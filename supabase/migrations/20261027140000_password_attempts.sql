-- =============================================================================
-- Freio de tentativas de "minha senha"
--
-- `changeOwnPassword` confere a senha atual com `signInWithPassword` (a Admin
-- API não valida senha sem emitir sessão). No deploy, essas chamadas saem do
-- servidor — o rate limit do GoTrue conta por IP e passa a ser compartilhado
-- pela equipe inteira: alguns erros de digitação de uma pessoa aproximam todo
-- mundo do bloqueio de login.
--
-- Esta tabela guarda um contador por usuário, em janela de 15 minutos, e não
-- tem policy alguma: só a service role (Server Action) enxerga. O objetivo é
-- parar o loop de tentativas antes que ele consuma o balde do GoTrue, nunca
-- substituir o rate limit do Auth.
-- =============================================================================

create table if not exists public.password_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  failures integer not null default 1 check (failures > 0),
  window_started_at timestamptz not null default now(),
  last_failure_at timestamptz not null default now()
);

comment on table public.password_attempts is
  'Falhas de conferência da senha atual por usuário (janela de 15 min, máximo 5). Acesso exclusivo da service role.';

-- GRANTs antes do ENABLE RLS, conforme padrão do projeto.
revoke all on public.password_attempts from anon, authenticated;
grant all on public.password_attempts to service_role;

alter table public.password_attempts enable row level security;

-- Sem policy: `anon` e `authenticated` não leem nem escrevem. A service role
-- ignora RLS e é o único caminho de escrita.

create or replace function public.register_password_failure(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_failures integer;
begin
  insert into public.password_attempts as pa (user_id, failures, window_started_at, last_failure_at)
  values (p_user_id, 1, now(), now())
  on conflict (user_id) do update
    set failures = case
          when pa.window_started_at < now() - interval '15 minutes' then 1
          else pa.failures + 1
        end,
        window_started_at = case
          when pa.window_started_at < now() - interval '15 minutes' then now()
          else pa.window_started_at
        end,
        last_failure_at = now()
  returning failures into v_failures;

  return v_failures;
end;
$$;

comment on function public.register_password_failure(uuid) is
  'Incrementa o contador de falhas do usuário; reinicia se a janela de 15 min expirou. Devolve o total na janela atual.';

revoke all on function public.register_password_failure(uuid) from public, anon, authenticated;
grant execute on function public.register_password_failure(uuid) to service_role;
