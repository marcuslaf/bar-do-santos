#!/usr/bin/env bash
# Keep-alive do projeto Supabase (plano free).
#
# O plano free pausa projetos com baixa atividade depois de ~7 dias. Este script:
#   1. consulta o status do projeto na Management API;
#   2. se estiver pausado, restaura via POST /v1/projects/{ref}/restore;
#   3. espera o projeto voltar a ACTIVE_HEALTHY;
#   4. roda um SELECT trivial no PostgREST (atividade real no Postgres);
#   5. registra um batimento no GitHub (no máximo 1x/dia) para o repositório
#      não ficar 60 dias sem atividade — o GitHub desabilita cron em repo
#      público ocioso e o keep-alive pararia silenciosamente.
#
# Uso local (para depurar antes de mexer no workflow):
#   SUPABASE_ACCESS_TOKEN=... SUPABASE_URL=... SUPABASE_ANON_KEY=... \
#     bash .github/scripts/keep-alive.sh
#
# Variáveis de ambiente (todas opcionais, com padrão sensato):
#   SUPABASE_ACCESS_TOKEN  PAT da Management API (necessário para restaurar)
#   SUPABASE_URL          https://<ref>.supabase.co
#   SUPABASE_ANON_KEY     chave anon/publishable (para o ping no Postgres)
#   SUPABASE_PROJECT_REF  ref do projeto (derivado da URL quando omitido)
#   KEEP_ALIVE_TABLE      tabela usada no ping (padrão: keep_alive_probe)
#   WAIT_TIMEOUT          segundos esperando o projeto ficar ativo (padrão: 600)
#   POLL_INTERVAL         segundos entre tentativas (padrão: 20)
#   HEARTBEAT             "1" grava batimento no GitHub (padrão: 1)
#   RESOLVE_HOST          "host:porta:ip" para contornar DNS quebrado localmente
#                         (ex.: RESOLVE_HOST=ref.supabase.co:443:104.18.38.10)

set -uo pipefail

MGMT_API="${MGMT_API:-https://api.supabase.com}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
KEEP_ALIVE_TABLE="${KEEP_ALIVE_TABLE:-keep_alive_probe}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-600}"
POLL_INTERVAL="${POLL_INTERVAL:-20}"
HEARTBEAT="${HEARTBEAT:-1}"
HEARTBEAT_ISSUE_TITLE="[keep-alive] Batimento do projeto Supabase"

# --resolve opcional: contorna DNS quebrado na máquina de desenvolvimento.
CURL_RESOLVE_ARGS=()
if [ -n "${RESOLVE_HOST:-}" ]; then
  CURL_RESOLVE_ARGS=(--resolve "${RESOLVE_HOST}")
fi

log()  { printf '%s\n' "$*"; }
info() { printf '::notice::%s\n' "$*"; }
warn() { printf '::warning::%s\n' "$*"; }
error(){ printf '::error::%s\n' "$*"; }

# --- utilidades -------------------------------------------------------------

# Extrai o valor de uma chave de string num JSON (com fallback sem jq).
json_field() {
  local json="$1" key="$2"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$json" | jq -r --arg k "$key" '.[$k] // empty' 2>/dev/null
  else
    printf '%s' "$json" \
      | grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
      | head -n1 \
      | sed -E "s/.*:[[:space:]]*\"([^\"]*)\".*/\1/"
  fi
}

# Deriva o ref do projeto a partir da URL do Supabase.
derive_ref() {
  local host="${SUPABASE_URL#*://}"
  host="${host%%/*}"
  host="${host%%:*}"
  case "$host" in
    *.supabase.co) printf '%s' "${host%%.supabase.co}" ;;
    *) printf '%s' "" ;;
  esac
}

mgmt_get() {
  curl -sS --max-time 30 \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Accept: application/json" \
    "${MGMT_API}$1" 2>/dev/null
}

# --- status do projeto ------------------------------------------------------

get_status() {
  local body status
  body="$(mgmt_get "/v1/projects/${PROJECT_REF}")"
  [ -z "$body" ] && { printf '%s' "UNKNOWN"; return 0; }
  status="$(json_field "$body" "status")"
  printf '%s' "${status:-UNKNOWN}"
}

# Status que exigem um POST /restore.
status_needs_restore() {
  case "$1" in
    INACTIVE|PAUSE_FAILED|PAUSE_FAILED_STATE|REMOVED|RESTORE_FAILED|GOING_DOWN|PAUSING) return 0 ;;
    *) return 1 ;;
  esac
}

restore_project() {
  local code body
  body="$(curl -sS -o /dev/null -w '%{http_code}' -X POST --max-time 60 \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "${MGMT_API}/v1/projects/${PROJECT_REF}/restore" 2>/dev/null)"
  code="$body"
  if [ "$code" = "200" ] || [ "$code" = "201" ] || [ "$code" = "202" ] || [ "$code" = "204" ]; then
    info "Restore solicitado (HTTP ${code}). O projeto está voltando."
    return 0
  fi
  error "Restore falhou (HTTP ${code:-sem resposta}). Verifique o token e as permissões."
  return 1
}

# Espera o projeto ficar utilizável (ACTIVE_HEALTHY ou ACTIVE_UNHEALTHY).
wait_active() {
  local deadline=$(( $(date +%s) + WAIT_TIMEOUT ))
  local status
  while [ "$(date +%s)" -lt "$deadline" ]; do
    status="$(get_status)"
    case "$status" in
      ACTIVE_HEALTHY|ACTIVE_UNHEALTHY)
        log "Status do projeto: ${status}"
        return 0
        ;;
      RESTORE_FAILED|PAUSE_FAILED|REMOVED)
        error "O projeto não voltou: status ${status}."
        return 1
        ;;
    esac
    log "Aguardando projeto ficar ativo (status atual: ${status})..."
    sleep "$POLL_INTERVAL"
  done
  error "Timeout de ${WAIT_TIMEOUT}s esperando o projeto ficar ativo."
  return 1
}

