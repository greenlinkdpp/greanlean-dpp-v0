begin;

-- Extend the existing Schema Registry. This remains the single Schema authority.
alter table public.schema_definition
  add column owner_type text not null default 'GLOBAL',
  add column tenant_id uuid references public.tenant(id) on delete restrict,
  add column created_by uuid references auth.users(id) on delete set null,
  add constraint schema_definition_owner_type_check
    check (owner_type in ('GLOBAL', 'TENANT_EXTENSION')),
  add constraint schema_definition_owner_scope_check
    check (
      (owner_type = 'GLOBAL' and tenant_id is null)
      or (owner_type = 'TENANT_EXTENSION' and tenant_id is not null)
    ),
  add unique (id, tenant_id);

alter table public.field_definition
  add column semantic_name text,
  add column cardinality text not null default 'SINGLE',
  add column subject_levels text[] not null default array['MODEL']::text[],
  add column semantic_uri text,
  add column vocabulary_reference text,
  add column verification_requirement jsonb not null default '{}'::jsonb,
  add column display_metadata jsonb not null default '{}'::jsonb,
  add column deprecated_by uuid references public.field_definition(id) on delete restrict,
  add column resolution_policy text not null default 'NO_AMBIGUITY_ALLOWED',
  add constraint field_definition_cardinality_v2_check
    check (cardinality in ('SINGLE', 'MULTIPLE')),
  add constraint field_definition_subject_levels_v2_check
    check (
      cardinality(subject_levels) > 0
      and subject_levels <@ array['FAMILY', 'MODEL', 'SKU', 'BATCH', 'ITEM']::text[]
    ),
  add constraint field_definition_verification_v2_check
    check (jsonb_typeof(verification_requirement) = 'object'),
  add constraint field_definition_display_v2_check
    check (jsonb_typeof(display_metadata) = 'object'),
  add constraint field_definition_resolution_policy_v2_check
    check (resolution_policy in (
      'MODEL_ONLY', 'SKU_PREFERRED', 'BATCH_PREFERRED',
      'ITEM_PREFERRED', 'MOST_SPECIFIC', 'NO_AMBIGUITY_ALLOWED'
    ));

create index schema_definition_v2_owner_idx
  on public.schema_definition(owner_type, tenant_id, status);
create index field_definition_v2_subject_levels_idx
  on public.field_definition using gin(subject_levels);

create table public.data_source (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  source_type text not null,
  name text not null,
  provider_organisation_id uuid,
  system_identifier text,
  trust_level text not null default 'UNVERIFIED',
  status text not null default 'ACTIVE',
  residency_classification text not null default 'UNSPECIFIED',
  connector_reference text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id),
  constraint data_source_provider_tenant_fk foreign key (provider_organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id) on delete restrict,
  constraint data_source_type_check check (source_type in (
    'MANUAL', 'EXCEL', 'CSV', 'JSON', 'API', 'ERP', 'MES', 'PLM', 'BMS', 'SUPPLIER', 'LEGACY'
  )),
  constraint data_source_trust_check check (trust_level in (
    'UNVERIFIED', 'SELF_DECLARED', 'CONTRACTED', 'SYSTEM_CONTROLLED', 'THIRD_PARTY_VERIFIED'
  )),
  constraint data_source_status_check check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED'))
);

create table public.source_record (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  data_source_id uuid not null,
  external_record_id text,
  subject_type text,
  subject_id uuid,
  subject_hint jsonb not null default '{}'::jsonb,
  payload_mode text not null default 'RAW_STORED',
  payload_json jsonb,
  payload_reference text,
  payload_hash text not null,
  observed_at timestamptz,
  received_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  classification text not null default 'INTERNAL',
  status text not null default 'RECEIVED',
  unique (id, tenant_id),
  constraint source_record_source_tenant_fk foreign key (data_source_id, tenant_id)
    references public.data_source(id, tenant_id) on delete restrict,
  constraint source_record_subject_type_check check (
    subject_type is null or subject_type in ('FAMILY', 'MODEL', 'SKU', 'BATCH', 'ITEM')
  ),
  constraint source_record_payload_mode_check check (payload_mode in ('RAW_STORED', 'REFERENCE_ONLY')),
  constraint source_record_payload_presence_check check (
    (payload_mode = 'RAW_STORED' and payload_json is not null)
    or (payload_mode = 'REFERENCE_ONLY' and payload_reference is not null)
  ),
  constraint source_record_payload_hash_check check (payload_hash ~ '^[a-f0-9]{64}$'),
  constraint source_record_hint_check check (jsonb_typeof(subject_hint) = 'object'),
  constraint source_record_classification_check check (classification in (
    'PUBLIC', 'LEGITIMATE_INTEREST', 'AUTHORITY_ONLY', 'INTERNAL'
  )),
  constraint source_record_status_check check (status in ('RECEIVED', 'PROCESSED', 'QUARANTINED', 'ARCHIVED'))
);

