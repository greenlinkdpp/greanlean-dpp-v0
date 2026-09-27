begin;

create table public.product_family (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  code text not null check (code ~ '^[a-z][a-z0-9._-]{1,62}$'),
  name text not null,
  description text,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (id, tenant_id)
);

create table public.product_model (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  family_id uuid,
  manufacturer_organisation_id uuid,
  model_code text not null,
  name text not null,
  description text,
  product_category text not null,
  sector text,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, model_code),
  unique (id, tenant_id),
  constraint product_model_family_tenant_fk foreign key (family_id, tenant_id)
    references public.product_family(id, tenant_id) on delete restrict,
  constraint product_model_manufacturer_tenant_fk foreign key (manufacturer_organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id) on delete restrict
);

create table public.sku (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  model_id uuid not null,
  sku_code text not null,
  name text not null,
  market text,
  configuration_json jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, sku_code),
  unique (id, tenant_id, model_id),
  constraint sku_model_tenant_fk foreign key (model_id, tenant_id)
    references public.product_model(id, tenant_id) on delete restrict
);

create table public.product_batch (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  model_id uuid not null,
  batch_number text not null,
  manufacturing_organisation_id uuid,
  production_date date,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, model_id, batch_number),
  unique (id, tenant_id, model_id),
  constraint product_batch_model_tenant_fk foreign key (model_id, tenant_id)
    references public.product_model(id, tenant_id) on delete restrict,
  constraint product_batch_manufacturer_tenant_fk foreign key (manufacturing_organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id) on delete restrict
);

create table public.batch_sku_link (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  model_id uuid not null,
  batch_id uuid not null,
  sku_id uuid not null,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (tenant_id, batch_id, sku_id),
  unique (id, tenant_id),
  constraint batch_sku_link_batch_model_tenant_fk foreign key (batch_id, tenant_id, model_id)
    references public.product_batch(id, tenant_id, model_id) on delete restrict,
  constraint batch_sku_link_sku_model_tenant_fk foreign key (sku_id, tenant_id, model_id)
    references public.sku(id, tenant_id, model_id) on delete restrict,
  check (valid_until is null or valid_until > valid_from)
);

create table public.product_item (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  model_id uuid not null,
  sku_id uuid,
  batch_id uuid,
  serial_number text,
  upi text,
  enforce_batch_sku_link boolean not null default true,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (id, tenant_id, model_id),
  constraint product_item_model_tenant_fk foreign key (model_id, tenant_id)
    references public.product_model(id, tenant_id) on delete restrict,
  constraint product_item_sku_model_tenant_fk foreign key (sku_id, tenant_id, model_id)
    references public.sku(id, tenant_id, model_id) on delete restrict,
  constraint product_item_batch_model_tenant_fk foreign key (batch_id, tenant_id, model_id)
    references public.product_batch(id, tenant_id, model_id) on delete restrict,
  check (upi is null or upi ~ '^https://')
);

create table public.product_subject_identifier (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  subject_type text not null
    check (subject_type in ('FAMILY', 'MODEL', 'SKU', 'BATCH', 'ITEM', 'PASSPORT')),
  subject_id uuid not null,
  identifier_type text not null
    check (identifier_type in (
      'INTERNAL', 'MODEL_CODE', 'SKU', 'GTIN', 'BATCH_NUMBER',
      'SERIAL_NUMBER', 'UPI', 'DPP_ID', 'REGISTRY_ID', 'CREDENTIAL_ID'
    )),
  value text not null,
  normalized_value text not null,
  issuer text not null default '',
  scheme text not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_primary boolean not null default false,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'RETIRED')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (id, tenant_id),
  check (valid_until is null or valid_until > valid_from),
  check (identifier_type not in ('DPP_ID', 'REGISTRY_ID', 'CREDENTIAL_ID'))
);

create unique index product_identifier_tenant_active_unique
  on public.product_subject_identifier (
    tenant_id, identifier_type, scheme, issuer, normalized_value
  )
  where status = 'ACTIVE' and identifier_type not in ('GTIN', 'UPI');

create unique index product_identifier_global_active_unique
  on public.product_subject_identifier (
    identifier_type, scheme, issuer, normalized_value
  )
  where status = 'ACTIVE' and identifier_type in ('GTIN', 'UPI');

create unique index product_identifier_primary_active_unique
  on public.product_subject_identifier (
    tenant_id, subject_type, subject_id, identifier_type
  )
  where status = 'ACTIVE' and is_primary;

