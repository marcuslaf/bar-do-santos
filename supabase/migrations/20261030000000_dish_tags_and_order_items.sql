-- =============================================================================
-- Migration: 20261030000000_dish_tags_and_order_items
-- Criada em: 2026-10-30
-- Propósito: Tags de prato criadas pelo dono e itens de nota (um pedido pode
-- ter vários itens, cada um com seu prato, opção de baião e valor próprio).
-- Afeta: NEW public.dish_tags, public.order_items; ALTER public.orders.
-- =============================================================================

-- -------------------------------------------------------
-- 1. Tags de prato (criadas pelo dono)
-- -------------------------------------------------------
create table if not exists public.dish_tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint dish_tags_org_name_key unique (org_id, name),
  constraint dish_tags_name_check check (char_length(btrim(name)) between 1 and 60)
);

comment on table public.dish_tags is 'Tags de prato criadas pelo dono (ex.: frango frito, carne de sol).';

-- -------------------------------------------------------
-- 2. Itens de nota (um pedido pode ter vários itens)
-- -------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_name text not null,
  dish_tag_id uuid references public.dish_tags (id) on delete set null,
  baião_option text check (baião_option in ('com', 'sem')),
  unit_price_cents integer not null check (unit_price_cents >= 0 and unit_price_cents <= 10000000),
  created_at timestamptz not null default now()
);

comment on table public.order_items is 'Itens de uma nota: cada item tem seu próprio nome do cliente, prato, baião e valor.';
comment on column public.order_items.baião_option is 'Opção de baião para este item: com, sem ou não informado (null).';

-- -------------------------------------------------------
-- 3. Índices
-- -------------------------------------------------------
create index if not exists order_items_order_idx
  on public.order_items (order_id);

create index if not exists order_items_dish_tag_idx
  on public.order_items (dish_tag_id);

-- -------------------------------------------------------
-- 4. GRANTs (antes do ENABLE RLS)
-- -------------------------------------------------------
revoke all on public.dish_tags from anon, authenticated;
revoke all on public.order_items from anon, authenticated;

grant select on public.dish_tags to authenticated;
grant select, insert on public.dish_tags to authenticated;
grant update (name) on public.dish_tags to authenticated;

grant select on public.order_items to authenticated;
grant select, insert on public.order_items to authenticated;
grant update (item_name, dish_tag_id, baião_option, unit_price_cents) on public.order_items to authenticated;

grant all on public.dish_tags to service_role;
grant all on public.order_items to service_role;

-- -------------------------------------------------------
-- 5. RLS
-- -------------------------------------------------------
alter table public.dish_tags enable row level security;
alter table public.order_items enable row level security;

drop policy if exists dish_tags_select_org on public.dish_tags;
create policy dish_tags_select_org
  on public.dish_tags
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
  );

drop policy if exists dish_tags_insert_org on public.dish_tags;
create policy dish_tags_insert_org
  on public.dish_tags
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
  );

drop policy if exists dish_tags_update_org on public.dish_tags;
create policy dish_tags_update_org
  on public.dish_tags
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

drop policy if exists dish_tags_delete_org on public.dish_tags;
create policy dish_tags_delete_org
  on public.dish_tags
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
    and public.is_owner()
  );

drop policy if exists order_items_select_org on public.order_items;
create policy order_items_select_org
  on public.order_items
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and order_id in (
      select o.id from public.orders o where o.org_id = (select public.current_org_id())
    )
  );

drop policy if exists order_items_insert_org on public.order_items;
create policy order_items_insert_org
  on public.order_items
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and order_id in (
      select o.id from public.orders o where o.org_id = (select public.current_org_id())
    )
  );

drop policy if exists order_items_update_org on public.order_items;
create policy order_items_update_org
  on public.order_items
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and order_id in (
      select o.id from public.orders o where o.org_id = (select public.current_org_id())
    )
  )
  with check (
    (select auth.uid()) is not null
    and order_id in (
      select o.id from public.orders o where o.org_id = (select public.current_org_id())
    )
  );

drop policy if exists order_items_delete_org on public.order_items;
create policy order_items_delete_org
  on public.order_items
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and order_id in (
      select o.id from public.orders o where o.org_id = (select public.current_org_id())
    )
  );

-- -------------------------------------------------------
-- 6. Recarrega o cache de schema do PostgREST
-- -------------------------------------------------------
notify pgrst, 'reload schema';
