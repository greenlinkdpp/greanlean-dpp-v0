begin;

create extension if not exists "pgcrypto";

create table public.tenant (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9-]{2,62}$'),
  name text not null,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  residency_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisation_v2 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  parent_organisation_id uuid,
  organisation_type text not null,
  legal_name text not null,
  trading_name text,
  country text,
  registration_identifier text,
  vat_number text,
  eori text,
  address jsonb not null default '{}'::jsonb,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (parent_organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id) on delete restrict
);

create table public.partner (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trading_name text,
  registration_identifier text,
  country text,
  partner_type text not null,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.capability (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  risk_class text not null
    check (risk_class in ('READ', 'WRITE', 'APPROVE', 'PUBLISH', 'ADMIN')),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'RETIRED')),
  created_at timestamptz not null default now()
);

create table public.permission_profile (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'RETIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenant(id) on delete restrict,
  code text not null,
  name text not null,
  role_class text not null
    check (role_class in ('PLATFORM', 'TENANT', 'PARTNER', 'INTEGRATION')),
  managed boolean not null default true,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'RETIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role_class = 'TENANT' and tenant_id is not null)
    or (role_class <> 'TENANT' and tenant_id is null)
  ),
  unique nulls not distinct (tenant_id, code),
  unique (id, tenant_id, role_class)
);

