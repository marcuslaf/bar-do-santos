# Modelo de dados — bar-do-santos

Documento de referência do schema. Fonte da verdade: `supabase/migrations/`.
O contrato consumido pelo app está em `apps/web/src/lib/data.ts`,
`apps/web/src/lib/actions/*.ts` e `apps/web/src/lib/types.ts`.

## 1. Visão geral

```text
auth.users (Supabase Auth)
    │ 1
    │ N
public.org_members ──────────────┐
  id, org_id, user_id, role,     │ N
  display_name, active           │
    │ N                          │
    │                            │ 1
public.orgs ◄────────────────────┘
  id, name, timezone, day_cutoff_hour
    │ 1
    │ N
public.orders
  id, org_id, customer_name, description, status,
  total_cents, payment_method, created_by,
  created_at, updated_at, day_key,
  delivered_at, paid_at, paid_by,
  canceled_at, canceled_by, cancel_reason
    │ 1
    │ N
public.order_events  (append-only)
  id, org_id, order_id, actor_id, event, payload, created_at

public.orders_view = orders + author_name + payer_name + canceller_name
                     (security_invoker = true)
```

Regras estruturais:

- `org_id` em toda tabela de domínio; RLS sempre por `org_id`.
- `orders` não tem `DELETE`: cancelamento é `status = 'cancelado'`.
- `order_events` é escrito apenas por trigger (sem GRANT e sem policy de escrita).
- `orders_view` herda a RLS de `orders` e `org_members` (`security_invoker`).

## 2. Tabelas

### `public.orgs`
| coluna | tipo | regra |
|---|---|---|
| id | uuid | pk, `gen_random_uuid()` |
| name | text | not null |
| timezone | text | not null, default `America/Sao_Paulo` |
| day_cutoff_hour | smallint | not null, default 4, check 0..23 |
| created_at | timestamptz | not null, default now() |

### `public.org_members`
| coluna | tipo | regra |
|---|---|---|
| id | uuid | pk |
| org_id | uuid | fk `orgs`, on delete cascade |
| user_id | uuid | fk `auth.users`, on delete cascade |
| role | member_role | `owner` \| `staff`, default `staff` |
| display_name | text | 1..60 caracteres (btrim) |
| phone | text | celular do login; `^[0-9]{10,11}$` (DDD incluso, sem `+55`); nulo no bootstrap por e-mail |
| active | boolean | default true; soft delete |
| created_at | timestamptz | not null |

`unique (org_id, user_id)`; índice em `user_id`; `unique (org_id, phone)` parcial
(`where phone is not null`) — é o que impede dois acessos com o mesmo celular.
O login é **celular + senha**: o `auth.users.email` é sintético e derivado do
celular (`<dígitos>@celular.local`), nunca exibido na interface.

### `public.orders`
| coluna | tipo | regra |
|---|---|---|
| id | uuid | pk |
| org_id | uuid | fk `orgs`, default `current_org_id()`, forçado no INSERT |
| customer_name | text | 1..80 (btrim) |
| description | text | 1..2000 (btrim) |
| status | order_status | default `aberto`, forçado no INSERT |
| total_cents | integer | null ou 0..10.000.000 |
| payment_method | payment_method | null até o pagamento |
| created_by | uuid | fk `auth.users`, forçado = `auth.uid()` |
| created_at / updated_at | timestamptz | imutável / atualizado no trigger |
| delivered_at | timestamptz | carimbado no trigger |
| paid_at / paid_by | timestamptz / uuid | carimbados no trigger |
| canceled_at / canceled_by | timestamptz / uuid | carimbados no trigger |
| cancel_reason | text | 3..300 quando cancelado |
| day_key | date | dia operacional, imutável |

Constraints de invariante (redundantes ao trigger, protegem escrita via service role):
`status = 'pago'` exige `total_cents` e `payment_method`; `status = 'cancelado'`
exige `cancel_reason` com 3+ caracteres.

### `public.order_events`
| coluna | tipo | regra |
|---|---|---|
| id | bigserial | pk |
| org_id | uuid | fk `orgs` |
| order_id | uuid | fk `orders`, on delete cascade |
| actor_id | uuid | fk `auth.users`, `auth.uid()` no momento do evento |
| event | text | `created` \| `updated` \| `delivered` \| `paid` \| `canceled` |
| payload | jsonb | default `{}` |
| created_at | timestamptz | default now() |

