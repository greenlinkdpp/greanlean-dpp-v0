begin;

do $$
begin
  if not exists (
    select 1 from public.greanlean_migration_ledger
    where migration_number = '0038' and result = 'applied'
  ) then
    raise exception '0039 requires migration 0038';
  end if;
end;
$$;

-- This was a one-time rollback aid for migration 0012.  It has no runtime,
-- foreign-key, view, or trigger consumers and must not remain client-exposed.
drop table if exists public.greanlean_0012_data_backup;

-- The platform route authorizes the caller before reaching this function. The
-- function itself re-reads the target and checks every tenant-scoped base
-- table atomically, so a stale browser view cannot bypass a new dependency.
create or replace function public.v2_delete_empty_archived_tenant(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_correlation_id text
)
returns table (deleted_tenant_id uuid, deleted_tenant_code text, deleted_role_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.tenant%rowtype;
  tenant_table record;
  dependency_count integer;
  removed_roles integer;
begin
  select * into target from public.tenant where id = p_tenant_id for update;
  if not found then
    raise exception 'TENANT_NOT_FOUND';
  end if;
  if target.status <> 'ARCHIVED' then
    raise exception 'TENANT_NOT_ARCHIVED';
  end if;
  if target.code = 'greanlean-reference-mobility' then
    raise exception 'TENANT_SYSTEM_REFERENCE_PROTECTED';
  end if;

  for tenant_table in
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'tenant_id'
      and table_name not in ('tenant', 'role', 'greanlean_migration_ledger')
    group by table_name
    order by table_name
  loop
    execute format('select count(*)::int from public.%I where tenant_id = $1', tenant_table.table_name)
      into dependency_count using p_tenant_id;
    if dependency_count > 0 then
      raise exception 'TENANT_DELETE_BLOCKED: % has % dependent rows', tenant_table.table_name, dependency_count;
    end if;
  end loop;

  select count(*)::int into removed_roles from public.role where tenant_id = p_tenant_id;
  delete from public.role where tenant_id = p_tenant_id;
  delete from public.tenant where id = p_tenant_id;

  insert into public.platform_operator_audit (
    actor_user_id, identity_context, platform_role, platform_capability,
    tenant_id, resource_type, resource_id, operation, decision, reason_code,
    correlation_id, safe_metadata
  ) values (
    p_actor_user_id, 'PLATFORM_OPERATOR', 'platform_operator', 'platform.tenant.manage',
    null, 'TENANT', p_tenant_id, 'platform.tenant.delete', 'ALLOW', 'ARCHIVED_EMPTY_TENANT_DELETED',
    p_correlation_id, jsonb_build_object('deletedTenantId', p_tenant_id, 'deletedTenantCode', target.code, 'deletedTenantRoleCount', removed_roles)
  );

  return query select p_tenant_id, target.code, removed_roles;
end;
$$;

revoke all on function public.v2_delete_empty_archived_tenant(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.v2_delete_empty_archived_tenant(uuid, uuid, text) to service_role;

insert into public.greanlean_migration_ledger(
  migration_number, migration_name, checksum_sha256, environment,
  applied_by, result, notes
)
values (
  '0039', 'round_d_security_operations_closeout', null,
  'preproduction', 'codex', 'applied',
  'Drop unused public 0012 backup table and add atomic archived-empty Tenant deletion with audit evidence.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
