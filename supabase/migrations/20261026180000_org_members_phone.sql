-- =============================================================================
-- Celular como identidade de acesso da equipe
--
-- O login continua sendo e-mail + senha no Supabase Auth, mas o e-mail é
-- sintético (`<digitos>@celular.local`) e derivado do celular. O dono cria o
-- acesso com senha temporária e informa apenas o número.
--
-- Formato de `phone`: somente dígitos, DDD incluso, sem +55.
--   10 dígitos: fixo      -> 1132345678
--   11 dígitos: celular   -> 11912345678
-- =============================================================================

alter table public.org_members add column if not exists phone text;

-- Garante o mesmo contrato da normalização feita em `lib/phone.ts`.
alter table public.org_members
  add constraint org_members_phone_format
  check (phone is null or phone ~ '^[0-9]{10,11}$');

-- Um mesmo número não pode aparecer duas vezes no bar.
create unique index if not exists org_members_org_phone_uidx
  on public.org_members (org_id, phone)
  where phone is not null;

comment on column public.org_members.phone is
  'Celular de acesso (somente dígitos, DDD incluso, sem +55). O e-mail do Auth é derivado: <phone>@celular.local.';