create table public.mapping_profile (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  data_source_id uuid not null,
  target_schema_definition_id uuid not null references public.schema_definition(id) on delete restrict,
  name text not null,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id),
  constraint mapping_profile_source_tenant_fk foreign key (data_source_id, tenant_id)
    references public.data_source(id, tenant_id) on delete restrict,
  constraint mapping_profile_status_check check (status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'))
);

create table public.mapping_version (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  mapping_profile_id uuid not null,
  version text not null,
  status text not null default 'DRAFT',
  content_hash text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  retired_at timestamptz,
  unique (mapping_profile_id, version),
  unique (id, tenant_id),
  constraint mapping_version_profile_tenant_fk foreign key (mapping_profile_id, tenant_id)
    references public.mapping_profile(id, tenant_id) on delete restrict,
  constraint mapping_version_semver_check check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'),
  constraint mapping_version_hash_check check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint mapping_version_status_check check (status in ('DRAFT', 'ACTIVE', 'RETIRED'))
);

create table public.mapping_rule (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  mapping_version_id uuid not null,
  source_pointer text not null,
  target_field_definition_id uuid not null references public.field_definition(id) on delete restrict,
  source_unit text,
  transform_type text not null default 'IDENTITY',
  transform_config jsonb not null default '{}'::jsonb,
  condition_config jsonb not null default '{}'::jsonb,
  null_policy text not null default 'SKIP',
  lossiness text not null default 'LOSSLESS',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique (mapping_version_id, source_pointer, target_field_definition_id),
  unique (id, tenant_id),
  constraint mapping_rule_version_tenant_fk foreign key (mapping_version_id, tenant_id)
    references public.mapping_version(id, tenant_id) on delete restrict,
  constraint mapping_rule_pointer_check check (source_pointer ~ '^/'),
  constraint mapping_rule_transform_check check (transform_type in (
    'IDENTITY', 'TRIM', 'CASE_NORMALIZE', 'NUMBER_PARSE', 'DATE_PARSE',
    'UNIT_CONVERT', 'ENUM_MAP', 'JOIN', 'SPLIT', 'REFERENCE_LOOKUP'
  )),
  constraint mapping_rule_transform_config_check check (jsonb_typeof(transform_config) = 'object'),
  constraint mapping_rule_condition_check check (jsonb_typeof(condition_config) = 'object'),
  constraint mapping_rule_null_policy_check check (null_policy in ('SKIP', 'UNKNOWN', 'CLEAR', 'ERROR')),
  constraint mapping_rule_lossiness_check check (lossiness in ('LOSSLESS', 'LOSSY', 'UNKNOWN'))
);

create table public.transformation_result (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  source_record_id uuid not null,
  mapping_version_id uuid not null,
  status text not null,
  input_hash text not null,
  output_hash text,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  correlation_id text not null,
  created_by uuid references auth.users(id) on delete set null,
  unique (id, tenant_id),
  constraint transformation_source_tenant_fk foreign key (source_record_id, tenant_id)
    references public.source_record(id, tenant_id) on delete restrict,
  constraint transformation_mapping_tenant_fk foreign key (mapping_version_id, tenant_id)
    references public.mapping_version(id, tenant_id) on delete restrict,
  constraint transformation_status_check check (status in ('SUCCESS', 'PARTIAL', 'FAILED', 'QUARANTINED')),
  constraint transformation_input_hash_check check (input_hash ~ '^[a-f0-9]{64}$'),
  constraint transformation_output_hash_check check (output_hash is null or output_hash ~ '^[a-f0-9]{64}$'),
  constraint transformation_warning_check check (jsonb_typeof(warnings) = 'array'),
  constraint transformation_error_check check (jsonb_typeof(errors) = 'array'),
  constraint transformation_output_check check (jsonb_typeof(output_json) = 'object')
);

