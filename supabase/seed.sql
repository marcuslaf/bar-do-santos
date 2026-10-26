-- =============================================================================
-- seed.sql — arranque idempotente (roda em supabase db reset)
-- =============================================================================
-- Um único bar. O app é single-org: orgs extras não são suportadas
-- pela UI, e public.current_org_id() escolhe o vínculo mais antigo do usuário.
insert into public.orgs (name, timezone, day_cutoff_hour)
select 'Bar do Santos', 'America/Sao_Paulo', 4
where not exists (
  select 1 from public.orgs where name = 'Bar do Santos'
);

-- O dono NÃO é criado aqui: depende de um usuário real em auth.users.
-- Passo manual (o e-mail é sintético, derivado do celular):
--   select public.bootstrap_owner('11999990001@celular.local');
