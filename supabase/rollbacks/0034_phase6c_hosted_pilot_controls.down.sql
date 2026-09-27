begin;

delete from public.resolver_mapping
where host = 'greanlean-dpp-preprod.vercel.app';

delete from public.resolver_host_allowlist
where host = 'greanlean-dpp-preprod.vercel.app';

drop function if exists public.v2_phase6c_consume_public_rate_limit(text,text,integer,integer);
drop table if exists public.v2_public_rate_limit_counter;
delete from public.greanlean_migration_ledger where migration_number = '0034';

commit;