create table public.role_capability (
  role_id uuid not null references public.role(id) on delete cascade,
  capability_id uuid not null references public.capability(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (role_id, capability_id)
);

create table public.permission_profile_capability (
  permission_profile_id uuid not null references public.permission_profile(id) on delete cascade,
  capability_id uuid not null references public.capability(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (permission_profile_id, capability_id)
);

create table public.tenant_membership (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role_id uuid not null,
  role_class text generated always as ('TENANT') stored,
  status text not null default 'INVITED'
    check (status in ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (id, tenant_id),
  foreign key (role_id, tenant_id, role_class)
    references public.role(id, tenant_id, role_class) on delete restrict,
  check (valid_until is null or valid_until > valid_from)
);

-- This is an identity binding only, not a Partner membership/administration model.
create table public.partner_user_link (
  partner_id uuid not null references public.partner(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  created_at timestamptz not null default now(),
  primary key (partner_id, user_id)
);

create table public.partner_tenant_authorization (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner(id) on delete restrict,
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  permission_profile_id uuid not null references public.permission_profile(id) on delete restrict,
  scope jsonb not null default '{}'::jsonb,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED')),
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approval_evidence_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  check (valid_until is null or valid_until > valid_from),
  check (
    (status = 'ACTIVE' and approved_by is not null and approved_at is not null)
    or status <> 'ACTIVE'
  )
);

create table public.scope_grant (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  grantee_type text not null
    check (grantee_type in ('MEMBERSHIP', 'PARTNER_AUTHORIZATION', 'INTEGRATION')),
  grantee_id uuid not null,
  resource_type text not null,
  resource_id uuid,
  purpose text,
  effect text not null default 'ALLOW' check (effect in ('ALLOW', 'DENY')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  check (valid_until is null or valid_until > valid_from)
);

create table public.policy_decision_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenant(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('TENANT', 'PARTNER', 'PLATFORM', 'INTEGRATION', 'ANONYMOUS')),
  partner_id uuid references public.partner(id) on delete set null,
  capability_code text,
  resource_type text,
  resource_id uuid,
  purpose text,
  decision text not null check (decision in ('ALLOW', 'DENY')),
  reason_code text not null,
  effective_scope jsonb not null default '{}'::jsonb,
  policy_version text not null,
  correlation_id text not null,
  request_path text,
  created_at timestamptz not null default now()
);

create table public.legacy_entity_mapping (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  legacy_entity_type text not null,
  legacy_entity_id text not null,
  v2_entity_type text not null,
  v2_entity_id uuid,
  mapping_status text not null default 'PROPOSED'
    check (mapping_status in ('PROPOSED', 'CONFIRMED', 'AMBIGUOUS', 'QUARANTINED')),
  evidence jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, legacy_entity_type, legacy_entity_id)
);

create table public.v2_idempotency_record (
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  request_path text not null,
  idempotency_key text not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  primary key (tenant_id, actor_user_id, request_path, idempotency_key)
);

create index organisation_v2_tenant_idx on public.organisation_v2(tenant_id);
create index tenant_membership_user_idx on public.tenant_membership(user_id, tenant_id);
create index partner_user_link_user_idx on public.partner_user_link(user_id, partner_id);
create index partner_tenant_authorization_lookup_idx
  on public.partner_tenant_authorization(partner_id, tenant_id, status, valid_until);
create index scope_grant_lookup_idx
  on public.scope_grant(tenant_id, grantee_type, grantee_id, resource_type, resource_id);
create index policy_decision_audit_tenant_created_idx
  on public.policy_decision_audit(tenant_id, created_at desc);

create or replace function public.v2_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.v2_reject_tenant_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'V2_TENANT_ID_IMMUTABLE';
  end if;
  return new;
end;
$$;

create or replace function public.v2_reject_audit_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'V2_POLICY_AUDIT_APPEND_ONLY';
end;
$$;

create or replace function public.v2_validate_scope_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.grantee_type = 'MEMBERSHIP' and not exists (
    select 1 from public.tenant_membership membership
    where membership.id = new.grantee_id and membership.tenant_id = new.tenant_id
  ) then
    raise exception 'V2_SCOPE_MEMBERSHIP_TENANT_MISMATCH';
  elsif new.grantee_type = 'PARTNER_AUTHORIZATION' and not exists (
    select 1 from public.partner_tenant_authorization authz
    where authz.id = new.grantee_id and authz.tenant_id = new.tenant_id
  ) then
    raise exception 'V2_SCOPE_PARTNER_AUTHORIZATION_TENANT_MISMATCH';
  elsif new.grantee_type = 'INTEGRATION' then
    raise exception 'V2_SCOPE_INTEGRATION_NOT_ENABLED';
  end if;
  return new;
end;
$$;

create trigger tenant_touch_updated_at before update on public.tenant
for each row execute function public.v2_touch_updated_at();
create trigger organisation_v2_touch_updated_at before update on public.organisation_v2
for each row execute function public.v2_touch_updated_at();
create trigger partner_touch_updated_at before update on public.partner
for each row execute function public.v2_touch_updated_at();
create trigger permission_profile_touch_updated_at before update on public.permission_profile
for each row execute function public.v2_touch_updated_at();
create trigger role_touch_updated_at before update on public.role
for each row execute function public.v2_touch_updated_at();
create trigger tenant_membership_touch_updated_at before update on public.tenant_membership
for each row execute function public.v2_touch_updated_at();
create trigger partner_tenant_authorization_touch_updated_at
before update on public.partner_tenant_authorization
for each row execute function public.v2_touch_updated_at();
create trigger scope_grant_touch_updated_at before update on public.scope_grant
for each row execute function public.v2_touch_updated_at();
create trigger legacy_entity_mapping_touch_updated_at before update on public.legacy_entity_mapping
for each row execute function public.v2_touch_updated_at();

create trigger organisation_v2_tenant_immutable before update on public.organisation_v2
for each row execute function public.v2_reject_tenant_change();
create trigger tenant_membership_tenant_immutable before update on public.tenant_membership
for each row execute function public.v2_reject_tenant_change();
create trigger partner_tenant_authorization_tenant_immutable
before update on public.partner_tenant_authorization
for each row execute function public.v2_reject_tenant_change();
create trigger scope_grant_tenant_immutable before update on public.scope_grant
for each row execute function public.v2_reject_tenant_change();
create trigger scope_grant_validate before insert or update on public.scope_grant
for each row execute function public.v2_validate_scope_grant();
create trigger legacy_entity_mapping_tenant_immutable before update on public.legacy_entity_mapping
for each row execute function public.v2_reject_tenant_change();
create trigger policy_decision_audit_append_only
before update or delete on public.policy_decision_audit
for each row execute function public.v2_reject_audit_mutation();

insert into public.capability (code, description, risk_class)
values
  ('tenant.view', 'View tenant configuration', 'READ'),
  ('tenant.manage', 'Manage tenant configuration', 'ADMIN'),
  ('organisation.view', 'View tenant organisations', 'READ'),
  ('organisation.edit', 'Edit tenant organisations', 'WRITE'),
  ('membership.view', 'View tenant memberships', 'READ'),
  ('membership.manage', 'Manage tenant memberships', 'ADMIN'),
  ('partner.view', 'View partners and tenant bindings', 'READ'),
  ('partner.manage', 'Manage partner records', 'ADMIN'),
  ('partner_authorization.view', 'View partner authorizations', 'READ'),
  ('partner_authorization.propose', 'Propose partner authorization', 'WRITE'),
  ('partner_authorization.approve', 'Approve partner authorization', 'APPROVE'),
  ('partner_authorization.revoke', 'Revoke partner authorization', 'ADMIN'),
  ('product.view', 'View products', 'READ'),
  ('product.edit', 'Edit products', 'WRITE'),
  ('dpp.view', 'View DPP data', 'READ'),
  ('dpp.create', 'Create DPP drafts', 'WRITE'),
  ('dpp.edit', 'Edit DPP drafts', 'WRITE'),
  ('dpp.submit_review', 'Submit DPP review', 'WRITE'),
  ('dpp.review', 'Review DPP content', 'APPROVE'),
  ('dpp.approve', 'Approve DPP content', 'APPROVE'),
  ('dpp.reject', 'Reject DPP content', 'APPROVE'),
  ('dpp.publish', 'Publish DPP content', 'PUBLISH'),
  ('dpp.withdraw', 'Withdraw published DPP content', 'PUBLISH'),
  ('schema.view', 'View schema definitions', 'READ'),
  ('schema.manage', 'Manage schema definitions', 'ADMIN'),
  ('import.create', 'Create import jobs', 'WRITE'),
  ('import.commit', 'Commit import jobs', 'WRITE'),
  ('identifier.manage', 'Manage identifiers', 'ADMIN'),
  ('registry.view', 'View Registry state', 'READ'),
  ('registry.submit', 'Submit to Registry adapters', 'PUBLISH');

insert into public.permission_profile (code, name)
values
  ('PARTNER_CONSULTANT', 'Partner Consultant'),
  ('PARTNER_READ_ONLY', 'Partner Read Only');

insert into public.permission_profile_capability (permission_profile_id, capability_id)
select profile.id, capability.id
from public.permission_profile profile
join public.capability capability on capability.code = any (
  case profile.code
    when 'PARTNER_CONSULTANT' then array[
      'organisation.view', 'product.view', 'product.edit', 'dpp.view', 'dpp.edit',
      'dpp.submit_review', 'schema.view', 'import.create'
    ]::text[]
    when 'PARTNER_READ_ONLY' then array[
      'organisation.view', 'product.view', 'dpp.view', 'schema.view', 'registry.view'
    ]::text[]
    else array[]::text[]
  end
);

insert into public.role (tenant_id, code, name, role_class)
values
  (null, 'partner_consultant', 'Partner Consultant', 'PARTNER'),
  (null, 'integration_user', 'Integration User', 'INTEGRATION');

create or replace function public.v2_seed_tenant_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_record record;
begin
  insert into public.role (tenant_id, code, name, role_class)
  values
    (new.id, 'tenant_admin', 'Tenant Admin', 'TENANT'),
    (new.id, 'dpp_manager', 'DPP Manager', 'TENANT'),
    (new.id, 'reviewer', 'Reviewer', 'TENANT'),
    (new.id, 'publisher', 'Publisher', 'TENANT'),
    (new.id, 'read_only', 'Read Only', 'TENANT');

  for role_record in
    select id, code from public.role where tenant_id = new.id
  loop
    insert into public.role_capability (role_id, capability_id)
    select role_record.id, capability.id
    from public.capability capability
    where capability.code = any (
      case role_record.code
        when 'tenant_admin' then array[
          'tenant.view', 'tenant.manage', 'organisation.view', 'organisation.edit',
          'membership.view', 'membership.manage', 'partner.view', 'partner.manage',
          'partner_authorization.view', 'partner_authorization.propose',
          'partner_authorization.approve', 'partner_authorization.revoke',
          'product.view', 'product.edit', 'dpp.view', 'dpp.create', 'dpp.edit',
          'dpp.submit_review', 'dpp.review', 'dpp.approve', 'dpp.reject',
          'dpp.publish', 'dpp.withdraw', 'schema.view', 'schema.manage',
          'import.create', 'import.commit', 'identifier.manage', 'registry.view',
          'registry.submit'
        ]::text[]
        when 'dpp_manager' then array[
          'tenant.view', 'organisation.view', 'membership.view', 'partner.view',
          'partner_authorization.view', 'product.view', 'product.edit', 'dpp.view',
          'dpp.create', 'dpp.edit', 'dpp.submit_review', 'schema.view',
          'import.create', 'import.commit', 'registry.view'
        ]::text[]
        when 'reviewer' then array[
          'tenant.view', 'organisation.view', 'product.view', 'dpp.view',
          'dpp.review', 'dpp.approve', 'dpp.reject', 'schema.view', 'registry.view'
        ]::text[]
        when 'publisher' then array[
          'tenant.view', 'organisation.view', 'product.view', 'dpp.view',
          'dpp.approve', 'dpp.publish', 'dpp.withdraw', 'schema.view',
          'identifier.manage', 'registry.view', 'registry.submit'
        ]::text[]
        when 'read_only' then array[
          'tenant.view', 'organisation.view', 'membership.view', 'partner.view',
          'partner_authorization.view', 'product.view', 'dpp.view', 'schema.view',
          'registry.view'
        ]::text[]
        else array[]::text[]
      end
    );
  end loop;
  return new;
end;
$$;

create trigger tenant_seed_roles after insert on public.tenant
for each row execute function public.v2_seed_tenant_roles();

create or replace function public.v2_user_has_capability(
  target_tenant_id uuid,
  target_capability_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_membership membership
    join public.role on role.id = membership.role_id
      and role.tenant_id = membership.tenant_id
      and role.role_class = 'TENANT'
      and role.status = 'ACTIVE'
    join public.role_capability on role_capability.role_id = role.id
    join public.capability on capability.id = role_capability.capability_id
    where membership.user_id = auth.uid()
      and membership.tenant_id = target_tenant_id
      and membership.status = 'ACTIVE'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
      and capability.code = target_capability_code
      and capability.status = 'ACTIVE'
  );
$$;

create or replace function public.v2_user_has_partner_capability(
  target_tenant_id uuid,
  target_capability_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_user_link identity_link
    join public.partner on partner.id = identity_link.partner_id
      and partner.status = 'ACTIVE'
    join public.partner_tenant_authorization authz
      on authz.partner_id = partner.id
      and authz.tenant_id = target_tenant_id
      and authz.status = 'ACTIVE'
      and authz.valid_from <= now()
      and (authz.valid_until is null or authz.valid_until > now())
    join public.permission_profile_capability profile_capability
      on profile_capability.permission_profile_id = authz.permission_profile_id
    join public.capability on capability.id = profile_capability.capability_id
    where identity_link.user_id = auth.uid()
      and identity_link.status = 'ACTIVE'
      and capability.code = target_capability_code
      and capability.status = 'ACTIVE'
  );
$$;

create or replace function public.v2_user_has_partner_resource_capability(
  target_tenant_id uuid,
  target_capability_code text,
  target_resource_type text,
  target_resource_id uuid,
  target_purpose text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_user_link identity_link
    join public.partner on partner.id = identity_link.partner_id
      and partner.status = 'ACTIVE'
    join public.partner_tenant_authorization authz
      on authz.partner_id = partner.id
      and authz.tenant_id = target_tenant_id
      and authz.status = 'ACTIVE'
      and authz.valid_from <= now()
      and (authz.valid_until is null or authz.valid_until > now())
    join public.permission_profile_capability profile_capability
      on profile_capability.permission_profile_id = authz.permission_profile_id
    join public.capability on capability.id = profile_capability.capability_id
    join public.scope_grant allow_scope
      on allow_scope.tenant_id = authz.tenant_id
      and allow_scope.grantee_type = 'PARTNER_AUTHORIZATION'
      and allow_scope.grantee_id = authz.id
      and allow_scope.effect = 'ALLOW'
      and allow_scope.status = 'ACTIVE'
      and allow_scope.valid_from <= now()
      and (allow_scope.valid_until is null or allow_scope.valid_until > now())
      and allow_scope.resource_type = target_resource_type
      and (allow_scope.resource_id is null or allow_scope.resource_id = target_resource_id)
      and (allow_scope.purpose is null or allow_scope.purpose = target_purpose)
    where identity_link.user_id = auth.uid()
      and identity_link.status = 'ACTIVE'
      and capability.code = target_capability_code
      and capability.status = 'ACTIVE'
      and not exists (
        select 1
        from public.scope_grant deny_scope
        where deny_scope.tenant_id = authz.tenant_id
          and deny_scope.grantee_type = 'PARTNER_AUTHORIZATION'
          and deny_scope.grantee_id = authz.id
          and deny_scope.effect = 'DENY'
          and deny_scope.status = 'ACTIVE'
          and deny_scope.valid_from <= now()
          and (deny_scope.valid_until is null or deny_scope.valid_until > now())
          and deny_scope.resource_type = target_resource_type
          and (deny_scope.resource_id is null or deny_scope.resource_id = target_resource_id)
          and (deny_scope.purpose is null or deny_scope.purpose = target_purpose)
      )
  );
$$;

create or replace function public.v2_policy_allows(
  target_tenant_id uuid,
  target_capability_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.v2_user_has_capability(target_tenant_id, target_capability_code)
    or public.v2_user_has_partner_capability(target_tenant_id, target_capability_code);
$$;

revoke all on function public.v2_user_has_capability(uuid, text) from public;
revoke all on function public.v2_user_has_partner_capability(uuid, text) from public;
revoke all on function public.v2_user_has_partner_resource_capability(uuid, text, text, uuid, text) from public;
revoke all on function public.v2_policy_allows(uuid, text) from public;
grant execute on function public.v2_user_has_capability(uuid, text) to authenticated;
grant execute on function public.v2_user_has_partner_capability(uuid, text) to authenticated;
grant execute on function public.v2_user_has_partner_resource_capability(uuid, text, text, uuid, text) to authenticated;
grant execute on function public.v2_policy_allows(uuid, text) to authenticated;

alter table public.tenant enable row level security;
alter table public.organisation_v2 enable row level security;
alter table public.partner enable row level security;
alter table public.capability enable row level security;
alter table public.permission_profile enable row level security;
alter table public.role enable row level security;
alter table public.role_capability enable row level security;
alter table public.permission_profile_capability enable row level security;
alter table public.tenant_membership enable row level security;
alter table public.partner_user_link enable row level security;
alter table public.partner_tenant_authorization enable row level security;
alter table public.scope_grant enable row level security;
alter table public.policy_decision_audit enable row level security;
alter table public.legacy_entity_mapping enable row level security;
alter table public.v2_idempotency_record enable row level security;

create policy tenant_select on public.tenant for select to authenticated
using (public.v2_policy_allows(id, 'tenant.view'));
create policy tenant_update on public.tenant for update to authenticated
using (public.v2_user_has_capability(id, 'tenant.manage'))
with check (public.v2_user_has_capability(id, 'tenant.manage'));

create policy organisation_v2_select on public.organisation_v2 for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'organisation.view')
  or public.v2_user_has_partner_resource_capability(
    tenant_id,
    'organisation.view',
    'ORGANISATION',
    id,
    null
  )
);
create policy organisation_v2_insert on public.organisation_v2 for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'organisation.edit'));
create policy organisation_v2_update on public.organisation_v2 for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'organisation.edit'))
with check (public.v2_user_has_capability(tenant_id, 'organisation.edit'));