create table public.provenance_record (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  subject_type text not null,
  subject_id uuid not null,
  field_definition_id uuid not null references public.field_definition(id) on delete restrict,
  provider_organisation_id uuid,
  data_source_id uuid,
  source_record_id uuid,
  raw_value_reference jsonb,
  normalized_value_reference jsonb,
  mapping_version_id uuid,
  transformation_result_id uuid,
  observed_at timestamptz,
  ingested_at timestamptz not null default now(),
  entered_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  verification_status text not null default 'UNVERIFIED',
  verification_method text,
  evidence_references jsonb not null default '[]'::jsonb,
  source_disclosure text not null default 'KNOWN',
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  constraint provenance_provider_tenant_fk foreign key (provider_organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id) on delete restrict,
  constraint provenance_source_tenant_fk foreign key (data_source_id, tenant_id)
    references public.data_source(id, tenant_id) on delete restrict,
  constraint provenance_source_record_tenant_fk foreign key (source_record_id, tenant_id)
    references public.source_record(id, tenant_id) on delete restrict,
  constraint provenance_mapping_tenant_fk foreign key (mapping_version_id, tenant_id)
    references public.mapping_version(id, tenant_id) on delete restrict,
  constraint provenance_transformation_tenant_fk foreign key (transformation_result_id, tenant_id)
    references public.transformation_result(id, tenant_id) on delete restrict,
  constraint provenance_subject_type_check check (subject_type in ('FAMILY', 'MODEL', 'SKU', 'BATCH', 'ITEM')),
  constraint provenance_verification_check check (verification_status in (
    'UNVERIFIED', 'SELF_DECLARED', 'EVIDENCE_ATTACHED', 'SYSTEM_VERIFIED',
    'THIRD_PARTY_VERIFIED', 'REJECTED'
  )),
  constraint provenance_evidence_check check (jsonb_typeof(evidence_references) = 'array'),
  constraint provenance_source_disclosure_check check (source_disclosure in ('KNOWN', 'LEGACY_SOURCE_UNKNOWN')),
  constraint provenance_source_presence_check check (
    data_source_id is not null or entered_by is not null or source_disclosure = 'LEGACY_SOURCE_UNKNOWN'
  )
);

create table public.canonical_claim (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  subject_type text not null,
  subject_id uuid not null,
  field_definition_id uuid not null references public.field_definition(id) on delete restrict,
  schema_version_id uuid not null references public.schema_version(id) on delete restrict,
  resolution_state text not null,
  value_json jsonb,
  canonical_unit text,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  verification_status text not null default 'UNVERIFIED',
  provenance_record_id uuid,
  supersedes_claim_id uuid,
  applicability_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (id, tenant_id),
  unique (supersedes_claim_id),
  constraint canonical_claim_provenance_tenant_fk foreign key (provenance_record_id, tenant_id)
    references public.provenance_record(id, tenant_id) on delete restrict,
  constraint canonical_claim_supersedes_tenant_fk foreign key (supersedes_claim_id, tenant_id)
    references public.canonical_claim(id, tenant_id) on delete restrict,
  constraint canonical_claim_subject_type_check check (subject_type in ('FAMILY', 'MODEL', 'SKU', 'BATCH', 'ITEM')),
  constraint canonical_claim_resolution_check check (resolution_state in (
    'INHERIT', 'OVERRIDE', 'CLEAR', 'NOT_APPLICABLE', 'UNKNOWN'
  )),
  constraint canonical_claim_value_state_check check (
    (resolution_state = 'OVERRIDE' and value_json is not null)
    or (resolution_state <> 'OVERRIDE' and value_json is null)
  ),
  constraint canonical_claim_applicability_reason_check check (
    resolution_state <> 'NOT_APPLICABLE' or nullif(btrim(applicability_reason), '') is not null
  ),
  constraint canonical_claim_effective_check check (effective_to is null or effective_to > effective_from),
  constraint canonical_claim_verification_check check (verification_status in (
    'UNVERIFIED', 'SELF_DECLARED', 'EVIDENCE_ATTACHED', 'SYSTEM_VERIFIED',
    'THIRD_PARTY_VERIFIED', 'REJECTED'
  ))
);