create index product_family_tenant_status_idx
  on public.product_family(tenant_id, status, name);
create index product_model_tenant_status_idx
  on public.product_model(tenant_id, status, name);
create index sku_model_idx on public.sku(tenant_id, model_id, status);
create index product_batch_model_idx on public.product_batch(tenant_id, model_id, status);
create index batch_sku_link_batch_idx on public.batch_sku_link(tenant_id, batch_id, status);
create index batch_sku_link_sku_idx on public.batch_sku_link(tenant_id, sku_id, status);
create index product_item_model_idx on public.product_item(tenant_id, model_id, status);
create index product_item_batch_idx on public.product_item(tenant_id, batch_id) where batch_id is not null;
create index product_identifier_lookup_idx
  on public.product_subject_identifier(identifier_type, scheme, issuer, normalized_value, status);
create index product_identifier_subject_idx
  on public.product_subject_identifier(tenant_id, subject_type, subject_id, status);

create or replace function public.v2_gtin_is_valid(candidate text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  cleaned text;
  total integer := 0;
  position integer;
  digit integer;
  weight integer;
begin
  cleaned := regexp_replace(coalesce(candidate, ''), '[^0-9]', '', 'g');
  if length(cleaned) not in (8, 12, 13, 14) then
    return false;
  end if;
  for position in 1..length(cleaned) - 1 loop
    digit := substring(cleaned from position for 1)::integer;
    weight := case when ((length(cleaned) - position) % 2) = 1 then 3 else 1 end;
    total := total + digit * weight;
  end loop;
  return ((10 - (total % 10)) % 10) =
    substring(cleaned from length(cleaned) for 1)::integer;
end;
$$;

create or replace function public.v2_normalize_product_identifier(
  target_type text,
  target_value text
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  normalized text;
begin
  if target_value is null or btrim(target_value) = '' then
    raise exception 'IDENTIFIER_INVALID';
  end if;
  if target_type = 'GTIN' then
    normalized := regexp_replace(target_value, '[^0-9]', '', 'g');
    if not public.v2_gtin_is_valid(normalized) then
      raise exception 'IDENTIFIER_INVALID';
    end if;
    return normalized;
  elsif target_type = 'UPI' then
    normalized := btrim(target_value);
    if normalized !~ '^https://[^[:space:]]+$' then
      raise exception 'IDENTIFIER_INVALID';
    end if;
    return normalized;
  end if;
  normalized := upper(regexp_replace(btrim(target_value), '[[:space:]]+', ' ', 'g'));
  if normalized = '' then
    raise exception 'IDENTIFIER_INVALID';
  end if;
  return normalized;
end;
$$;

create or replace function public.v2_prepare_product_identifier()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subject_type = 'PASSPORT' then
    raise exception 'IDENTIFIER_PASSPORT_NOT_ENABLED';
  end if;
  new.normalized_value :=
    public.v2_normalize_product_identifier(new.identifier_type, new.value);
  if new.status = 'RETIRED' then
    new.is_primary := false;
  end if;
  return new;
end;
$$;

create or replace function public.v2_validate_product_identifier_subject()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subject_type = 'FAMILY' and not exists (
    select 1 from public.product_family
    where id = new.subject_id and tenant_id = new.tenant_id
  ) then
    raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'MODEL' and not exists (
    select 1 from public.product_model
    where id = new.subject_id and tenant_id = new.tenant_id
  ) then
    raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'SKU' and not exists (
    select 1 from public.sku
    where id = new.subject_id and tenant_id = new.tenant_id
  ) then
    raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'BATCH' and not exists (
    select 1 from public.product_batch
    where id = new.subject_id and tenant_id = new.tenant_id
  ) then
    raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'ITEM' and not exists (
    select 1 from public.product_item
    where id = new.subject_id and tenant_id = new.tenant_id
  ) then
    raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  end if;
  return new;
end;
$$;

create or replace function public.v2_validate_item_batch_sku_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sku_id is not null
    and new.batch_id is not null
    and new.enforce_batch_sku_link
    and not exists (
      select 1
      from public.batch_sku_link link
      where link.tenant_id = new.tenant_id
        and link.model_id = new.model_id
        and link.batch_id = new.batch_id
        and link.sku_id = new.sku_id
        and link.status = 'ACTIVE'
        and link.valid_from <= now()
        and (link.valid_until is null or link.valid_until > now())
    )
  then
    raise exception 'BATCH_SKU_LINK_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger product_family_touch_updated_at before update on public.product_family
for each row execute function public.v2_touch_updated_at();
create trigger product_model_touch_updated_at before update on public.product_model
for each row execute function public.v2_touch_updated_at();
create trigger sku_touch_updated_at before update on public.sku
for each row execute function public.v2_touch_updated_at();
create trigger product_batch_touch_updated_at before update on public.product_batch
for each row execute function public.v2_touch_updated_at();
create trigger product_item_touch_updated_at before update on public.product_item
for each row execute function public.v2_touch_updated_at();

create trigger product_family_tenant_immutable before update on public.product_family
for each row execute function public.v2_reject_tenant_change();
create trigger product_model_tenant_immutable before update on public.product_model
for each row execute function public.v2_reject_tenant_change();
create trigger sku_tenant_immutable before update on public.sku
for each row execute function public.v2_reject_tenant_change();
create trigger product_batch_tenant_immutable before update on public.product_batch
for each row execute function public.v2_reject_tenant_change();
create trigger batch_sku_link_tenant_immutable before update on public.batch_sku_link
for each row execute function public.v2_reject_tenant_change();
create trigger product_item_tenant_immutable before update on public.product_item
for each row execute function public.v2_reject_tenant_change();
create trigger product_identifier_tenant_immutable before update on public.product_subject_identifier
for each row execute function public.v2_reject_tenant_change();

create trigger product_item_validate_link before insert or update
on public.product_item for each row execute function public.v2_validate_item_batch_sku_link();
create trigger product_identifier_prepare before insert or update
on public.product_subject_identifier for each row execute function public.v2_prepare_product_identifier();
create trigger product_identifier_validate_subject before insert or update
on public.product_subject_identifier for each row execute function public.v2_validate_product_identifier_subject();

alter table public.product_family enable row level security;
alter table public.product_model enable row level security;
alter table public.sku enable row level security;
alter table public.product_batch enable row level security;
alter table public.batch_sku_link enable row level security;
alter table public.product_item enable row level security;
alter table public.product_subject_identifier enable row level security;

create policy product_family_select on public.product_family for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'product.view')
  or public.v2_user_has_partner_resource_capability(
    tenant_id, 'product.view', 'PRODUCT_FAMILY', id, null
  )
);
create policy product_family_insert on public.product_family for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));
create policy product_family_update on public.product_family for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'product.edit'))
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));

