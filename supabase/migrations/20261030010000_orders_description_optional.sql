-- =============================================================================
-- Migration: 20261030010000_orders_description_optional
-- Criada em: 2026-10-30
-- Propósito: Torna o campo description (observações) opcional nas notas de
-- pedido, já que os itens agora carregam o conteúdo principal da nota.
-- Afeta: public.orders.description (not null -> nullable), constraint
-- orders_description_check (permite null ou texto 1-2000).
-- =============================================================================

-- -------------------------------------------------------
-- 1. Permitir description vazio/nulo em orders
-- -------------------------------------------------------
alter table public.orders alter column description drop not null;

-- Recriar a constraint permitindo null (texto 1-2000 quando preenchido).
do $$
begin
  alter table public.orders
    drop constraint orders_description_check;
exception
  when others then null;
end $$;

alter table public.orders
  add constraint orders_description_check
    check (description is null or char_length(btrim(description)) between 1 and 2000);

-- -------------------------------------------------------
-- 2. Recarrega o cache de schema do PostgREST
-- -------------------------------------------------------
notify pgrst, 'reload schema';
