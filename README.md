# Bar do Santos

> **App em produção / Live app:** <https://bar-do-santos.vercel.app>

Bloco de notas de pedidos do Bar do Santos: substitui o caderno de papel mantendo a mesma velocidade de anotação.
*Order notepad for Bar do Santos: replaces the paper pad while keeping the same capture speed.*

---

## O que é / What it is

Uma tela de login para a equipe e um caderno digital mobile-first. Cada nota tem **dois campos**: nome do cliente e o que ele pediu. O resto (quem anotou, que horas, status, valor) é registrado sem digitação extra.

A team login plus a mobile-first digital notepad. Each note has **two fields**: customer name and the order. Everything else (author, time, status, amount) is recorded without extra typing.

- Notas compartilhadas em tempo real entre salão e cozinha.
- Valor é opcional na anotação e obrigatório apenas no pagamento.
- Fechamento de caixa por dia operacional (vira às 04:00, não à meia-noite).
- Cancelamento exige motivo e fica registrado — só o dono cancela.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Web | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS v4 |
| Banco/Auth | Supabase (Postgres + RLS + Realtime broadcast) |
| Validação | Zod |
| Testes | Vitest |
| Deploy | Vercel + Supabase |

---

## Como funciona / How it works

```text
login → lista do dia → "+ Nova nota" (2 campos) → salvar
                          ↓
                 cozinha vê na hora (realtime)
                          ↓
              marcar entregue → marcar pago (valor + forma)
                          ↓
                    fechamento do dia (/caixa)
```

1. **`/login`** — celular e senha. Cadastro é fechado: só o dono cria acessos.
   *`/login` — phone number and password. Signup is closed: only the owner creates accounts.*
2. **`/`** — o caderno aberto: notas do dia, busca por nome ou texto, filtros.
3. **`/nova`** — captura em 2 campos; o valor fica recolhido atrás de "+ valor".
4. **`/nota/[id]`** — detalhe, edição, entregar, pagar, cancelar (com motivo).
5. **`/caixa`** — total pago, em aberto, por forma de pagamento e por operador.
6. **`/equipe`** — só o dono: criar acesso por celular definindo a senha da pessoa,
   redefinir a senha de quem já tem acesso, excluir quem saiu e ver o número de cada um.
   A própria senha não é redefinida aqui: o dono usa `/minha-senha` como todo mundo.
   *Owner only: create an account by phone number and set the person's password, reset
   an existing member's password, remove members who left and see each member's number.
   The owner's own password is not reset here — they use `/minha-senha` like everyone.*
7. **`/minha-senha`** — qualquer membro logado troca a própria senha. Pede a senha
   atual, confere a política e derruba as sessões dos outros aparelhos; o aparelho em
   uso continua conectado.
   *Any signed-in member changes their own password. It asks for the current password,
   enforces the policy and ends the sessions on other devices; the current device stays
   signed in.*

---

## Requisitos / Requirements

- Node.js 20+ (testado em 24)
- pnpm 11+
- Projeto Supabase (cloud) **ou** Docker para o Supabase local

> Docker não está disponível nesta máquina: use um projeto Supabase cloud e `supabase link`.

---

## Setup / Getting started

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis

```bash
cp .env.example apps/web/.env.local
```

Preencha em `apps/web/.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # só servidor
```

A `SERVICE_ROLE_KEY` ignora RLS. Ela é usada apenas em Server Actions já autorizadas
(`inviteMember`, `removeMember`). **Nunca** use o prefixo `NEXT_PUBLIC_` nela.

### 3. Aplicar o banco

```bash
supabase link --project-ref <ref>
supabase db push
```

O `db push` aplica `supabase/migrations/` (schema, RLS, triggers, realtime).
Em ambiente local com Docker: `supabase start && supabase db reset` (roda o seed).

### 4. Criar o primeiro acesso (dono) / Create the first access (owner)

O login é **celular + senha**. No Supabase Auth o e-mail é sintético e derivado do
celular (`<somente_digitos>@celular.local`); o dono não digita nem vê esse e-mail no app.

*Login is **phone number + password**. Supabase Auth stores a synthetic email derived
from the phone (`<digits>@celular.local`); the owner never types or sees it in the app.*

O dono não pode nascer por SQL (a senha vive no `auth.users`).

1. Dashboard → **Authentication → Users → Add user** com o e-mail sintético
   do seu celular (ex.: `11999990000@celular.local`) e uma senha, auto-confirm.
2. SQL Editor, apontando para o mesmo e-mail sintético:

```sql
select public.bootstrap_owner('11999990000@celular.local');
```

3. Entre no app com o celular (ex.: `(11) 99999-0000`) e a senha. Os demais acessos saem
   de `/equipe`, onde o dono informa apenas o celular.

