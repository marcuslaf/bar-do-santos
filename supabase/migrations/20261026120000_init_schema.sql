/*
  Migration: 20261026120000_init_schema
  Criada em: 2026-10-26
  Propósito: schema base do bloco de notas — organizações, equipe, notas,
             trilha de auditoria, view de leitura, RLS e RPCs.
  Afeta: NEW public.orgs, public.org_members, public.orders, public.order_events,
         public.orders_view, funções e policies.
  Ordem obrigatória: enums -> orgs -> org_members -> helpers -> orders -> order_events.
                     (orders.org_id usa public.current_org_id() como DEFAULT, então
                      os helpers precisam existir antes da tabela.)
*/

-- =============================================================================
-- 1. Enums
-- =============================================================================
-- create type não tem "if not exists"; o bloco garante reexecução segura.
do $$
begin
  create type public.member_role as enum ('owner', 'staff');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum ('aberto', 'entregue', 'pago', 'cancelado');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('dinheiro', 'pix', 'credito', 'debito', 'outro');
exception
  when duplicate_object then null;
end $$;

-- =============================================================================
-- 2. Organizações
-- =============================================================================
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Sao_Paulo',
  day_cutoff_hour smallint not null default 4,
  created_at timestamptz not null default now(),
  constraint orgs_day_cutoff_hour_check check (day_cutoff_hour between 0 and 23)
);

comment on column public.orgs.day_cutoff_hour is
  'Hora local (0-23) em que o dia operacional vira. Notas criadas antes desse horário pertencem ao dia anterior.';

-- =============================================================================
-- 3. Vínculo usuário <-> organização (equipe)
-- =============================================================================
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'staff',
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint org_members_org_user_key unique (org_id, user_id),
  constraint org_members_display_name_check check (char_length(btrim(display_name)) between 1 and 60)
);

comment on column public.org_members.active is
  'Desligamento é soft delete: preserva o histórico (author_name das notas antigas).';

-- =============================================================================
-- 4. Helpers de tenancy
-- =============================================================================
-- Todos SECURITY DEFINER com search_path = '' para:
--   (a) não recursar nas policies de org_members;
--   (b) não depender do search_path de quem chama (inclusive PostgREST).
-- O app é single-org; se um usuário tiver mais de um vínculo, escolhemos o mais
-- antigo para manter o DEFAULT de orders.org_id determinístico.
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id
  from public.org_members m
  where m.user_id = auth.uid()
    and m.active
  order by m.created_at asc, m.id asc
  limit 1;
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.org_members m
    where m.user_id = auth.uid()
      and m.org_id = public.current_org_id()
      and m.role = 'owner'
      and m.active
  );
$$;

-- Dia operacional de QUALQUER org em QUALQUER instante.
-- Regra: (instante - cutoff horas) convertido para o fuso do org, depois ::date.
-- Ex.: cutoff 4, 27/10 02:00 BRT -> 26/10 22:00 BRT -> 2026-10-26.
create or replace function public.business_day_for(p_org_id uuid, p_at timestamptz default now())
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (
    (p_at - make_interval(hours => o.day_cutoff_hour::int))
    at time zone o.timezone
  )::date
  from public.orgs o
  where o.id = p_org_id;
$$;

-- Contrato consumido pelo app: supabase.rpc("current_business_day").
create or replace function public.current_business_day()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select public.business_day_for(public.current_org_id(), now());
$$;

-- =============================================================================
-- 5. Notas
-- =============================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org_id() references public.orgs (id) on delete cascade,
  customer_name text not null,
  description text not null,
  status public.order_status not null default 'aberto',
  total_cents integer,
  payment_method public.payment_method,
  -- Sem ON DELETE: apagar usuário com histórico quebraria a auditoria.
  -- Desligamento de equipe é active = false (org_members).
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz,
  paid_at timestamptz,
  paid_by uuid references auth.users (id),
  canceled_at timestamptz,
  canceled_by uuid references auth.users (id),
  cancel_reason text,
  -- Preenchido SEMPRE pelo trigger BEFORE; o cliente nunca escolhe o dia.
  day_key date not null,
  constraint orders_customer_name_check check (char_length(btrim(customer_name)) between 1 and 80),
  constraint orders_description_check check (char_length(btrim(description)) between 1 and 2000),
  constraint orders_total_cents_check check (total_cents is null or (total_cents >= 0 and total_cents <= 10000000)),
  -- Invariantes redundantes ao trigger: barram escrita direta via service role.
  constraint orders_paid_requires_payment_check check (
    status <> 'pago' or (total_cents is not null and payment_method is not null)
  ),
  constraint orders_canceled_requires_reason_check check (
    status <> 'cancelado' or (cancel_reason is not null and char_length(btrim(cancel_reason)) >= 3)
  ),
  constraint orders_cancel_reason_length_check check (
    cancel_reason is null or char_length(cancel_reason) <= 300
  )
);

