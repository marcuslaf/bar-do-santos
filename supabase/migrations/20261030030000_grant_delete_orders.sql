-- =============================================================================
-- Migration: 20261030030000_grant_delete_orders
-- Criada em: 2026-10-30
-- Propósito: Concede permissão DELETE na tabela orders para o role authenticated
-- =============================================================================

grant delete on public.orders to authenticated;

-- Recarrega o cache de schema do PostgREST
notify pgrst, 'reload schema';