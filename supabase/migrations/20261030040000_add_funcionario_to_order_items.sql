-- =============================================================================
-- Migration: 20261030040000_add_funcionario_to_order_items
-- Criada em: 2026-10-30
-- Propósito: Adiciona coluna funcionario na tabela order_items
-- =============================================================================

-- Adiciona coluna funcionario (nome do funcionário que fez o pedido)
alter table public.order_items
  add column if not exists funcionario text;

-- Comentário
comment on column public.order_items.funcionario is
  'Nome do funcionário que fez o pedido/item.';

-- Índice para consultas por funcionário
create index if not exists order_items_funcionario_idx
  on public.order_items (funcionario)
  where funcionario is not null;

-- Recarrega o cache de schema do PostgREST
notify pgrst, 'reload schema';