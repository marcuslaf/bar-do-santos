# restaurante-pedidos

Bloco de notas de pedidos para pequeno restaurante: mobile-first, login de equipe, valor opcional por nota e fechamento de caixa.

## Sobre / About

Projeto full-stack scaffolded com agents locais, CI/CD, Docker e a base de segurança (security-foundation) já aplicada: .gitignore e .env.example oficiais, pre-commit com detecção de secrets e checklist de segurança.

Full-stack project scaffolded with local agents, CI/CD, Docker, and the security-foundation base already applied: official .gitignore and .env.example, pre-commit secret detection, and the security checklist.

## Stack

- **Frontend:** Next.js 15 + React 19 + TS 5.6
- **Backend:** Supabase (Edge Functions + Postgres)
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth

## Quick Start / Início Rápido

```bash
# 1. Clone e entre no diretório / clone and cd into the directory
cd restaurante-pedidos

# 2. Configure variáveis de ambiente / set up environment variables
cp .env.example .env
# Edite .env: preencha JWT_SECRET (e ANON_KEY/SERVICE_ROLE_KEY se usar Supabase)
# Edit .env: fill JWT_SECRET (and ANON_KEY/SERVICE_ROLE_KEY for Supabase)

# 3. Ative os hooks de pré-commit (requer: pip install pre-commit)
#    Enable pre-commit hooks
pre-commit install

# 4. Suba a stack com Docker / bring the stack up with Docker
docker compose up -d

# 5. Verifique / verify
docker compose ps
curl http://localhost:3000       # Frontend
curl http://localhost:3001/health  # Backend
```

> **Nota PT:** Após criar o `package.json` do projeto, configure husky + lint-staged com o comando `/setup-hooks` do OpenCode ou executando `powershell -ExecutionPolicy Bypass -File "C:\Users\marcu\.config\opencode\scripts\setup-hooks.ps1"`.
>
> **EN note:** After creating the project's `package.json`, set up husky + lint-staged via OpenCode's `/setup-hooks` command or by running the `setup-hooks.ps1` script referenced above.

## Estrutura do Projeto / Project Structure

```text
restaurante-pedidos/
├── apps/
│   ├── web/              # Frontend Next.js / Next.js frontend
│   └── api/              # Backend API
├── packages/
│   ├── shared/           # Types compartilhados (Zod/OpenAPI) / shared types
│   ├── ui/               # Componentes UI compartilhados / shared UI components
│   ├── config/           # Configuração compartilhada / shared config
│   └── db/               # Migrations e schema
├── .agents/rules/        # Agents especializados locais / local specialist agents
├── .github/workflows/    # CI/CD GitHub Actions (inclui secret-scan)
├── docs/                 # Documentação (inclui SECURITY-CHECKLIST.md) / docs
├── scripts/              # validate-agents.ps1, pre-push-hook.ps1
├── .gitignore            # Base security-foundation + padrões do stack
├── .env.example          # Template de variáveis (NUNCA committar .env)
├── .pre-commit-config.yaml  # Detecção de secrets / secret detection
├── docker-compose.yml
├── AGENTS.md             # Instruções globais / global agent instructions
└── AGENTS-ROUTING.md     # Matriz de roteamento / routing matrix
```

## Agents Disponíveis / Available Agents

Use `AGENTS-ROUTING.md` para saber qual agent delegar. Validação: `pwsh scripts/validate-agents.ps1 -Strict`.

Use `AGENTS-ROUTING.md` to know which agent to delegate to. Validation: `pwsh scripts/validate-agents.ps1 -Strict`.

## Comandos Úteis / Useful Commands

```bash
# Validar agents / validate agents
pwsh scripts/validate-agents.ps1 -Strict

# Secret scan em todos os arquivos / scan all files for secrets
pre-commit run --all-files

# Ver logs / tail logs
docker compose logs -f

# Parar tudo / stop everything
docker compose down

# Rebuild
docker compose up -d --build
```

## Deploy

Configure os secrets no GitHub Actions / configure these GitHub Actions secrets:
- `DOCKER_REGISTRY`
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `PRODUCTION_DATABASE_URL`
- `PRODUCTION_JWT_SECRET`

Push para `main` dispara build + deploy automático. / Push to `main` triggers automatic build + deploy.
