-- =============================================================================
-- Sonda do keep-alive do plano free do Supabase
-- =============================================================================
-- O plano free pausa projetos sem atividade após ~7 dias. O workflow
-- .github/workflows/keep-alive.yml mantém o projeto vivo com uma consulta
-- trivial no Postgres.
--
-- Essa consulta precisa responder 200 para a chave anon (o role `anon` não tem
-- nenhum privilégio no schema public deste projeto), mas não pode expor dado
-- algum. A tabela abaixo existe só para isso:
--
--   - `anon` recebe apenas SELECT;
--   - RLS ligado e SEM policy para `anon` => zero linhas visíveis;
--   - a query ainda executa no Postgres, que é o que conta como atividade.
--
-- A tabela não guarda informação sensível: uma linha, um timestamp.

create table if not exists public.keep_alive_probe (
  id smallint primary key default 1,
  touched_at timestamptz not null default now(),
  constraint keep_alive_probe_single_row check (id = 1)
);

comment on table public.keep_alive_probe is
  'Sonda de atividade do keep-alive. Nenhuma policy de RLS: invisível para anon/authenticated.';

-- Privilégio mínimo explícito (o padrão do projeto é revogar tudo antes de grant).
revoke all on public.keep_alive_probe from anon, authenticated;
grant select on public.keep_alive_probe to anon;
grant all on public.keep_alive_probe to service_role;

alter table public.keep_alive_probe enable row level security;

-- Sem policy de propósito: RLS sem policy => SELECT devolve 0 linhas (HTTP 200).

insert into public.keep_alive_probe (id)
values (1)
on conflict (id) do nothing;

-- Recarrega o cache de schema do PostgREST para a tabela aparecer na API.
notify pgrst, 'reload schema';
