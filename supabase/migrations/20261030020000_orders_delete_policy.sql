-- =============================================================================
-- Migration: 20261030020000_orders_delete_policy
-- Criada em: 2026-10-30
-- Propósito: Adiciona policy DELETE para o dono na tabela orders.
--   Permite que o dono exclua notas da própria organização.
-- =============================================================================

-- -------------------------------------------------------
-- Policy DELETE para o dono
-- -------------------------------------------------------
drop policy if exists orders_delete_org on public.orders;
create policy orders_delete_org
  on public.orders
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and org_id = (select public.current_org_id())
    and public.is_owner()
  );

-- -------------------------------------------------------
-- Recarrega o cache de schema do PostgREST
-- -------------------------------------------------------
notify pgrst, 'reload schema';