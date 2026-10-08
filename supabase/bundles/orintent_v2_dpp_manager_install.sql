-- Upgrade the existing Orintent pilot account from the legacy four-product
-- workspace to the V2 GreanLean Reference Mobility workspace.
-- DPP Manager may view/edit/import/submit for review, but cannot approve,
-- publish, withdraw, or administer Tenant membership.

begin;

do $$
declare
  target_user_id uuid;
  target_tenant_id uuid;
  target_role_id uuid;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = 'orintent@greanlean.com'
  limit 1;

  if target_user_id is null then
    raise exception 'ORINTENT_AUTH_USER_NOT_FOUND';
  end if;

  select id into target_tenant_id
  from public.tenant
  where code = 'greanlean-reference-mobility'
    and status = 'ACTIVE'
  limit 1;

  if target_tenant_id is null then
    raise exception 'ORINTENT_V2_TENANT_NOT_FOUND';
  end if;

  select id into target_role_id
  from public.role
  where tenant_id = target_tenant_id
    and code = 'dpp_manager'
    and role_class = 'TENANT'
    and status = 'ACTIVE'
  limit 1;

  if target_role_id is null then
    raise exception 'ORINTENT_V2_DPP_MANAGER_ROLE_NOT_FOUND';
  end if;

  insert into public.tenant_membership (
    tenant_id,
    user_id,
    role_id,
    status,
    valid_from,
    valid_until
  ) values (
    target_tenant_id,
    target_user_id,
    target_role_id,
    'ACTIVE',
    now(),
    null
  )
  on conflict (tenant_id, user_id)
  do update set
    role_id = excluded.role_id,
    status = 'ACTIVE',
    valid_from = now(),
    valid_until = null,
    updated_at = now();
end;
$$;

commit;