create policy tenant_membership_select on public.tenant_membership for select to authenticated
using (
  user_id = auth.uid()
  or public.v2_user_has_capability(tenant_id, 'membership.view')
);
create policy tenant_membership_write on public.tenant_membership for all to authenticated
using (public.v2_user_has_capability(tenant_id, 'membership.manage'))
with check (public.v2_user_has_capability(tenant_id, 'membership.manage'));

create policy role_select on public.role for select to authenticated
using (
  (tenant_id is not null and public.v2_policy_allows(tenant_id, 'membership.view'))
  or (tenant_id is null and role_class in ('PARTNER', 'INTEGRATION'))
);
create policy role_write on public.role for all to authenticated
using (tenant_id is not null and public.v2_user_has_capability(tenant_id, 'membership.manage'))
with check (tenant_id is not null and public.v2_user_has_capability(tenant_id, 'membership.manage'));

create policy capability_select on public.capability for select to authenticated using (true);
create policy role_capability_select on public.role_capability for select to authenticated
using (exists (
  select 1 from public.role
  where role.id = role_capability.role_id
    and role.tenant_id is not null
    and public.v2_policy_allows(role.tenant_id, 'membership.view')
));
create policy permission_profile_select on public.permission_profile for select to authenticated using (true);
create policy permission_profile_capability_select on public.permission_profile_capability
for select to authenticated using (true);

