/*
  Migration: 20261026121000_realtime_broadcast
  Criada em: 2026-10-26
  Propósito: publicar INSERT/UPDATE de orders em canal privado 'orders:<org_id>'
             e autorizar membros do org a receber esses broadcasts.
  Afeta: NEW função public.orders_broadcast_changes, trigger em public.orders,
         policy em realtime.messages.
  Referências: https://supabase.com/docs/guides/realtime/broadcast
               https://supabase.com/docs/guides/realtime/authorization
*/

-- =============================================================================
-- 1. Trigger function de broadcast
-- =============================================================================
-- Assinatura oficial de realtime.broadcast_changes (posicional, 7 argumentos):
--   (topic, event, operation, table_name, table_schema, new, old)
-- broadcast_changes SEMPRE publica em canal privado (não há parâmetro private),
-- então o cliente precisa assinar com { config: { private: true } } e chamar
-- supabase.realtime.setAuth() antes do subscribe.
create or replace function public.orders_broadcast_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_op text := tg_op;
begin
  perform realtime.broadcast_changes(
    'orders:' || new.org_id::text,  -- tópico por organização
    v_op,                           -- evento: 'INSERT' | 'UPDATE'
    v_op,                           -- operação (payload.type)
    tg_table_name,
    tg_table_schema,
    new,
    old
  );

  return null;
exception
  when others then
    -- Realtime é best-effort: perder uma notificação é aceitável, perder a nota não.
    -- Sem este bloco, uma indisponibilidade do Realtime abortaria a escrita.
    raise warning 'Falha ao publicar broadcast de orders (%) : %', v_op, sqlerrm;
    return null;
end;
$$;

drop trigger if exists orders_broadcast_changes on public.orders;
create trigger orders_broadcast_changes
  after insert or update
  on public.orders
  for each row
  execute function public.orders_broadcast_changes();

-- =============================================================================
-- 2. Autorização do canal
-- =============================================================================
-- NUNCA rodar "alter table realtime.messages enable row level security":
-- a tabela pertence ao serviço Realtime e o comando falha com
-- "42501 must be owner of table messages", abortando a migration inteira.
--
-- Regras:
--   - só 'authenticated' recebe (canal privado);
--   - só tópicos 'orders:<uuid>';
--   - e apenas se o uuid for o org ativo do usuário.
-- Não há policy de INSERT: nenhum cliente publica nesse tópico, só o trigger.
drop policy if exists orders_broadcast_read on realtime.messages;
create policy orders_broadcast_read
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) like 'orders:%'
    and exists (
      select 1
      from public.org_members m
      where m.user_id = (select auth.uid())
        and m.active
        and 'orders:' || m.org_id::text = (select realtime.topic())
    )
  );

revoke all on function public.orders_broadcast_changes() from public;
grant execute on function public.orders_broadcast_changes() to service_role;
