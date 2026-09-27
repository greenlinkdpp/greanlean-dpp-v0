begin;

drop trigger if exists role_seed_phase6b_connector_capabilities on public.role;
drop function if exists public.v2_phase6b_seed_connector_role_capabilities();

delete from public.role_capability binding
using public.greanlean_0033_role_capability_delta delta
where binding.role_id = delta.role_id
  and binding.capability_id = delta.capability_id;

drop table if exists public.greanlean_0033_role_capability_delta;
delete from public.greanlean_migration_ledger where migration_number = '0033';

commit;