create policy partner_select on public.partner for select to authenticated
using (
  exists (
    select 1 from public.partner_user_link link
    where link.partner_id = partner.id and link.user_id = auth.uid() and link.status = 'ACTIVE'
  )
  or exists (
    select 1 from public.partner_tenant_authorization authz
    where authz.partner_id = partner.id
      and public.v2_user_has_capability(authz.tenant_id, 'partner.view')
  )
);
create policy partner_user_link_select on public.partner_user_link for select to authenticated
using (user_id = auth.uid());

create policy partner_authorization_select on public.partner_tenant_authorization
for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'partner_authorization.view')
  or exists (
    select 1 from public.partner_user_link link
    where link.partner_id = partner_tenant_authorization.partner_id
      and link.user_id = auth.uid()
      and link.status = 'ACTIVE'
  )
);
create policy partner_authorization_insert on public.partner_tenant_authorization
for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'partner_authorization.propose'));
create policy partner_authorization_update on public.partner_tenant_authorization
for update to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'partner_authorization.approve')
  or public.v2_user_has_capability(tenant_id, 'partner_authorization.revoke')
)
with check (
  public.v2_user_has_capability(tenant_id, 'partner_authorization.approve')
  or public.v2_user_has_capability(tenant_id, 'partner_authorization.revoke')
);