> `scripts/dev-users.ps1` cria os acessos de teste `11999990002` (equipe) e
> `11999990003` (sem vínculo). O **dono de teste** (`11999990001`) é criado apenas
> se a org ainda não tiver owner; com um dono real já cadastrado, o script apenas
> informa quem é. Credenciais reais não ficam no repositório.

*The remaining accounts are created in `/equipe`; the owner only provides the phone number.*

### 5. Rodar

```bash
pnpm dev      # http://localhost:3000
```

---

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Next dev em `apps/web` |
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest |

---

## Estrutura / Structure

```text
apps/web/src/
├── app/                 # rotas: login, lista, nova, nota/[id], caixa, equipe
├── components/          # UI client-side
├── lib/
│   ├── actions/         # Server Actions (orders, auth)
│   ├── supabase/        # clients server/browser/admin + middleware
│   ├── data.ts          # queries
│   ├── cash.ts          # agregação do fechamento (testada)
│   ├── format.ts        # BRL, datas, iniciais
│   ├── phone.ts         # celular: normalização, máscara e e-mail sintético
│   └── types.ts         # contrato de tipos
└── middleware.ts        # guarda de sessão

supabase/
├── migrations/          # schema + RLS + triggers + realtime
└── seed.sql

docs/
├── architecture/data-model.md   # schema detalhado, matriz de permissões, transições
└── SECURITY-CHECKLIST.md
```

---

## Segurança / Security

- **RLS em todas as tabelas**, policies por operação com `(select auth.uid())`.
- **Zero policy de DELETE** em `orders`: cancelar é status, não remoção.
- **Autorização no banco**, não só na UI: transições de status e cancelamento
  são validadas por trigger; o app só reflete a regra.
- **Cadastro fechado** (`enable_signup = false` no config local; desligue também
  no Dashboard em *Authentication → Providers → Email*).
- **Service role só no servidor**, com checagem prévia de papel `owner`.
- **Auditoria append-only** em `order_events` (quem criou, editou, entregou, pagou, cancelou).
- CI com **gitleaks** + hooks globais de lint/typecheck no commit.
- Checklist completo: [`docs/SECURITY-CHECKLIST.md`](docs/SECURITY-CHECKLIST.md).

---

## Limitações conhecidas / Known limitations

- **Single-org**: uma instância por estabelecimento. Multi-tenant exigiria seletor de org.
- **Sem cardápio**: o pedido é texto livre; não há total automático por item.
- **Sem "esqueci a senha"**: o e-mail do Auth é sintético e não recebe mensagens. Quem
  não lembra a senha atual pede ao dono para redefinir na tela Equipe — o que **encerra
  as sessões abertas** da pessoa (ela cai no login e entra com a senha nova). Para cortar
  o acesso de vez, remova o vínculo.
  *There is no "forgot password" flow: the Auth email is synthetic and receives no mail.
  Whoever does not remember the current password asks the owner to reset it on the Team
  screen — which **ends that person's open sessions** (they land on the login screen and
  sign in with the new password). To cut access for good, remove the membership.*
- **O dono ainda conhece as senhas que criou**: é consequência de ele cadastrá-las. Isso
  significa senha possivelmente compartilhada e que a autoria das notas
  (`orders.created_by`) deixa de ter valor probatório — o dono pode se passar por
  qualquer membro. O mitigador é `/minha-senha`: cada pessoa troca a sua sem depender
  dele (e a troca derruba as sessões antigas).
  *The owner still knows the passwords they created — a consequence of setting them.
  That means possibly shared passwords and that note authorship (`orders.created_by`) is
  no longer probative: the owner can impersonate any member. The mitigation is
  `/minha-senha`: each person changes their own password without depending on the owner
  (and the change ends older sessions).*
- **Sem impressão térmica** na v1.
- **Realtime** degrada para atualização manual se o serviço estiver indisponível; há polling de 20s como rede de segurança.

### Roadmap
1. Recuperação de senha pelo celular (SMS/WhatsApp). Hoje o dono redefine a senha na
   tela Equipe; o que falta é o caminho sem depender dele.
2. Cardápio opcional com preço por item (sem perder a captura em 2 campos).
3. Exportação do caixa (CSV) e impressão de comanda.

---

## Deploy

1. **Vercel**: importe o repositório, root directory `apps/web`, e configure
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (server-only).
2. **Supabase**: `supabase db push` no projeto de produção e `bootstrap_owner`
   com o e-mail sintético do dono (`<digitos>@celular.local`).
3. Em *Authentication → URL Configuration*, adicione a URL da Vercel em
   **Site URL** e **Redirect URLs**.