create policy product_model_select on public.product_model for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'product.view')
  or public.v2_user_has_partner_resource_capability(
    tenant_id, 'product.view', 'PRODUCT_MODEL', id, null
  )
);
create policy product_model_insert on public.product_model for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));
create policy product_model_update on public.product_model for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'product.edit'))
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));

create policy sku_select on public.sku for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'product.view')
  or public.v2_user_has_partner_resource_capability(
    tenant_id, 'product.view', 'SKU', id, null
  )
);
create policy sku_insert on public.sku for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));
create policy sku_update on public.sku for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'product.edit'))
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));

create policy product_batch_select on public.product_batch for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'product.view')
  or public.v2_user_has_partner_resource_capability(
    tenant_id, 'product.view', 'BATCH', id, null
  )
);
create policy product_batch_insert on public.product_batch for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));
create policy product_batch_update on public.product_batch for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'product.edit'))
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));

create policy batch_sku_link_select on public.batch_sku_link for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'product.view')
  or public.v2_user_has_partner_resource_capability(
    tenant_id, 'product.view', 'BATCH_SKU_LINK', id, null
  )
);
create policy batch_sku_link_insert on public.batch_sku_link for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));
create policy batch_sku_link_update on public.batch_sku_link for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'product.edit'))
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));

create policy product_item_select on public.product_item for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'product.view')
  or public.v2_user_has_partner_resource_capability(
    tenant_id, 'product.view', 'ITEM', id, null
  )
);
create policy product_item_insert on public.product_item for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));
create policy product_item_update on public.product_item for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'product.edit'))
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));

create policy product_identifier_select on public.product_subject_identifier
for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'product.view')
  or public.v2_user_has_partner_resource_capability(
    tenant_id, 'product.view', 'IDENTIFIER', id, null
  )
);
create policy product_identifier_insert on public.product_subject_identifier
for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'identifier.manage'));
create policy product_identifier_update on public.product_subject_identifier
for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'identifier.manage'))
with check (public.v2_user_has_capability(tenant_id, 'identifier.manage'));

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
  '0028',
  'v2_phase2_product_core',
  null,
  'development',
  'codex',
  'applied',
  'Additive V2 Phase 2 Product Core; no V1 or Phase 1 object changed.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
