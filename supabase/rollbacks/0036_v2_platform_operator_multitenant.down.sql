begin;

drop trigger if exists platform_operator_audit_append_only on public.platform_operator_audit;
drop trigger if exists platform_role_assignment_touch_updated_at on public.platform_role_assignment;
drop trigger if exists platform_role_assignment_validate on public.platform_role_assignment;
drop function if exists public.v2_validate_platform_role_assignment();
drop table if exists public.platform_operator_audit;
drop table if exists public.platform_role_assignment;

delete from public.role_capability
where role_id in (
  select id from public.role
  where tenant_id is null and code = 'platform_operator' and role_class = 'PLATFORM'
);
delete from public.role
where tenant_id is null and code = 'platform_operator' and role_class = 'PLATFORM';
delete from public.capability where code like 'platform.%';
delete from public.greanlean_migration_ledger where migration_number = '0036';

commit;