comment on column public.orders.day_key is
  'Dia operacional (orgs.timezone + orgs.day_cutoff_hour). Imutável após o INSERT.';
comment on column public.orders.status is
  'pago e cancelado são terminais: nenhum UPDATE é aceito depois deles.';

-- =============================================================================
-- 6. Trilha de auditoria (append-only)
-- =============================================================================
create table if not exists public.order_events (
  id bigserial primary key,
  org_id uuid not null references public.orgs (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  actor_id uuid references auth.users (id),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint order_events_event_check check (
    event in ('created', 'updated', 'delivered', 'paid', 'canceled')
  )
);

comment on table public.order_events is
  'Append-only. Escrita exclusivamente pelo trigger orders_record_event (SECURITY DEFINER).';

-- =============================================================================
-- 7. Índices
-- =============================================================================
create index if not exists org_members_user_id_idx
  on public.org_members (user_id);

create index if not exists orders_org_day_created_idx
  on public.orders (org_id, day_key, created_at desc);

-- Caminho quente da tela inicial: notas ainda em aberto no dia.
create index if not exists orders_org_open_idx
  on public.orders (org_id, day_key, created_at desc)
  where status in ('aberto', 'entregue');

create index if not exists order_events_org_created_idx
  on public.order_events (org_id, created_at desc);

create index if not exists order_events_order_idx
  on public.order_events (order_id);

-- =============================================================================
-- 8. View de leitura usada pelo app (select("*") -> tipo Order)
-- =============================================================================
-- security_invoker = true: RLS de orders e org_members é aplicada como o usuário
-- que consulta, não como o dono da view. Sem isso a view vazaria entre orgs.
create or replace view public.orders_view
with (security_invoker = true)
as
select
  o.id,
  o.org_id,
  o.customer_name,
  o.description,
  o.status,
  o.total_cents,
  o.payment_method,
  o.created_by,
  o.created_at,
  o.updated_at,
  o.delivered_at,
  o.paid_at,
  o.paid_by,
  o.canceled_at,
  o.canceled_by,
  o.cancel_reason,
  o.day_key,
  author.display_name as author_name,
  payer.display_name as payer_name,
  canceller.display_name as canceller_name
from public.orders o
left join public.org_members author
  on author.org_id = o.org_id and author.user_id = o.created_by
left join public.org_members payer
  on payer.org_id = o.org_id and payer.user_id = o.paid_by
left join public.org_members canceller
  on canceller.org_id = o.org_id and canceller.user_id = o.canceled_by;

-- =============================================================================
-- 9. GRANTs (antes do ENABLE RLS, conforme padrão do projeto)
-- =============================================================================
-- O Supabase concede ALL por default em tabelas novas do schema public;
-- revogamos primeiro para deixar o privilégio explícito e mínimo.
revoke all on public.orgs from anon, authenticated;
revoke all on public.org_members from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_events from anon, authenticated;
revoke all on public.orders_view from anon, authenticated;
revoke all on sequence public.order_events_id_seq from anon, authenticated;

grant select on public.orgs to authenticated;
grant select on public.org_members to authenticated;
grant select on public.orders_view to authenticated;

grant select, insert on public.orders to authenticated;
-- Colunas mutáveis pelo app. paid_*, canceled_*, day_key, org_id e created_by
-- ficam fora do GRANT: tentativa de escrevê-las falha com 42501 antes do trigger.
grant update (customer_name, description, status, total_cents, payment_method, cancel_reason)
  on public.orders to authenticated;

grant select on public.order_events to authenticated;

grant all on public.orgs to service_role;
grant all on public.org_members to service_role;
grant all on public.orders to service_role;
grant all on public.order_events to service_role;
grant all on public.orders_view to service_role;
grant usage, select on sequence public.order_events_id_seq to service_role;

-- =============================================================================
-- 10. RLS
-- =============================================================================
alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;

-- orgs: cada usuário enxerga apenas o próprio restaurante.
drop policy if exists orgs_select_own on public.orgs;
create policy orgs_select_own
  on public.orgs
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and id = (select public.current_org_id())
  );