Formato do `payload`:
- `created`: snapshot da linha (`to_jsonb(NEW)` sem `updated_at`).
- `updated`: `{ "changes": { "<coluna>": { "old": ..., "new": ... } } }`.
- `delivered`/`paid`/`canceled`: `{ "from": "<status antigo>", "to": "<status novo>", "changes": {...} }`.

### `public.orders_view`
Todas as colunas de `orders` + `author_name`, `payer_name`, `canceller_name`
(`display_name` de `org_members`, por `created_by`/`paid_by`/`canceled_by`).
`security_invoker = true` — sem isso a view vazaria dados entre organizações.
Os LEFT JOINs são 1:1 porque `(org_id, user_id)` é único, então não duplicam notas.

## 3. Matriz de permissões

| objeto | anon | staff (authenticated) | owner (authenticated) | service_role |
|---|---|---|---|---|
| `orgs` | — | select do próprio org | select do próprio org | all |
| `org_members` | — | select da equipe do org | select da equipe do org | all |
| `orders` | — | select, insert, update* | select, insert, update* | all |
| `order_events` | — | select do org | select do org | all (escrita via trigger) |
| `orders_view` | — | select do org | select do org | all |
| `realtime.messages` | — | select no tópico `orders:<próprio org>` | idem | — |

`*` UPDATE só nas colunas: `customer_name`, `description`, `status`, `total_cents`,
`payment_method`, `cancel_reason`. `org_id`, `created_by`, `created_at`, `day_key`,
`delivered_at`, `paid_at`, `paid_by`, `canceled_at`, `canceled_by` não têm GRANT —
tentativa direta retorna `42501` (o app traduz para "Você não tem permissão para esta ação.").

Não existe policy nem GRANT de DELETE em `orders`. Ninguém apaga nota.

`org_members` não tem policy de INSERT/UPDATE/DELETE: convite e desligamento passam
pelo client service role em `apps/web/src/lib/actions/auth.ts`, que valida antes que
o chamador é `owner`.

## 4. Regras de transição de status

| de \ para | aberto | entregue | pago | cancelado |
|---|---|---|---|---|
| **aberto** | edição livre | ok | ok (com valor + forma) | ok (só owner, com motivo) |
| **entregue** | inválido | edição livre | ok (com valor + forma) | ok (só owner, com motivo) |
| **pago** | terminal | terminal | terminal | terminal |
| **cancelado** | terminal | terminal | terminal | terminal |

Mensagens (todas `P0001`, exibidas pelo app via `error.message`):
- nota paga/cancelada: `Esta nota já foi finalizada e não pode ser alterada.`
- pagamento sem valor/forma: `Informe o valor e a forma de pagamento.`
- cancelamento sem motivo: `Descreva o motivo do cancelamento.`
- cancelamento por staff: `Somente o dono pode cancelar uma nota.`
- qualquer outro salto: `Transição de status inválida.`

Carimbos: `entregue` grava `delivered_at`; `pago` grava `paid_at` + `paid_by`;
`cancelado` grava `canceled_at` + `canceled_by` + `cancel_reason` (btrim).
Se o status não muda, os carimbos existentes são preservados (idempotência).
`payment_method` só existe em nota paga; `cancel_reason` só em nota cancelada.

## 5. Dia operacional

`public.current_business_day()` → `date`, calculado no banco:

```text
day_key = ((now() - make_interval(hours => orgs.day_cutoff_hour))
           at time zone orgs.timezone)::date
```

Exemplo com `timezone = America/Sao_Paulo` e `day_cutoff_hour = 4`:

| instante local | day_key |
|---|---|
| 26/10 23:30 | 2026-10-26 |
| 27/10 02:00 | 2026-10-26 (madrugada pertence ao dia anterior) |
| 27/10 04:00 | 2026-10-27 |

`orders.day_key` é gravado no INSERT pelo trigger, com o fuso/cutoff do org da nota,
e é imutável. O cliente nunca envia `day_key`. `current_business_day()` é `STABLE`
e `SECURITY DEFINER` (`search_path = ''`), e é o único caminho que o app usa
(`getBusinessDay()`), garantindo que lista, busca e caixa usem o mesmo dia.

## 6. Realtime

