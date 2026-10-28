# AGENTS.md — bar-do-santos

## Descrição
Bloco de notas de pedidos do Bar do Santos. Mobile-first, login de equipe por
**celular + senha** (Supabase Auth, cadastro fechado), captura em 2 campos
(cliente + pedido), valor opcional por nota e fechamento de caixa por dia operacional.

## Stack Principal
- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Estilo:** Tailwind CSS v4 (`@import "tailwindcss"`, sem tailwind.config.js)
- **Backend:** Supabase (Postgres + RLS + Realtime broadcast + Server Actions)
- **Auth:** Supabase Auth (celular + senha; e-mail sintético interno
  `<digitos>@celular.local`, acesso criado pelo dono **com a senha que ele digita**)
- **Testes:** Vitest (lógica pura) + pgTAP (banco, quando houver)
- **Package Manager:** pnpm (workspace: `apps/web`)
- **Deploy:** Vercel (web) + Supabase (banco)

## Comandos Essenciais
```bash
# Dev (na raiz)
pnpm dev              # Next dev em apps/web
pnpm build            # Build de produção
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest

# Supabase
supabase start                    # stack local (Docker)
supabase db push --linked         # aplica migrations no remoto
supabase migration new <nome>     # nova migration versionada
supabase db diff --linked         # detecta drift

# Agentes
pwsh scripts/validate-agents.ps1 -Strict
```

## Estrutura
```text
apps/web/src/
├── app/                 # rotas (login, lista, nova, nota/[id], caixa, equipe, minha-senha)
├── components/          # UI (client components)
├── lib/
│   ├── actions/         # Server Actions (orders, auth)
│   ├── supabase/        # clients server/browser/admin + middleware
│   ├── data.ts          # queries (Server Components)
│   ├── cash.ts          # agregação pura do fechamento
│   ├── format.ts        # BRL, datas, iniciais
│   └── types.ts         # contrato de tipos do domínio
└── middleware.ts        # guarda de sessão

supabase/
├── migrations/          # schema, RLS, triggers, realtime
└── seed.sql             # org única do bar
```

## Modelo de dados (resumo)
- `orgs` — o bar (timezone, `day_cutoff_hour`). Uma linha no v1.
- `org_members` — vínculo usuário↔org com `role` (`owner` | `staff`) e `phone`
  (celular de acesso: só dígitos, DDD incluso, sem +55).
- `orders` — a nota: `customer_name`, `description`, `status`, `total_cents`,
  `payment_method`, carimbos de entrega/pagamento/cancelamento, `day_key`.
- `order_events` — trilha append-only de toda mudança de estado.
- `password_attempts` — contador de falhas de senha atual por usuário (5 em 15 min).
  Sem policy: acesso só pela service role, usado por `changeOwnPassword`.
- `orders_view` — `orders` + nomes de autor/pagador/cancelador.

## Regras de negócio
- Status: `aberto` → `entregue` → `pago`, ou `cancelado`. `pago` e `cancelado` são terminais.
- `pago` exige `total_cents` e `payment_method`. `cancelado` exige motivo e é exclusivo do `owner`.
- `day_key` é calculado no banco (timezone + corte, default 04:00) e nunca aceito do cliente.
- Valor é opcional na captura; obrigatório apenas no pagamento.

## Regras de Segurança
- RLS obrigatório em toda tabela; policies por operação com `(select auth.uid())`.
- `orders` não tem policy de DELETE: cancelamento é status, não remoção.
- `SUPABASE_SERVICE_ROLE_KEY` só em código de servidor (`lib/supabase/admin.ts`), nunca com prefixo `NEXT_PUBLIC_`.
- Server Actions revalidam autorização no servidor; nunca confiar em papel vindo do cliente.
- Validação de entrada com Zod em toda action.
- Senha definida pelo dono em `/equipe`: a política vive em `lib/password.ts`
  (mínimo 8, teto de 72 **bytes** do bcrypt, blocklist com celular/nome/nome do bar) e é
  usada pelo formulário e pela action. Senha nunca é normalizada, logada nem devolvida
  na resposta; o `<form>` do convite usa `method="post"` para não vazar senha na URL
  antes da hidratação.
- Redefinir senha (`resetMemberPassword`) usa `updateUserById`, que **revoga as sessões**
  do alvo: quem estava logado volta ao login e entra de novo com a senha nova. Cortar
  acesso é remover o vínculo (`active` é o que a RLS respeita), não trocar senha.
- Exclusão do vínculo (`removeMember`) bloqueia a si mesmo, e `resetMemberPassword`
  **recusa o alvo igual ao usuário logado**: a própria senha só muda em `/minha-senha`.
- `changeOwnPassword` ("Minha senha") exige a **senha atual** — o aparelho do balcão fica
  destravado e sem essa checagem qualquer um trocaria a senha e trancaria o dono para
  fora. A conferência usa `signInWithPassword` num client **efêmero** (sem cookies): o
  client com cookies só faz o `updateUser`, que rotaciona a sessão atual e derruba as
  outras. Falhas de senha atual são contadas por usuário em `public.password_attempts`
  (5 em 15 min, service role) porque o rate limit do GoTrue conta por IP do servidor e é
  compartilhado pela equipe. Não aplicar a política de senha à senha atual.
- O e-mail de Auth é sintético (`<digitos>@celular.local`): nunca exibir na UI,
  nem em mensagens de erro/logs. A UI mostra apenas o celular formatado.
- NUNCA commitar `.env` ou `.env.local`. Segredos apenas em variáveis de ambiente.

## Tema e responsividade (padrões obrigatórios)
- **Tema:** claro/escuro com `next-themes` (`attribute="class"`), tokens semânticos, botão de 2 estados no header (claro ↔ escuro; a primeira visita segue o SO). Componente nunca usa cor literal.
- **Responsividade:** toda tela funciona em 320px de largura e em altura ≤ 480px (celular deitado, tablet de balcão). Zero scroll horizontal; `/nova` e `/nota/[id]` com a ação primária visível nessas alturas; alvos ≥ 44px; inputs com `font-size` ≥ 16px; `100dvh` e `env(safe-area-inset-bottom)` nas barras fixas.
- Antes de entregar tela nova ou alterada: medir a matriz de viewports e anexar a tabela overflow antes/depois. Receita e critérios em `.agents/rules/responsive-auditor.md`.

## Convenções de Código
- camelCase para variáveis/funções, PascalCase para componentes, snake_case para SQL.
- `const` sempre; `let` só quando inevitável; nunca `var`.
- Componentes funcionais com hooks. Sem class components.
- Imports com alias `@/`.
- Commits em Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).

## Memória entre Sessões (MCP Memory)
- Consultar o memory graph no início de cada sessão de trabalho.
- Registrar stack, features e caminho do projeto ao finalizar entregas.

## Referências
- Agents locais: `.agents/rules/` · Roteamento: `AGENTS-ROUTING.md`
- Validação: `scripts/validate-agents.ps1`
- Checklist de segurança: `docs/SECURITY-CHECKLIST.md`
- Modelo de dados detalhado: `docs/architecture/data-model.md`