create policy scope_grant_select on public.scope_grant for select to authenticated
using (public.v2_policy_allows(tenant_id, 'partner_authorization.view'));
create policy scope_grant_write on public.scope_grant for all to authenticated
using (public.v2_user_has_capability(tenant_id, 'partner_authorization.approve'))
with check (public.v2_user_has_capability(tenant_id, 'partner_authorization.approve'));

create policy policy_decision_audit_select on public.policy_decision_audit for select to authenticated
using (tenant_id is not null and public.v2_user_has_capability(tenant_id, 'tenant.manage'));

create policy legacy_entity_mapping_select on public.legacy_entity_mapping for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'tenant.view'));
create policy legacy_entity_mapping_write on public.legacy_entity_mapping for all to authenticated
using (public.v2_user_has_capability(tenant_id, 'tenant.manage'))
with check (public.v2_user_has_capability(tenant_id, 'tenant.manage'));

revoke all on public.policy_decision_audit from anon, authenticated;
revoke all on public.v2_idempotency_record from anon, authenticated;

insert into public.greanlean_migration_ledger (
  migration_number,
  migration_name,
  checksum_sha256,
  environment,
  applied_by,
  result,
  notes
)
values (
  '0027',
  'v2_phase1_tenant_access_foundation',
  null,
  'development',
  'codex',
  'applied',
  'Additive V2 Phase 1 foundation; no V1 object changed.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