create index data_source_tenant_status_idx on public.data_source(tenant_id, status, source_type);
create index source_record_tenant_source_idx on public.source_record(tenant_id, data_source_id, status);
create index mapping_profile_tenant_source_idx on public.mapping_profile(tenant_id, data_source_id, status);
create index mapping_version_profile_idx on public.mapping_version(tenant_id, mapping_profile_id, status);
create index mapping_rule_version_idx on public.mapping_rule(tenant_id, mapping_version_id, sort_order);
create index transformation_result_source_idx on public.transformation_result(tenant_id, source_record_id, started_at desc);
create index provenance_subject_idx on public.provenance_record(tenant_id, subject_type, subject_id, field_definition_id);
create index canonical_claim_resolution_idx on public.canonical_claim(
  tenant_id, subject_type, subject_id, field_definition_id, effective_from desc
);
create index canonical_claim_supersession_idx on public.canonical_claim(supersedes_claim_id)
  where supersedes_claim_id is not null;

create or replace function public.v2_phase3_subject_exists(
  target_tenant uuid,
  target_type text,
  target_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case target_type
    when 'FAMILY' then exists(select 1 from public.product_family where id = target_id and tenant_id = target_tenant)
    when 'MODEL' then exists(select 1 from public.product_model where id = target_id and tenant_id = target_tenant)
    when 'SKU' then exists(select 1 from public.sku where id = target_id and tenant_id = target_tenant)
    when 'BATCH' then exists(select 1 from public.product_batch where id = target_id and tenant_id = target_tenant)
    when 'ITEM' then exists(select 1 from public.product_item where id = target_id and tenant_id = target_tenant)
    else false
  end;
$$;

create or replace function public.v2_phase3_validate_mapping_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  schema_owner text;
  schema_tenant uuid;
begin
  select owner_type, tenant_id into schema_owner, schema_tenant
  from public.schema_definition where id = new.target_schema_definition_id;
  if schema_owner is null
    or (schema_owner = 'TENANT_EXTENSION' and schema_tenant is distinct from new.tenant_id)
  then
    raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  end if;
  return new;
end;
$$;

create or replace function public.v2_phase3_protect_active_mapping_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.status in ('ACTIVE', 'RETIRED') then
    raise exception 'MAPPING_VERSION_IMMUTABLE';
  end if;
  if tg_op = 'UPDATE' and old.status in ('ACTIVE', 'RETIRED') then
    if old.status = 'ACTIVE'
      and new.status = 'RETIRED'
      and row(new.tenant_id, new.mapping_profile_id, new.version, new.content_hash, new.created_at, new.created_by, new.activated_at)
          is not distinct from
          row(old.tenant_id, old.mapping_profile_id, old.version, old.content_hash, old.created_at, old.created_by, old.activated_at)
    then
      new.retired_at := coalesce(new.retired_at, now());
      return new;
    end if;
    raise exception 'MAPPING_VERSION_IMMUTABLE';
  end if;
  if tg_op = 'UPDATE' and new.status = 'ACTIVE' and old.status = 'DRAFT' then
    new.activated_at := coalesce(new.activated_at, now());
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.v2_phase3_protect_mapping_rule()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_version uuid;
  target_status text;
begin
  target_version := case when tg_op = 'DELETE' then old.mapping_version_id else new.mapping_version_id end;
  select status into target_status from public.mapping_version where id = target_version;
  if target_status in ('ACTIVE', 'RETIRED') then
    raise exception 'MAPPING_VERSION_IMMUTABLE';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.v2_phase3_validate_mapping_rule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_schema uuid;
  field_schema uuid;
begin
  select mp.target_schema_definition_id into target_schema
  from public.mapping_version mv
  join public.mapping_profile mp on mp.id = mv.mapping_profile_id
  where mv.id = new.mapping_version_id and mv.tenant_id = new.tenant_id;
  select sv.schema_definition_id into field_schema
  from public.field_definition fd
  join public.schema_version sv on sv.id = fd.schema_version_id
  where fd.id = new.target_field_definition_id;
  if target_schema is null or target_schema is distinct from field_schema then
    raise exception 'FIELD_VALUE_INVALID';
  end if;
  return new;
end;
$$;

create or replace function public.v2_phase3_validate_provenance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.v2_phase3_subject_exists(new.tenant_id, new.subject_type, new.subject_id) then
    raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  end if;
  return new;
end;
$$;

create or replace function public.v2_phase3_validate_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  field_version uuid;
  allowed_levels text[];
  previous_claim public.canonical_claim%rowtype;
  provenance public.provenance_record%rowtype;
begin
  if not public.v2_phase3_subject_exists(new.tenant_id, new.subject_type, new.subject_id) then
    raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  end if;
  select schema_version_id, subject_levels into field_version, allowed_levels
  from public.field_definition where id = new.field_definition_id;
  if field_version is distinct from new.schema_version_id then
    raise exception 'FIELD_VALUE_INVALID';
  end if;
  if not (new.subject_type = any(allowed_levels)) then
    raise exception 'FIELD_NOT_APPLICABLE';
  end if;
  if new.provenance_record_id is not null then
    select * into provenance from public.provenance_record
    where id = new.provenance_record_id and tenant_id = new.tenant_id;
    if provenance.id is null
      or provenance.subject_type is distinct from new.subject_type
      or provenance.subject_id is distinct from new.subject_id
      or provenance.field_definition_id is distinct from new.field_definition_id
    then
      raise exception 'PROVENANCE_INCOMPLETE';
    end if;
  end if;
  if new.supersedes_claim_id is not null then
    select * into previous_claim from public.canonical_claim
    where id = new.supersedes_claim_id and tenant_id = new.tenant_id;
    if previous_claim.id is null
      or previous_claim.subject_type is distinct from new.subject_type
      or previous_claim.subject_id is distinct from new.subject_id
      or previous_claim.field_definition_id is distinct from new.field_definition_id
      or previous_claim.schema_version_id is distinct from new.schema_version_id
    then
      raise exception 'CLAIM_CONFLICT';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.v2_phase3_partner_field_visible(target_field_definition_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.field_definition
    where id = target_field_definition_id and access_level_code <> 'INTERNAL'
  );
$$;

revoke all on function public.v2_phase3_partner_field_visible(uuid) from public;
grant execute on function public.v2_phase3_partner_field_visible(uuid) to authenticated;

create trigger data_source_touch_updated_at before update on public.data_source
for each row execute function public.v2_touch_updated_at();
create trigger mapping_profile_touch_updated_at before update on public.mapping_profile
for each row execute function public.v2_touch_updated_at();

create trigger data_source_tenant_immutable before update on public.data_source
for each row execute function public.v2_reject_tenant_change();
create trigger mapping_profile_tenant_immutable before update on public.mapping_profile
for each row execute function public.v2_reject_tenant_change();
create trigger mapping_version_tenant_immutable before update on public.mapping_version
for each row execute function public.v2_reject_tenant_change();

create trigger mapping_profile_validate before insert or update on public.mapping_profile
for each row execute function public.v2_phase3_validate_mapping_profile();
create trigger mapping_version_immutable before update or delete on public.mapping_version
for each row execute function public.v2_phase3_protect_active_mapping_version();
create trigger mapping_rule_immutable before insert or update or delete on public.mapping_rule
for each row execute function public.v2_phase3_protect_mapping_rule();
create trigger mapping_rule_validate before insert or update on public.mapping_rule
for each row execute function public.v2_phase3_validate_mapping_rule();
create trigger provenance_validate before insert on public.provenance_record
for each row execute function public.v2_phase3_validate_provenance();
create trigger canonical_claim_validate before insert on public.canonical_claim
for each row execute function public.v2_phase3_validate_claim();

-- Existing Schema Registry RLS is narrowed for Tenant extensions.
drop policy if exists "Authenticated can read schema definitions" on public.schema_definition;
drop policy if exists "Public can read active schema definitions" on public.schema_definition;
create policy schema_definition_v2_select on public.schema_definition for select to authenticated
using (owner_type = 'GLOBAL' or public.v2_user_has_capability(tenant_id, 'schema.view'));
create policy schema_definition_v2_public_select on public.schema_definition for select to anon
using (owner_type = 'GLOBAL' and status = 'active');
create policy schema_definition_v2_insert on public.schema_definition for insert to authenticated
with check (owner_type = 'TENANT_EXTENSION' and public.v2_user_has_capability(tenant_id, 'schema.manage'));
create policy schema_definition_v2_update on public.schema_definition for update to authenticated
using (owner_type = 'TENANT_EXTENSION' and public.v2_user_has_capability(tenant_id, 'schema.manage'))
with check (owner_type = 'TENANT_EXTENSION' and public.v2_user_has_capability(tenant_id, 'schema.manage'));

drop policy if exists "Authenticated can read schema versions" on public.schema_version;
drop policy if exists "Public can read published schema versions" on public.schema_version;
create policy schema_version_v2_select on public.schema_version for select to authenticated
using (exists (
  select 1 from public.schema_definition sd where sd.id = schema_definition_id
  and (sd.owner_type = 'GLOBAL' or public.v2_user_has_capability(sd.tenant_id, 'schema.view'))
));
create policy schema_version_v2_public_select on public.schema_version for select to anon
using (status = 'published' and exists (
  select 1 from public.schema_definition sd
  where sd.id = schema_definition_id and sd.owner_type = 'GLOBAL'
));
create policy schema_version_v2_insert on public.schema_version for insert to authenticated
with check (exists (
  select 1 from public.schema_definition sd where sd.id = schema_definition_id
  and sd.owner_type = 'TENANT_EXTENSION'
  and public.v2_user_has_capability(sd.tenant_id, 'schema.manage')
));
create policy schema_version_v2_update on public.schema_version for update to authenticated
using (exists (
  select 1 from public.schema_definition sd where sd.id = schema_definition_id
  and sd.owner_type = 'TENANT_EXTENSION'
  and public.v2_user_has_capability(sd.tenant_id, 'schema.manage')
));

drop policy if exists "Authenticated can read field definitions" on public.field_definition;
drop policy if exists "Public can read published field definitions" on public.field_definition;
create policy field_definition_v2_select on public.field_definition for select to authenticated
using (exists (
  select 1 from public.schema_version sv
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sv.id = schema_version_id
  and (sd.owner_type = 'GLOBAL' or public.v2_user_has_capability(sd.tenant_id, 'schema.view'))
));
create policy field_definition_v2_public_select on public.field_definition for select to anon
using (exists (
  select 1 from public.schema_version sv
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sv.id = schema_version_id and sv.status = 'published' and sd.owner_type = 'GLOBAL'
));
create policy field_definition_v2_write on public.field_definition for all to authenticated
using (exists (
  select 1 from public.schema_version sv
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sv.id = schema_version_id and sd.owner_type = 'TENANT_EXTENSION'
  and public.v2_user_has_capability(sd.tenant_id, 'schema.manage')
))
with check (exists (
  select 1 from public.schema_version sv
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sv.id = schema_version_id and sd.owner_type = 'TENANT_EXTENSION'
  and public.v2_user_has_capability(sd.tenant_id, 'schema.manage')
));

drop policy if exists "Authenticated can read validation rules" on public.validation_rule;
drop policy if exists "Public can read published validation rules" on public.validation_rule;
create policy validation_rule_v2_select on public.validation_rule for select to authenticated
using (exists (
  select 1 from public.schema_version sv
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sv.id = schema_version_id
  and (sd.owner_type = 'GLOBAL' or public.v2_user_has_capability(sd.tenant_id, 'schema.view'))
));
create policy validation_rule_v2_public_select on public.validation_rule for select to anon
using (exists (
  select 1 from public.schema_version sv
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sv.id = schema_version_id and sv.status = 'published' and sd.owner_type = 'GLOBAL'
));

drop policy if exists "Authenticated can read applicability rules" on public.applicability_rule;
drop policy if exists "Public can read published applicability rules" on public.applicability_rule;
create policy applicability_rule_v2_select on public.applicability_rule for select to authenticated
using (exists (
  select 1 from public.schema_version sv
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sv.id = schema_version_id
  and (sd.owner_type = 'GLOBAL' or public.v2_user_has_capability(sd.tenant_id, 'schema.view'))
));
create policy applicability_rule_v2_public_select on public.applicability_rule for select to anon
using (exists (
  select 1 from public.schema_version sv
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sv.id = schema_version_id and sv.status = 'published' and sd.owner_type = 'GLOBAL'
));

drop policy if exists "Authenticated can read field regulatory references" on public.field_regulatory_reference;
drop policy if exists "Public can read published field regulatory references" on public.field_regulatory_reference;
create policy field_regulatory_reference_v2_select on public.field_regulatory_reference for select to authenticated
using (exists (
  select 1 from public.field_definition fd
  join public.schema_version sv on sv.id = fd.schema_version_id
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where fd.id = field_definition_id
  and (sd.owner_type = 'GLOBAL' or public.v2_user_has_capability(sd.tenant_id, 'schema.view'))
));
create policy field_regulatory_reference_v2_public_select on public.field_regulatory_reference for select to anon
using (exists (
  select 1 from public.field_definition fd
  join public.schema_version sv on sv.id = fd.schema_version_id
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where fd.id = field_definition_id and sv.status = 'published' and sd.owner_type = 'GLOBAL'
));

drop policy if exists "Authenticated can read access policies" on public.access_policy;
create policy access_policy_v2_select on public.access_policy for select to authenticated
using (exists (
  select 1 from public.schema_version sv
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sv.id = schema_version_id
  and (sd.owner_type = 'GLOBAL' or public.v2_user_has_capability(sd.tenant_id, 'schema.view'))
));

alter table public.data_source enable row level security;
alter table public.source_record enable row level security;
alter table public.mapping_profile enable row level security;
alter table public.mapping_version enable row level security;
alter table public.mapping_rule enable row level security;
alter table public.transformation_result enable row level security;
alter table public.provenance_record enable row level security;
alter table public.canonical_claim enable row level security;

create policy data_source_select on public.data_source for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'schema.view'));
create policy data_source_insert on public.data_source for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'import.create'));
create policy data_source_update on public.data_source for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'import.create'))
with check (public.v2_user_has_capability(tenant_id, 'import.create'));