-- org_members: membros ativos enxergam a equipe do próprio org (tela /equipe).
-- INSERT/UPDATE/DELETE não têm policy: são feitos com service role em Server Actions.
drop policy if exists org_members_select_org on public.org_members;
create policy org_members_select_org
  on public.org_members
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
  );

-- orders: membros ativos leem/escrevem o próprio org. ZERO policy de DELETE.
drop policy if exists orders_select_org on public.orders;
create policy orders_select_org
  on public.orders
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
  );

drop policy if exists orders_insert_org on public.orders;
create policy orders_insert_org
  on public.orders
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
    and created_by = (select auth.uid())
  );

drop policy if exists orders_update_org on public.orders;
create policy orders_update_org
  on public.orders
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
  )
  with check (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
  );

-- order_events: leitura para membros; escrita só pelo trigger (nenhuma policy
-- de INSERT/UPDATE/DELETE e nenhum GRANT correspondente).
drop policy if exists order_events_select_org on public.order_events;
create policy order_events_select_org
  on public.order_events
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
  );

-- =============================================================================
-- 11. Trigger BEFORE: regras de negócio, carimbos e imutabilidade
-- =============================================================================
create or replace function public.orders_enforce_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_org_id uuid;
  v_day date;
begin
  if tg_op = 'INSERT' then
    v_org_id := public.current_org_id();

    -- Força o org do usuário. Só um contexto sem JWT (service role/ops) pode
    -- informar org_id explicitamente; nesse caso o RLS não se aplica de todo modo.
    if v_org_id is not null then
      new.org_id := v_org_id;
    elsif new.org_id is null then
      raise exception 'Você não tem acesso a este restaurante.';
    end if;

    if v_uid is not null then
      new.created_by := v_uid;
    elsif new.created_by is null then
      raise exception 'Sessão inválida. Entre novamente.';
    end if;

    v_day := public.business_day_for(new.org_id, v_now);
    if v_day is null then
      raise exception 'Restaurante não encontrado.';
    end if;

    new.day_key := v_day;
    new.status := 'aberto';
    new.created_at := v_now;
    new.updated_at := v_now;
    new.delivered_at := null;
    new.paid_at := null;
    new.paid_by := null;
    new.payment_method := null;
    new.canceled_at := null;
    new.canceled_by := null;
    new.cancel_reason := null;

    return new;
  end if;

  -- ---------------------------- UPDATE ----------------------------
  -- Estados terminais: nada é editável depois de pago ou cancelado.
  if old.status in ('pago', 'cancelado') then
    raise exception 'Esta nota já foi finalizada e não pode ser alterada.';
  end if;

  -- Campos imutáveis: o valor enviado pelo cliente é silenciosamente ignorado.
  new.org_id := old.org_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.day_key := old.day_key;
  new.updated_at := v_now;

  -- Carimbos são herdados; só o carimbo do NOVO estado é sobrescrito.
  new.delivered_at := old.delivered_at;
  new.paid_at := old.paid_at;
  new.paid_by := old.paid_by;
  new.canceled_at := old.canceled_at;
  new.canceled_by := old.canceled_by;

  if new.status is distinct from old.status then
    if new.status = 'entregue' then
      if old.status <> 'aberto' then
        raise exception 'Transição de status inválida.';
      end if;
      new.delivered_at := v_now;

    elsif new.status = 'pago' then
      if old.status not in ('aberto', 'entregue') then
        raise exception 'Transição de status inválida.';
      end if;
      -- Mesma mensagem exata consumida pelo app (error.code = P0001).
      if new.total_cents is null or new.payment_method is null then
        raise exception 'Informe o valor e a forma de pagamento.';
      end if;
      new.paid_at := v_now;
      new.paid_by := v_uid;

    elsif new.status = 'cancelado' then
      if old.status not in ('aberto', 'entregue') then
        raise exception 'Transição de status inválida.';
      end if;
      -- Autorização antes de validação: não vaza regra para quem não pode cancelar.
      if not public.is_owner() then
        raise exception 'Somente o dono pode cancelar uma nota.';
      end if;
      if new.cancel_reason is null or length(btrim(new.cancel_reason)) < 3 then
        raise exception 'Descreva o motivo do cancelamento.';
      end if;
      new.cancel_reason := btrim(new.cancel_reason);
      new.canceled_at := v_now;
      new.canceled_by := v_uid;

    else
      -- 'aberto' como destino = reabertura; não existe no fluxo.
      raise exception 'Transição de status inválida.';
    end if;
  end if;

  -- Normalização: esses campos só fazem sentido no estado correspondente.
  if new.status <> 'cancelado' then
    new.cancel_reason := null;
  end if;
  if new.status <> 'pago' then
    new.payment_method := null;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_rules on public.orders;