# --- ping no Postgres -------------------------------------------------------

# Uma consulta trivial no PostgREST: a RLS devolve lista vazia para o anon,
# mas o SQL roda no Postgres — é isso que conta como atividade do banco.
# Retorna: 0 = ok, 1 = transitório (tentar de novo), 2 = permanente (outra tabela).
ping_rest() {
  local table="$1" body code rc
  body="$(mktemp)"
  code="$(curl -sS -o "$body" -w '%{http_code}' --max-time 30 \
    "${CURL_RESOLVE_ARGS[@]}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    "${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1" 2>/dev/null)"
  rc=$?
  if [ "$rc" -ne 0 ]; then
    # rc 6 = não resolveu o host (projeto pausado derruba o DNS).
    warn "Falha de rede ao consultar ${table} (curl rc=${rc})."
    rm -f "$body"
    return 1
  fi
  if [ "$code" = "200" ]; then
    log "Ping em ${table}: HTTP 200 ($(head -c 120 "$body"))"
    rm -f "$body"
    return 0
  fi
  warn "Ping em ${table}: HTTP ${code} ($(head -c 200 "$body"))"
  rm -f "$body"
  case "$code" in
    429|5*) return 1 ;;                      # transitório: tenta de novo
    *) return 2 ;;                           # permanente: troca de tabela
  esac
}

ping_with_fallback() {
  local table deadline rc permanent
  deadline=$(( $(date +%s) + WAIT_TIMEOUT ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    permanent="yes"
    for table in "${KEEP_ALIVE_TABLE}" orgs; do
      ping_rest "$table"
      rc=$?
      [ "$rc" -eq 0 ] && return 0
      [ "$rc" -eq 1 ] && permanent="no"
    done
    if [ "$permanent" = "yes" ]; then
      error "Nenhuma tabela respondeu 200 (a sonda '${KEEP_ALIVE_TABLE}' não existe ou o anon não tem SELECT?)."
      return 1
    fi
    sleep "$POLL_INTERVAL"
  done
  error "Não foi possível consultar o banco após ${WAIT_TIMEOUT}s."
  return 1
}

# --- batimento no GitHub ----------------------------------------------------

heartbeat() {
  local restored="$1" status="$2" now today last number title
  command -v gh >/dev/null 2>&1 || return 0
  [ -n "${GITHUB_REPOSITORY:-}" ] || return 0
  [ -n "${GH_TOKEN:-}" ] || return 0

  now="$(date -u +%s)"
  today="$(date -u +%Y-%m-%d)"

  number="$(gh issue list --repo "$GITHUB_REPOSITORY" --state all \
    --search "in:title keep-alive" --json number --jq '.[0].number' 2>/dev/null)"

  if [ -z "${number:-}" ]; then
    number="$(gh issue create --repo "$GITHUB_REPOSITORY" \
      --title "$HEARTBEAT_ISSUE_TITLE" \
      --body "Batimento automático do keep-alive do Supabase. Este issue existe para manter o repositório com atividade — o GitHub desabilita workflows agendados em repositórios públicos sem atividade por 60 dias." \
      2>/dev/null | grep -oE '[0-9]+$')"
    [ -n "${number:-}" ] || return 0
    last=""
  else
    last="$(gh api "repos/${GITHUB_REPOSITORY}/issues/${number}/comments" --jq '.[-1].created_at' 2>/dev/null)"
  fi

  # Só grava batimento 1x por dia, salvo quando houve restore (que merece registro).
  if [ "$restored" != "yes" ] && [ -n "${last:-}" ]; then
    case "$last" in
      "$today"*) return 0 ;;
    esac
  fi

  title="Keep-alive ${today} — status ${status}"
  if [ "$restored" = "yes" ]; then
    title="Keep-alive ${today} — projeto estava pausado e foi restaurado (status ${status})"
  fi
  gh issue comment "$number" --repo "$GITHUB_REPOSITORY" --body "${title}" >/dev/null 2>&1 || true
}

# --- main -------------------------------------------------------------------

if [ -z "$PROJECT_REF" ]; then
  PROJECT_REF="$(derive_ref)"
fi

if [ -z "$PROJECT_REF" ]; then
  error "Não foi possível determinar o ref do projeto (informe SUPABASE_PROJECT_REF)."
  exit 1
fi
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  error "SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios."
  exit 1
fi
if [ -z "$ACCESS_TOKEN" ]; then
  error "SUPABASE_ACCESS_TOKEN é obrigatório para restaurar o projeto quando ele pausar."
  exit 1
fi

log "Projeto: ${PROJECT_REF}"

restored="no"
status="$(get_status)"
log "Status inicial: ${status}"

if status_needs_restore "$status"; then
  warn "O projeto está pausado (status ${status})."
  if ! restore_project; then
    exit 1
  fi
  restored="yes"
fi

if ! wait_active; then
  exit 1
fi

if ! ping_with_fallback; then
  exit 1
fi

status="$(get_status)"
info "Projeto ativo (status ${status})."
[ "$HEARTBEAT" = "1" ] && heartbeat "$restored" "$status"

log "Keep-alive concluído."
exit 0