create policy source_record_select on public.source_record for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'schema.view'));
create policy source_record_insert on public.source_record for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'import.create'));

create policy mapping_profile_select on public.mapping_profile for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'schema.view'));
create policy mapping_profile_insert on public.mapping_profile for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'import.create'));
create policy mapping_profile_update on public.mapping_profile for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'import.create'))
with check (public.v2_user_has_capability(tenant_id, 'import.create'));

create policy mapping_version_select on public.mapping_version for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'schema.view'));
create policy mapping_version_insert on public.mapping_version for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'import.create'));
create policy mapping_version_update on public.mapping_version for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'import.create'))
with check (public.v2_user_has_capability(tenant_id, 'import.create'));

create policy mapping_rule_select on public.mapping_rule for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'schema.view'));
create policy mapping_rule_write on public.mapping_rule for all to authenticated
using (public.v2_user_has_capability(tenant_id, 'import.create'))
with check (public.v2_user_has_capability(tenant_id, 'import.create'));

create policy transformation_result_select on public.transformation_result for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'schema.view'));
create policy transformation_result_insert on public.transformation_result for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'import.commit'));

create policy provenance_record_select on public.provenance_record for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'product.view')
  or public.v2_user_has_partner_resource_capability(tenant_id, 'product.view', 'PROVENANCE', id, null)
);
create policy provenance_record_insert on public.provenance_record for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'import.commit'));

create policy canonical_claim_select on public.canonical_claim for select to authenticated
using (
  public.v2_user_has_capability(tenant_id, 'product.view')
  or (
    public.v2_user_has_partner_resource_capability(tenant_id, 'product.view', 'CANONICAL_CLAIM', id, null)
    and public.v2_phase3_partner_field_visible(field_definition_id)
  )
);
create policy canonical_claim_insert on public.canonical_claim for insert to authenticated
with check (
  public.v2_user_has_capability(tenant_id, 'product.edit')
  or public.v2_user_has_capability(tenant_id, 'import.commit')
);

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
  '0029',
  'v2_phase3_schema_canonical_provenance',
  null,
  'development',
  'codex',
  'applied',
  'Extends the existing Schema Registry and adds Phase 3 Source, Mapping, Claim, Provenance, and Resolution foundations.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