create trigger orders_enforce_rules
  before insert or update
  on public.orders
  for each row
  execute function public.orders_enforce_rules();

-- =============================================================================
-- 12. Trigger AFTER: trilha de auditoria
-- =============================================================================
create or replace function public.orders_record_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event text;
  v_payload jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_new jsonb;
  v_old jsonb;
  v_key text;
begin
  if tg_op = 'INSERT' then
    v_event := 'created';
    -- Snapshot da linha; updated_at não agrega nada.
    v_payload := to_jsonb(new) - 'updated_at';
  else
    v_new := to_jsonb(new);
    v_old := to_jsonb(old);

    -- Diff campo a campo: { "status": { "old": "aberto", "new": "entregue" } }
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> 'updated_at'
         and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changes := v_changes || jsonb_build_object(
          v_key,
          jsonb_build_object(
            'old', v_old -> v_key,
            'new', v_new -> v_key
          )
        );
      end if;
    end loop;

    if new.status is distinct from old.status then
      v_event := case new.status
        when 'entregue' then 'delivered'
        when 'pago' then 'paid'
        when 'cancelado' then 'canceled'
        else 'updated'
      end;
      v_payload := jsonb_build_object(
        'from', old.status,
        'to', new.status,
        'changes', v_changes
      );
    else
      -- UPDATE sem mudança real não polui a trilha.
      if v_changes = '{}'::jsonb then
        return null;
      end if;
      v_event := 'updated';
      v_payload := jsonb_build_object('changes', v_changes);
    end if;
  end if;

  insert into public.order_events (org_id, order_id, actor_id, event, payload)
  values (new.org_id, new.id, auth.uid(), v_event, v_payload);

  return null;
end;
$$;

drop trigger if exists orders_record_event on public.orders;
create trigger orders_record_event
  after insert or update
  on public.orders
  for each row
  execute function public.orders_record_event();

-- =============================================================================
-- 13. Arranque do dono (passo manual, uma vez)
-- =============================================================================
create or replace function public.bootstrap_owner(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user_id uuid;
  v_display_name text;
  v_org_id uuid;
begin
  if v_email = '' then
    raise exception 'Informe o e-mail do dono.';
  end if;

  select
    u.id,
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Dono'
    )
    into v_user_id, v_display_name
  from auth.users u
  where lower(u.email) = v_email;

  if v_user_id is null then
    raise exception 'Nenhum usuário com o e-mail %. Crie o usuário em Authentication > Users antes do bootstrap.', v_email;
  end if;

  select o.id into v_org_id
  from public.orgs o
  order by o.created_at asc
  limit 1;

  if v_org_id is null then
    raise exception 'Nenhum restaurante cadastrado. Rode o seed (supabase/seed.sql) antes do bootstrap.';
  end if;

  insert into public.org_members (org_id, user_id, role, display_name)
  values (v_org_id, v_user_id, 'owner', left(v_display_name, 60))
  on conflict (org_id, user_id) do update
    set role = 'owner',
        active = true;

  return v_org_id;
end;
$$;

-- =============================================================================
-- 14. Privilégios de execução das funções
-- =============================================================================
-- Por padrão toda função nasce com EXECUTE para PUBLIC. Fechamos e concedemos
-- só o necessário. Trigger function não precisa de EXECUTE do invocador
-- (o privilégio é checado na criação do trigger).
revoke all on function public.current_org_id() from public;
revoke all on function public.is_owner() from public;
revoke all on function public.business_day_for(uuid, timestamptz) from public;
revoke all on function public.current_business_day() from public;
revoke all on function public.orders_enforce_rules() from public;
revoke all on function public.orders_record_event() from public;
revoke all on function public.bootstrap_owner(text) from public, anon, authenticated;

grant execute on function public.current_org_id() to authenticated, service_role;
grant execute on function public.is_owner() to authenticated, service_role;
grant execute on function public.current_business_day() to authenticated, service_role;
grant execute on function public.business_day_for(uuid, timestamptz) to service_role;
grant execute on function public.orders_enforce_rules() to service_role;
grant execute on function public.orders_record_event() to service_role;
grant execute on function public.bootstrap_owner(text) to service_role;

-- =============================================================================
-- 15. Recarrega o cache de schema do PostgREST
-- =============================================================================
notify pgrst, 'reload schema';