- Tópico: `orders:<org_id>` (um por organização).
- Eventos: `INSERT` e `UPDATE` (`DELETE` não existe).
- Publicação: trigger `orders_broadcast_changes` → `realtime.broadcast_changes(...)`.
- Canal sempre **privado**: `supabase.channel('orders:<org_id>', { config: { private: true } })`
  + `await supabase.realtime.setAuth()` antes do `subscribe()`.
- Payload: `{ schema, table, type, record, old_record, commit_timestamp }`.
- Autorização: policy `orders_broadcast_read` em `realtime.messages` (SELECT) —
  só `authenticated`, só tópico `orders:%` e só se o uuid for o org ativo do usuário.
  Não há policy de INSERT: nenhum cliente publica nesse tópico.
- O trigger de broadcast roda em `exception when others` + `raise warning`: uma
  indisponibilidade do Realtime nunca desfaz a escrita da nota (degrada para
  "sem atualização ao vivo", não para "perdi o pedido").

## 7. Bootstrap do dono

O primeiro usuário não pode ser criado por SQL (a senha vive em `auth.users`).

1. Aplicar schema: `supabase db push --linked` (remoto) ou `supabase db reset` (local).
2. Criar o usuário: Dashboard → Authentication → Users → Add user, com o
   **e-mail sintético derivado do celular** — `<dígitos>@celular.local`
   (ex.: `11999990000@celular.local` para `(11) 99999-0000`), senha, "Auto
   Confirm User". O app nunca mostra esse e-mail: o login é celular + senha.
3. Rodar, como `postgres` no SQL Editor:
   ```sql
   select public.bootstrap_owner('11999990000@celular.local');
   ```
   A função valida que o usuário existe, pega o org único e faz upsert em
   `org_members` com `role = 'owner'`, `active = true`. É idempotente.
   A coluna `org_members.phone` fica nula nesse caminho — preencha à mão
   (`update public.org_members set phone = '<dígitos>' where user_id = …`)
   ou use `/equipe`, que já grava o celular.
4. Verificar: `select user_id, role, display_name, phone, active from public.org_members;`
5. Login no app. Os demais acessos saem de `/equipe` (`inviteMember`), que usa
   service role e não precisa de bootstrap.

`bootstrap_owner` tem `EXECUTE` revogado de `public`, `anon` e `authenticated` —
só `service_role` e `postgres` executam.

## 8. Funções e RPCs

| função | retorno | estabilidade | quem executa |
|---|---|---|---|
| `current_org_id()` | uuid | stable | authenticated, service_role |
| `is_owner()` | boolean | stable | authenticated, service_role |
| `current_business_day()` | date | stable | authenticated, service_role (RPC do app) |
| `business_day_for(uuid, timestamptz)` | date | stable | service_role (interno) |
| `orders_enforce_rules()` | trigger | — | trigger |
| `orders_record_event()` | trigger | — | trigger |
| `orders_broadcast_changes()` | trigger | — | trigger |
| `bootstrap_owner(text)` | uuid | volatile | service_role, postgres |

## 9. Índices

| índice | uso |
|---|---|
| `org_members_user_id_idx` | helper `current_org_id()` |
| `org_members_org_user_key` (unique) | join 1:1 da view, upsert do bootstrap |
| `org_members_org_phone_uidx` (unique, partial) | impede dois acessos com o mesmo celular |
| `orders_org_day_created_idx` | lista do dia e caixa |
| `orders_org_open_idx` (partial) | notas `aberto`/`entregue` |
| `order_events_org_created_idx` | auditoria por org |
| `order_events_order_idx` | eventos de uma nota |

## 10. Decisões e limites conhecidos

- **Single-org por design.** `current_org_id()` escolhe o vínculo ativo mais antigo.
  Suportar múltiplos orgs exige um seletor explícito de org (não existe hoje).
- **Sem DELETE em `orders`.** Correção de nota paga/cancelada = nova nota.
- **`created_by` sem ON DELETE.** Por isso excluir membro apaga só o vínculo em
  `org_members`; a conta do Auth fica para preservar a autoria das notas.
- **`paid_by`/`canceled_by` são carimbos do banco.** O cliente não os informa.
- **Service role ignora RLS.** Só é usada em Server Actions já autorizadas
  (`inviteMember`, `removeMember`); nunca no browser.
- **`order_events` cresce sem poda.** Com 6 usuários o volume é irrelevante;
  se virar problema, podar por `created_at` via `pg_cron`.
