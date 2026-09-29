begin;

do $$
begin
  if not exists (
    select 1 from public.greanlean_migration_ledger
    where migration_number = '0035' and result = 'applied'
  ) then
    raise exception '0036 requires migration 0035';
  end if;
end;
$$;

insert into public.capability (code, description, risk_class)
values
  ('platform.tenant.list', 'List active platform Tenants', 'READ'),
  ('platform.tenant.view', 'View Tenant configuration from the platform console', 'READ'),
  ('platform.tenant.create', 'Create a Tenant through an approved platform workflow', 'ADMIN'),
  ('platform.tenant.manage', 'Manage Tenant configuration and access', 'ADMIN'),
  ('platform.organisation.view', 'View Organisations across Tenants', 'READ'),
  ('platform.organisation.manage', 'Manage Organisations in an explicit Tenant context', 'ADMIN'),
  ('platform.product.view', 'View Product hierarchy records across Tenants', 'READ'),
  ('platform.product.manage', 'Manage Product hierarchy records in an explicit Tenant context', 'ADMIN'),
  ('platform.import.view', 'View import and mapping operations across Tenants', 'READ'),
  ('platform.import.manage', 'Run import and mapping operations in an explicit Tenant context', 'ADMIN'),
  ('platform.claim.view', 'View Canonical Claims across Tenants', 'READ'),
  ('platform.claim.manage', 'Manage Canonical Claims in an explicit Tenant context', 'ADMIN'),
  ('platform.dpp.view', 'View DPP workflow state across Tenants', 'READ'),
  ('platform.dpp.manage', 'Manage DPP drafts in an explicit Tenant context', 'ADMIN'),
  ('platform.dpp.review', 'Review DPP candidates in an explicit Tenant context', 'APPROVE'),
  ('platform.dpp.approve', 'Approve DPP candidates in an explicit Tenant context', 'APPROVE'),
  ('platform.dpp.publish', 'Publish DPP versions in an explicit Tenant context', 'PUBLISH'),
  ('platform.dpp.withdraw', 'Withdraw DPP versions in an explicit Tenant context', 'PUBLISH'),
  ('platform.resolver.view', 'View Identifier and Resolver state across Tenants', 'READ'),
  ('platform.resolver.manage', 'Manage Identifier and Resolver state in an explicit Tenant context', 'ADMIN'),
  ('platform.audit.view', 'View Tenant-scoped and platform audit activity', 'READ'),
  ('platform.operations.view', 'View platform integration and operating status', 'READ')
on conflict (code) do nothing;

insert into public.role (tenant_id, code, name, role_class, managed, status)
values (null, 'platform_operator', 'Platform Operator', 'PLATFORM', true, 'ACTIVE')
on conflict (tenant_id, code) do nothing;

insert into public.role_capability (role_id, capability_id)
select role.id, capability.id
from public.role role
cross join public.capability capability
where role.tenant_id is null
  and role.code = 'platform_operator'
  and role.role_class = 'PLATFORM'
  and capability.code like 'platform.%'
on conflict do nothing;

create table public.platform_role_assignment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  role_id uuid not null references public.role(id) on delete restrict,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  check (valid_until is null or valid_until > valid_from)
);

create table public.platform_operator_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  identity_context text not null check (identity_context = 'PLATFORM_OPERATOR'),
  platform_role text not null,
  platform_capability text not null,
  tenant_id uuid references public.tenant(id) on delete restrict,
  resource_type text not null,
  resource_id uuid,
  operation text not null,
  decision text not null check (decision in ('ALLOW', 'DENY')),
  reason_code text not null,
  correlation_id text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index platform_role_assignment_user_idx
  on public.platform_role_assignment(user_id, status, valid_until);
create index platform_operator_audit_tenant_time_idx
  on public.platform_operator_audit(tenant_id, created_at desc);
create index platform_operator_audit_actor_time_idx
  on public.platform_operator_audit(actor_user_id, created_at desc);

create or replace function public.v2_validate_platform_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.role
    where role.id = new.role_id
      and role.tenant_id is null
      and role.role_class = 'PLATFORM'
      and role.status = 'ACTIVE'
  ) then
    raise exception 'V2_PLATFORM_ROLE_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger platform_role_assignment_validate
before insert or update on public.platform_role_assignment
for each row execute function public.v2_validate_platform_role_assignment();

create trigger platform_role_assignment_touch_updated_at
before update on public.platform_role_assignment
for each row execute function public.v2_touch_updated_at();

create trigger platform_operator_audit_append_only
before update or delete on public.platform_operator_audit
for each row execute function public.v2_reject_audit_mutation();

insert into public.platform_role_assignment (user_id, role_id, status, valid_from)
select legacy.user_id, platform_role.id, 'ACTIVE', greatest(legacy.valid_from, now())
from public.dpp_user_membership legacy
join public.dpp_organisation organisation on organisation.id = legacy.organisation_id
cross join lateral (
  select id from public.role
  where tenant_id is null and code = 'platform_operator' and role_class = 'PLATFORM' and status = 'ACTIVE'
  limit 1
) platform_role
where legacy.role_code = 'platform_admin'
  and legacy.status = 'active'
  and legacy.valid_from <= now()
  and (legacy.valid_until is null or legacy.valid_until > now())
  and organisation.organisation_type = 'platform_operator'
  and organisation.verification_status = 'verified'
  and organisation.status = 'active'
on conflict (user_id) do nothing;

alter table public.platform_role_assignment enable row level security;
alter table public.platform_operator_audit enable row level security;

revoke all on public.platform_role_assignment from anon, authenticated;
revoke all on public.platform_operator_audit from anon, authenticated;
grant select, insert, update on public.platform_role_assignment to service_role;
grant select, insert on public.platform_operator_audit to service_role;

comment on table public.platform_role_assignment is
  'Explicit platform authority; never a Tenant membership and never a substitute for an active Tenant context.';
comment on table public.platform_operator_audit is
  'Append-only allow/deny audit for platform-operator reads, Tenant selection, and Tenant-scoped operations.';

insert into public.greanlean_migration_ledger(
  migration_number, migration_name, checksum_sha256, environment,
  applied_by, result, notes
)
values (
  '0036', 'v2_platform_operator_multitenant', null,
  'preproduction', 'codex', 'applied',
  'Add explicit capability-based Platform Operator authority, active-Tenant binding and append-only platform audit without creating Tenant memberships.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
