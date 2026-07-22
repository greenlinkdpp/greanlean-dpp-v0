-- GREANLEAN BATTERY DPP PREVIEW INSTALL BUNDLE
-- Generated file. Do not edit this bundle manually.
-- Target: a disposable Supabase Preview/Test project with the legacy products
-- and product_documents tables already installed.
-- Run the entire file in Supabase SQL Editor. Each source migration keeps its
-- own transaction boundary. Do not enable the application feature flag until
-- battery_dpp_preview_verify.sql reports every check as passed.

-- ============================================================================
-- SOURCE: supabase/migrations/0001_project_migration_ledger.sql
-- SHA256: bde9b3d605aad8e3b28e54494a94f23a13d69691724611a2c94892228eb7259c
-- ============================================================================
begin;

create table if not exists public.greanlean_migration_ledger (
  migration_number text primary key,
  migration_name text not null,
  checksum_sha256 text,
  environment text not null default 'unknown',
  applied_by text,
  applied_at timestamptz not null default now(),
  execution_ms integer,
  result text not null default 'applied',
  notes text,
  constraint greanlean_migration_number_format check (migration_number ~ '^[0-9]{4}$'),
  constraint greanlean_migration_checksum_format check (
    checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'
  ),
  constraint greanlean_migration_result_check check (result in ('applied', 'rolled_back', 'failed'))
);

comment on table public.greanlean_migration_ledger is
  'Application-visible record of approved Greanlean migrations. Supabase internal migration history remains authoritative for CLI execution.';

alter table public.greanlean_migration_ledger enable row level security;

drop policy if exists "Authenticated can read migration ledger" on public.greanlean_migration_ledger;
create policy "Authenticated can read migration ledger"
  on public.greanlean_migration_ledger for select to authenticated using (true);

commit;

-- ============================================================================
-- SOURCE: supabase/migrations/0006_schema_registry.sql
-- SHA256: 45b18877ed7b7912de17e742be8ace93ec03be5665de2cc5c35e787534ae3375
-- ============================================================================
begin;

create table if not exists public.access_level (
  code text primary key,
  label_en text not null,
  label_zh text not null,
  description_en text,
  description_zh text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint access_level_code_check check (code in ('PUBLIC', 'LEGITIMATE_INTEREST', 'AUTHORITY_ONLY', 'INTERNAL'))
);

create table if not exists public.schema_definition (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  sector_code text not null,
  legal_category_code text,
  technical_variant_code text,
  source_name text not null,
  name_en text not null,
  name_zh text not null,
  description_en text,
  description_zh text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schema_definition_code_check check (code ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'),
  constraint schema_definition_status_check check (status in ('draft', 'active', 'retired'))
);

create table if not exists public.schema_version (
  id uuid primary key default gen_random_uuid(),
  schema_definition_id uuid not null references public.schema_definition(id) on delete restrict,
  version text not null,
  source_version text,
  json_schema jsonb not null default '{}'::jsonb,
  checksum_sha256 text,
  effective_from date,
  effective_until date,
  status text not null default 'draft',
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by text,
  unique (schema_definition_id, version),
  constraint schema_version_semver_check check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'),
  constraint schema_version_json_check check (jsonb_typeof(json_schema) = 'object'),
  constraint schema_version_checksum_check check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint schema_version_status_check check (status in ('draft', 'published', 'retired')),
  constraint schema_version_effective_dates_check check (effective_until is null or effective_from is null or effective_until >= effective_from),
  constraint schema_version_published_checksum_check check (status <> 'published' or checksum_sha256 is not null)
);

create table if not exists public.regulatory_reference (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_code text not null,
  title text,
  article_reference text,
  source_version text,
  source_uri text,
  confirmation_status text not null default 'TBD',
  effective_from date,
  effective_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regulatory_reference_source_type_check check (
    source_type in ('regulation', 'delegated_act', 'implementing_act', 'standard', 'standard_draft', 'reference_model', 'guidance')
  ),
  constraint regulatory_reference_status_check check (confirmation_status in ('CONFIRMED', 'DRAFT', 'TBD', 'SUPERSEDED')),
  constraint regulatory_reference_dates_check check (effective_until is null or effective_from is null or effective_until >= effective_from)
);

create unique index if not exists regulatory_reference_identity_idx
  on public.regulatory_reference (source_type, source_code, coalesce(article_reference, ''), coalesce(source_version, ''));

create table if not exists public.codelist (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version text not null,
  source_name text not null,
  schema_version_id uuid references public.schema_version(id) on delete restrict,
  label_en text not null,
  label_zh text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code, version),
  constraint codelist_status_check check (status in ('draft', 'published', 'retired'))
);

create table if not exists public.codelist_value (
  id uuid primary key default gen_random_uuid(),
  codelist_id uuid not null references public.codelist(id) on delete cascade,
  value_code text not null,
  label_en text not null,
  label_zh text not null,
  description_en text,
  description_zh text,
  sort_order integer not null default 100,
  valid_from date,
  valid_until date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (codelist_id, value_code),
  constraint codelist_value_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint codelist_value_dates_check check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create index if not exists schema_definition_sector_idx on public.schema_definition (sector_code, status);
create index if not exists schema_version_definition_idx on public.schema_version (schema_definition_id, status);
create index if not exists codelist_schema_version_idx on public.codelist (schema_version_id);

create or replace function public.greanlean_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.greanlean_protect_schema_version()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' and new.published_at is null then
      new.published_at = now();
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status in ('published', 'retired') then
      raise exception 'Published or retired Schema versions cannot be deleted';
    end if;
    return old;
  end if;

  if old.status = 'retired' then
    raise exception 'Retired Schema versions are immutable';
  end if;

  if old.status = 'published' then
    if new.status <> 'retired'
      or row(new.schema_definition_id, new.version, new.source_version, new.json_schema, new.checksum_sha256, new.effective_from, new.published_at, new.created_at, new.created_by)
         is distinct from
         row(old.schema_definition_id, old.version, old.source_version, old.json_schema, old.checksum_sha256, old.effective_from, old.published_at, old.created_at, old.created_by)
    then
      raise exception 'Published Schema versions are immutable and may only transition to retired';
    end if;
    if new.retired_at is null then
      new.retired_at = now();
    end if;
  elsif new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.greanlean_protect_codelist()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('published', 'retired') then
      raise exception 'Published or retired codelists cannot be deleted';
    end if;
    return old;
  end if;

  if old.status = 'retired' then
    raise exception 'Retired codelists are immutable';
  end if;
  if old.status = 'published' then
    if new.status <> 'retired'
      or row(new.code, new.version, new.source_name, new.schema_version_id, new.label_en, new.label_zh, new.created_at)
         is distinct from
         row(old.code, old.version, old.source_name, old.schema_version_id, old.label_en, old.label_zh, old.created_at)
    then
      raise exception 'Published codelists are immutable and may only transition to retired';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.greanlean_protect_codelist_value()
returns trigger
language plpgsql
as $$
declare
  target_codelist_id uuid;
  target_status text;
begin
  target_codelist_id := case when tg_op = 'DELETE' then old.codelist_id else new.codelist_id end;
  select parent.status into target_status from public.codelist parent where parent.id = target_codelist_id;
  if target_status in ('published', 'retired') then
    raise exception 'Values belonging to a published or retired codelist are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists schema_definition_touch_updated_at on public.schema_definition;
create trigger schema_definition_touch_updated_at
  before update on public.schema_definition
  for each row execute function public.greanlean_touch_updated_at();

drop trigger if exists regulatory_reference_touch_updated_at on public.regulatory_reference;
create trigger regulatory_reference_touch_updated_at
  before update on public.regulatory_reference
  for each row execute function public.greanlean_touch_updated_at();

drop trigger if exists codelist_touch_updated_at on public.codelist;
create trigger codelist_touch_updated_at
  before update on public.codelist
  for each row execute function public.greanlean_touch_updated_at();

drop trigger if exists codelist_immutable_when_published on public.codelist;
create trigger codelist_immutable_when_published
  before update or delete on public.codelist
  for each row execute function public.greanlean_protect_codelist();

drop trigger if exists codelist_value_immutable_when_published on public.codelist_value;
create trigger codelist_value_immutable_when_published
  before insert or update or delete on public.codelist_value
  for each row execute function public.greanlean_protect_codelist_value();

drop trigger if exists schema_version_immutable_when_published on public.schema_version;
create trigger schema_version_immutable_when_published
  before insert or update or delete on public.schema_version
  for each row execute function public.greanlean_protect_schema_version();

insert into public.access_level (code, label_en, label_zh, description_en, description_zh, sort_order)
values
  ('PUBLIC', 'Public', '公开', 'Visible without authentication.', '无需登录即可查看。', 10),
  ('LEGITIMATE_INTEREST', 'Legitimate interest', '正当利益访问', 'Visible to an approved professional user with a recorded purpose.', '经批准并记录用途的专业用户可查看。', 20),
  ('AUTHORITY_ONLY', 'Authority only', '主管机关访问', 'Visible only to authorised public authorities or equivalent approved roles.', '仅限获授权的主管机关或同等角色查看。', 30),
  ('INTERNAL', 'Internal', '内部访问', 'Visible only inside the responsible organisation.', '仅责任组织内部可查看。', 40)
on conflict (code) do update set
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  description_en = excluded.description_en,
  description_zh = excluded.description_zh,
  sort_order = excluded.sort_order;

alter table public.access_level enable row level security;
alter table public.schema_definition enable row level security;
alter table public.schema_version enable row level security;
alter table public.regulatory_reference enable row level security;
alter table public.codelist enable row level security;
alter table public.codelist_value enable row level security;

drop policy if exists "Public can read access levels" on public.access_level;
create policy "Public can read access levels" on public.access_level for select to anon, authenticated using (true);

drop policy if exists "Authenticated can read schema definitions" on public.schema_definition;
create policy "Authenticated can read schema definitions" on public.schema_definition for select to authenticated using (true);
drop policy if exists "Public can read active schema definitions" on public.schema_definition;
create policy "Public can read active schema definitions" on public.schema_definition for select to anon using (status = 'active');

drop policy if exists "Authenticated can read schema versions" on public.schema_version;
create policy "Authenticated can read schema versions" on public.schema_version for select to authenticated using (true);
drop policy if exists "Public can read published schema versions" on public.schema_version;
create policy "Public can read published schema versions" on public.schema_version for select to anon using (status = 'published');

drop policy if exists "Authenticated can read regulatory references" on public.regulatory_reference;
create policy "Authenticated can read regulatory references" on public.regulatory_reference for select to authenticated using (true);
drop policy if exists "Public can read confirmed regulatory references" on public.regulatory_reference;
create policy "Public can read confirmed regulatory references" on public.regulatory_reference for select to anon using (confirmation_status = 'CONFIRMED');

drop policy if exists "Authenticated can read codelists" on public.codelist;
create policy "Authenticated can read codelists" on public.codelist for select to authenticated using (true);
drop policy if exists "Public can read published codelists" on public.codelist;
create policy "Public can read published codelists" on public.codelist for select to anon using (status = 'published');

drop policy if exists "Authenticated can read codelist values" on public.codelist_value;
create policy "Authenticated can read codelist values" on public.codelist_value for select to authenticated using (true);
drop policy if exists "Public can read published codelist values" on public.codelist_value;
create policy "Public can read published codelist values" on public.codelist_value for select to anon using (
  exists (select 1 from public.codelist parent where parent.id = codelist_id and parent.status = 'published')
);

commit;

-- ============================================================================
-- SOURCE: supabase/migrations/0007_field_definitions_and_rules.sql
-- SHA256: 35e21e5767f52cfa3e5682165e1f7f8e9cf9d14583e87ee87fda8d67082b533b
-- ============================================================================
begin;

create table if not exists public.field_definition (
  id uuid primary key default gen_random_uuid(),
  schema_version_id uuid not null references public.schema_version(id) on delete restrict,
  field_code text not null,
  json_pointer text,
  storage_path text,
  label_en text not null,
  label_zh text not null,
  description_en text,
  description_zh text,
  data_type text not null,
  unit_code text,
  codelist_id uuid references public.codelist(id) on delete restrict,
  data_behavior text not null default 'STATIC',
  data_granularity text not null default 'MODEL',
  access_level_code text not null default 'PUBLIC' references public.access_level(code) on delete restrict,
  requirement_status text not null default 'TBD',
  evidence_requirement jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schema_version_id, field_code),
  constraint field_definition_code_check check (field_code ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'),
  constraint field_definition_pointer_check check (json_pointer is null or json_pointer ~ '^/'),
  constraint field_definition_type_check check (data_type in ('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'uri', 'object', 'array')),
  constraint field_definition_behavior_check check (data_behavior in ('STATIC', 'DYNAMIC')),
  constraint field_definition_granularity_check check (data_granularity in ('MODEL', 'BATCH', 'ITEM', 'MODEL_YEAR_SITE', 'MODEL_SITE')),
  constraint field_definition_requirement_check check (
    requirement_status in ('CONFIRMED_MANDATORY', 'CONDITIONAL_MANDATORY', 'DRAFT_MANDATORY', 'VOLUNTARY', 'NOT_APPLICABLE', 'TBD')
  ),
  constraint field_definition_evidence_check check (jsonb_typeof(evidence_requirement) = 'object')
);

create table if not exists public.validation_rule (
  id uuid primary key default gen_random_uuid(),
  schema_version_id uuid not null references public.schema_version(id) on delete restrict,
  field_definition_id uuid references public.field_definition(id) on delete cascade,
  rule_code text not null,
  rule_type text not null,
  rule_config jsonb not null default '{}'::jsonb,
  error_code text not null,
  message_en text not null,
  message_zh text not null,
  severity text not null default 'error',
  rule_version text not null default '1.0.0',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schema_version_id, rule_code),
  constraint validation_rule_type_check check (rule_type in ('required', 'type', 'range', 'format', 'codelist', 'cross_field', 'evidence', 'custom_config')),
  constraint validation_rule_config_check check (jsonb_typeof(rule_config) = 'object'),
  constraint validation_rule_severity_check check (severity in ('info', 'warning', 'error', 'blocking'))
);

create table if not exists public.applicability_rule (
  id uuid primary key default gen_random_uuid(),
  schema_version_id uuid not null references public.schema_version(id) on delete restrict,
  field_definition_id uuid not null references public.field_definition(id) on delete cascade,
  rule_code text not null,
  legal_category_code text,
  technical_variant_code text,
  data_granularity text,
  condition_config jsonb not null default '{}'::jsonb,
  result_status text not null,
  priority integer not null default 100,
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schema_version_id, rule_code),
  constraint applicability_rule_granularity_check check (
    data_granularity is null or data_granularity in ('MODEL', 'BATCH', 'ITEM', 'MODEL_YEAR_SITE', 'MODEL_SITE')
  ),
  constraint applicability_rule_condition_check check (jsonb_typeof(condition_config) = 'object'),
  constraint applicability_rule_result_check check (
    result_status in ('CONFIRMED_MANDATORY', 'CONDITIONAL_MANDATORY', 'DRAFT_MANDATORY', 'VOLUNTARY', 'NOT_APPLICABLE', 'TBD')
  )
);

create table if not exists public.field_regulatory_reference (
  field_definition_id uuid not null references public.field_definition(id) on delete cascade,
  regulatory_reference_id uuid not null references public.regulatory_reference(id) on delete restrict,
  relation_type text not null default 'supports',
  notes text,
  created_at timestamptz not null default now(),
  primary key (field_definition_id, regulatory_reference_id),
  constraint field_regulatory_relation_check check (relation_type in ('requires', 'supports', 'maps', 'informs'))
);

create table if not exists public.access_policy (
  id uuid primary key default gen_random_uuid(),
  schema_version_id uuid not null references public.schema_version(id) on delete restrict,
  field_definition_id uuid references public.field_definition(id) on delete cascade,
  policy_code text not null,
  access_level_code text not null references public.access_level(code) on delete restrict,
  allowed_roles jsonb not null default '[]'::jsonb,
  condition_config jsonb not null default '{}'::jsonb,
  purpose_required boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schema_version_id, policy_code),
  constraint access_policy_roles_check check (jsonb_typeof(allowed_roles) = 'array'),
  constraint access_policy_condition_check check (jsonb_typeof(condition_config) = 'object'),
  constraint access_policy_status_check check (status in ('draft', 'active', 'retired'))
);

create index if not exists field_definition_schema_idx on public.field_definition (schema_version_id, sort_order);
create unique index if not exists field_definition_json_pointer_idx
  on public.field_definition (schema_version_id, json_pointer)
  where json_pointer is not null;
create index if not exists field_definition_access_idx on public.field_definition (access_level_code);
create index if not exists validation_rule_field_idx on public.validation_rule (field_definition_id);
create index if not exists applicability_rule_field_idx on public.applicability_rule (field_definition_id, priority);
create index if not exists field_regulatory_reference_source_idx on public.field_regulatory_reference (regulatory_reference_id);
create index if not exists access_policy_field_idx on public.access_policy (field_definition_id);

create or replace function public.greanlean_protect_published_schema_child()
returns trigger
language plpgsql
as $$
declare
  target_schema_version_id uuid;
  target_field_definition_id uuid;
  target_status text;
begin
  if tg_table_name = 'field_regulatory_reference' then
    target_field_definition_id := case when tg_op = 'DELETE' then old.field_definition_id else new.field_definition_id end;
    select fd.schema_version_id into target_schema_version_id
      from public.field_definition fd where fd.id = target_field_definition_id;
  else
    target_schema_version_id := case when tg_op = 'DELETE' then old.schema_version_id else new.schema_version_id end;
  end if;

  select sv.status into target_status from public.schema_version sv where sv.id = target_schema_version_id;
  if target_status = 'published' then
    raise exception 'Configuration belonging to a published Schema version is immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists field_definition_touch_updated_at on public.field_definition;
create trigger field_definition_touch_updated_at
  before update on public.field_definition
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists validation_rule_touch_updated_at on public.validation_rule;
create trigger validation_rule_touch_updated_at
  before update on public.validation_rule
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists applicability_rule_touch_updated_at on public.applicability_rule;
create trigger applicability_rule_touch_updated_at
  before update on public.applicability_rule
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists access_policy_touch_updated_at on public.access_policy;
create trigger access_policy_touch_updated_at
  before update on public.access_policy
  for each row execute function public.greanlean_touch_updated_at();

drop trigger if exists field_definition_immutable_when_published on public.field_definition;
create trigger field_definition_immutable_when_published
  before insert or update or delete on public.field_definition
  for each row execute function public.greanlean_protect_published_schema_child();
drop trigger if exists validation_rule_immutable_when_published on public.validation_rule;
create trigger validation_rule_immutable_when_published
  before insert or update or delete on public.validation_rule
  for each row execute function public.greanlean_protect_published_schema_child();
drop trigger if exists applicability_rule_immutable_when_published on public.applicability_rule;
create trigger applicability_rule_immutable_when_published
  before insert or update or delete on public.applicability_rule
  for each row execute function public.greanlean_protect_published_schema_child();
drop trigger if exists field_regulatory_reference_immutable_when_published on public.field_regulatory_reference;
create trigger field_regulatory_reference_immutable_when_published
  before insert or update or delete on public.field_regulatory_reference
  for each row execute function public.greanlean_protect_published_schema_child();
drop trigger if exists access_policy_immutable_when_published on public.access_policy;
create trigger access_policy_immutable_when_published
  before insert or update or delete on public.access_policy
  for each row execute function public.greanlean_protect_published_schema_child();

alter table public.field_definition enable row level security;
alter table public.validation_rule enable row level security;
alter table public.applicability_rule enable row level security;
alter table public.field_regulatory_reference enable row level security;
alter table public.access_policy enable row level security;

drop policy if exists "Authenticated can read field definitions" on public.field_definition;
create policy "Authenticated can read field definitions" on public.field_definition for select to authenticated using (true);
drop policy if exists "Public can read published field definitions" on public.field_definition;
create policy "Public can read published field definitions" on public.field_definition for select to anon using (
  exists (select 1 from public.schema_version sv where sv.id = schema_version_id and sv.status = 'published')
);

drop policy if exists "Authenticated can read validation rules" on public.validation_rule;
create policy "Authenticated can read validation rules" on public.validation_rule for select to authenticated using (true);
drop policy if exists "Public can read published validation rules" on public.validation_rule;
create policy "Public can read published validation rules" on public.validation_rule for select to anon using (
  exists (select 1 from public.schema_version sv where sv.id = schema_version_id and sv.status = 'published')
);

drop policy if exists "Authenticated can read applicability rules" on public.applicability_rule;
create policy "Authenticated can read applicability rules" on public.applicability_rule for select to authenticated using (true);
drop policy if exists "Public can read published applicability rules" on public.applicability_rule;
create policy "Public can read published applicability rules" on public.applicability_rule for select to anon using (
  exists (select 1 from public.schema_version sv where sv.id = schema_version_id and sv.status = 'published')
);

drop policy if exists "Authenticated can read field regulatory references" on public.field_regulatory_reference;
create policy "Authenticated can read field regulatory references" on public.field_regulatory_reference for select to authenticated using (true);
drop policy if exists "Public can read published field regulatory references" on public.field_regulatory_reference;
create policy "Public can read published field regulatory references" on public.field_regulatory_reference for select to anon using (
  exists (
    select 1 from public.field_definition fd
    join public.schema_version sv on sv.id = fd.schema_version_id
    where fd.id = field_definition_id and sv.status = 'published'
  )
);

drop policy if exists "Authenticated can read access policies" on public.access_policy;
create policy "Authenticated can read access policies" on public.access_policy for select to authenticated using (true);

commit;

-- ============================================================================
-- SOURCE: supabase/migrations/0009_battery_domain.sql
-- SHA256: a0090ef68260c8341f7b35031819be3899b297c87bded2d316461651ac2b04e9
-- ============================================================================
begin;

create table if not exists public.battery_schema_profile (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  legal_category_code text not null,
  technical_variant_code text,
  validation_schema_version_id uuid references public.schema_version(id) on delete restrict,
  longlist_schema_version_id uuid not null references public.schema_version(id) on delete restrict,
  source_profile_code text,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battery_schema_profile_category_check check (legal_category_code in ('ev', 'lmt', 'industrial', 'portable', 'sli', 'other')),
  constraint battery_schema_profile_status_check check (status in ('draft', 'active', 'retired'))
);

-- BEGIN GENERATED BATTERY REFERENCE CATALOG
-- Generated from checked-in BatteryPass-Ready sources. Do not edit this block manually.
insert into public.regulatory_reference (source_type, source_code, title, source_version, source_uri, confirmation_status, notes)
values
  ('regulation', 'EU-2023-1542', 'Regulation (EU) 2023/1542 concerning batteries and waste batteries', '2023-07-12', 'https://eur-lex.europa.eu/eli/reg/2023/1542/oj', 'CONFIRMED', 'Primary battery-passport legal source.'),
  ('reference_model', 'BPR-LONGLIST', 'BatteryPass-Ready Data Attribute Longlist', '1.3', null, 'DRAFT', 'Reference model under CC BY 4.0; not the final EU Registry semantic catalogue.')
on conflict do nothing;

insert into public.schema_definition (code, sector_code, legal_category_code, technical_variant_code, source_name, name_en, name_zh, status)
values
  ('battery.longlist', 'battery', null, null, 'BatteryPass-Ready', 'Battery reference field dictionary', '电池参考字段字典', 'active'),
  ('battery.ev', 'battery', 'ev', null, 'BatteryPass-Ready', 'battery.ev validation configuration', 'battery.ev 验证配置', 'active'),
  ('battery.lmt', 'battery', 'lmt', null, 'BatteryPass-Ready', 'battery.lmt validation configuration', 'battery.lmt 验证配置', 'active'),
  ('battery.industrial.without_bms', 'battery', 'industrial', 'without_bms', 'BatteryPass-Ready', 'battery.industrial.without_bms validation configuration', 'battery.industrial.without_bms 验证配置', 'active'),
  ('battery.industrial.non_stationary', 'battery', 'industrial', 'non_stationary_above_2kwh', 'BatteryPass-Ready', 'battery.industrial.non_stationary validation configuration', 'battery.industrial.non_stationary 验证配置', 'active'),
  ('battery.industrial.stationary', 'battery', 'industrial', 'stationary_above_2kwh', 'BatteryPass-Ready', 'battery.industrial.stationary validation configuration', 'battery.industrial.stationary 验证配置', 'active')
on conflict (code) do update set status = excluded.status, updated_at = now();

insert into public.schema_version (schema_definition_id, version, source_version, json_schema, checksum_sha256, status, created_by)
select id, '1.3.0', '1.3', '{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://www.greanlean.com/schemas/battery/longlist/1.3.0","title":"BatteryPass-Ready Longlist v1.3 normalized field dictionary","type":"object","x-source-sha256":"2be2585bb29be1378807d6c5b829fc67414797542d32e5e014c5fe05bd13d8ba"}'::jsonb, '2be2585bb29be1378807d6c5b829fc67414797542d32e5e014c5fe05bd13d8ba', 'draft', 'scripts/battery/generate_schema_seed.mjs'
from public.schema_definition where code = 'battery.longlist'
on conflict (schema_definition_id, version) do nothing;

insert into public.schema_version (schema_definition_id, version, source_version, json_schema, checksum_sha256, status, created_by)
select id, '1.0.0', 'BatteryPass-Ready 1.0', '{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "Battery_Passport": {
      "$ref": "#/$defs/Battery_Passport_Master"
    }
  },
  "required": [
    "Battery_Passport"
  ],
  "$defs": {
    "Battery_Passport_Master": {
      "type": "object",
      "properties": {
        "SymbolsLabelsAndDocumentationOfConformity": {
          "$ref": "#/$defs/SymbolsLabelsAndDocumentationOfConformity"
        },
        "SupplyChainDueDiligence": {
          "$ref": "#/$defs/SupplyChainDueDiligence"
        },
        "PerformanceAndDurability": {
          "$ref": "#/$defs/PerformanceAndDurability"
        },
        "IdentifiersAndProductData": {
          "$ref": "#/$defs/IdentifiersAndProductData"
        },
        "CircularityAndResourceEfficiency": {
          "$ref": "#/$defs/CircularityAndResourceEfficiency"
        },
        "BatteryMaterialsAndComposition": {
          "$ref": "#/$defs/BatteryMaterialsAndComposition"
        },
        "BatteryCarbonFootprint": {
          "$ref": "#/$defs/BatteryCarbonFootprint"
        }
      },
      "required": [
        "SymbolsLabelsAndDocumentationOfConformity",
        "SupplyChainDueDiligence",
        "PerformanceAndDurability",
        "IdentifiersAndProductData",
        "CircularityAndResourceEfficiency",
        "BatteryMaterialsAndComposition",
        "BatteryCarbonFootprint"
      ]
    },
    "BatteryCarbonFootprint": {
      "type": "object",
      "properties": {
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "BatteryCarbonFootprintPerFunctionalUnit": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfMainProductProductionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfDistributionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "CarbonFootprintPerformanceClass": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "WebLinkToPublicCarbonFootprintStudy": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "AbsoluteBatteryCarbonFootprint": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_integer"
        }
      },
      "required": [
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage",
        "BatteryCarbonFootprintPerFunctionalUnit",
        "ContributionOfMainProductProductionLifecycleStage",
        "ContributionOfDistributionLifecycleStage",
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage",
        "CarbonFootprintPerformanceClass",
        "WebLinkToPublicCarbonFootprintStudy"
      ]
    },
    "BatteryMaterialsAndComposition": {
      "type": "object",
      "properties": {
        "BatteryChemistry": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_chemistry_type"
        },
        "CriticalRawMaterials": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "HazardousSubstances": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "MaterialsUsedInCathodeAnodeAndElectrolyte": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "BatteryChemistry",
        "CriticalRawMaterials",
        "HazardousSubstances",
        "MaterialsUsedInCathodeAnodeAndElectrolyte",
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons"
      ]
    },
    "CircularityAndResourceEfficiency": {
      "type": "object",
      "properties": {
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "PartNumbersForComponents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnSourcesOfSpareParts": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SafetyMeasures": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "Pre-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RecycledLeadShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RenewableContentShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack",
        "PartNumbersForComponents",
        "InformationOnSourcesOfSpareParts",
        "SafetyMeasures",
        "Pre-consumerRecycledNickelShare",
        "Pre-consumerRecycledCobaltShare",
        "Pre-consumerRecycledLithiumShare",
        "Post-consumerRecycledNickelShare",
        "Post-consumerRecycledCobaltShare",
        "Post-consumerRecycledLithiumShare",
        "RecycledLeadShare",
        "RenewableContentShare",
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention",
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries",
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife"
      ]
    },
    "IdentifiersAndProductData": {
      "type": "object",
      "properties": {
        "DPPSchemaVersion": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "DPPStatus": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/DPP_status_type"
        },
        "DPPGranularity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "Date-timeOfLatestUpdateOfDPP": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "date-time"
        },
        "BatteryModelIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        },
        "UniqueBatteryIdentifierUniqueProductIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "BatterySerialNumber": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueEconomicOperatorIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueManufacturerIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueFacilityIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EconomicOperatorInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturerInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturingPlace": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ManufacturingDate": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "DateOfPuttingTheBatteryIntoService": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "WarrantyPeriodOfTheBattery": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "BatteryCategory": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_category_type"
        },
        "BatteryMass": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/gram_kg_decimal"
        },
        "BatteryStatus": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_status_type"
        }
      },
      "required": [
        "DPPSchemaVersion",
        "DPPStatus",
        "DPPGranularity",
        "Date-timeOfLatestUpdateOfDPP",
        "BatteryModelIdentifier",
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier",
        "UniqueBatteryIdentifierUniqueProductIdentifier",
        "BatterySerialNumber",
        "UniqueEconomicOperatorIdentifier",
        "UniqueManufacturerIdentifier",
        "UniqueFacilityIdentifier",
        "EconomicOperatorInformation",
        "ManufacturerInformation",
        "ManufacturingPlace",
        "ManufacturingDate",
        "WarrantyPeriodOfTheBattery",
        "BatteryCategory",
        "BatteryMass",
        "BatteryStatus"
      ]
    },
    "PerformanceAndDurability": {
      "type": "object",
      "properties": {
        "RatedCapacity": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_integer"
        },
        "RemainingCapacity": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_integer_2"
        },
        "CapacityFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "CertifiedUsableBatteryEnergy": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kilowatthour_integer"
        },
        "RemainingUsableBatteryEnergy": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/kilowatthour_integer"
        },
        "StateOfCertifiedEnergySOCE": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "StateOfChargeSoC": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MinimumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "MaximumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "NominalVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "OriginalPowerCapability": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celcius_integer"
        },
        "RemainingPowerCapability": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celcius_integer_2"
        },
        "PowerFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MaximumPermittedBatteryPower": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celsius_integer_onevalue"
        },
        "RatioBetweenNominalBatteryPowerAndBatteryEnergy": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_per_watt_hour_integer"
        },
        "InitialRoundTripEnergyEfficiency": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RoundTripEnergyEfficiencyAt50OfCycleLife": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "EnergyRoundTripEfficiencyFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InitialInternalResistanceOfBatteryCellAndPackModuleRecommended": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/ohm_integer"
        },
        "InternalResistanceIncreaseOfPackCellAndModuleRecommended": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "ExpectedLifetimeInCalendarYears": {
          "type": "number",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ExpectedLifetime-NumberOfCharge-dischargeCycles": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "NumberOfFullChargingAndDischargingCycles": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "Cycle-lifeReferenceTest": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "C-rateOfRelevantCycle-lifeTest": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/ampere_per_ampere_hour_decimal"
        },
        "CapacityThresholdForExhaustion": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "TemperatureInformation": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateLowerBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateUpperBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "NumberOfDeepDischargeEvents": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "NumberOfOverchargeEvents": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "InformationOnAccidents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "RatedCapacity",
        "CapacityFade",
        "StateOfCertifiedEnergySOCE",
        "StateOfChargeSoC",
        "MinimumVoltage",
        "MaximumVoltage",
        "NominalVoltage",
        "OriginalPowerCapability",
        "PowerFade",
        "MaximumPermittedBatteryPower",
        "InitialRoundTripEnergyEfficiency",
        "RoundTripEnergyEfficiencyAt50OfCycleLife",
        "EnergyRoundTripEfficiencyFade",
        "InitialInternalResistanceOfBatteryCellAndPackModuleRecommended",
        "InternalResistanceIncreaseOfPackCellAndModuleRecommended",
        "ExpectedLifetimeInCalendarYears",
        "ExpectedLifetime-NumberOfCharge-dischargeCycles",
        "NumberOfFullChargingAndDischargingCycles",
        "Cycle-lifeReferenceTest",
        "C-rateOfRelevantCycle-lifeTest",
        "CapacityThresholdForExhaustion",
        "TemperatureInformation",
        "TemperatureRangeIdleStateLowerBoundary",
        "TemperatureRangeIdleStateUpperBoundary",
        "InformationOnAccidents"
      ]
    },
    "SupplyChainDueDiligence": {
      "type": "object",
      "properties": {
        "InformationOfDueDiligenceReport": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ThirdPartyAssurancesOfRecognisedSchemes": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "SupplyChainIndices": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "InformationOfDueDiligenceReport"
      ]
    },
    "SymbolsLabelsAndDocumentationOfConformity": {
      "type": "object",
      "properties": {
        "SeparateCollectionSymbol": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SymbolsForCadmiumAndLead": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "CarbonFootprintLabel": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ExtinguishingAgent": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Extinguishing_agent_type"
        },
        "MeaningOfLabelsAndSymbols": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EUDeclarationOfConformity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ResultsOfTestReportsProvingCompliance": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "SeparateCollectionSymbol",
        "SymbolsForCadmiumAndLead",
        "CarbonFootprintLabel",
        "ExtinguishingAgent",
        "MeaningOfLabelsAndSymbols",
        "EUDeclarationOfConformity",
        "ResultsOfTestReportsProvingCompliance"
      ]
    },
    "Battery_category_type": {
      "type": "object",
      "properties": {
        "batteryCategoryValue": {
          "$ref": "#/$defs/batteryCategoryCodes"
        }
      },
      "required": [
        "batteryCategoryValue"
      ]
    },
    "Battery_chemistry_type": {
      "type": "object",
      "properties": {
        "additionallyPossibleValue": {
          "type": "string"
        },
        "chemicalCodeValue": {
          "$ref": "#/$defs/customChemicalCodes"
        }
      }
    },
    "Battery_status_type": {
      "type": "object",
      "properties": {
        "batteryStatusValues": {
          "$ref": "#/$defs/batteryStatusCodes"
        }
      },
      "required": [
        "batteryStatusValues"
      ]
    },
    "DPP_status_type": {
      "type": "object",
      "properties": {
        "dppStatusValue": {
          "$ref": "#/$defs/dppStatusCodes"
        }
      },
      "required": [
        "dppStatusValue"
      ]
    },
    "Extinguishing_agent_type": {
      "type": "object",
      "properties": {
        "agentFireClass": {
          "type": "string"
        },
        "extinguishingAgent": {
          "type": "string"
        }
      }
    },
    "Operator_information_type": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "registeredTradeNameOrRegisteredTrademark": {
          "type": "string"
        },
        "postalAddress": {
          "type": "string"
        },
        "webAddress": {
          "type": "string"
        },
        "e-mailAddress": {
          "type": "string"
        }
      },
      "required": [
        "name",
        "registeredTradeNameOrRegisteredTrademark",
        "postalAddress"
      ]
    },
    "ampere_per_ampere_hour_decimal": {
      "type": "object",
      "properties": {
        "amperePerAmpereHourValue": {
          "type": "number"
        },
        "amperePerAmpereHour": {
          "$ref": "#/$defs/amperePerAmpereHour"
        }
      },
      "required": [
        "amperePerAmpereHourValue",
        "amperePerAmpereHour"
      ]
    },
    "amperehour_miliamperehour_integer": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "integer"
        },
        "ampereHourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "ampereHourMiliamperehour"
      ]
    },
    "amperehour_miliamperehour_integer_2": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "integer"
        },
        "ampereHourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour_2"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "ampereHourMiliamperehour"
      ]
    },
    "celsius_integer": {
      "type": "object",
      "properties": {
        "degreeCelsius": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "celsiusValue": {
          "type": "integer"
        }
      },
      "required": [
        "degreeCelsius",
        "celsiusValue"
      ]
    },
    "gram_kg_decimal": {
      "type": "object",
      "properties": {
        "gramKg": {
          "$ref": "#/$defs/gram_kg"
        },
        "gramKgValue": {
          "type": "number"
        }
      },
      "required": [
        "gramKg",
        "gramKgValue"
      ]
    },
    "kg_CO2-equivalent_integer": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentValue": {
          "type": "integer"
        },
        "kgCO2-equivalent": {
          "$ref": "#/$defs/kgCO2-equivalent"
        }
      },
      "required": [
        "kgCO2-equivalentValue",
        "kgCO2-equivalent"
      ]
    },
    "kg_CO2-equivalent_per_kilowatt_hour_decimal": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentPerKilowattHourValue": {
          "type": "number"
        },
        "kgCO2-equivalentPerKilowattHour": {
          "$ref": "#/$defs/kgCO2-equivalentPerKilowattHour"
        }
      },
      "required": [
        "kgCO2-equivalentPerKilowattHourValue",
        "kgCO2-equivalentPerKilowattHour"
      ]
    },
    "kilowatthour_integer": {
      "type": "object",
      "properties": {
        "kilowattHourValue": {
          "type": "integer"
        },
        "kilowattHour": {
          "$ref": "#/$defs/kilowattHour"
        }
      },
      "required": [
        "kilowattHourValue",
        "kilowattHour"
      ]
    },
    "ohm_integer": {
      "type": "object",
      "properties": {
        "ohmValue": {
          "type": "integer"
        },
        "ohm": {
          "$ref": "#/$defs/ohm"
        }
      },
      "required": [
        "ohmValue",
        "ohm"
      ]
    },
    "percent_decimal": {
      "type": "object",
      "properties": {
        "percent": {
          "$ref": "#/$defs/percent"
        },
        "percentageValue": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      },
      "required": [
        "percent",
        "percentageValue"
      ]
    },
    "volt_celsius_decimal": {
      "type": "object",
      "properties": {
        "voltValue": {
          "type": "number"
        },
        "volt": {
          "$ref": "#/$defs/volt"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        }
      },
      "required": [
        "voltValue",
        "volt"
      ]
    },
    "watt_celcius_integer": {
      "type": "object",
      "properties": {
        "wattValueAt80SoC": {
          "type": "integer"
        },
        "wattValueAt20SoC": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValueAt80SoC",
        "wattValueAt20SoC",
        "watt"
      ]
    },
    "watt_celcius_integer_2": {
      "type": "object",
      "properties": {
        "wattValueAt80SoC": {
          "type": "integer"
        },
        "wattValueAt20SoC": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        }
      },
      "required": [
        "wattValueAt80SoC",
        "wattValueAt20SoC",
        "watt"
      ]
    },
    "watt_celsius_integer_onevalue": {
      "type": "object",
      "properties": {
        "wattValue": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValue",
        "watt"
      ]
    },
    "watt_per_watt_hour_integer": {
      "type": "object",
      "properties": {
        "wattPerWattHourValue": {
          "type": "integer"
        },
        "wattPerWattHour": {
          "$ref": "#/$defs/wattPerWattHour"
        }
      },
      "required": [
        "wattPerWattHourValue",
        "wattPerWattHour"
      ]
    },
    "amperePerAmpereHour": {
      "type": "string",
      "enum": [
        "A/Ah"
      ]
    },
    "amperehour_miliamperehour": {
      "type": "string",
      "enum": [
        "Ah",
        "mAh"
      ]
    },
    "amperehour_miliamperehour_2": {
      "type": "string",
      "enum": [
        "Ah"
      ]
    },
    "batteryCategoryCodes": {
      "type": "string",
      "enum": [
        "electric vehicle battery"
      ]
    },
    "batteryStatusCodes": {
      "type": "string",
      "enum": [
        "original",
        "re-used",
        "remanufactured",
        "repurposed",
        "waste"
      ]
    },
    "customChemicalCodes": {
      "type": "string",
      "enum": [
        "Li-ion LCO",
        "Li-ion LFP",
        "Li-ion LMO",
        "Li-ion NCA",
        "Li-ion NMC",
        "Li-metal",
        "Na-ion",
        "Ni-Cd",
        "Ni-MH",
        "Pb"
      ]
    },
    "degreeCelsius": {
      "type": "string",
      "enum": [
        "°C"
      ]
    },
    "dppStatusCodes": {
      "type": "string",
      "enum": [
        "Active",
        "Archived",
        "Inactive",
        "Marked-for-deletion"
      ]
    },
    "gram_kg": {
      "type": "string",
      "enum": [
        "g",
        "kg"
      ]
    },
    "kgCO2-equivalent": {
      "type": "string",
      "enum": [
        "kgCO2-eq"
      ]
    },
    "kgCO2-equivalentPerKilowattHour": {
      "type": "string",
      "enum": [
        "kgCO2-eq/kWh"
      ]
    },
    "kilowattHour": {
      "type": "string",
      "enum": [
        "kWh"
      ]
    },
    "ohm": {
      "type": "string",
      "enum": [
        "Ohm"
      ]
    },
    "percent": {
      "type": "string",
      "enum": [
        "%"
      ]
    },
    "volt": {
      "type": "string",
      "enum": [
        "V"
      ]
    },
    "watt": {
      "type": "string",
      "enum": [
        "W"
      ]
    },
    "wattPerWattHour": {
      "type": "string",
      "enum": [
        "W/Wh"
      ]
    }
  }
}'::jsonb, 'e581ab6092b715b3ddcaca60d64df167b756670d5ff4feacd2ebfd14abe4868b', 'published', 'scripts/battery/generate_schema_seed.mjs'
from public.schema_definition where code = 'battery.ev'
on conflict (schema_definition_id, version) do nothing;

insert into public.schema_version (schema_definition_id, version, source_version, json_schema, checksum_sha256, status, created_by)
select id, '1.0.0', 'BatteryPass-Ready 1.0', '{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "Battery_Passport": {
      "$ref": "#/$defs/Battery_Passport_Master"
    }
  },
  "required": [
    "Battery_Passport"
  ],
  "$defs": {
    "Battery_Passport_Master": {
      "type": "object",
      "properties": {
        "SymbolsLabelsAndDocumentationOfConformity": {
          "$ref": "#/$defs/SymbolsLabelsAndDocumentationOfConformity"
        },
        "SupplyChainDueDiligence": {
          "$ref": "#/$defs/SupplyChainDueDiligence"
        },
        "PerformanceAndDurability": {
          "$ref": "#/$defs/PerformanceAndDurability"
        },
        "IdentifiersAndProductData": {
          "$ref": "#/$defs/IdentifiersAndProductData"
        },
        "CircularityAndResourceEfficiency": {
          "$ref": "#/$defs/CircularityAndResourceEfficiency"
        },
        "BatteryMaterialsAndComposition": {
          "$ref": "#/$defs/BatteryMaterialsAndComposition"
        },
        "BatteryCarbonFootprint": {
          "$ref": "#/$defs/BatteryCarbonFootprint"
        }
      },
      "required": [
        "SymbolsLabelsAndDocumentationOfConformity",
        "SupplyChainDueDiligence",
        "PerformanceAndDurability",
        "IdentifiersAndProductData",
        "CircularityAndResourceEfficiency",
        "BatteryMaterialsAndComposition",
        "BatteryCarbonFootprint"
      ]
    },
    "BatteryCarbonFootprint": {
      "type": "object",
      "properties": {
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "BatteryCarbonFootprintPerFunctionalUnit": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfMainProductProductionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfDistributionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "CarbonFootprintPerformanceClass": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "WebLinkToPublicCarbonFootprintStudy": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "AbsoluteBatteryCarbonFootprint": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_integer"
        }
      },
      "required": [
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage",
        "BatteryCarbonFootprintPerFunctionalUnit",
        "ContributionOfMainProductProductionLifecycleStage",
        "ContributionOfDistributionLifecycleStage",
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage",
        "CarbonFootprintPerformanceClass",
        "WebLinkToPublicCarbonFootprintStudy"
      ]
    },
    "BatteryMaterialsAndComposition": {
      "type": "object",
      "properties": {
        "BatteryChemistry": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_chemistry_type"
        },
        "CriticalRawMaterials": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "HazardousSubstances": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "MaterialsUsedInCathodeAnodeAndElectrolyte": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "BatteryChemistry",
        "CriticalRawMaterials",
        "HazardousSubstances",
        "MaterialsUsedInCathodeAnodeAndElectrolyte",
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons"
      ]
    },
    "CircularityAndResourceEfficiency": {
      "type": "object",
      "properties": {
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "PartNumbersForComponents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnSourcesOfSpareParts": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SafetyMeasures": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "Pre-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RecycledLeadShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RenewableContentShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack",
        "PartNumbersForComponents",
        "InformationOnSourcesOfSpareParts",
        "SafetyMeasures",
        "Pre-consumerRecycledNickelShare",
        "Pre-consumerRecycledCobaltShare",
        "Pre-consumerRecycledLithiumShare",
        "Post-consumerRecycledNickelShare",
        "Post-consumerRecycledCobaltShare",
        "Post-consumerRecycledLithiumShare",
        "RecycledLeadShare",
        "RenewableContentShare",
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention",
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries",
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife"
      ]
    },
    "IdentifiersAndProductData": {
      "type": "object",
      "properties": {
        "DPPSchemaVersion": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "DPPStatus": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/DPP_status_type"
        },
        "DPPGranularity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "Date-timeOfLatestUpdateOfDPP": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "date-time"
        },
        "BatteryModelIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        },
        "UniqueBatteryIdentifierUniqueProductIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "BatterySerialNumber": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueEconomicOperatorIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueManufacturerIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueFacilityIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EconomicOperatorInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturerInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturingPlace": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ManufacturingDate": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "DateOfPuttingTheBatteryIntoService": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "WarrantyPeriodOfTheBattery": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "BatteryCategory": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_category_type"
        },
        "BatteryMass": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/gram_kg_decimal"
        },
        "BatteryStatus": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_status_type"
        }
      },
      "required": [
        "DPPSchemaVersion",
        "DPPStatus",
        "DPPGranularity",
        "Date-timeOfLatestUpdateOfDPP",
        "BatteryModelIdentifier",
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier",
        "UniqueBatteryIdentifierUniqueProductIdentifier",
        "BatterySerialNumber",
        "UniqueEconomicOperatorIdentifier",
        "UniqueManufacturerIdentifier",
        "UniqueFacilityIdentifier",
        "EconomicOperatorInformation",
        "ManufacturerInformation",
        "ManufacturingPlace",
        "ManufacturingDate",
        "DateOfPuttingTheBatteryIntoService",
        "WarrantyPeriodOfTheBattery",
        "BatteryCategory",
        "BatteryMass",
        "BatteryStatus"
      ]
    },
    "PerformanceAndDurability": {
      "type": "object",
      "properties": {
        "RatedCapacity": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_integer"
        },
        "RemainingCapacity": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_integer_2"
        },
        "CapacityFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "StateOfChargeSoC": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MinimumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "MaximumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "NominalVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "OriginalPowerCapability": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celcius_integer"
        },
        "RemainingPowerCapability": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celcius_integer_2"
        },
        "PowerFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MaximumPermittedBatteryPower": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celsius_integer_onevalue"
        },
        "RatioBetweenNominalBatteryPowerAndBatteryEnergy": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_per_watt_hour_integer"
        },
        "InitialRoundTripEnergyEfficiency": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RoundTripEnergyEfficiencyAt50OfCycleLife": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RemainingRoundTripEnergyEfficiency": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "EnergyRoundTripEfficiencyFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InitialSelf-dischargeRate": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percentMonth_decimal"
        },
        "CurrentSelf-dischargeRate": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percentMonth_decimal"
        },
        "EvolutionOfSelf-dischargeRates": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InitialInternalResistanceOfBatteryCellAndPackModuleRecommended": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/ohm_integer"
        },
        "InternalResistanceIncreaseOfPackCellAndModuleRecommended": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "ExpectedLifetimeInCalendarYears": {
          "type": "number",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ExpectedLifetime-NumberOfCharge-dischargeCycles": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "NumberOfFullChargingAndDischargingCycles": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "Cycle-lifeReferenceTest": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "C-rateOfRelevantCycle-lifeTest": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/ampere_per_ampere_hour_decimal"
        },
        "EnergyThroughput": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/kilowatthour_decimal"
        },
        "CapacityThroughput": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_decimal"
        },
        "TemperatureInformation": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateLowerBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateUpperBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TimeSpentInExtremeTemperaturesAboveBoundary": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "TimeSpentInExtremeTemperaturesBelowBoundary": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "TimeSpentChargingDuringExtremeTemperaturesAboveBoundary": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "TimeSpentChargingDuringExtremeTemperaturesBelowBoundary": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "NumberOfDeepDischargeEvents": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "NumberOfOverchargeEvents": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "InformationOnAccidents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "RatedCapacity",
        "RemainingCapacity",
        "CapacityFade",
        "StateOfChargeSoC",
        "MinimumVoltage",
        "MaximumVoltage",
        "NominalVoltage",
        "OriginalPowerCapability",
        "RemainingPowerCapability",
        "PowerFade",
        "MaximumPermittedBatteryPower",
        "InitialRoundTripEnergyEfficiency",
        "RoundTripEnergyEfficiencyAt50OfCycleLife",
        "RemainingRoundTripEnergyEfficiency",
        "EnergyRoundTripEfficiencyFade",
        "EvolutionOfSelf-dischargeRates",
        "InitialInternalResistanceOfBatteryCellAndPackModuleRecommended",
        "InternalResistanceIncreaseOfPackCellAndModuleRecommended",
        "ExpectedLifetimeInCalendarYears",
        "ExpectedLifetime-NumberOfCharge-dischargeCycles",
        "NumberOfFullChargingAndDischargingCycles",
        "Cycle-lifeReferenceTest",
        "C-rateOfRelevantCycle-lifeTest",
        "EnergyThroughput",
        "CapacityThroughput",
        "TemperatureInformation",
        "TemperatureRangeIdleStateLowerBoundary",
        "TemperatureRangeIdleStateUpperBoundary",
        "TimeSpentInExtremeTemperaturesAboveBoundary",
        "TimeSpentInExtremeTemperaturesBelowBoundary",
        "TimeSpentChargingDuringExtremeTemperaturesAboveBoundary",
        "TimeSpentChargingDuringExtremeTemperaturesBelowBoundary",
        "NumberOfDeepDischargeEvents",
        "InformationOnAccidents"
      ]
    },
    "SupplyChainDueDiligence": {
      "type": "object",
      "properties": {
        "InformationOfDueDiligenceReport": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ThirdPartyAssurancesOfRecognisedSchemes": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "SupplyChainIndices": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "InformationOfDueDiligenceReport"
      ]
    },
    "SymbolsLabelsAndDocumentationOfConformity": {
      "type": "object",
      "properties": {
        "SeparateCollectionSymbol": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SymbolsForCadmiumAndLead": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "CarbonFootprintLabel": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ExtinguishingAgent": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Extinguishing_agent_type"
        },
        "MeaningOfLabelsAndSymbols": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EUDeclarationOfConformity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ResultsOfTestReportsProvingCompliance": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "SeparateCollectionSymbol",
        "SymbolsForCadmiumAndLead",
        "CarbonFootprintLabel",
        "ExtinguishingAgent",
        "MeaningOfLabelsAndSymbols",
        "EUDeclarationOfConformity",
        "ResultsOfTestReportsProvingCompliance"
      ]
    },
    "Battery_category_type": {
      "type": "object",
      "properties": {
        "batteryCategoryValue": {
          "$ref": "#/$defs/batteryCategoryCodes"
        }
      },
      "required": [
        "batteryCategoryValue"
      ]
    },
    "Battery_chemistry_type": {
      "type": "object",
      "properties": {
        "additionallyPossibleValue": {
          "type": "string"
        },
        "chemicalCodeValue": {
          "$ref": "#/$defs/customChemicalCodes"
        }
      }
    },
    "Battery_status_type": {
      "type": "object",
      "properties": {
        "batteryStatusValues": {
          "$ref": "#/$defs/batteryStatusCodes"
        }
      },
      "required": [
        "batteryStatusValues"
      ]
    },
    "DPP_status_type": {
      "type": "object",
      "properties": {
        "dppStatusValue": {
          "$ref": "#/$defs/dppStatusCodes"
        }
      },
      "required": [
        "dppStatusValue"
      ]
    },
    "Extinguishing_agent_type": {
      "type": "object",
      "properties": {
        "agentFireClass": {
          "type": "string"
        },
        "extinguishingAgent": {
          "type": "string"
        }
      }
    },
    "Operator_information_type": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "registeredTradeNameOrRegisteredTrademark": {
          "type": "string"
        },
        "postalAddress": {
          "type": "string"
        },
        "webAddress": {
          "type": "string"
        },
        "e-mailAddress": {
          "type": "string"
        }
      },
      "required": [
        "name",
        "registeredTradeNameOrRegisteredTrademark",
        "postalAddress"
      ]
    },
    "ampere_per_ampere_hour_decimal": {
      "type": "object",
      "properties": {
        "amperePerAmpereHourValue": {
          "type": "number"
        },
        "amperePerAmpereHour": {
          "$ref": "#/$defs/amperePerAmpereHour"
        }
      },
      "required": [
        "amperePerAmpereHourValue",
        "amperePerAmpereHour"
      ]
    },
    "amperehour_miliamperehour_decimal": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "number"
        },
        "amperehourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "amperehourMiliamperehour"
      ]
    },
    "amperehour_miliamperehour_integer": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "integer"
        },
        "ampereHourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour_2"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "ampereHourMiliamperehour"
      ]
    },
    "amperehour_miliamperehour_integer_2": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "integer"
        },
        "ampereHourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "ampereHourMiliamperehour"
      ]
    },
    "celsius_integer": {
      "type": "object",
      "properties": {
        "degreeCelsius": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "celsiusValue": {
          "type": "integer"
        }
      },
      "required": [
        "degreeCelsius",
        "celsiusValue"
      ]
    },
    "gram_kg_decimal": {
      "type": "object",
      "properties": {
        "gramKg": {
          "$ref": "#/$defs/gram_kg"
        },
        "gramKgValue": {
          "type": "number"
        }
      },
      "required": [
        "gramKg",
        "gramKgValue"
      ]
    },
    "kg_CO2-equivalent_integer": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentValue": {
          "type": "integer"
        },
        "kgCO2-equivalent": {
          "$ref": "#/$defs/kgCO2-equivalent"
        }
      },
      "required": [
        "kgCO2-equivalentValue",
        "kgCO2-equivalent"
      ]
    },
    "kg_CO2-equivalent_per_kilowatt_hour_decimal": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentPerKilowattHourValue": {
          "type": "number"
        },
        "kgCO2-equivalentPerKilowattHour": {
          "$ref": "#/$defs/kgCO2-equivalentPerKilowattHour"
        }
      },
      "required": [
        "kgCO2-equivalentPerKilowattHourValue",
        "kgCO2-equivalentPerKilowattHour"
      ]
    },
    "kilowatthour_decimal": {
      "type": "object",
      "properties": {
        "kilowattHourValue": {
          "type": "number"
        },
        "kilowattHour": {
          "$ref": "#/$defs/kilowattHour"
        }
      },
      "required": [
        "kilowattHourValue",
        "kilowattHour"
      ]
    },
    "ohm_integer": {
      "type": "object",
      "properties": {
        "ohmValue": {
          "type": "integer"
        },
        "ohm": {
          "$ref": "#/$defs/ohm"
        }
      },
      "required": [
        "ohmValue",
        "ohm"
      ]
    },
    "percentMonth_decimal": {
      "type": "object",
      "properties": {
        "percentMonth": {
          "$ref": "#/$defs/percentMonth"
        },
        "percentMonthValue": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      },
      "required": [
        "percentMonth",
        "percentMonthValue"
      ]
    },
    "percent_decimal": {
      "type": "object",
      "properties": {
        "percent": {
          "$ref": "#/$defs/percent"
        },
        "percentageValue": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      },
      "required": [
        "percent",
        "percentageValue"
      ]
    },
    "volt_celsius_decimal": {
      "type": "object",
      "properties": {
        "voltValue": {
          "type": "number"
        },
        "volt": {
          "$ref": "#/$defs/volt"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        }
      },
      "required": [
        "voltValue",
        "volt"
      ]
    },
    "watt_celcius_integer": {
      "type": "object",
      "properties": {
        "wattValueAt80SoC": {
          "type": "integer"
        },
        "wattValueAt20SoC": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValueAt80SoC",
        "wattValueAt20SoC",
        "watt"
      ]
    },
    "watt_celcius_integer_2": {
      "type": "object",
      "properties": {
        "wattValueAt80SoC": {
          "type": "integer"
        },
        "wattValueAt20SoC": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        }
      },
      "required": [
        "wattValueAt80SoC",
        "wattValueAt20SoC",
        "watt"
      ]
    },
    "watt_celsius_integer_onevalue": {
      "type": "object",
      "properties": {
        "wattValue": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValue",
        "watt"
      ]
    },
    "watt_per_watt_hour_integer": {
      "type": "object",
      "properties": {
        "wattPerWattHourValue": {
          "type": "integer"
        },
        "wattPerWattHour": {
          "$ref": "#/$defs/wattPerWattHour"
        }
      },
      "required": [
        "wattPerWattHourValue",
        "wattPerWattHour"
      ]
    },
    "amperePerAmpereHour": {
      "type": "string",
      "enum": [
        "A/Ah"
      ]
    },
    "amperehour_miliamperehour": {
      "type": "string",
      "enum": [
        "Ah"
      ]
    },
    "amperehour_miliamperehour_2": {
      "type": "string",
      "enum": [
        "Ah",
        "mAh"
      ]
    },
    "batteryCategoryCodes": {
      "type": "string",
      "enum": [
        "LMT battery"
      ]
    },
    "batteryStatusCodes": {
      "type": "string",
      "enum": [
        "original",
        "re-used",
        "remanufactured",
        "repurposed",
        "waste"
      ]
    },
    "customChemicalCodes": {
      "type": "string",
      "enum": [
        "Li-ion LCO",
        "Li-ion LFP",
        "Li-ion LMO",
        "Li-ion NCA",
        "Li-ion NMC",
        "Li-metal",
        "Na-ion",
        "Ni-Cd",
        "Ni-MH",
        "Pb"
      ]
    },
    "degreeCelsius": {
      "type": "string",
      "enum": [
        "°C"
      ]
    },
    "dppStatusCodes": {
      "type": "string",
      "enum": [
        "Active",
        "Archived",
        "Inactive",
        "Marked-for-deletion"
      ]
    },
    "gram_kg": {
      "type": "string",
      "enum": [
        "g",
        "kg"
      ]
    },
    "kgCO2-equivalent": {
      "type": "string",
      "enum": [
        "kgCO2-eq"
      ]
    },
    "kgCO2-equivalentPerKilowattHour": {
      "type": "string",
      "enum": [
        "kgCO2-eq/kWh"
      ]
    },
    "kilowattHour": {
      "type": "string",
      "enum": [
        "kWh"
      ]
    },
    "ohm": {
      "type": "string",
      "enum": [
        "Ohm"
      ]
    },
    "percent": {
      "type": "string",
      "enum": [
        "%"
      ]
    },
    "percentMonth": {
      "type": "string",
      "enum": [
        "%/month"
      ]
    },
    "volt": {
      "type": "string",
      "enum": [
        "V"
      ]
    },
    "watt": {
      "type": "string",
      "enum": [
        "W"
      ]
    },
    "wattPerWattHour": {
      "type": "string",
      "enum": [
        "W/Wh"
      ]
    }
  }
}'::jsonb, '8f07f5a72b984dae77d14d083333783e53edc3381efc3003d6c718a978b93681', 'published', 'scripts/battery/generate_schema_seed.mjs'
from public.schema_definition where code = 'battery.lmt'
on conflict (schema_definition_id, version) do nothing;

insert into public.schema_version (schema_definition_id, version, source_version, json_schema, checksum_sha256, status, created_by)
select id, '1.0.0', 'BatteryPass-Ready 1.0', '{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "Battery_Passport": {
      "$ref": "#/$defs/Battery_Passport_Master",
      "description": "Contains Battery Passport Information for Industrial Batteries without BMS"
    }
  },
  "required": [
    "Battery_Passport"
  ],
  "$defs": {
    "Battery_Passport_Master": {
      "type": "object",
      "properties": {
        "SymbolsLabelsAndDocumentationOfConformity": {
          "$ref": "#/$defs/SymbolsLabelsAndDocumentationOfConformity"
        },
        "SupplyChainDueDiligence": {
          "$ref": "#/$defs/SupplyChainDueDiligence"
        },
        "PerformanceAndDurability": {
          "$ref": "#/$defs/PerformanceAndDurability"
        },
        "IdentifiersAndProductData": {
          "$ref": "#/$defs/IdentifiersAndProductData"
        },
        "CircularityAndResourceEfficiency": {
          "$ref": "#/$defs/CircularityAndResourceEfficiency"
        },
        "BatteryMaterialsAndComposition": {
          "$ref": "#/$defs/BatteryMaterialsAndComposition"
        },
        "BatteryCarbonFootprint": {
          "$ref": "#/$defs/BatteryCarbonFootprint"
        }
      },
      "required": [
        "SymbolsLabelsAndDocumentationOfConformity",
        "SupplyChainDueDiligence",
        "PerformanceAndDurability",
        "IdentifiersAndProductData",
        "CircularityAndResourceEfficiency",
        "BatteryMaterialsAndComposition",
        "BatteryCarbonFootprint"
      ]
    },
    "BatteryCarbonFootprint": {
      "type": "object",
      "properties": {
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "BatteryCarbonFootprintPerFunctionalUnit": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfMainProductProductionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfDistributionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "CarbonFootprintPerformanceClass": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "WebLinkToPublicCarbonFootprintStudy": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "AbsoluteBatteryCarbonFootprint": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_integer"
        }
      },
      "required": [
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage",
        "BatteryCarbonFootprintPerFunctionalUnit",
        "ContributionOfMainProductProductionLifecycleStage",
        "ContributionOfDistributionLifecycleStage",
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage",
        "CarbonFootprintPerformanceClass",
        "WebLinkToPublicCarbonFootprintStudy"
      ]
    },
    "BatteryMaterialsAndComposition": {
      "type": "object",
      "properties": {
        "BatteryChemistry": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_chemistry_type"
        },
        "CriticalRawMaterials": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "HazardousSubstances": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "MaterialsUsedInCathodeAnodeAndElectrolyte": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "BatteryChemistry",
        "CriticalRawMaterials",
        "HazardousSubstances",
        "MaterialsUsedInCathodeAnodeAndElectrolyte",
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons"
      ]
    },
    "CircularityAndResourceEfficiency": {
      "type": "object",
      "properties": {
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "PartNumbersForComponents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnSourcesOfSpareParts": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SafetyMeasures": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "Pre-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RecycledLeadShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RenewableContentShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack",
        "PartNumbersForComponents",
        "InformationOnSourcesOfSpareParts",
        "SafetyMeasures",
        "Pre-consumerRecycledNickelShare",
        "Pre-consumerRecycledCobaltShare",
        "Pre-consumerRecycledLithiumShare",
        "Post-consumerRecycledNickelShare",
        "Post-consumerRecycledCobaltShare",
        "Post-consumerRecycledLithiumShare",
        "RecycledLeadShare",
        "RenewableContentShare",
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention",
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries",
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife"
      ]
    },
    "IdentifiersAndProductData": {
      "type": "object",
      "properties": {
        "DPPSchemaVersion": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "DPPStatus": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/DPP_status_type"
        },
        "DPPGranularity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "Date-timeOfLatestUpdateOfDPP": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "date-time"
        },
        "BatteryModelIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        },
        "UniqueBatteryIdentifierUniqueProductIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "BatterySerialNumber": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueEconomicOperatorIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueManufacturerIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueFacilityIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EconomicOperatorInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturerInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturingPlace": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "WarrantyPeriodOfTheBattery": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "BatteryCategory": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_category_type"
        },
        "BatteryMass": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/gram_kg_decimal"
        },
        "BatteryStatus": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_status_type"
        }
      },
      "required": [
        "DPPSchemaVersion",
        "DPPStatus",
        "DPPGranularity",
        "Date-timeOfLatestUpdateOfDPP",
        "BatteryModelIdentifier",
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier",
        "UniqueBatteryIdentifierUniqueProductIdentifier",
        "BatterySerialNumber",
        "UniqueEconomicOperatorIdentifier",
        "UniqueManufacturerIdentifier",
        "UniqueFacilityIdentifier",
        "EconomicOperatorInformation",
        "ManufacturerInformation",
        "ManufacturingPlace",
        "WarrantyPeriodOfTheBattery",
        "BatteryCategory",
        "BatteryMass",
        "BatteryStatus"
      ]
    },
    "PerformanceAndDurability": {
      "type": "object",
      "properties": {
        "RatedCapacity": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_integer"
        },
        "CapacityFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "StateOfChargeSoC": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MinimumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "MaximumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "NominalVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "OriginalPowerCapability": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celcius_integer"
        },
        "PowerFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MaximumPermittedBatteryPower": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celsius_integer_onevalue"
        },
        "RatioBetweenNominalBatteryPowerAndBatteryEnergy": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_per_watt_hour_integer"
        },
        "InitialRoundTripEnergyEfficiency": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RoundTripEnergyEfficiencyAt50OfCycleLife": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "EnergyRoundTripEfficiencyFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "ExpectedLifetimeInCalendarYears": {
          "type": "number",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ExpectedLifetime-NumberOfCharge-dischargeCycles": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "Cycle-lifeReferenceTest": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "C-rateOfRelevantCycle-lifeTest": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/ampere_per_ampere_hour_decimal"
        },
        "TemperatureInformation": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateLowerBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateUpperBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "InformationOnAccidents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "RatedCapacity",
        "CapacityFade",
        "StateOfChargeSoC",
        "MinimumVoltage",
        "MaximumVoltage",
        "NominalVoltage",
        "OriginalPowerCapability",
        "PowerFade",
        "MaximumPermittedBatteryPower",
        "InitialRoundTripEnergyEfficiency",
        "RoundTripEnergyEfficiencyAt50OfCycleLife",
        "EnergyRoundTripEfficiencyFade",
        "ExpectedLifetimeInCalendarYears",
        "ExpectedLifetime-NumberOfCharge-dischargeCycles",
        "Cycle-lifeReferenceTest",
        "C-rateOfRelevantCycle-lifeTest",
        "TemperatureInformation",
        "TemperatureRangeIdleStateLowerBoundary",
        "TemperatureRangeIdleStateUpperBoundary",
        "InformationOnAccidents"
      ]
    },
    "SupplyChainDueDiligence": {
      "type": "object",
      "properties": {
        "InformationOfDueDiligenceReport": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ThirdPartyAssurancesOfRecognisedSchemes": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "SupplyChainIndices": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "InformationOfDueDiligenceReport"
      ]
    },
    "SymbolsLabelsAndDocumentationOfConformity": {
      "type": "object",
      "properties": {
        "SeparateCollectionSymbol": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SymbolsForCadmiumAndLead": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "CarbonFootprintLabel": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ExtinguishingAgent": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Extinguishing_agent_type"
        },
        "MeaningOfLabelsAndSymbols": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EUDeclarationOfConformity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ResultsOfTestReportsProvingCompliance": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "SeparateCollectionSymbol",
        "SymbolsForCadmiumAndLead",
        "CarbonFootprintLabel",
        "ExtinguishingAgent",
        "MeaningOfLabelsAndSymbols",
        "EUDeclarationOfConformity",
        "ResultsOfTestReportsProvingCompliance"
      ]
    },
    "Battery_category_type": {
      "type": "object",
      "properties": {
        "batteryCategoryValue": {
          "$ref": "#/$defs/batteryCategoryCodes"
        }
      },
      "required": [
        "batteryCategoryValue"
      ]
    },
    "Battery_chemistry_type": {
      "type": "object",
      "properties": {
        "additionallyPossibleValue": {
          "type": "string"
        },
        "chemicalCodeValue": {
          "$ref": "#/$defs/customChemicalCodes"
        }
      }
    },
    "Battery_status_type": {
      "type": "object",
      "properties": {
        "batteryStatusValues": {
          "$ref": "#/$defs/batteryStatusCodes"
        }
      },
      "required": [
        "batteryStatusValues"
      ]
    },
    "DPP_status_type": {
      "type": "object",
      "properties": {
        "dppStatusValue": {
          "$ref": "#/$defs/dppStatusCodes"
        }
      },
      "required": [
        "dppStatusValue"
      ]
    },
    "Extinguishing_agent_type": {
      "type": "object",
      "properties": {
        "agentFireClass": {
          "type": "string"
        },
        "extinguishingAgent": {
          "type": "string"
        }
      }
    },
    "Operator_information_type": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "registeredTradeNameOrRegisteredTrademark": {
          "type": "string"
        },
        "postalAddress": {
          "type": "string"
        },
        "webAddress": {
          "type": "string"
        },
        "e-mailAddress": {
          "type": "string"
        }
      },
      "required": [
        "name",
        "registeredTradeNameOrRegisteredTrademark",
        "postalAddress"
      ]
    },
    "ampere_per_ampere_hour_decimal": {
      "type": "object",
      "properties": {
        "amperePerAmpereHourValue": {
          "type": "number"
        },
        "amperePerAmpereHour": {
          "$ref": "#/$defs/amperePerAmpereHour"
        }
      },
      "required": [
        "amperePerAmpereHourValue",
        "amperePerAmpereHour"
      ]
    },
    "amperehour_miliamperehour_integer": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "integer"
        },
        "ampereHourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "ampereHourMiliamperehour"
      ]
    },
    "celsius_integer": {
      "type": "object",
      "properties": {
        "degreeCelsius": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "celsiusValue": {
          "type": "integer"
        }
      },
      "required": [
        "degreeCelsius",
        "celsiusValue"
      ]
    },
    "gram_kg_decimal": {
      "type": "object",
      "properties": {
        "gramKg": {
          "$ref": "#/$defs/gram_kg"
        },
        "gramKgValue": {
          "type": "number"
        }
      },
      "required": [
        "gramKg",
        "gramKgValue"
      ]
    },
    "kg_CO2-equivalent_integer": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentValue": {
          "type": "integer"
        },
        "kgCO2-equivalent": {
          "$ref": "#/$defs/kgCO2-equivalent"
        }
      },
      "required": [
        "kgCO2-equivalentValue",
        "kgCO2-equivalent"
      ]
    },
    "kg_CO2-equivalent_per_kilowatt_hour_decimal": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentPerKilowattHourValue": {
          "type": "number"
        },
        "kgCO2-equivalentPerKilowattHour": {
          "$ref": "#/$defs/kgCO2-equivalentPerKilowattHour"
        }
      },
      "required": [
        "kgCO2-equivalentPerKilowattHourValue",
        "kgCO2-equivalentPerKilowattHour"
      ]
    },
    "percent_decimal": {
      "type": "object",
      "properties": {
        "percent": {
          "$ref": "#/$defs/percent"
        },
        "percentageValue": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      },
      "required": [
        "percent",
        "percentageValue"
      ]
    },
    "volt_celsius_decimal": {
      "type": "object",
      "properties": {
        "voltValue": {
          "type": "number"
        },
        "volt": {
          "$ref": "#/$defs/volt"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        }
      },
      "required": [
        "voltValue",
        "volt"
      ]
    },
    "watt_celcius_integer": {
      "type": "object",
      "properties": {
        "wattValueAt80SoC": {
          "type": "integer"
        },
        "wattValueAt20SoC": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValueAt80SoC",
        "wattValueAt20SoC",
        "watt"
      ]
    },
    "watt_celsius_integer_onevalue": {
      "type": "object",
      "properties": {
        "wattValue": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValue",
        "watt"
      ]
    },
    "watt_per_watt_hour_integer": {
      "type": "object",
      "properties": {
        "wattPerWattHourValue": {
          "type": "integer"
        },
        "wattPerWattHour": {
          "$ref": "#/$defs/wattPerWattHour"
        }
      },
      "required": [
        "wattPerWattHourValue",
        "wattPerWattHour"
      ]
    },
    "amperePerAmpereHour": {
      "type": "string",
      "enum": [
        "A/Ah"
      ]
    },
    "amperehour_miliamperehour": {
      "type": "string",
      "enum": [
        "Ah",
        "mAh"
      ]
    },
    "batteryCategoryCodes": {
      "type": "string",
      "enum": [
        "industrial battery without BMS"
      ]
    },
    "batteryStatusCodes": {
      "type": "string",
      "enum": [
        "original",
        "re-used",
        "remanufactured",
        "repurposed",
        "waste"
      ]
    },
    "customChemicalCodes": {
      "type": "string",
      "enum": [
        "Pb"
      ]
    },
    "degreeCelsius": {
      "type": "string",
      "enum": [
        "°C"
      ]
    },
    "dppStatusCodes": {
      "type": "string",
      "enum": [
        "Active",
        "Archived",
        "Inactive",
        "Marked-for-deletion"
      ]
    },
    "gram_kg": {
      "type": "string",
      "enum": [
        "g",
        "kg"
      ]
    },
    "kgCO2-equivalent": {
      "type": "string",
      "enum": [
        "kgCO2-eq"
      ]
    },
    "kgCO2-equivalentPerKilowattHour": {
      "type": "string",
      "enum": [
        "kgCO2-eq/kWh"
      ]
    },
    "percent": {
      "type": "string",
      "enum": [
        "%"
      ]
    },
    "volt": {
      "type": "string",
      "enum": [
        "V"
      ]
    },
    "watt": {
      "type": "string",
      "enum": [
        "W"
      ]
    },
    "wattPerWattHour": {
      "type": "string",
      "enum": [
        "W/Wh"
      ]
    }
  }
}'::jsonb, 'cb00c02438c1c9bff48ea74c1417a3435edf3068e2945479d0fb96a9793b1cbe', 'published', 'scripts/battery/generate_schema_seed.mjs'
from public.schema_definition where code = 'battery.industrial.without_bms'
on conflict (schema_definition_id, version) do nothing;

insert into public.schema_version (schema_definition_id, version, source_version, json_schema, checksum_sha256, status, created_by)
select id, '1.0.0', 'BatteryPass-Ready 1.0', '{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "Battery_Passport": {
      "$ref": "#/$defs/Battery_Passport_Master"
    }
  },
  "required": [
    "Battery_Passport"
  ],
  "$defs": {
    "Battery_Passport_Master": {
      "type": "object",
      "properties": {
        "SymbolsLabelsAndDocumentationOfConformity": {
          "$ref": "#/$defs/SymbolsLabelsAndDocumentationOfConformity"
        },
        "SupplyChainDueDiligence": {
          "$ref": "#/$defs/SupplyChainDueDiligence"
        },
        "PerformanceAndDurability": {
          "$ref": "#/$defs/PerformanceAndDurability"
        },
        "IdentifiersAndProductData": {
          "$ref": "#/$defs/IdentifiersAndProductData"
        },
        "CircularityAndResourceEfficiency": {
          "$ref": "#/$defs/CircularityAndResourceEfficiency"
        },
        "BatteryMaterialsAndComposition": {
          "$ref": "#/$defs/BatteryMaterialsAndComposition"
        },
        "BatteryCarbonFootprint": {
          "$ref": "#/$defs/BatteryCarbonFootprint"
        }
      },
      "required": [
        "SymbolsLabelsAndDocumentationOfConformity",
        "SupplyChainDueDiligence",
        "PerformanceAndDurability",
        "IdentifiersAndProductData",
        "CircularityAndResourceEfficiency",
        "BatteryMaterialsAndComposition",
        "BatteryCarbonFootprint"
      ]
    },
    "BatteryCarbonFootprint": {
      "type": "object",
      "properties": {
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "BatteryCarbonFootprintPerFunctionalUnit": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfMainProductProductionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfDistributionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "CarbonFootprintPerformanceClass": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "WebLinkToPublicCarbonFootprintStudy": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "AbsoluteBatteryCarbonFootprint": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_integer"
        }
      },
      "required": [
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage",
        "BatteryCarbonFootprintPerFunctionalUnit",
        "ContributionOfMainProductProductionLifecycleStage",
        "ContributionOfDistributionLifecycleStage",
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage",
        "CarbonFootprintPerformanceClass",
        "WebLinkToPublicCarbonFootprintStudy"
      ]
    },
    "BatteryMaterialsAndComposition": {
      "type": "object",
      "properties": {
        "BatteryChemistry": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_chemistry_type"
        },
        "CriticalRawMaterials": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "HazardousSubstances": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "MaterialsUsedInCathodeAnodeAndElectrolyte": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "BatteryChemistry",
        "CriticalRawMaterials",
        "HazardousSubstances",
        "MaterialsUsedInCathodeAnodeAndElectrolyte",
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons"
      ]
    },
    "CircularityAndResourceEfficiency": {
      "type": "object",
      "properties": {
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "PartNumbersForComponents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnSourcesOfSpareParts": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SafetyMeasures": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "Pre-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RecycledLeadShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RenewableContentShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack",
        "PartNumbersForComponents",
        "InformationOnSourcesOfSpareParts",
        "SafetyMeasures",
        "Pre-consumerRecycledNickelShare",
        "Pre-consumerRecycledCobaltShare",
        "Pre-consumerRecycledLithiumShare",
        "Post-consumerRecycledNickelShare",
        "Post-consumerRecycledCobaltShare",
        "Post-consumerRecycledLithiumShare",
        "RecycledLeadShare",
        "RenewableContentShare",
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention",
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries",
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife"
      ]
    },
    "IdentifiersAndProductData": {
      "type": "object",
      "properties": {
        "DPPSchemaVersion": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "DPPStatus": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/DPP_status_type"
        },
        "DPPGranularity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "Date-timeOfLatestUpdateOfDPP": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "date-time"
        },
        "BatteryModelIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        },
        "UniqueBatteryIdentifierUniqueProductIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "BatterySerialNumber": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueEconomicOperatorIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueManufacturerIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueFacilityIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EconomicOperatorInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturerInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturingPlace": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ManufacturingDate": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "DateOfPuttingTheBatteryIntoService": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "WarrantyPeriodOfTheBattery": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "BatteryCategory": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_category_type"
        },
        "BatteryMass": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/gram_kg_decimal"
        },
        "BatteryStatus": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_status_type"
        }
      },
      "required": [
        "DPPSchemaVersion",
        "DPPStatus",
        "DPPGranularity",
        "Date-timeOfLatestUpdateOfDPP",
        "BatteryModelIdentifier",
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier",
        "UniqueBatteryIdentifierUniqueProductIdentifier",
        "BatterySerialNumber",
        "UniqueEconomicOperatorIdentifier",
        "UniqueManufacturerIdentifier",
        "UniqueFacilityIdentifier",
        "EconomicOperatorInformation",
        "ManufacturerInformation",
        "ManufacturingPlace",
        "ManufacturingDate",
        "WarrantyPeriodOfTheBattery",
        "BatteryCategory",
        "BatteryMass",
        "BatteryStatus"
      ]
    },
    "PerformanceAndDurability": {
      "type": "object",
      "properties": {
        "RatedCapacity": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_integer"
        },
        "RemainingCapacity": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_integer_2"
        },
        "CapacityFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "StateOfChargeSoC": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MinimumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "MaximumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "NominalVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "OriginalPowerCapability": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celcius_integer"
        },
        "RemainingPowerCapability": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celcius_integer_2"
        },
        "PowerFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MaximumPermittedBatteryPower": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celsius_integer_onevalue"
        },
        "RatioBetweenNominalBatteryPowerAndBatteryEnergy": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_per_watt_hour_integer"
        },
        "InitialRoundTripEnergyEfficiency": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RoundTripEnergyEfficiencyAt50OfCycleLife": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "EnergyRoundTripEfficiencyFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InitialInternalResistanceOfBatteryCellAndPackModuleRecommended": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/ohm_integer"
        },
        "InternalResistanceIncreaseOfPackCellAndModuleRecommended": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "ExpectedLifetimeInCalendarYears": {
          "type": "number",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ExpectedLifetime-NumberOfCharge-dischargeCycles": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "NumberOfFullChargingAndDischargingCycles": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "Cycle-lifeReferenceTest": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "C-rateOfRelevantCycle-lifeTest": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/ampere_per_ampere_hour_decimal"
        },
        "TemperatureInformation": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateLowerBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateUpperBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "NumberOfDeepDischargeEvents": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "NumberOfOverchargeEvents": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "InformationOnAccidents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "RatedCapacity",
        "CapacityFade",
        "StateOfChargeSoC",
        "MinimumVoltage",
        "MaximumVoltage",
        "NominalVoltage",
        "OriginalPowerCapability",
        "PowerFade",
        "MaximumPermittedBatteryPower",
        "InitialRoundTripEnergyEfficiency",
        "RoundTripEnergyEfficiencyAt50OfCycleLife",
        "EnergyRoundTripEfficiencyFade",
        "InitialInternalResistanceOfBatteryCellAndPackModuleRecommended",
        "InternalResistanceIncreaseOfPackCellAndModuleRecommended",
        "ExpectedLifetimeInCalendarYears",
        "ExpectedLifetime-NumberOfCharge-dischargeCycles",
        "NumberOfFullChargingAndDischargingCycles",
        "Cycle-lifeReferenceTest",
        "C-rateOfRelevantCycle-lifeTest",
        "TemperatureInformation",
        "TemperatureRangeIdleStateLowerBoundary",
        "TemperatureRangeIdleStateUpperBoundary",
        "InformationOnAccidents"
      ]
    },
    "SupplyChainDueDiligence": {
      "type": "object",
      "properties": {
        "InformationOfDueDiligenceReport": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ThirdPartyAssurancesOfRecognisedSchemes": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "SupplyChainIndices": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "InformationOfDueDiligenceReport"
      ]
    },
    "SymbolsLabelsAndDocumentationOfConformity": {
      "type": "object",
      "properties": {
        "SeparateCollectionSymbol": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SymbolsForCadmiumAndLead": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "CarbonFootprintLabel": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ExtinguishingAgent": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Extinguishing_agent_type"
        },
        "MeaningOfLabelsAndSymbols": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EUDeclarationOfConformity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ResultsOfTestReportsProvingCompliance": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "SeparateCollectionSymbol",
        "SymbolsForCadmiumAndLead",
        "CarbonFootprintLabel",
        "ExtinguishingAgent",
        "MeaningOfLabelsAndSymbols",
        "EUDeclarationOfConformity",
        "ResultsOfTestReportsProvingCompliance"
      ]
    },
    "Battery_category_type": {
      "type": "object",
      "properties": {
        "batteryCategoryValue": {
          "$ref": "#/$defs/batteryCategoryCodes"
        }
      },
      "required": [
        "batteryCategoryValue"
      ]
    },
    "Battery_chemistry_type": {
      "type": "object",
      "properties": {
        "additionallyPossibleValue": {
          "type": "string"
        },
        "chemicalCodeValue": {
          "$ref": "#/$defs/customChemicalCodes"
        }
      }
    },
    "Battery_status_type": {
      "type": "object",
      "properties": {
        "batteryStatusValues": {
          "$ref": "#/$defs/batteryStatusCodes"
        }
      },
      "required": [
        "batteryStatusValues"
      ]
    },
    "DPP_status_type": {
      "type": "object",
      "properties": {
        "dppStatusValue": {
          "$ref": "#/$defs/dppStatusCodes"
        }
      },
      "required": [
        "dppStatusValue"
      ]
    },
    "Extinguishing_agent_type": {
      "type": "object",
      "properties": {
        "agentFireClass": {
          "type": "string"
        },
        "extinguishingAgent": {
          "type": "string"
        }
      }
    },
    "Operator_information_type": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "registeredTradeNameOrRegisteredTrademark": {
          "type": "string"
        },
        "postalAddress": {
          "type": "string"
        },
        "webAddress": {
          "type": "string"
        },
        "e-mailAddress": {
          "type": "string"
        }
      },
      "required": [
        "name",
        "registeredTradeNameOrRegisteredTrademark",
        "postalAddress"
      ]
    },
    "ampere_per_ampere_hour_decimal": {
      "type": "object",
      "properties": {
        "amperePerAmpereHourValue": {
          "type": "number"
        },
        "amperePerAmpereHour": {
          "$ref": "#/$defs/amperePerAmpereHour"
        }
      },
      "required": [
        "amperePerAmpereHourValue",
        "amperePerAmpereHour"
      ]
    },
    "amperehour_miliamperehour_integer": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "integer"
        },
        "ampereHourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "ampereHourMiliamperehour"
      ]
    },
    "amperehour_miliamperehour_integer_2": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "integer"
        },
        "ampereHourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour_2"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "ampereHourMiliamperehour"
      ]
    },
    "celsius_integer": {
      "type": "object",
      "properties": {
        "degreeCelsius": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "celsiusValue": {
          "type": "integer"
        }
      },
      "required": [
        "degreeCelsius",
        "celsiusValue"
      ]
    },
    "gram_kg_decimal": {
      "type": "object",
      "properties": {
        "gramKg": {
          "$ref": "#/$defs/gram_kg"
        },
        "gramKgValue": {
          "type": "number"
        }
      },
      "required": [
        "gramKg",
        "gramKgValue"
      ]
    },
    "kg_CO2-equivalent_integer": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentValue": {
          "type": "integer"
        },
        "kgCO2-equivalent": {
          "$ref": "#/$defs/kgCO2-equivalent"
        }
      },
      "required": [
        "kgCO2-equivalentValue",
        "kgCO2-equivalent"
      ]
    },
    "kg_CO2-equivalent_per_kilowatt_hour_decimal": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentPerKilowattHourValue": {
          "type": "number"
        },
        "kgCO2-equivalentPerKilowattHour": {
          "$ref": "#/$defs/kgCO2-equivalentPerKilowattHour"
        }
      },
      "required": [
        "kgCO2-equivalentPerKilowattHourValue",
        "kgCO2-equivalentPerKilowattHour"
      ]
    },
    "ohm_integer": {
      "type": "object",
      "properties": {
        "ohmValue": {
          "type": "integer"
        },
        "ohm": {
          "$ref": "#/$defs/ohm"
        }
      },
      "required": [
        "ohmValue",
        "ohm"
      ]
    },
    "percent_decimal": {
      "type": "object",
      "properties": {
        "percent": {
          "$ref": "#/$defs/percent"
        },
        "percentageValue": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      },
      "required": [
        "percent",
        "percentageValue"
      ]
    },
    "volt_celsius_decimal": {
      "type": "object",
      "properties": {
        "voltValue": {
          "type": "number"
        },
        "volt": {
          "$ref": "#/$defs/volt"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        }
      },
      "required": [
        "voltValue",
        "volt"
      ]
    },
    "watt_celcius_integer": {
      "type": "object",
      "properties": {
        "wattValueAt80SoC": {
          "type": "integer"
        },
        "wattValueAt20SoC": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValueAt80SoC",
        "wattValueAt20SoC",
        "watt"
      ]
    },
    "watt_celcius_integer_2": {
      "type": "object",
      "properties": {
        "wattValueAt80SoC": {
          "type": "integer"
        },
        "wattValueAt20SoC": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        }
      },
      "required": [
        "wattValueAt80SoC",
        "wattValueAt20SoC",
        "watt"
      ]
    },
    "watt_celsius_integer_onevalue": {
      "type": "object",
      "properties": {
        "wattValue": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValue",
        "watt"
      ]
    },
    "watt_per_watt_hour_integer": {
      "type": "object",
      "properties": {
        "wattPerWattHourValue": {
          "type": "integer"
        },
        "wattPerWattHour": {
          "$ref": "#/$defs/wattPerWattHour"
        }
      },
      "required": [
        "wattPerWattHourValue",
        "wattPerWattHour"
      ]
    },
    "amperePerAmpereHour": {
      "type": "string",
      "enum": [
        "A/Ah"
      ]
    },
    "amperehour_miliamperehour": {
      "type": "string",
      "enum": [
        "Ah",
        "mAh"
      ]
    },
    "amperehour_miliamperehour_2": {
      "type": "string",
      "enum": [
        "Ah"
      ]
    },
    "batteryCategoryCodes": {
      "type": "string",
      "enum": [
        "industrial/non-stationary battery"
      ]
    },
    "batteryStatusCodes": {
      "type": "string",
      "enum": [
        "original",
        "re-used",
        "remanufactured",
        "repurposed",
        "waste"
      ]
    },
    "customChemicalCodes": {
      "type": "string",
      "enum": [
        "Li-ion LCO",
        "Li-ion LFP",
        "Li-ion LMO",
        "Li-ion NCA",
        "Li-ion NMC",
        "Li-metal",
        "Na-ion",
        "Ni-Cd",
        "Ni-MH",
        "Pb"
      ]
    },
    "degreeCelsius": {
      "type": "string",
      "enum": [
        "°C"
      ]
    },
    "dppStatusCodes": {
      "type": "string",
      "enum": [
        "Active",
        "Archived",
        "Inactive",
        "Marked-for-deletion"
      ]
    },
    "gram_kg": {
      "type": "string",
      "enum": [
        "g",
        "kg"
      ]
    },
    "kgCO2-equivalent": {
      "type": "string",
      "enum": [
        "kgCO2-eq"
      ]
    },
    "kgCO2-equivalentPerKilowattHour": {
      "type": "string",
      "enum": [
        "kgCO2-eq/kWh"
      ]
    },
    "ohm": {
      "type": "string",
      "enum": [
        "Ohm"
      ]
    },
    "percent": {
      "type": "string",
      "enum": [
        "%"
      ]
    },
    "volt": {
      "type": "string",
      "enum": [
        "V"
      ]
    },
    "watt": {
      "type": "string",
      "enum": [
        "W"
      ]
    },
    "wattPerWattHour": {
      "type": "string",
      "enum": [
        "W/Wh"
      ]
    }
  }
}'::jsonb, '521e731b8fbd45907151e45ed038f14b4a5e77858b2a1dac5d237cb05da77768', 'published', 'scripts/battery/generate_schema_seed.mjs'
from public.schema_definition where code = 'battery.industrial.non_stationary'
on conflict (schema_definition_id, version) do nothing;

insert into public.schema_version (schema_definition_id, version, source_version, json_schema, checksum_sha256, status, created_by)
select id, '1.0.0', 'BatteryPass-Ready 1.0', '{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "Battery_Passport": {
      "$ref": "#/$defs/Battery_Passport_Master"
    }
  },
  "required": [
    "Battery_Passport"
  ],
  "$defs": {
    "Battery_Passport_Master": {
      "type": "object",
      "properties": {
        "SymbolsLabelsAndDocumentationOfConformity": {
          "$ref": "#/$defs/SymbolsLabelsAndDocumentationOfConformity"
        },
        "SupplyChainDueDiligence": {
          "$ref": "#/$defs/SupplyChainDueDiligence"
        },
        "PerformanceAndDurability": {
          "$ref": "#/$defs/PerformanceAndDurability"
        },
        "IdentifiersAndProductData": {
          "$ref": "#/$defs/IdentifiersAndProductData"
        },
        "CircularityAndResourceEfficiency": {
          "$ref": "#/$defs/CircularityAndResourceEfficiency"
        },
        "BatteryMaterialsAndComposition": {
          "$ref": "#/$defs/BatteryMaterialsAndComposition"
        },
        "BatteryCarbonFootprint": {
          "$ref": "#/$defs/BatteryCarbonFootprint"
        }
      },
      "required": [
        "SymbolsLabelsAndDocumentationOfConformity",
        "SupplyChainDueDiligence",
        "PerformanceAndDurability",
        "IdentifiersAndProductData",
        "CircularityAndResourceEfficiency",
        "BatteryMaterialsAndComposition",
        "BatteryCarbonFootprint"
      ]
    },
    "BatteryCarbonFootprint": {
      "type": "object",
      "properties": {
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "BatteryCarbonFootprintPerFunctionalUnit": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfMainProductProductionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfDistributionLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_per_kilowatt_hour_decimal"
        },
        "CarbonFootprintPerformanceClass": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "WebLinkToPublicCarbonFootprintStudy": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "AbsoluteBatteryCarbonFootprint": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/kg_CO2-equivalent_integer"
        }
      },
      "required": [
        "ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage",
        "BatteryCarbonFootprintPerFunctionalUnit",
        "ContributionOfMainProductProductionLifecycleStage",
        "ContributionOfDistributionLifecycleStage",
        "ContributionOfEndOfLifeAndRecyclingLifecycleStage",
        "CarbonFootprintPerformanceClass",
        "WebLinkToPublicCarbonFootprintStudy"
      ]
    },
    "BatteryMaterialsAndComposition": {
      "type": "object",
      "properties": {
        "BatteryChemistry": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_chemistry_type"
        },
        "CriticalRawMaterials": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "HazardousSubstances": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "MaterialsUsedInCathodeAnodeAndElectrolyte": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "BatteryChemistry",
        "CriticalRawMaterials",
        "HazardousSubstances",
        "MaterialsUsedInCathodeAnodeAndElectrolyte",
        "ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons"
      ]
    },
    "CircularityAndResourceEfficiency": {
      "type": "object",
      "properties": {
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "PartNumbersForComponents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnSourcesOfSpareParts": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SafetyMeasures": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "Pre-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Pre-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledNickelShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledCobaltShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "Post-consumerRecycledLithiumShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RecycledLeadShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RenewableContentShare": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack",
        "PartNumbersForComponents",
        "InformationOnSourcesOfSpareParts",
        "SafetyMeasures",
        "Pre-consumerRecycledNickelShare",
        "Pre-consumerRecycledCobaltShare",
        "Pre-consumerRecycledLithiumShare",
        "Post-consumerRecycledNickelShare",
        "Post-consumerRecycledCobaltShare",
        "Post-consumerRecycledLithiumShare",
        "RecycledLeadShare",
        "RenewableContentShare",
        "InformationOnTheRoleOfEnd-usersInContributingToWastePrevention",
        "InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries",
        "InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife"
      ]
    },
    "IdentifiersAndProductData": {
      "type": "object",
      "properties": {
        "DPPSchemaVersion": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "DPPStatus": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/DPP_status_type"
        },
        "DPPGranularity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "Date-timeOfLatestUpdateOfDPP": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "date-time"
        },
        "BatteryModelIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        },
        "UniqueBatteryIdentifierUniqueProductIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "BatterySerialNumber": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueEconomicOperatorIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueManufacturerIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "UniqueFacilityIdentifier": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EconomicOperatorInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturerInformation": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Operator_information_type"
        },
        "ManufacturingPlace": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ManufacturingDate": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "DateOfPuttingTheBatteryIntoService": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "WarrantyPeriodOfTheBattery": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "date"
        },
        "BatteryCategory": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_category_type"
        },
        "BatteryMass": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/gram_kg_decimal"
        },
        "BatteryStatus": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/Battery_status_type"
        }
      },
      "required": [
        "DPPSchemaVersion",
        "DPPStatus",
        "DPPGranularity",
        "Date-timeOfLatestUpdateOfDPP",
        "BatteryModelIdentifier",
        "UniqueBatteryPassportIdentifierUniqueDPPIdentifier",
        "UniqueBatteryIdentifierUniqueProductIdentifier",
        "BatterySerialNumber",
        "UniqueEconomicOperatorIdentifier",
        "UniqueManufacturerIdentifier",
        "UniqueFacilityIdentifier",
        "EconomicOperatorInformation",
        "ManufacturerInformation",
        "ManufacturingPlace",
        "ManufacturingDate",
        "DateOfPuttingTheBatteryIntoService",
        "WarrantyPeriodOfTheBattery",
        "BatteryCategory",
        "BatteryMass",
        "BatteryStatus"
      ]
    },
    "PerformanceAndDurability": {
      "type": "object",
      "properties": {
        "RatedCapacity": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_integer"
        },
        "RemainingCapacity": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_integer_2"
        },
        "CapacityFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "StateOfChargeSoC": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MinimumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "MaximumVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "NominalVoltage": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/volt_celsius_decimal"
        },
        "OriginalPowerCapability": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celcius_integer"
        },
        "RemainingPowerCapability": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celcius_integer_2"
        },
        "PowerFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "MaximumPermittedBatteryPower": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_celsius_integer_onevalue"
        },
        "RatioBetweenNominalBatteryPowerAndBatteryEnergy": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/watt_per_watt_hour_integer"
        },
        "InitialRoundTripEnergyEfficiency": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RoundTripEnergyEfficiencyAt50OfCycleLife": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "RemainingRoundTripEnergyEfficiency": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "EnergyRoundTripEfficiencyFade": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InitialSelf-dischargeRate": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/percentMonth_decimal"
        },
        "CurrentSelf-dischargeRate": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percentMonth_decimal"
        },
        "EvolutionOfSelf-dischargeRates": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "InitialInternalResistanceOfBatteryCellAndPackModuleRecommended": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/ohm_integer"
        },
        "InternalResistanceIncreaseOfPackCellAndModuleRecommended": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/percent_decimal"
        },
        "ExpectedLifetimeInCalendarYears": {
          "type": "number",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "ExpectedLifetime-NumberOfCharge-dischargeCycles": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "NumberOfFullChargingAndDischargingCycles": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "Cycle-lifeReferenceTest": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "C-rateOfRelevantCycle-lifeTest": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/ampere_per_ampere_hour_decimal"
        },
        "EnergyThroughput": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/kilowatthour_decimal"
        },
        "CapacityThroughput": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/amperehour_miliamperehour_decimal"
        },
        "TemperatureInformation": {
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateLowerBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TemperatureRangeIdleStateUpperBoundary": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/celsius_integer"
        },
        "TimeSpentInExtremeTemperaturesAboveBoundary": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "TimeSpentInExtremeTemperaturesBelowBoundary": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "TimeSpentChargingDuringExtremeTemperaturesAboveBoundary": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "TimeSpentChargingDuringExtremeTemperaturesBelowBoundary": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "NumberOfDeepDischargeEvents": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "NumberOfOverchargeEvents": {
          "type": "integer",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          }
        },
        "InformationOnAccidents": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "legitimate_interest"
            ],
            "write": [
              "economic_operator",
              "third_parties_authorized_by_economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "RatedCapacity",
        "RemainingCapacity",
        "CapacityFade",
        "StateOfChargeSoC",
        "MinimumVoltage",
        "MaximumVoltage",
        "NominalVoltage",
        "OriginalPowerCapability",
        "RemainingPowerCapability",
        "PowerFade",
        "MaximumPermittedBatteryPower",
        "InitialRoundTripEnergyEfficiency",
        "RoundTripEnergyEfficiencyAt50OfCycleLife",
        "RemainingRoundTripEnergyEfficiency",
        "EnergyRoundTripEfficiencyFade",
        "EvolutionOfSelf-dischargeRates",
        "InitialInternalResistanceOfBatteryCellAndPackModuleRecommended",
        "InternalResistanceIncreaseOfPackCellAndModuleRecommended",
        "ExpectedLifetimeInCalendarYears",
        "ExpectedLifetime-NumberOfCharge-dischargeCycles",
        "NumberOfFullChargingAndDischargingCycles",
        "Cycle-lifeReferenceTest",
        "C-rateOfRelevantCycle-lifeTest",
        "EnergyThroughput",
        "CapacityThroughput",
        "TemperatureInformation",
        "TemperatureRangeIdleStateLowerBoundary",
        "TemperatureRangeIdleStateUpperBoundary",
        "TimeSpentInExtremeTemperaturesAboveBoundary",
        "TimeSpentInExtremeTemperaturesBelowBoundary",
        "TimeSpentChargingDuringExtremeTemperaturesAboveBoundary",
        "TimeSpentChargingDuringExtremeTemperaturesBelowBoundary",
        "NumberOfDeepDischargeEvents",
        "InformationOnAccidents"
      ]
    },
    "SupplyChainDueDiligence": {
      "type": "object",
      "properties": {
        "InformationOfDueDiligenceReport": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ThirdPartyAssurancesOfRecognisedSchemes": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "SupplyChainIndices": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        }
      },
      "required": [
        "InformationOfDueDiligenceReport"
      ]
    },
    "SymbolsLabelsAndDocumentationOfConformity": {
      "type": "object",
      "properties": {
        "SeparateCollectionSymbol": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "SymbolsForCadmiumAndLead": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "CarbonFootprintLabel": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ExtinguishingAgent": {
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "$ref": "#/$defs/Extinguishing_agent_type"
        },
        "MeaningOfLabelsAndSymbols": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          }
        },
        "EUDeclarationOfConformity": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "public"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        },
        "ResultsOfTestReportsProvingCompliance": {
          "type": "string",
          "x-AccessRights": {
            "read": [
              "notified_bodies",
              "authorities",
              "commission"
            ],
            "write": [
              "economic_operator"
            ]
          },
          "format": "uri"
        }
      },
      "required": [
        "SeparateCollectionSymbol",
        "SymbolsForCadmiumAndLead",
        "CarbonFootprintLabel",
        "ExtinguishingAgent",
        "MeaningOfLabelsAndSymbols",
        "EUDeclarationOfConformity",
        "ResultsOfTestReportsProvingCompliance"
      ]
    },
    "Battery_category_type": {
      "type": "object",
      "properties": {
        "batteryCategoryValue": {
          "$ref": "#/$defs/batteryCategoryCodes"
        }
      },
      "required": [
        "batteryCategoryValue"
      ]
    },
    "Battery_chemistry_type": {
      "type": "object",
      "properties": {
        "additionallyPossibleValue": {
          "type": "string"
        },
        "chemicalCodeValue": {
          "$ref": "#/$defs/customChemicalCodes"
        }
      }
    },
    "Battery_status_type": {
      "type": "object",
      "properties": {
        "batteryStatusValues": {
          "$ref": "#/$defs/batteryStatusCodes"
        }
      },
      "required": [
        "batteryStatusValues"
      ]
    },
    "DPP_status_type": {
      "type": "object",
      "properties": {
        "dppStatusValue": {
          "$ref": "#/$defs/dppStatusCodes"
        }
      },
      "required": [
        "dppStatusValue"
      ]
    },
    "Extinguishing_agent_type": {
      "type": "object",
      "properties": {
        "agentFireClass": {
          "type": "string"
        },
        "extinguishingAgent": {
          "type": "string"
        }
      }
    },
    "Operator_information_type": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "registeredTradeNameOrRegisteredTrademark": {
          "type": "string"
        },
        "postalAddress": {
          "type": "string"
        },
        "webAddress": {
          "type": "string"
        },
        "e-mailAddress": {
          "type": "string"
        }
      },
      "required": [
        "name",
        "registeredTradeNameOrRegisteredTrademark",
        "postalAddress"
      ]
    },
    "ampere_per_ampere_hour_decimal": {
      "type": "object",
      "properties": {
        "amperePerAmpereHourValue": {
          "type": "number"
        },
        "amperePerAmpereHour": {
          "$ref": "#/$defs/amperePerAmpereHour"
        }
      },
      "required": [
        "amperePerAmpereHourValue",
        "amperePerAmpereHour"
      ]
    },
    "amperehour_miliamperehour_decimal": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "number"
        },
        "amperehourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "amperehourMiliamperehour"
      ]
    },
    "amperehour_miliamperehour_integer": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "integer"
        },
        "ampereHourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour_2"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "ampereHourMiliamperehour"
      ]
    },
    "amperehour_miliamperehour_integer_2": {
      "type": "object",
      "properties": {
        "amperehourMiliamperehourValue": {
          "type": "integer"
        },
        "ampereHourMiliamperehour": {
          "$ref": "#/$defs/amperehour_miliamperehour"
        }
      },
      "required": [
        "amperehourMiliamperehourValue",
        "ampereHourMiliamperehour"
      ]
    },
    "celsius_integer": {
      "type": "object",
      "properties": {
        "degreeCelsius": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "celsiusValue": {
          "type": "integer"
        }
      },
      "required": [
        "degreeCelsius",
        "celsiusValue"
      ]
    },
    "gram_kg_decimal": {
      "type": "object",
      "properties": {
        "gramKg": {
          "$ref": "#/$defs/gram_kg"
        },
        "gramKgValue": {
          "type": "number"
        }
      },
      "required": [
        "gramKg",
        "gramKgValue"
      ]
    },
    "kg_CO2-equivalent_integer": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentValue": {
          "type": "integer"
        },
        "kgCO2-equivalent": {
          "$ref": "#/$defs/kgCO2-equivalent"
        }
      },
      "required": [
        "kgCO2-equivalentValue",
        "kgCO2-equivalent"
      ]
    },
    "kg_CO2-equivalent_per_kilowatt_hour_decimal": {
      "type": "object",
      "properties": {
        "kgCO2-equivalentPerKilowattHourValue": {
          "type": "number"
        },
        "kgCO2-equivalentPerKilowattHour": {
          "$ref": "#/$defs/kgCO2-equivalentPerKilowattHour"
        }
      },
      "required": [
        "kgCO2-equivalentPerKilowattHourValue",
        "kgCO2-equivalentPerKilowattHour"
      ]
    },
    "kilowatthour_decimal": {
      "type": "object",
      "properties": {
        "kilowattHourValue": {
          "type": "number"
        },
        "kilowattHour": {
          "$ref": "#/$defs/kilowattHour"
        }
      },
      "required": [
        "kilowattHourValue",
        "kilowattHour"
      ]
    },
    "ohm_integer": {
      "type": "object",
      "properties": {
        "ohmValue": {
          "type": "integer"
        },
        "ohm": {
          "$ref": "#/$defs/ohm"
        }
      },
      "required": [
        "ohmValue",
        "ohm"
      ]
    },
    "percentMonth_decimal": {
      "type": "object",
      "properties": {
        "percentMonth": {
          "$ref": "#/$defs/percentMonth"
        },
        "percentMonthValue": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      },
      "required": [
        "percentMonth",
        "percentMonthValue"
      ]
    },
    "percent_decimal": {
      "type": "object",
      "properties": {
        "percent": {
          "$ref": "#/$defs/percent"
        },
        "percentageValue": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      },
      "required": [
        "percent",
        "percentageValue"
      ]
    },
    "volt_celsius_decimal": {
      "type": "object",
      "properties": {
        "voltValue": {
          "type": "number"
        },
        "volt": {
          "$ref": "#/$defs/volt"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        }
      },
      "required": [
        "voltValue",
        "volt"
      ]
    },
    "watt_celcius_integer": {
      "type": "object",
      "properties": {
        "wattValueAt80SoC": {
          "type": "integer"
        },
        "wattValueAt20SoC": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValueAt80SoC",
        "wattValueAt20SoC",
        "watt"
      ]
    },
    "watt_celcius_integer_2": {
      "type": "object",
      "properties": {
        "wattValueAt80SoC": {
          "type": "integer"
        },
        "wattValueAt20SoC": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        }
      },
      "required": [
        "wattValueAt80SoC",
        "wattValueAt20SoC",
        "watt"
      ]
    },
    "watt_celsius_integer_onevalue": {
      "type": "object",
      "properties": {
        "wattValue": {
          "type": "integer"
        },
        "watt": {
          "$ref": "#/$defs/watt"
        },
        "temperatureRangeUpperBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeLowerBoundaryValue": {
          "type": "integer"
        },
        "temperatureRangeUpperBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        },
        "temperatureRangeLowerBoundary": {
          "$ref": "#/$defs/degreeCelsius"
        }
      },
      "required": [
        "wattValue",
        "watt"
      ]
    },
    "watt_per_watt_hour_integer": {
      "type": "object",
      "properties": {
        "wattPerWattHourValue": {
          "type": "integer"
        },
        "wattPerWattHour": {
          "$ref": "#/$defs/wattPerWattHour"
        }
      },
      "required": [
        "wattPerWattHourValue",
        "wattPerWattHour"
      ]
    },
    "amperePerAmpereHour": {
      "type": "string",
      "enum": [
        "A/Ah"
      ]
    },
    "amperehour_miliamperehour": {
      "type": "string",
      "enum": [
        "Ah"
      ]
    },
    "amperehour_miliamperehour_2": {
      "type": "string",
      "enum": [
        "Ah",
        "mAh"
      ]
    },
    "batteryCategoryCodes": {
      "type": "string",
      "enum": [
        "industrial/stationary battery"
      ]
    },
    "batteryStatusCodes": {
      "type": "string",
      "enum": [
        "original",
        "re-used",
        "remanufactured",
        "repurposed",
        "waste"
      ]
    },
    "customChemicalCodes": {
      "type": "string",
      "enum": [
        "Li-ion LCO",
        "Li-ion LFP",
        "Li-ion LMO",
        "Li-ion NCA",
        "Li-ion NMC",
        "Li-metal",
        "Na-ion",
        "Ni-Cd",
        "Ni-MH",
        "Pb"
      ]
    },
    "degreeCelsius": {
      "type": "string",
      "enum": [
        "°C"
      ]
    },
    "dppStatusCodes": {
      "type": "string",
      "enum": [
        "Active",
        "Archived",
        "Inactive",
        "Marked-for-deletion"
      ]
    },
    "gram_kg": {
      "type": "string",
      "enum": [
        "g",
        "kg"
      ]
    },
    "kgCO2-equivalent": {
      "type": "string",
      "enum": [
        "kgCO2-eq"
      ]
    },
    "kgCO2-equivalentPerKilowattHour": {
      "type": "string",
      "enum": [
        "kgCO2-eq/kWh"
      ]
    },
    "kilowattHour": {
      "type": "string",
      "enum": [
        "kWh"
      ]
    },
    "ohm": {
      "type": "string",
      "enum": [
        "Ohm"
      ]
    },
    "percent": {
      "type": "string",
      "enum": [
        "%"
      ]
    },
    "percentMonth": {
      "type": "string",
      "enum": [
        "%/month"
      ]
    },
    "volt": {
      "type": "string",
      "enum": [
        "V"
      ]
    },
    "watt": {
      "type": "string",
      "enum": [
        "W"
      ]
    },
    "wattPerWattHour": {
      "type": "string",
      "enum": [
        "W/Wh"
      ]
    }
  }
}'::jsonb, '355aaae561b769a3cceb4217fc8b46ec32b64eb11831a31b39b00d9ac47ae58f', 'published', 'scripts/battery/generate_schema_seed.mjs'
from public.schema_definition where code = 'battery.industrial.stationary'
on conflict (schema_definition_id, version) do nothing;

insert into public.codelist (code, version, source_name, schema_version_id, label_en, label_zh, status)
select seed.code, '1.0.0', 'Greanlean + BatteryPass-Ready', sv.id, seed.label_en, seed.label_zh, 'draft'
from (values ('battery.category', 'Battery category', '电池类别'), ('battery.status', 'Battery status', '电池状态'), ('battery.chemistry', 'Battery chemistry', '电池化学体系')) as seed(code, label_en, label_zh)
join public.schema_definition sd on sd.code = 'battery.longlist'
join public.schema_version sv on sv.schema_definition_id = sd.id and sv.version = '1.3.0'
on conflict (code, version) do nothing;

insert into public.codelist_value (codelist_id, value_code, label_en, label_zh, sort_order)
select rows.codelist_id, rows.value_code, rows.label_en, rows.label_zh, rows.sort_order
from public.codelist cl cross join lateral (values (cl.id, 'ev', 'Electric vehicle battery', '电动汽车电池', 10), (cl.id, 'lmt', 'Light means of transport battery', '轻型交通工具电池', 20), (cl.id, 'industrial', 'Industrial battery', '工业电池', 30), (cl.id, 'portable', 'Portable battery', '便携式电池', 40), (cl.id, 'sli', 'Starting, lighting and ignition battery', '启动、照明和点火电池', 50), (cl.id, 'other', 'Other configurable battery', '其他可配置电池', 60)) as rows(codelist_id, value_code, label_en, label_zh, sort_order)
where cl.code = 'battery.category' and cl.version = '1.0.0' and cl.status = 'draft'
on conflict (codelist_id, value_code) do nothing;

insert into public.codelist_value (codelist_id, value_code, label_en, label_zh, sort_order)
select rows.codelist_id, rows.value_code, rows.label_en, rows.label_zh, rows.sort_order
from public.codelist cl cross join lateral (values (cl.id, 'original', 'original', 'original', 10), (cl.id, 'reused', 'reused', 'reused', 20), (cl.id, 'remanufactured', 'remanufactured', 'remanufactured', 30), (cl.id, 'repurposed', 'repurposed', 'repurposed', 40), (cl.id, 'waste', 'waste', 'waste', 50), (cl.id, 'exported', 'exported', 'exported', 60), (cl.id, 'unknown', 'unknown', 'unknown', 70)) as rows(codelist_id, value_code, label_en, label_zh, sort_order)
where cl.code = 'battery.status' and cl.version = '1.0.0' and cl.status = 'draft'
on conflict (codelist_id, value_code) do nothing;

insert into public.codelist_value (codelist_id, value_code, label_en, label_zh, sort_order)
select rows.codelist_id, rows.value_code, rows.label_en, rows.label_zh, rows.sort_order
from public.codelist cl cross join lateral (values (cl.id, 'Li-ion LCO', 'Li-ion LCO', 'Li-ion LCO', 10), (cl.id, 'Li-ion LFP', 'Li-ion LFP', 'Li-ion LFP', 20), (cl.id, 'Li-ion LMO', 'Li-ion LMO', 'Li-ion LMO', 30), (cl.id, 'Li-ion NCA', 'Li-ion NCA', 'Li-ion NCA', 40), (cl.id, 'Li-ion NMC', 'Li-ion NMC', 'Li-ion NMC', 50), (cl.id, 'Li-metal', 'Li-metal', 'Li-metal', 60), (cl.id, 'Na-ion', 'Na-ion', 'Na-ion', 70), (cl.id, 'Ni-Cd', 'Ni-Cd', 'Ni-Cd', 80), (cl.id, 'Ni-MH', 'Ni-MH', 'Ni-MH', 90), (cl.id, 'Pb', 'Pb', 'Pb', 100)) as rows(codelist_id, value_code, label_en, label_zh, sort_order)
where cl.code = 'battery.chemistry' and cl.version = '1.0.0' and cl.status = 'draft'
on conflict (codelist_id, value_code) do nothing;

insert into public.field_definition (schema_version_id, field_code, json_pointer, storage_path, label_en, label_zh, description_en, description_zh, data_type, unit_code, data_behavior, data_granularity, access_level_code, requirement_status, evidence_requirement, sort_order)
select rows.schema_version_id, rows.field_code, rows.json_pointer, rows.storage_path, rows.label_en, rows.label_zh, rows.description_en, rows.description_zh, rows.data_type, rows.unit_code, rows.data_behavior, rows.data_granularity, rows.access_level_code, rows.requirement_status, rows.evidence_requirement, rows.sort_order
from public.schema_definition sd join public.schema_version sv on sv.schema_definition_id = sd.id cross join lateral (values
  (sv.id, 'battery.dpp_schema_version', '/Battery_Passport/IdentifiersAndProductData/DPPSchemaVersion', 'battery_field_value.value_json', 'DPP Schema version', 'DPP Schema 版本', 'The reference standard the DPP instance schema refers to', '按适用法规和当前 Schema 版本填写“DPP Schema 版本”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 10),
  (sv.id, 'battery.dpp_status', '/Battery_Passport/IdentifiersAndProductData/DPPStatus', 'battery_field_value.value_json', 'DPP Status', 'DPP 状态', 'The current status of the DPP as a digital resource', '按适用法规和当前 Schema 版本填写“DPP 状态”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'ITEM', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 20),
  (sv.id, 'battery.dpp_granularity', '/Battery_Passport/IdentifiersAndProductData/DPPGranularity', 'battery_field_value.value_json', 'DPP Granularity', 'DPP 数据粒度', 'The required level of information with regard to product item, batch or model', '按适用法规和当前 Schema 版本填写“DPP 数据粒度”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 30),
  (sv.id, 'battery.date_time_of_latest_update_of_dpp', '/Battery_Passport/IdentifiersAndProductData/Date-timeOfLatestUpdateOfDPP', 'battery_lifecycle_event.event_data', 'Date-time of latest update of DPP', 'DPP 最近更新时间', 'Date and time of the latest update of the battery passport', '按适用法规和当前 Schema 版本填写“DPP 最近更新时间”，同时记录数据来源、采集时间和责任人。', 'datetime', null, 'DYNAMIC', 'ITEM', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 40),
  (sv.id, 'battery.unique_battery_passport_identifier_unique_dpp_identifier', '/Battery_Passport/IdentifiersAndProductData/UniqueBatteryPassportIdentifierUniqueDPPIdentifier', 'battery_lifecycle_event.event_data', 'Unique battery passport identifier / unique DPP identifier', '唯一电池护照标识 / 唯一 DPP 标识', 'The unique identifier of a battery passport, equivalent to the unique DPP identifier in JTC-24 draft standards', '按适用法规和当前 Schema 版本填写“唯一电池护照标识 / 唯一 DPP 标识”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'DYNAMIC', 'ITEM', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 50),
  (sv.id, 'battery.unique_battery_identifier_unique_product_identifier', '/Battery_Passport/IdentifiersAndProductData/UniqueBatteryIdentifierUniqueProductIdentifier', 'battery_field_value.value_json', 'Unique battery identifier / unique product identifier', '唯一电池标识 / 唯一产品标识', 'The unique identifier of the battery item, equivalent to the unique product identifier in JTC-24 draft standards', '按适用法规和当前 Schema 版本填写“唯一电池标识 / 唯一产品标识”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'ITEM', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 60),
  (sv.id, 'battery.battery_model_identifier', '/Battery_Passport/IdentifiersAndProductData/BatteryModelIdentifier', 'battery_field_value.value_json', 'Battery model identifier', '电池型号标识', 'The unique identifier of the battery model.', '按适用法规和当前 Schema 版本填写“电池型号标识”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 70),
  (sv.id, 'battery.battery_serial_number', '/Battery_Passport/IdentifiersAndProductData/BatterySerialNumber', 'battery_field_value.value_json', 'Battery serial number', '电池序列号', 'Serial number of the battery including information on the battery batch', '按适用法规和当前 Schema 版本填写“电池序列号”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'ITEM', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 80),
  (sv.id, 'battery.unique_economic_operator_identifier', '/Battery_Passport/IdentifiersAndProductData/UniqueEconomicOperatorIdentifier', 'battery_field_value.value_json', 'Unique economic operator identifier', '唯一经济运营者标识', 'The unique identifier of the economic operator', '按适用法规和当前 Schema 版本填写“唯一经济运营者标识”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'ITEM', 'AUTHORITY_ONLY', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 90),
  (sv.id, 'battery.unique_manufacturer_identifier', '/Battery_Passport/IdentifiersAndProductData/UniqueManufacturerIdentifier', 'battery_field_value.value_json', 'Unique manufacturer identifier', '唯一制造商标识', 'The unique identifier of the manufacturer of the battery.', '按适用法规和当前 Schema 版本填写“唯一制造商标识”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL_SITE', 'AUTHORITY_ONLY', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 100),
  (sv.id, 'battery.unique_facility_identifier', '/Battery_Passport/IdentifiersAndProductData/UniqueFacilityIdentifier', 'battery_field_value.value_json', 'Unique facility identifier', '唯一制造设施标识', 'The unique identifier of a facility', '按适用法规和当前 Schema 版本填写“唯一制造设施标识”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL_SITE', 'AUTHORITY_ONLY', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 110),
  (sv.id, 'battery.economic_operator_information', '/Battery_Passport/IdentifiersAndProductData/EconomicOperatorInformation', 'battery_field_value.value_json', 'Economic operator information', '经济运营者信息', 'Information related to the economic operator', '按适用法规和当前 Schema 版本填写“经济运营者信息”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'ITEM', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 120),
  (sv.id, 'battery.manufacturer_information', '/Battery_Passport/IdentifiersAndProductData/ManufacturerInformation', 'battery_field_value.value_json', 'Manufacturer information', '制造商信息', 'Information related to the manufacturer of the battery', '按适用法规和当前 Schema 版本填写“制造商信息”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 130),
  (sv.id, 'battery.manufacturing_place', '/Battery_Passport/IdentifiersAndProductData/ManufacturingPlace', 'battery_field_value.value_json', 'Manufacturing place', '制造地点', 'The place of manufacture of the battery', '按适用法规和当前 Schema 版本填写“制造地点”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL_SITE', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 140),
  (sv.id, 'battery.manufacturing_date', '/Battery_Passport/IdentifiersAndProductData/ManufacturingDate', 'battery_field_value.value_json', 'Manufacturing date', '制造日期', 'The date of manufacture of the battery', '按适用法规和当前 Schema 版本填写“制造日期”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'ITEM', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 150),
  (sv.id, 'battery.date_of_putting_the_battery_into_service', '/Battery_Passport/IdentifiersAndProductData/DateOfPuttingTheBatteryIntoService', 'battery_field_value.value_json', 'Date of putting the battery into service', '电池投入使用日期', 'The date of first use, for its intended purpose, in the European Union, of a battery, without having been previously placed on the market', '按适用法规和当前 Schema 版本填写“电池投入使用日期”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 160),
  (sv.id, 'battery.warranty_period_of_the_battery', '/Battery_Passport/IdentifiersAndProductData/WarrantyPeriodOfTheBattery', 'battery_field_value.value_json', 'Warranty period of the battery', '电池质保期', 'Commercial warranty period for the battery', '按适用法规和当前 Schema 版本填写“电池质保期”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 170),
  (sv.id, 'battery.battery_category', '/Battery_Passport/IdentifiersAndProductData/BatteryCategory', 'battery_field_value.value_json', 'Battery category', '电池类别', 'Description of the scope of application of a battery in terms of its use according to the battery regulation', '按适用法规和当前 Schema 版本填写“电池类别”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 180),
  (sv.id, 'battery.battery_mass', '/Battery_Passport/IdentifiersAndProductData/BatteryMass', 'battery_field_value.value_json', 'Battery mass', '电池质量', 'The mass of the battery', '按适用法规和当前 Schema 版本填写“电池质量”，同时记录数据来源、采集时间和责任人。', 'decimal', 'g or kg', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 190),
  (sv.id, 'battery.battery_status', '/Battery_Passport/IdentifiersAndProductData/BatteryStatus', 'battery_lifecycle_event.event_data', 'Battery status', '电池状态', 'Current status of the battery item in its life cycle', '按适用法规和当前 Schema 版本填写“电池状态”，同时记录数据来源、采集时间和责任人。', 'string', null, 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。"}'::jsonb, 200),
  (sv.id, 'battery.separate_collection_symbol', '/Battery_Passport/SymbolsLabelsAndDocumentationOfConformity/SeparateCollectionSymbol', 'battery_field_value.value_json', 'Separate collection symbol', '分类收集标识', 'Symbol indicating the necessity of separate collection', '按适用法规和当前 Schema 版本填写“分类收集标识”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"上传正式签署文件或实验室报告，并保存文件 Hash、版本和核验状态。"}'::jsonb, 210),
  (sv.id, 'battery.symbols_for_cadmium_and_lead', '/Battery_Passport/SymbolsLabelsAndDocumentationOfConformity/SymbolsForCadmiumAndLead', 'battery_field_value.value_json', 'Symbols for cadmium and lead', '镉和铅标识', 'Representation of the chemical symbol “Cd” for cadmium and “Pb” for lead contained in the battery', '按适用法规和当前 Schema 版本填写“镉和铅标识”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"上传正式签署文件或实验室报告，并保存文件 Hash、版本和核验状态。"}'::jsonb, 220),
  (sv.id, 'battery.carbon_footprint_label', '/Battery_Passport/SymbolsLabelsAndDocumentationOfConformity/CarbonFootprintLabel', 'battery_field_value.value_json', 'Carbon footprint label', '碳足迹标签', 'Label indicating the carbon footprint and carbon footprint performance class', '按适用法规和当前 Schema 版本填写“碳足迹标签”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"上传正式签署文件或实验室报告，并保存文件 Hash、版本和核验状态。"}'::jsonb, 230),
  (sv.id, 'battery.extinguishing_agent', '/Battery_Passport/SymbolsLabelsAndDocumentationOfConformity/ExtinguishingAgent', 'battery_field_value.value_json', 'Extinguishing agent', '灭火剂', 'Specification of the usable extinguishing agent', '按适用法规和当前 Schema 版本填写“灭火剂”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"上传正式签署文件或实验室报告，并保存文件 Hash、版本和核验状态。"}'::jsonb, 240),
  (sv.id, 'battery.meaning_of_labels_and_symbols', '/Battery_Passport/SymbolsLabelsAndDocumentationOfConformity/MeaningOfLabelsAndSymbols', 'battery_field_value.value_json', 'Meaning of labels and symbols', '标签和符号含义', 'Brief and easily understandable explanatory sentence conveying the meaning of symbols and labels used', '按适用法规和当前 Schema 版本填写“标签和符号含义”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"上传正式签署文件或实验室报告，并保存文件 Hash、版本和核验状态。"}'::jsonb, 250),
  (sv.id, 'battery.eu_declaration_of_conformity', '/Battery_Passport/SymbolsLabelsAndDocumentationOfConformity/EUDeclarationOfConformity', 'battery_field_value.value_json', 'EU declaration of conformity', '欧盟符合性声明', 'The document that declares compliance with requirements for placement on EU market', '按适用法规和当前 Schema 版本填写“欧盟符合性声明”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"上传正式签署文件或实验室报告，并保存文件 Hash、版本和核验状态。"}'::jsonb, 260),
  (sv.id, 'battery.results_of_test_reports_proving_compliance', '/Battery_Passport/SymbolsLabelsAndDocumentationOfConformity/ResultsOfTestReportsProvingCompliance', 'battery_field_value.value_json', 'Results of test reports proving compliance', '证明合规的测试报告结果', 'Test report results proving compliance with the requirements stated in the battery regulation', '按适用法规和当前 Schema 版本填写“证明合规的测试报告结果”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL_YEAR_SITE', 'AUTHORITY_ONLY', 'TBD', '{"required":true,"sourceSuggestionZh":"上传正式签署文件或实验室报告，并保存文件 Hash、版本和核验状态。"}'::jsonb, 270),
  (sv.id, 'battery.battery_carbon_footprint_per_functional_unit', '/Battery_Passport/BatteryCarbonFootprint/BatteryCarbonFootprintPerFunctionalUnit', 'battery_field_value.value_json', 'Battery carbon footprint per Functional Unit', '单位功能电池碳足迹', 'The battery carbon footprint must be included as declared in terms of kg of carbon dioxide equivalent per one kWh of the total energy provided by the battery over its expected service life.', '按适用法规和当前 Schema 版本填写“单位功能电池碳足迹”，同时记录数据来源、采集时间和责任人。', 'decimal', 'kgCO2eq/kWh', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用经核验的碳足迹声明或 LCA 研究，记录方法、功能单位和制造场所。"}'::jsonb, 280),
  (sv.id, 'battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', '/Battery_Passport/BatteryCarbonFootprint/ContributionOfRawMaterialAcquisitionAndPre-processingLifecycleStage', 'battery_field_value.value_json', 'Contribution of raw material acquisition and pre-processing lifecycle stage', '原材料获取和预处理阶段碳足迹贡献', 'Contribution of raw material acquisition and pre-processing lifecycle stage to the battery carbon footprint', '按适用法规和当前 Schema 版本填写“原材料获取和预处理阶段碳足迹贡献”，同时记录数据来源、采集时间和责任人。', 'decimal', 'kgCO2eq/kWh', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用经核验的碳足迹声明或 LCA 研究，记录方法、功能单位和制造场所。"}'::jsonb, 290),
  (sv.id, 'battery.contribution_of_main_product_production_lifecycle_stage', '/Battery_Passport/BatteryCarbonFootprint/ContributionOfMainProductProductionLifecycleStage', 'battery_field_value.value_json', 'Contribution of main product production lifecycle stage', '主要产品生产阶段碳足迹贡献', 'Contribution of the main product production lifecycle stage to the battery carbon footprint', '按适用法规和当前 Schema 版本填写“主要产品生产阶段碳足迹贡献”，同时记录数据来源、采集时间和责任人。', 'decimal', 'kgCO2eq/kWh', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用经核验的碳足迹声明或 LCA 研究，记录方法、功能单位和制造场所。"}'::jsonb, 300),
  (sv.id, 'battery.contribution_of_distribution_lifecycle_stage', '/Battery_Passport/BatteryCarbonFootprint/ContributionOfDistributionLifecycleStage', 'battery_field_value.value_json', 'Contribution of distribution lifecycle stage', '分销阶段碳足迹贡献', 'Contribution of the distribution lifecycle stage to the battery''s carbon footprint', '按适用法规和当前 Schema 版本填写“分销阶段碳足迹贡献”，同时记录数据来源、采集时间和责任人。', 'decimal', 'kgCO2eq/kWh', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用经核验的碳足迹声明或 LCA 研究，记录方法、功能单位和制造场所。"}'::jsonb, 310),
  (sv.id, 'battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', '/Battery_Passport/BatteryCarbonFootprint/ContributionOfEndOfLifeAndRecyclingLifecycleStage', 'battery_field_value.value_json', 'Contribution of end of life and recycling lifecycle stage', '生命周期结束和回收阶段碳足迹贡献', 'Contribution of the end of life and recycling lifecycle stage to the battery''s carbon footprint', '按适用法规和当前 Schema 版本填写“生命周期结束和回收阶段碳足迹贡献”，同时记录数据来源、采集时间和责任人。', 'decimal', 'kgCO2eq/kWh', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用经核验的碳足迹声明或 LCA 研究，记录方法、功能单位和制造场所。"}'::jsonb, 320),
  (sv.id, 'battery.carbon_footprint_performance_class', '/Battery_Passport/BatteryCarbonFootprint/CarbonFootprintPerformanceClass', 'battery_field_value.value_json', 'Carbon footprint performance class', '碳足迹绩效等级', 'Depending on the distribution of the values in the carbon footprint declarations of batteries placed on the market, a meaningful number of classes of performance shall be identified, with category A being the best class with the lowest carbon footprint life cycle impact, to enable market differentiation', '按适用法规和当前 Schema 版本填写“碳足迹绩效等级”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用经核验的碳足迹声明或 LCA 研究，记录方法、功能单位和制造场所。"}'::jsonb, 330),
  (sv.id, 'battery.web_link_to_public_carbon_footprint_study', '/Battery_Passport/BatteryCarbonFootprint/WebLinkToPublicCarbonFootprintStudy', 'battery_field_value.value_json', 'Web link to public carbon footprint study', '公开碳足迹研究网页链接', 'The public version of the carbon footprint study', '按适用法规和当前 Schema 版本填写“公开碳足迹研究网页链接”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"使用经核验的碳足迹声明或 LCA 研究，记录方法、功能单位和制造场所。"}'::jsonb, 340),
  (sv.id, 'battery.absolute_battery_carbon_footprint', '/Battery_Passport/BatteryCarbonFootprint/AbsoluteBatteryCarbonFootprint', 'battery_field_value.value_json', 'Absolute battery carbon footprint', '电池绝对碳足迹', 'Battery carbon footprint as absolute number', '按适用法规和当前 Schema 版本填写“电池绝对碳足迹”，同时记录数据来源、采集时间和责任人。', 'integer', 'kgCO2eq', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用经核验的碳足迹声明或 LCA 研究，记录方法、功能单位和制造场所。"}'::jsonb, 350),
  (sv.id, 'battery.information_of_due_diligence_report', '/Battery_Passport/SupplyChainDueDiligence/InformationOfDueDiligenceReport', 'battery_field_value.value_json', 'Information of due diligence report', '尽职调查报告信息', 'The report on the supply chain due diligence policy, risk management plan, and summary of third-party verification.', '按适用法规和当前 Schema 版本填写“尽职调查报告信息”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"使用责任采购、第三方保证和供应链尽调记录，不把链接本身视为已核验证据。"}'::jsonb, 360),
  (sv.id, 'battery.third_party_assurances_of_recognised_schemes', '/Battery_Passport/SupplyChainDueDiligence/ThirdPartyAssurancesOfRecognisedSchemes', 'battery_field_value.value_json', 'Third party assurances of recognised schemes', '认可计划的第三方保证', 'Information on supply chain scheme assurances granted by third-party actors', '按适用法规和当前 Schema 版本填写“认可计划的第三方保证”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"使用责任采购、第三方保证和供应链尽调记录，不把链接本身视为已核验证据。"}'::jsonb, 370),
  (sv.id, 'battery.supply_chain_indices', '/Battery_Passport/SupplyChainDueDiligence/SupplyChainIndices', 'battery_field_value.value_json', 'Supply chain indices', '供应链指数', 'Information on relevant supply chain indices', '按适用法规和当前 Schema 版本填写“供应链指数”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用责任采购、第三方保证和供应链尽调记录，不把链接本身视为已核验证据。"}'::jsonb, 380),
  (sv.id, 'battery.battery_chemistry', '/Battery_Passport/BatteryMaterialsAndComposition/BatteryChemistry', 'battery_field_value.value_json', 'Battery chemistry', '电池化学体系', 'The electrochemical composition reflecting active materials in cathode and anode, and - voluntarily - electrolyte', '按适用法规和当前 Schema 版本填写“电池化学体系”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用 BOM、供应商声明和化学检测结果，并记录材料角色和来源。"}'::jsonb, 390),
  (sv.id, 'battery.critical_raw_materials', '/Battery_Passport/BatteryMaterialsAndComposition/CriticalRawMaterials', 'battery_field_value.value_json', 'Critical raw materials', '关键原材料', 'Critical raw materials present in a concentration of more than 0,1%, weight by weight', '按适用法规和当前 Schema 版本填写“关键原材料”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用 BOM、供应商声明和化学检测结果，并记录材料角色和来源。"}'::jsonb, 400),
  (sv.id, 'battery.materials_used_in_cathode_anode_and_electrolyte', '/Battery_Passport/BatteryMaterialsAndComposition/MaterialsUsedInCathodeAnodeAndElectrolyte', 'battery_field_value.value_json', 'Materials used in cathode, anode and electrolyte', '正极、负极和电解液所用材料', 'Detailed composition of cathode, anode and electrolyte', '按适用法规和当前 Schema 版本填写“正极、负极和电解液所用材料”，同时记录数据来源、采集时间和责任人。', 'array', null, 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"使用 BOM、供应商声明和化学检测结果，并记录材料角色和来源。"}'::jsonb, 410),
  (sv.id, 'battery.hazardous_substances', '/Battery_Passport/BatteryMaterialsAndComposition/HazardousSubstances', 'battery_field_value.value_json', 'Hazardous substances', '有害物质', 'Substances of very high concern in the meaning of Article 3 (1) (69) which are present in the battery, other than mercury, cadmium and lead, with a concentration equal or above 0,1%, weight on weight.’', '按适用法规和当前 Schema 版本填写“有害物质”，同时记录数据来源、采集时间和责任人。', 'array', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用 BOM、供应商声明和化学检测结果，并记录材料角色和来源。"}'::jsonb, 420),
  (sv.id, 'battery.impact_of_substances_on_environment_human_health_safety_persons', '/Battery_Passport/BatteryMaterialsAndComposition/ImpactOfSubstancesOnEnvironmentHumanHealthSafetyPersons', 'battery_field_value.value_json', 'Impact of substances on environment, human health, safety, persons', '物质对环境、人体健康、安全和人员的影响', 'Elaboration on the impact of substances contained in the battery on the environment, human health and the safety of persons', '按适用法规和当前 Schema 版本填写“物质对环境、人体健康、安全和人员的影响”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用 BOM、供应商声明和化学检测结果，并记录材料角色和来源。"}'::jsonb, 430),
  (sv.id, 'battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', '/Battery_Passport/CircularityAndResourceEfficiency/DismantlingInformation-ManualsForTheRemovalAndTheDisassemblyOfTheBatteryPack', 'battery_field_value.value_json', 'Dismantling information: Manuals for the removal and the disassembly of the battery pack', '电池包移除和拆解手册', 'Manual(s) containing information on the removal and disassembly of the battery pack', '按适用法规和当前 Schema 版本填写“电池包移除和拆解手册”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":true,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 440),
  (sv.id, 'battery.part_numbers_for_components', '/Battery_Passport/CircularityAndResourceEfficiency/PartNumbersForComponents', 'battery_field_value.value_json', 'Part numbers for components', '组件零件编号', 'The part numbers of components of the battery', '按适用法规和当前 Schema 版本填写“组件零件编号”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":true,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 450),
  (sv.id, 'battery.information_on_sources_of_spare_parts', '/Battery_Passport/CircularityAndResourceEfficiency/InformationOnSourcesOfSpareParts', 'battery_field_value.value_json', 'Information on sources of spare parts', '备件来源信息', 'Information on how to contact sources of spare parts', '按适用法规和当前 Schema 版本填写“备件来源信息”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":true,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 460),
  (sv.id, 'battery.safety_measures', '/Battery_Passport/CircularityAndResourceEfficiency/SafetyMeasures', 'battery_field_value.value_json', 'Safety measures', '安全措施', 'Safety measures to be taken during battery handling, including the dismantling', '按适用法规和当前 Schema 版本填写“安全措施”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":true,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 470),
  (sv.id, 'battery.pre_consumer_recycled_nickel_share', '/Battery_Passport/CircularityAndResourceEfficiency/Pre-consumerRecycledNickelShare', 'battery_field_value.value_json', 'Pre-consumer recycled nickel share', '消费前再生镍比例', 'The share of nickel recycled from pre-consumer waste in the active materials of the battery', '按适用法规和当前 Schema 版本填写“消费前再生镍比例”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 480),
  (sv.id, 'battery.pre_consumer_recycled_cobalt_share', '/Battery_Passport/CircularityAndResourceEfficiency/Pre-consumerRecycledCobaltShare', 'battery_field_value.value_json', 'Pre-consumer recycled cobalt share', '消费前再生钴比例', 'The share of cobalt recycled from pre-consumer waste in the active materials of the battery', '按适用法规和当前 Schema 版本填写“消费前再生钴比例”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 490),
  (sv.id, 'battery.pre_consumer_recycled_lithium_share', '/Battery_Passport/CircularityAndResourceEfficiency/Pre-consumerRecycledLithiumShare', 'battery_field_value.value_json', 'Pre-consumer recycled lithium share', '消费前再生锂比例', 'The share of lithium recycled from pre-consumer waste in the active materials of the battery', '按适用法规和当前 Schema 版本填写“消费前再生锂比例”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 500),
  (sv.id, 'battery.post_consumer_recycled_nickel_share', '/Battery_Passport/CircularityAndResourceEfficiency/Post-consumerRecycledNickelShare', 'battery_field_value.value_json', 'Post-consumer recycled nickel share', '消费后再生镍比例', 'The share of nickel recycled from post-consumer waste in the active materials of the battery', '按适用法规和当前 Schema 版本填写“消费后再生镍比例”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 510),
  (sv.id, 'battery.post_consumer_recycled_cobalt_share', '/Battery_Passport/CircularityAndResourceEfficiency/Post-consumerRecycledCobaltShare', 'battery_field_value.value_json', 'Post-consumer recycled cobalt share', '消费后再生钴比例', 'The share of cobalt recycled from post-consumer waste in the active materials of the battery', '按适用法规和当前 Schema 版本填写“消费后再生钴比例”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 520),
  (sv.id, 'battery.post_consumer_recycled_lithium_share', '/Battery_Passport/CircularityAndResourceEfficiency/Post-consumerRecycledLithiumShare', 'battery_field_value.value_json', 'Post-consumer recycled lithium share', '消费后再生锂比例', 'The share of lithium recycled from post-consumer waste in the active materials of the battery', '按适用法规和当前 Schema 版本填写“消费后再生锂比例”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 530),
  (sv.id, 'battery.recycled_lead_share', '/Battery_Passport/CircularityAndResourceEfficiency/RecycledLeadShare', 'battery_field_value.value_json', 'Recycled lead share', '再生铅比例', 'The share of recycled lead in the active materials of the battery', '按适用法规和当前 Schema 版本填写“再生铅比例”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 540),
  (sv.id, 'battery.renewable_content_share', '/Battery_Passport/CircularityAndResourceEfficiency/RenewableContentShare', 'battery_field_value.value_json', 'Renewable content share', '可再生成分比例', 'Share of renewable content in the battery', '按适用法规和当前 Schema 版本填写“可再生成分比例”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL_YEAR_SITE', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 550),
  (sv.id, 'battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', '/Battery_Passport/CircularityAndResourceEfficiency/InformationOnTheRoleOfEnd-usersInContributingToWastePrevention', 'battery_field_value.value_json', 'Information on the role of end-users in contributing to waste prevention', '最终用户参与废物预防的信息', 'Information on how end-users can contribute to waste prevention', '按适用法规和当前 Schema 版本填写“最终用户参与废物预防的信息”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 560),
  (sv.id, 'battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', '/Battery_Passport/CircularityAndResourceEfficiency/InformationOnTheRoleOfEnd-usersInContributingToTheSeparateCollectionOfWasteBatteries', 'battery_field_value.value_json', 'Information on the role of end-users in contributing to the separate collection of waste batteries', '最终用户参与废旧电池分类收集的信息', 'Information on how end-users can contribute to the separate collection of waste batteries', '按适用法规和当前 Schema 版本填写“最终用户参与废旧电池分类收集的信息”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 570),
  (sv.id, 'battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', '/Battery_Passport/CircularityAndResourceEfficiency/InformationOnBatteryCollectionPreparationForSecondLifeAndOnTreatmentAtEndOfLife', 'battery_field_value.value_json', 'Information on battery collection, preparation for second life and on treatment at end of life', '电池收集、第二次寿命准备和寿命结束处理信息', 'Information on the collection of waste batteries, their preparation for second life and definitive treatment at end of life', '按适用法规和当前 Schema 版本填写“电池收集、第二次寿命准备和寿命结束处理信息”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"使用拆解手册、维修资料、标签文件和寿命结束处理说明。"}'::jsonb, 580),
  (sv.id, 'battery.rated_capacity', '/Battery_Passport/PerformanceAndDurability/RatedCapacity', 'battery_field_value.value_json', 'Rated capacity', '额定容量', 'The total number of ampere-hours that can be withdrawn from a fully charged battery under reference conditions', '按适用法规和当前 Schema 版本填写“额定容量”，同时记录数据来源、采集时间和责任人。', 'integer', 'Ah
or mAh (for LMT)', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 590),
  (sv.id, 'battery.remaining_capacity', '/Battery_Passport/PerformanceAndDurability/RemainingCapacity', 'battery_operating_metric.metric_value', 'Remaining capacity', '剩余容量', 'The corresponding in-use data attribute to rated capacity', '按适用法规和当前 Schema 版本填写“剩余容量”，同时记录数据来源、采集时间和责任人。', 'integer', 'Ah', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 600),
  (sv.id, 'battery.capacity_fade', '/Battery_Passport/PerformanceAndDurability/CapacityFade', 'battery_field_value.value_json', 'Capacity fade', '容量衰减', 'The decrease over time and upon usage in the amount of charge that a battery can deliver at the rated voltage, with respect to the original rated capacity as declared by the manufacturer', '按适用法规和当前 Schema 版本填写“容量衰减”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 610),
  (sv.id, 'battery.certified_usable_battery_energy', '/Battery_Passport/PerformanceAndDurability/CertifiedUsableBatteryEnergy', 'battery_field_value.value_json', 'Certified usable battery energy', '认证可用电池能量', 'The usable battery energy according to the procedure in the UN GTR No 22 as determined during the certification of the vehicle', '按适用法规和当前 Schema 版本填写“认证可用电池能量”，同时记录数据来源、采集时间和责任人。', 'integer', 'kWh', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 620),
  (sv.id, 'battery.remaining_usable_battery_energy', '/Battery_Passport/PerformanceAndDurability/RemainingUsableBatteryEnergy', 'battery_operating_metric.metric_value', 'Remaining usable battery energy', '剩余可用电池能量', 'The usable battery energy at the present point in the lifetime of a battery as determined according to the procedure in the UN GTR No 22', '按适用法规和当前 Schema 版本填写“剩余可用电池能量”，同时记录数据来源、采集时间和责任人。', 'integer', 'kWh', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 630),
  (sv.id, 'battery.state_of_certified_energy_soce', '/Battery_Passport/PerformanceAndDurability/StateOfCertifiedEnergySOCE', 'battery_operating_metric.metric_value', 'State of certified energy (SOCE)', '认证能量状态（SOCE）', 'The measured or on-board usable battery energy performance at a specific point in its lifetime, expressed as a percentage of the certified usable battery energy.', '按适用法规和当前 Schema 版本填写“认证能量状态（SOCE）”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 640),
  (sv.id, 'battery.state_of_charge_soc', '/Battery_Passport/PerformanceAndDurability/StateOfChargeSoC', 'battery_operating_metric.metric_value', 'State of Charge (SoC)', '荷电状态（SoC）', 'The available energy or charge in a battery expressed as a percentage of rated capacity as declared by the manufacturer. When the battery’s state of health is no longer equal to its initial condition, SoC refers to the maximum energy or charge that can be stored in the battery at the time of charging.', '按适用法规和当前 Schema 版本填写“荷电状态（SoC）”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 650),
  (sv.id, 'battery.minimum_voltage', '/Battery_Passport/PerformanceAndDurability/MinimumVoltage', 'battery_field_value.value_json', 'Minimum voltage', '最低电压', 'The lower voltage limit that the safe operation of the battery is rated for', '按适用法规和当前 Schema 版本填写“最低电压”，同时记录数据来源、采集时间和责任人。', 'decimal', 'V', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 660),
  (sv.id, 'battery.maximum_voltage', '/Battery_Passport/PerformanceAndDurability/MaximumVoltage', 'battery_field_value.value_json', 'Maximum voltage', '最高电压', 'The upper voltage limit that the safe operation of the battery is rated for', '按适用法规和当前 Schema 版本填写“最高电压”，同时记录数据来源、采集时间和责任人。', 'decimal', 'V', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 670),
  (sv.id, 'battery.nominal_voltage', '/Battery_Passport/PerformanceAndDurability/NominalVoltage', 'battery_field_value.value_json', 'Nominal voltage', '标称电压', 'The suitable approximate value of the voltage used to designate or identify the battery', '按适用法规和当前 Schema 版本填写“标称电压”，同时记录数据来源、采集时间和责任人。', 'decimal', 'V', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 680),
  (sv.id, 'battery.original_power_capability', '/Battery_Passport/PerformanceAndDurability/OriginalPowerCapability', 'battery_field_value.value_json', 'Original power capability', '初始功率能力', 'The amount of energy that a battery is capable to provide over a given period of time under reference conditions', '按适用法规和当前 Schema 版本填写“初始功率能力”，同时记录数据来源、采集时间和责任人。', 'integer', 'W', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 690),
  (sv.id, 'battery.remaining_power_capability', '/Battery_Passport/PerformanceAndDurability/RemainingPowerCapability', 'battery_operating_metric.metric_value', 'Remaining power capability', '剩余功率能力', 'The amount of energy that a battery is capable to provide over a given period of time under reference conditions at a distinct point in time during its usage', '按适用法规和当前 Schema 版本填写“剩余功率能力”，同时记录数据来源、采集时间和责任人。', 'integer', 'W', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 700),
  (sv.id, 'battery.power_fade', '/Battery_Passport/PerformanceAndDurability/PowerFade', 'battery_field_value.value_json', 'Power fade', '功率衰减', 'The decrease over time and upon usage in the amount of power that a battery can deliver at the rated voltage', '按适用法规和当前 Schema 版本填写“功率衰减”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 710),
  (sv.id, 'battery.maximum_permitted_battery_power', '/Battery_Passport/PerformanceAndDurability/MaximumPermittedBatteryPower', 'battery_field_value.value_json', 'Maximum permitted battery power', '最大允许电池功率', 'The value of maximum permitted power the battery is rated for and reflects the data relevant for power limits', '按适用法规和当前 Schema 版本填写“最大允许电池功率”，同时记录数据来源、采集时间和责任人。', 'integer', 'W', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 720),
  (sv.id, 'battery.ratio_between_nominal_battery_power_and_battery_energy', '/Battery_Passport/PerformanceAndDurability/RatioBetweenNominalBatteryPowerAndBatteryEnergy', 'battery_field_value.value_json', 'Ratio between nominal battery power and battery energy', '标称电池功率与电池能量比', 'The suitable approximate value of the power capability used to designate or identify the battery, while the battery energy is determined in reference conditions to be defined', '按适用法规和当前 Schema 版本填写“标称电池功率与电池能量比”，同时记录数据来源、采集时间和责任人。', 'integer', 'W/Wh', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 730),
  (sv.id, 'battery.initial_round_trip_energy_efficiency', '/Battery_Passport/PerformanceAndDurability/InitialRoundTripEnergyEfficiency', 'battery_field_value.value_json', 'Initial round trip energy efficiency', '初始往返能量效率', 'The ratio of the net energy delivered by a battery during a discharge test to the total energy required to restore the initial state of charge by a standard charge (see BattReg Annex IV (6))', '按适用法规和当前 Schema 版本填写“初始往返能量效率”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 740),
  (sv.id, 'battery.round_trip_energy_efficiency_at_50_of_cycle_life', '/Battery_Passport/PerformanceAndDurability/RoundTripEnergyEfficiencyAt50OfCycleLife', 'battery_field_value.value_json', 'Round trip energy efficiency at 50% of cycle life', '循环寿命 50% 时的往返能量效率', 'The ratio of the net energy delivered by a battery during a discharge test to the total energy required to restore the initial state of charge by a standard charge (see BattReg Annex IV (6))', '按适用法规和当前 Schema 版本填写“循环寿命 50% 时的往返能量效率”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 750),
  (sv.id, 'battery.remaining_round_trip_energy_efficiency', '/Battery_Passport/PerformanceAndDurability/RemainingRoundTripEnergyEfficiency', 'battery_operating_metric.metric_value', 'Remaining round trip energy efficiency', '剩余往返能量效率', 'The in-use analogy to the initial roundtrip energy the ratio of the net energy delivered by a battery during a discharge test to the total energy required to restore the initial state of charge by a standard charge', '按适用法规和当前 Schema 版本填写“剩余往返能量效率”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 760),
  (sv.id, 'battery.energy_round_trip_efficiency_fade', '/Battery_Passport/PerformanceAndDurability/EnergyRoundTripEfficiencyFade', 'battery_field_value.value_json', 'Energy round trip efficiency fade', '往返能量效率衰减', 'The decrease of round trip energy efficiency as percentage', '按适用法规和当前 Schema 版本填写“往返能量效率衰减”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 770),
  (sv.id, 'battery.initial_self_discharge_rate', '/Battery_Passport/PerformanceAndDurability/InitialSelf-dischargeRate', 'battery_field_value.value_json', 'Initial self-discharge rate', '初始自放电率', 'The self-discharge-rate in an idle state of the battery in reference conditions (temperature etc.) at begin of life', '按适用法规和当前 Schema 版本填写“初始自放电率”，同时记录数据来源、采集时间和责任人。', 'decimal', '%/month', 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 780),
  (sv.id, 'battery.current_self_discharge_rate', '/Battery_Passport/PerformanceAndDurability/CurrentSelf-dischargeRate', 'battery_operating_metric.metric_value', 'Current self-discharge rate', '当前自放电率', 'The change of the self-discharge rate in an idle state of the battery in reference conditions (temperature etc.) at aging parameter x, e.g. after a certain amount of storage time or, number of cycles', '按适用法规和当前 Schema 版本填写“当前自放电率”，同时记录数据来源、采集时间和责任人。', 'decimal', '%/month', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 790),
  (sv.id, 'battery.evolution_of_self_discharge_rates', '/Battery_Passport/PerformanceAndDurability/EvolutionOfSelf-dischargeRates', 'battery_operating_metric.metric_value', 'Evolution of self-discharge rates', '自放电率变化', 'The change of self-discharge over time and usage, as percentage calculated from the initial and current self-discharge rate.', '按适用法规和当前 Schema 版本填写“自放电率变化”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 800),
  (sv.id, 'battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', '/Battery_Passport/PerformanceAndDurability/InitialInternalResistanceOfBatteryCellAndPackModuleRecommended', 'battery_field_value.value_json', 'Initial internal resistance of battery cell and pack (module recommended)', '电芯和电池包初始内阻（建议提供模组数据）', '"Quotient of change of voltage of a battery by the corresponding change in discharge current under specified conditions” (IEV 482 03 36)', '按适用法规和当前 Schema 版本填写“电芯和电池包初始内阻（建议提供模组数据）”，同时记录数据来源、采集时间和责任人。', 'integer', 'Ohm', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 810),
  (sv.id, 'battery.internal_resistance_increase_of_pack_cell_and_module_recommended', '/Battery_Passport/PerformanceAndDurability/InternalResistanceIncreaseOfPackCellAndModuleRecommended', 'battery_field_value.value_json', 'Internal resistance increase of pack (cell and module recommended)', '电池包内阻增长（建议提供电芯和模组数据）', 'The increase over time and upon usage of internal resistance', '按适用法规和当前 Schema 版本填写“电池包内阻增长（建议提供电芯和模组数据）”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 820),
  (sv.id, 'battery.expected_lifetime_in_calendar_years', '/Battery_Passport/PerformanceAndDurability/ExpectedLifetimeInCalendarYears', 'battery_field_value.value_json', 'Expected lifetime in calendar years', '预期日历寿命', 'Expected life-time under the reference conditions for which they have been designed in terms of cycles, except for non-cycle applications, and calendar years', '按适用法规和当前 Schema 版本填写“预期日历寿命”，同时记录数据来源、采集时间和责任人。', 'decimal', 'years', 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 830),
  (sv.id, 'battery.expected_lifetime_number_of_charge_discharge_cycles', '/Battery_Passport/PerformanceAndDurability/ExpectedLifetime-NumberOfCharge-dischargeCycles', 'battery_field_value.value_json', 'Expected lifetime: Number of charge-discharge cycles', '预期充放电循环次数', 'Expected life-time under the reference conditions for which they have been designed in terms of cycles, except for non-cycle applications, and calendar years', '按适用法规和当前 Schema 版本填写“预期充放电循环次数”，同时记录数据来源、采集时间和责任人。', 'integer', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 840),
  (sv.id, 'battery.number_of_full_charging_and_discharging_cycles', '/Battery_Passport/PerformanceAndDurability/NumberOfFullChargingAndDischargingCycles', 'battery_operating_metric.metric_value', 'Number of full charging and discharging cycles', '完整充放电循环次数', 'In-use number of (full) charging and discharging cycles', '按适用法规和当前 Schema 版本填写“完整充放电循环次数”，同时记录数据来源、采集时间和责任人。', 'integer', null, 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 850),
  (sv.id, 'battery.cycle_life_reference_test', '/Battery_Passport/PerformanceAndDurability/Cycle-lifeReferenceTest', 'battery_field_value.value_json', 'Cycle-life reference test', '循环寿命参考测试', 'The reference test for “Expected lifetime: Number of charge-discharge cycles”', '按适用法规和当前 Schema 版本填写“循环寿命参考测试”，同时记录数据来源、采集时间和责任人。', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 860),
  (sv.id, 'battery.c_rate_of_relevant_cycle_life_test', '/Battery_Passport/PerformanceAndDurability/C-rateOfRelevantCycle-lifeTest', 'battery_field_value.value_json', 'C-rate of relevant cycle-life test', '循环寿命测试 C 倍率', 'Measurement parameter for “Expected lifetime: Number of charge-discharge cycles”: Applied charge and discharge rate in terms of rated capacity (C-rate) of relevant cycle-life reference test', '按适用法规和当前 Schema 版本填写“循环寿命测试 C 倍率”，同时记录数据来源、采集时间和责任人。', 'decimal', 'A/Ah', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":true,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 870),
  (sv.id, 'battery.energy_throughput', '/Battery_Passport/PerformanceAndDurability/EnergyThroughput', 'battery_operating_metric.metric_value', 'Energy throughput', '能量吞吐量', 'The overall sum of the energy throughput over the battery lifetime at a specific time during usage', '按适用法规和当前 Schema 版本填写“能量吞吐量”，同时记录数据来源、采集时间和责任人。', 'decimal', 'kWh', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 880),
  (sv.id, 'battery.capacity_throughput', '/Battery_Passport/PerformanceAndDurability/CapacityThroughput', 'battery_operating_metric.metric_value', 'Capacity throughput', '容量吞吐量', 'The overall sum of the capacity throughput over the battery lifetime at a specific time during usage', '按适用法规和当前 Schema 版本填写“容量吞吐量”，同时记录数据来源、采集时间和责任人。', 'decimal', 'Ah', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 890),
  (sv.id, 'battery.capacity_threshold_for_exhaustion', '/Battery_Passport/PerformanceAndDurability/CapacityThresholdForExhaustion', 'battery_field_value.value_json', 'Capacity threshold for exhaustion', '寿命耗尽容量阈值', 'The percentage of SOCE, above which the battery is still considered operational as EV battery in its current life, as provided by the economic operator', '按适用法规和当前 Schema 版本填写“寿命耗尽容量阈值”，同时记录数据来源、采集时间和责任人。', 'decimal', '%', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 900),
  (sv.id, 'battery.temperature_information', '/Battery_Passport/PerformanceAndDurability/TemperatureInformation', 'battery_operating_metric.metric_value', 'Temperature information', '温度信息', 'Temperature information regarding operating environmental conditions', '按适用法规和当前 Schema 版本填写“温度信息”，同时记录数据来源、采集时间和责任人。', 'integer', '°C', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 910),
  (sv.id, 'battery.temperature_range_idle_state_lower_boundary', '/Battery_Passport/PerformanceAndDurability/TemperatureRangeIdleStateLowerBoundary', 'battery_field_value.value_json', 'Temperature range idle state, lower boundary', '闲置状态温度范围下限', 'The lower boundary of the surrounding temperature range', '按适用法规和当前 Schema 版本填写“闲置状态温度范围下限”，同时记录数据来源、采集时间和责任人。', 'integer', '°C', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 920),
  (sv.id, 'battery.temperature_range_idle_state_upper_boundary', '/Battery_Passport/PerformanceAndDurability/TemperatureRangeIdleStateUpperBoundary', 'battery_field_value.value_json', 'Temperature range idle state, upper boundary', '闲置状态温度范围上限', 'The upper boundary of the surrounding temperature range', '按适用法规和当前 Schema 版本填写“闲置状态温度范围上限”，同时记录数据来源、采集时间和责任人。', 'integer', '°C', 'STATIC', 'MODEL', 'PUBLIC', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 930),
  (sv.id, 'battery.time_spent_in_extreme_temperatures_above_boundary', '/Battery_Passport/PerformanceAndDurability/TimeSpentInExtremeTemperaturesAboveBoundary', 'battery_operating_metric.metric_value', 'Time spent in extreme temperatures above boundary', '高于温度边界的持续时间', 'The aggregated time, in which temperatures above the upper boundary of the temperature range as defined in ''Temperature range idle state, upper boundary'' are prevalent', '按适用法规和当前 Schema 版本填写“高于温度边界的持续时间”，同时记录数据来源、采集时间和责任人。', 'integer', 'Minutes', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 940),
  (sv.id, 'battery.time_spent_in_extreme_temperatures_below_boundary', '/Battery_Passport/PerformanceAndDurability/TimeSpentInExtremeTemperaturesBelowBoundary', 'battery_operating_metric.metric_value', 'Time spent in extreme temperatures below boundary', '低于温度边界的持续时间', 'The aggregated time, in which temperatures below the lower boundary of the temperature range as defined in ''Temperature range idle state, lower boundary'' are prevalent', '按适用法规和当前 Schema 版本填写“低于温度边界的持续时间”，同时记录数据来源、采集时间和责任人。', 'integer', 'Minutes', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 950),
  (sv.id, 'battery.time_spent_charging_during_extreme_temperatures_above_boundary', '/Battery_Passport/PerformanceAndDurability/TimeSpentChargingDuringExtremeTemperaturesAboveBoundary', 'battery_operating_metric.metric_value', 'Time spent charging during extreme temperatures above boundary', '高温边界以上充电持续时间', 'The aggregated time, in which the battery is charged, while temperatures above the upper boundary of the temperature range as defined in ''Temperature range idle state, upper boundary'' are prevalent', '按适用法规和当前 Schema 版本填写“高温边界以上充电持续时间”，同时记录数据来源、采集时间和责任人。', 'integer', 'Minutes', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":true,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 960),
  (sv.id, 'battery.time_spent_charging_during_extreme_temperatures_below_boundary', '/Battery_Passport/PerformanceAndDurability/TimeSpentChargingDuringExtremeTemperaturesBelowBoundary', 'battery_operating_metric.metric_value', 'Time spent charging during extreme temperatures below boundary', '低温边界以下充电持续时间', 'The aggregated time, in which the battery is charged, while temperatures below the lower boundary of the temperature range as defined in ''Temperature range idle state, lower boundary'' are prevalent', '按适用法规和当前 Schema 版本填写“低温边界以下充电持续时间”，同时记录数据来源、采集时间和责任人。', 'integer', 'Minutes', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":true,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 970),
  (sv.id, 'battery.number_of_deep_discharge_events', '/Battery_Passport/PerformanceAndDurability/NumberOfDeepDischargeEvents', 'battery_operating_metric.metric_value', 'Number of deep discharge events', '深度放电事件次数', 'The number of occasions, in which voltage has dropped below the lower operational limit as provided in the battery passport', '按适用法规和当前 Schema 版本填写“深度放电事件次数”，同时记录数据来源、采集时间和责任人。', 'integer', null, 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 980),
  (sv.id, 'battery.number_of_overcharge_events', '/Battery_Passport/PerformanceAndDurability/NumberOfOverchargeEvents', 'battery_operating_metric.metric_value', 'Number of overcharge events', '过充事件次数', 'The number of occasions, in which voltage has increased above the upper operational limit as provided in the battery passport', '按适用法规和当前 Schema 版本填写“过充事件次数”，同时记录数据来源、采集时间和责任人。', 'integer', null, 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":false,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 990),
  (sv.id, 'battery.information_on_accidents', '/Battery_Passport/PerformanceAndDurability/InformationOnAccidents', 'battery_lifecycle_event.event_data', 'Information on accidents', '事故信息', 'Information on accidents affecting the battery, including when incorporated in equipment it is powering.', '按适用法规和当前 Schema 版本填写“事故信息”，同时记录数据来源、采集时间和责任人。', 'uri', null, 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', 'TBD', '{"required":true,"sourceSuggestionZh":"静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。"}'::jsonb, 1000)
) as rows(schema_version_id, field_code, json_pointer, storage_path, label_en, label_zh, description_en, description_zh, data_type, unit_code, data_behavior, data_granularity, access_level_code, requirement_status, evidence_requirement, sort_order)
where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft'
on conflict (schema_version_id, field_code) do update set label_en = excluded.label_en, label_zh = excluded.label_zh, description_en = excluded.description_en, description_zh = excluded.description_zh, data_type = excluded.data_type, unit_code = excluded.unit_code, data_behavior = excluded.data_behavior, data_granularity = excluded.data_granularity, access_level_code = excluded.access_level_code, evidence_requirement = excluded.evidence_requirement, sort_order = excluded.sort_order;

update public.field_definition fd set codelist_id = cl.id
from public.schema_version sv, public.schema_definition sd, public.codelist cl
where fd.schema_version_id = sv.id and sv.schema_definition_id = sd.id and sd.code = 'battery.longlist' and sv.status = 'draft' and fd.field_code = 'battery.battery_category' and cl.code = 'battery.category' and cl.version = '1.0.0';
update public.field_definition fd set codelist_id = cl.id
from public.schema_version sv, public.schema_definition sd, public.codelist cl
where fd.schema_version_id = sv.id and sv.schema_definition_id = sd.id and sd.code = 'battery.longlist' and sv.status = 'draft' and fd.field_code = 'battery.battery_status' and cl.code = 'battery.status' and cl.version = '1.0.0';
update public.field_definition fd set codelist_id = cl.id
from public.schema_version sv, public.schema_definition sd, public.codelist cl
where fd.schema_version_id = sv.id and sv.schema_definition_id = sd.id and sd.code = 'battery.longlist' and sv.status = 'draft' and fd.field_code = 'battery.battery_chemistry' and cl.code = 'battery.chemistry' and cl.version = '1.0.0';

insert into public.validation_rule (schema_version_id, field_definition_id, rule_code, rule_type, rule_config, error_code, message_en, message_zh, severity, sort_order)
select sv.id, fd.id, rows.rule_code, rows.rule_type, rows.rule_config, rows.error_code, rows.message_en, rows.message_zh, rows.severity, rows.sort_order
from public.schema_definition sd join public.schema_version sv on sv.schema_definition_id = sd.id join public.field_definition fd on fd.schema_version_id = sv.id join (values
  ('battery.dpp_schema_version', 'type.001', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_001_INVALID', 'DPP Schema version has an invalid value.', 'DPP Schema 版本的值不符合字段类型或单位要求。', 'error', 10),
  ('battery.dpp_status', 'type.002', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_002_INVALID', 'DPP Status has an invalid value.', 'DPP 状态的值不符合字段类型或单位要求。', 'error', 20),
  ('battery.dpp_granularity', 'type.003', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_003_INVALID', 'DPP Granularity has an invalid value.', 'DPP 数据粒度的值不符合字段类型或单位要求。', 'error', 30),
  ('battery.date_time_of_latest_update_of_dpp', 'type.004', 'type', '{"dataType":"datetime","unit":null}'::jsonb, 'BATTERY_FIELD_004_INVALID', 'Date-time of latest update of DPP has an invalid value.', 'DPP 最近更新时间的值不符合字段类型或单位要求。', 'error', 40),
  ('battery.unique_battery_passport_identifier_unique_dpp_identifier', 'type.005', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_005_INVALID', 'Unique battery passport identifier / unique DPP identifier has an invalid value.', '唯一电池护照标识 / 唯一 DPP 标识的值不符合字段类型或单位要求。', 'error', 50),
  ('battery.unique_battery_identifier_unique_product_identifier', 'type.006', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_006_INVALID', 'Unique battery identifier / unique product identifier has an invalid value.', '唯一电池标识 / 唯一产品标识的值不符合字段类型或单位要求。', 'error', 60),
  ('battery.battery_model_identifier', 'type.007', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_007_INVALID', 'Battery model identifier has an invalid value.', '电池型号标识的值不符合字段类型或单位要求。', 'error', 70),
  ('battery.battery_serial_number', 'type.008', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_008_INVALID', 'Battery serial number has an invalid value.', '电池序列号的值不符合字段类型或单位要求。', 'error', 80),
  ('battery.unique_economic_operator_identifier', 'type.009', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_009_INVALID', 'Unique economic operator identifier has an invalid value.', '唯一经济运营者标识的值不符合字段类型或单位要求。', 'error', 90),
  ('battery.unique_manufacturer_identifier', 'type.010', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_010_INVALID', 'Unique manufacturer identifier has an invalid value.', '唯一制造商标识的值不符合字段类型或单位要求。', 'error', 100),
  ('battery.unique_facility_identifier', 'type.011', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_011_INVALID', 'Unique facility identifier has an invalid value.', '唯一制造设施标识的值不符合字段类型或单位要求。', 'error', 110),
  ('battery.economic_operator_information', 'type.012', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_012_INVALID', 'Economic operator information has an invalid value.', '经济运营者信息的值不符合字段类型或单位要求。', 'error', 120),
  ('battery.manufacturer_information', 'type.013', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_013_INVALID', 'Manufacturer information has an invalid value.', '制造商信息的值不符合字段类型或单位要求。', 'error', 130),
  ('battery.manufacturing_place', 'type.014', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_014_INVALID', 'Manufacturing place has an invalid value.', '制造地点的值不符合字段类型或单位要求。', 'error', 140),
  ('battery.manufacturing_date', 'type.015', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_015_INVALID', 'Manufacturing date has an invalid value.', '制造日期的值不符合字段类型或单位要求。', 'error', 150),
  ('battery.date_of_putting_the_battery_into_service', 'type.016', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_016_INVALID', 'Date of putting the battery into service has an invalid value.', '电池投入使用日期的值不符合字段类型或单位要求。', 'error', 160),
  ('battery.warranty_period_of_the_battery', 'type.017', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_017_INVALID', 'Warranty period of the battery has an invalid value.', '电池质保期的值不符合字段类型或单位要求。', 'error', 170),
  ('battery.battery_category', 'type.018', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_018_INVALID', 'Battery category has an invalid value.', '电池类别的值不符合字段类型或单位要求。', 'error', 180),
  ('battery.battery_mass', 'type.019', 'type', '{"dataType":"decimal","unit":"g or kg"}'::jsonb, 'BATTERY_FIELD_019_INVALID', 'Battery mass has an invalid value.', '电池质量的值不符合字段类型或单位要求。', 'error', 190),
  ('battery.battery_status', 'type.020', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_020_INVALID', 'Battery status has an invalid value.', '电池状态的值不符合字段类型或单位要求。', 'error', 200),
  ('battery.separate_collection_symbol', 'type.021', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_021_INVALID', 'Separate collection symbol has an invalid value.', '分类收集标识的值不符合字段类型或单位要求。', 'error', 210),
  ('battery.symbols_for_cadmium_and_lead', 'type.022', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_022_INVALID', 'Symbols for cadmium and lead has an invalid value.', '镉和铅标识的值不符合字段类型或单位要求。', 'error', 220),
  ('battery.carbon_footprint_label', 'type.023', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_023_INVALID', 'Carbon footprint label has an invalid value.', '碳足迹标签的值不符合字段类型或单位要求。', 'error', 230),
  ('battery.extinguishing_agent', 'type.024', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_024_INVALID', 'Extinguishing agent has an invalid value.', '灭火剂的值不符合字段类型或单位要求。', 'error', 240),
  ('battery.meaning_of_labels_and_symbols', 'type.025', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_025_INVALID', 'Meaning of labels and symbols has an invalid value.', '标签和符号含义的值不符合字段类型或单位要求。', 'error', 250),
  ('battery.eu_declaration_of_conformity', 'type.026', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_026_INVALID', 'EU declaration of conformity has an invalid value.', '欧盟符合性声明的值不符合字段类型或单位要求。', 'error', 260),
  ('battery.results_of_test_reports_proving_compliance', 'type.027', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_027_INVALID', 'Results of test reports proving compliance has an invalid value.', '证明合规的测试报告结果的值不符合字段类型或单位要求。', 'error', 270),
  ('battery.battery_carbon_footprint_per_functional_unit', 'type.028', 'type', '{"dataType":"decimal","unit":"kgCO2eq/kWh"}'::jsonb, 'BATTERY_FIELD_028_INVALID', 'Battery carbon footprint per Functional Unit has an invalid value.', '单位功能电池碳足迹的值不符合字段类型或单位要求。', 'error', 280),
  ('battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', 'type.029', 'type', '{"dataType":"decimal","unit":"kgCO2eq/kWh"}'::jsonb, 'BATTERY_FIELD_029_INVALID', 'Contribution of raw material acquisition and pre-processing lifecycle stage has an invalid value.', '原材料获取和预处理阶段碳足迹贡献的值不符合字段类型或单位要求。', 'error', 290),
  ('battery.contribution_of_main_product_production_lifecycle_stage', 'type.030', 'type', '{"dataType":"decimal","unit":"kgCO2eq/kWh"}'::jsonb, 'BATTERY_FIELD_030_INVALID', 'Contribution of main product production lifecycle stage has an invalid value.', '主要产品生产阶段碳足迹贡献的值不符合字段类型或单位要求。', 'error', 300),
  ('battery.contribution_of_distribution_lifecycle_stage', 'type.031', 'type', '{"dataType":"decimal","unit":"kgCO2eq/kWh"}'::jsonb, 'BATTERY_FIELD_031_INVALID', 'Contribution of distribution lifecycle stage has an invalid value.', '分销阶段碳足迹贡献的值不符合字段类型或单位要求。', 'error', 310),
  ('battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', 'type.032', 'type', '{"dataType":"decimal","unit":"kgCO2eq/kWh"}'::jsonb, 'BATTERY_FIELD_032_INVALID', 'Contribution of end of life and recycling lifecycle stage has an invalid value.', '生命周期结束和回收阶段碳足迹贡献的值不符合字段类型或单位要求。', 'error', 320),
  ('battery.carbon_footprint_performance_class', 'type.033', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_033_INVALID', 'Carbon footprint performance class has an invalid value.', '碳足迹绩效等级的值不符合字段类型或单位要求。', 'error', 330),
  ('battery.web_link_to_public_carbon_footprint_study', 'type.034', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_034_INVALID', 'Web link to public carbon footprint study has an invalid value.', '公开碳足迹研究网页链接的值不符合字段类型或单位要求。', 'error', 340),
  ('battery.absolute_battery_carbon_footprint', 'type.035', 'type', '{"dataType":"integer","unit":"kgCO2eq"}'::jsonb, 'BATTERY_FIELD_035_INVALID', 'Absolute battery carbon footprint has an invalid value.', '电池绝对碳足迹的值不符合字段类型或单位要求。', 'error', 350),
  ('battery.information_of_due_diligence_report', 'type.036', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_036_INVALID', 'Information of due diligence report has an invalid value.', '尽职调查报告信息的值不符合字段类型或单位要求。', 'error', 360),
  ('battery.third_party_assurances_of_recognised_schemes', 'type.037', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_037_INVALID', 'Third party assurances of recognised schemes has an invalid value.', '认可计划的第三方保证的值不符合字段类型或单位要求。', 'error', 370),
  ('battery.supply_chain_indices', 'type.038', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_038_INVALID', 'Supply chain indices has an invalid value.', '供应链指数的值不符合字段类型或单位要求。', 'error', 380),
  ('battery.battery_chemistry', 'type.039', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_039_INVALID', 'Battery chemistry has an invalid value.', '电池化学体系的值不符合字段类型或单位要求。', 'error', 390),
  ('battery.critical_raw_materials', 'type.040', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_040_INVALID', 'Critical raw materials has an invalid value.', '关键原材料的值不符合字段类型或单位要求。', 'error', 400),
  ('battery.materials_used_in_cathode_anode_and_electrolyte', 'type.041', 'type', '{"dataType":"array","unit":null}'::jsonb, 'BATTERY_FIELD_041_INVALID', 'Materials used in cathode, anode and electrolyte has an invalid value.', '正极、负极和电解液所用材料的值不符合字段类型或单位要求。', 'error', 410),
  ('battery.hazardous_substances', 'type.042', 'type', '{"dataType":"array","unit":null}'::jsonb, 'BATTERY_FIELD_042_INVALID', 'Hazardous substances has an invalid value.', '有害物质的值不符合字段类型或单位要求。', 'error', 420),
  ('battery.impact_of_substances_on_environment_human_health_safety_persons', 'type.043', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_043_INVALID', 'Impact of substances on environment, human health, safety, persons has an invalid value.', '物质对环境、人体健康、安全和人员的影响的值不符合字段类型或单位要求。', 'error', 430),
  ('battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', 'type.044', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_044_INVALID', 'Dismantling information: Manuals for the removal and the disassembly of the battery pack has an invalid value.', '电池包移除和拆解手册的值不符合字段类型或单位要求。', 'error', 440),
  ('battery.part_numbers_for_components', 'type.045', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_045_INVALID', 'Part numbers for components has an invalid value.', '组件零件编号的值不符合字段类型或单位要求。', 'error', 450),
  ('battery.information_on_sources_of_spare_parts', 'type.046', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_046_INVALID', 'Information on sources of spare parts has an invalid value.', '备件来源信息的值不符合字段类型或单位要求。', 'error', 460),
  ('battery.safety_measures', 'type.047', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_047_INVALID', 'Safety measures has an invalid value.', '安全措施的值不符合字段类型或单位要求。', 'error', 470),
  ('battery.pre_consumer_recycled_nickel_share', 'type.048', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_048_INVALID', 'Pre-consumer recycled nickel share has an invalid value.', '消费前再生镍比例的值不符合字段类型或单位要求。', 'error', 480),
  ('battery.pre_consumer_recycled_cobalt_share', 'type.049', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_049_INVALID', 'Pre-consumer recycled cobalt share has an invalid value.', '消费前再生钴比例的值不符合字段类型或单位要求。', 'error', 490),
  ('battery.pre_consumer_recycled_lithium_share', 'type.050', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_050_INVALID', 'Pre-consumer recycled lithium share has an invalid value.', '消费前再生锂比例的值不符合字段类型或单位要求。', 'error', 500),
  ('battery.post_consumer_recycled_nickel_share', 'type.051', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_051_INVALID', 'Post-consumer recycled nickel share has an invalid value.', '消费后再生镍比例的值不符合字段类型或单位要求。', 'error', 510),
  ('battery.post_consumer_recycled_cobalt_share', 'type.052', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_052_INVALID', 'Post-consumer recycled cobalt share has an invalid value.', '消费后再生钴比例的值不符合字段类型或单位要求。', 'error', 520),
  ('battery.post_consumer_recycled_lithium_share', 'type.053', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_053_INVALID', 'Post-consumer recycled lithium share has an invalid value.', '消费后再生锂比例的值不符合字段类型或单位要求。', 'error', 530),
  ('battery.recycled_lead_share', 'type.054', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_054_INVALID', 'Recycled lead share has an invalid value.', '再生铅比例的值不符合字段类型或单位要求。', 'error', 540),
  ('battery.renewable_content_share', 'type.055', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_055_INVALID', 'Renewable content share has an invalid value.', '可再生成分比例的值不符合字段类型或单位要求。', 'error', 550),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', 'type.056', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_056_INVALID', 'Information on the role of end-users in contributing to waste prevention has an invalid value.', '最终用户参与废物预防的信息的值不符合字段类型或单位要求。', 'error', 560),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', 'type.057', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_057_INVALID', 'Information on the role of end-users in contributing to the separate collection of waste batteries has an invalid value.', '最终用户参与废旧电池分类收集的信息的值不符合字段类型或单位要求。', 'error', 570),
  ('battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', 'type.058', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_058_INVALID', 'Information on battery collection, preparation for second life and on treatment at end of life has an invalid value.', '电池收集、第二次寿命准备和寿命结束处理信息的值不符合字段类型或单位要求。', 'error', 580),
  ('battery.rated_capacity', 'type.059', 'type', '{"dataType":"integer","unit":"Ah \nor mAh (for LMT)"}'::jsonb, 'BATTERY_FIELD_059_INVALID', 'Rated capacity has an invalid value.', '额定容量的值不符合字段类型或单位要求。', 'error', 590),
  ('battery.remaining_capacity', 'type.060', 'type', '{"dataType":"integer","unit":"Ah"}'::jsonb, 'BATTERY_FIELD_060_INVALID', 'Remaining capacity has an invalid value.', '剩余容量的值不符合字段类型或单位要求。', 'error', 600),
  ('battery.capacity_fade', 'type.061', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_061_INVALID', 'Capacity fade has an invalid value.', '容量衰减的值不符合字段类型或单位要求。', 'error', 610),
  ('battery.certified_usable_battery_energy', 'type.062', 'type', '{"dataType":"integer","unit":"kWh"}'::jsonb, 'BATTERY_FIELD_062_INVALID', 'Certified usable battery energy has an invalid value.', '认证可用电池能量的值不符合字段类型或单位要求。', 'error', 620),
  ('battery.remaining_usable_battery_energy', 'type.063', 'type', '{"dataType":"integer","unit":"kWh"}'::jsonb, 'BATTERY_FIELD_063_INVALID', 'Remaining usable battery energy has an invalid value.', '剩余可用电池能量的值不符合字段类型或单位要求。', 'error', 630),
  ('battery.state_of_certified_energy_soce', 'type.064', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_064_INVALID', 'State of certified energy (SOCE) has an invalid value.', '认证能量状态（SOCE）的值不符合字段类型或单位要求。', 'error', 640),
  ('battery.state_of_charge_soc', 'type.065', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_065_INVALID', 'State of Charge (SoC) has an invalid value.', '荷电状态（SoC）的值不符合字段类型或单位要求。', 'error', 650),
  ('battery.minimum_voltage', 'type.066', 'type', '{"dataType":"decimal","unit":"V"}'::jsonb, 'BATTERY_FIELD_066_INVALID', 'Minimum voltage has an invalid value.', '最低电压的值不符合字段类型或单位要求。', 'error', 660),
  ('battery.maximum_voltage', 'type.067', 'type', '{"dataType":"decimal","unit":"V"}'::jsonb, 'BATTERY_FIELD_067_INVALID', 'Maximum voltage has an invalid value.', '最高电压的值不符合字段类型或单位要求。', 'error', 670),
  ('battery.nominal_voltage', 'type.068', 'type', '{"dataType":"decimal","unit":"V"}'::jsonb, 'BATTERY_FIELD_068_INVALID', 'Nominal voltage has an invalid value.', '标称电压的值不符合字段类型或单位要求。', 'error', 680),
  ('battery.original_power_capability', 'type.069', 'type', '{"dataType":"integer","unit":"W"}'::jsonb, 'BATTERY_FIELD_069_INVALID', 'Original power capability has an invalid value.', '初始功率能力的值不符合字段类型或单位要求。', 'error', 690),
  ('battery.remaining_power_capability', 'type.070', 'type', '{"dataType":"integer","unit":"W"}'::jsonb, 'BATTERY_FIELD_070_INVALID', 'Remaining power capability has an invalid value.', '剩余功率能力的值不符合字段类型或单位要求。', 'error', 700),
  ('battery.power_fade', 'type.071', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_071_INVALID', 'Power fade has an invalid value.', '功率衰减的值不符合字段类型或单位要求。', 'error', 710),
  ('battery.maximum_permitted_battery_power', 'type.072', 'type', '{"dataType":"integer","unit":"W"}'::jsonb, 'BATTERY_FIELD_072_INVALID', 'Maximum permitted battery power has an invalid value.', '最大允许电池功率的值不符合字段类型或单位要求。', 'error', 720),
  ('battery.ratio_between_nominal_battery_power_and_battery_energy', 'type.073', 'type', '{"dataType":"integer","unit":"W/Wh"}'::jsonb, 'BATTERY_FIELD_073_INVALID', 'Ratio between nominal battery power and battery energy has an invalid value.', '标称电池功率与电池能量比的值不符合字段类型或单位要求。', 'error', 730),
  ('battery.initial_round_trip_energy_efficiency', 'type.074', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_074_INVALID', 'Initial round trip energy efficiency has an invalid value.', '初始往返能量效率的值不符合字段类型或单位要求。', 'error', 740),
  ('battery.round_trip_energy_efficiency_at_50_of_cycle_life', 'type.075', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_075_INVALID', 'Round trip energy efficiency at 50% of cycle life has an invalid value.', '循环寿命 50% 时的往返能量效率的值不符合字段类型或单位要求。', 'error', 750),
  ('battery.remaining_round_trip_energy_efficiency', 'type.076', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_076_INVALID', 'Remaining round trip energy efficiency has an invalid value.', '剩余往返能量效率的值不符合字段类型或单位要求。', 'error', 760),
  ('battery.energy_round_trip_efficiency_fade', 'type.077', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_077_INVALID', 'Energy round trip efficiency fade has an invalid value.', '往返能量效率衰减的值不符合字段类型或单位要求。', 'error', 770),
  ('battery.initial_self_discharge_rate', 'type.078', 'type', '{"dataType":"decimal","unit":"%/month"}'::jsonb, 'BATTERY_FIELD_078_INVALID', 'Initial self-discharge rate has an invalid value.', '初始自放电率的值不符合字段类型或单位要求。', 'error', 780),
  ('battery.current_self_discharge_rate', 'type.079', 'type', '{"dataType":"decimal","unit":"%/month"}'::jsonb, 'BATTERY_FIELD_079_INVALID', 'Current self-discharge rate has an invalid value.', '当前自放电率的值不符合字段类型或单位要求。', 'error', 790),
  ('battery.evolution_of_self_discharge_rates', 'type.080', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_080_INVALID', 'Evolution of self-discharge rates has an invalid value.', '自放电率变化的值不符合字段类型或单位要求。', 'error', 800),
  ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', 'type.081', 'type', '{"dataType":"integer","unit":"Ohm"}'::jsonb, 'BATTERY_FIELD_081_INVALID', 'Initial internal resistance of battery cell and pack (module recommended) has an invalid value.', '电芯和电池包初始内阻（建议提供模组数据）的值不符合字段类型或单位要求。', 'error', 810),
  ('battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'type.082', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_082_INVALID', 'Internal resistance increase of pack (cell and module recommended) has an invalid value.', '电池包内阻增长（建议提供电芯和模组数据）的值不符合字段类型或单位要求。', 'error', 820),
  ('battery.expected_lifetime_in_calendar_years', 'type.083', 'type', '{"dataType":"decimal","unit":"years"}'::jsonb, 'BATTERY_FIELD_083_INVALID', 'Expected lifetime in calendar years has an invalid value.', '预期日历寿命的值不符合字段类型或单位要求。', 'error', 830),
  ('battery.expected_lifetime_number_of_charge_discharge_cycles', 'type.084', 'type', '{"dataType":"integer","unit":null}'::jsonb, 'BATTERY_FIELD_084_INVALID', 'Expected lifetime: Number of charge-discharge cycles has an invalid value.', '预期充放电循环次数的值不符合字段类型或单位要求。', 'error', 840),
  ('battery.number_of_full_charging_and_discharging_cycles', 'type.085', 'type', '{"dataType":"integer","unit":null}'::jsonb, 'BATTERY_FIELD_085_INVALID', 'Number of full charging and discharging cycles has an invalid value.', '完整充放电循环次数的值不符合字段类型或单位要求。', 'error', 850),
  ('battery.cycle_life_reference_test', 'type.086', 'type', '{"dataType":"string","unit":null}'::jsonb, 'BATTERY_FIELD_086_INVALID', 'Cycle-life reference test has an invalid value.', '循环寿命参考测试的值不符合字段类型或单位要求。', 'error', 860),
  ('battery.c_rate_of_relevant_cycle_life_test', 'type.087', 'type', '{"dataType":"decimal","unit":"A/Ah"}'::jsonb, 'BATTERY_FIELD_087_INVALID', 'C-rate of relevant cycle-life test has an invalid value.', '循环寿命测试 C 倍率的值不符合字段类型或单位要求。', 'error', 870),
  ('battery.energy_throughput', 'type.088', 'type', '{"dataType":"decimal","unit":"kWh"}'::jsonb, 'BATTERY_FIELD_088_INVALID', 'Energy throughput has an invalid value.', '能量吞吐量的值不符合字段类型或单位要求。', 'error', 880),
  ('battery.capacity_throughput', 'type.089', 'type', '{"dataType":"decimal","unit":"Ah"}'::jsonb, 'BATTERY_FIELD_089_INVALID', 'Capacity throughput has an invalid value.', '容量吞吐量的值不符合字段类型或单位要求。', 'error', 890),
  ('battery.capacity_threshold_for_exhaustion', 'type.090', 'type', '{"dataType":"decimal","unit":"%"}'::jsonb, 'BATTERY_FIELD_090_INVALID', 'Capacity threshold for exhaustion has an invalid value.', '寿命耗尽容量阈值的值不符合字段类型或单位要求。', 'error', 900),
  ('battery.temperature_information', 'type.091', 'type', '{"dataType":"integer","unit":"°C"}'::jsonb, 'BATTERY_FIELD_091_INVALID', 'Temperature information has an invalid value.', '温度信息的值不符合字段类型或单位要求。', 'error', 910),
  ('battery.temperature_range_idle_state_lower_boundary', 'type.092', 'type', '{"dataType":"integer","unit":"°C"}'::jsonb, 'BATTERY_FIELD_092_INVALID', 'Temperature range idle state, lower boundary has an invalid value.', '闲置状态温度范围下限的值不符合字段类型或单位要求。', 'error', 920),
  ('battery.temperature_range_idle_state_upper_boundary', 'type.093', 'type', '{"dataType":"integer","unit":"°C"}'::jsonb, 'BATTERY_FIELD_093_INVALID', 'Temperature range idle state, upper boundary has an invalid value.', '闲置状态温度范围上限的值不符合字段类型或单位要求。', 'error', 930),
  ('battery.time_spent_in_extreme_temperatures_above_boundary', 'type.094', 'type', '{"dataType":"integer","unit":"Minutes"}'::jsonb, 'BATTERY_FIELD_094_INVALID', 'Time spent in extreme temperatures above boundary has an invalid value.', '高于温度边界的持续时间的值不符合字段类型或单位要求。', 'error', 940),
  ('battery.time_spent_in_extreme_temperatures_below_boundary', 'type.095', 'type', '{"dataType":"integer","unit":"Minutes"}'::jsonb, 'BATTERY_FIELD_095_INVALID', 'Time spent in extreme temperatures below boundary has an invalid value.', '低于温度边界的持续时间的值不符合字段类型或单位要求。', 'error', 950),
  ('battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'type.096', 'type', '{"dataType":"integer","unit":"Minutes"}'::jsonb, 'BATTERY_FIELD_096_INVALID', 'Time spent charging during extreme temperatures above boundary has an invalid value.', '高温边界以上充电持续时间的值不符合字段类型或单位要求。', 'error', 960),
  ('battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'type.097', 'type', '{"dataType":"integer","unit":"Minutes"}'::jsonb, 'BATTERY_FIELD_097_INVALID', 'Time spent charging during extreme temperatures below boundary has an invalid value.', '低温边界以下充电持续时间的值不符合字段类型或单位要求。', 'error', 970),
  ('battery.number_of_deep_discharge_events', 'type.098', 'type', '{"dataType":"integer","unit":null}'::jsonb, 'BATTERY_FIELD_098_INVALID', 'Number of deep discharge events has an invalid value.', '深度放电事件次数的值不符合字段类型或单位要求。', 'error', 980),
  ('battery.number_of_overcharge_events', 'type.099', 'type', '{"dataType":"integer","unit":null}'::jsonb, 'BATTERY_FIELD_099_INVALID', 'Number of overcharge events has an invalid value.', '过充事件次数的值不符合字段类型或单位要求。', 'error', 990),
  ('battery.information_on_accidents', 'type.100', 'type', '{"dataType":"uri","unit":null}'::jsonb, 'BATTERY_FIELD_100_INVALID', 'Information on accidents has an invalid value.', '事故信息的值不符合字段类型或单位要求。', 'error', 1000)
) as rows(field_code, rule_code, rule_type, rule_config, error_code, message_en, message_zh, severity, sort_order) on rows.field_code = fd.field_code
where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft'
on conflict (schema_version_id, rule_code) do nothing;

insert into public.applicability_rule (schema_version_id, field_definition_id, rule_code, legal_category_code, technical_variant_code, data_granularity, condition_config, result_status, priority, source_note)
select sv.id, fd.id, rows.rule_code, rows.legal_category_code, rows.technical_variant_code, rows.data_granularity, rows.condition_config, rows.result_status, rows.priority, rows.source_note
from public.schema_definition sd join public.schema_version sv on sv.schema_definition_id = sd.id join public.field_definition fd on fd.schema_version_id = sv.id join (values
  ('battery.dpp_schema_version', 'app.001.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'DRAFT_MANDATORY', 1000, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_schema_version', 'app.001.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'DRAFT_MANDATORY', 999, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_schema_version', 'app.001.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'DRAFT_MANDATORY', 998, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_schema_version', 'app.001.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'DRAFT_MANDATORY', 997, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_schema_version', 'app.001.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'DRAFT_MANDATORY', 996, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_schema_version', 'app.001.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_schema_version', 'app.001.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_schema_version', 'app.001.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_status', 'app.002.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'DRAFT_MANDATORY', 1000, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_status', 'app.002.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'DRAFT_MANDATORY', 999, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_status', 'app.002.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'DRAFT_MANDATORY', 998, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_status', 'app.002.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'DRAFT_MANDATORY', 997, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_status', 'app.002.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'DRAFT_MANDATORY', 996, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_status', 'app.002.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_status', 'app.002.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_status', 'app.002.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_granularity', 'app.003.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'DRAFT_MANDATORY', 1000, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_granularity', 'app.003.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'DRAFT_MANDATORY', 999, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_granularity', 'app.003.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'DRAFT_MANDATORY', 998, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_granularity', 'app.003.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'DRAFT_MANDATORY', 997, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_granularity', 'app.003.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'DRAFT_MANDATORY', 996, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_granularity', 'app.003.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_granularity', 'app.003.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.dpp_granularity', 'app.003.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.date_time_of_latest_update_of_dpp', 'app.004.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'DRAFT_MANDATORY', 1000, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.date_time_of_latest_update_of_dpp', 'app.004.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'DRAFT_MANDATORY', 999, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.date_time_of_latest_update_of_dpp', 'app.004.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'DRAFT_MANDATORY', 998, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.date_time_of_latest_update_of_dpp', 'app.004.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'DRAFT_MANDATORY', 997, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.date_time_of_latest_update_of_dpp', 'app.004.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'DRAFT_MANDATORY', 996, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.date_time_of_latest_update_of_dpp', 'app.004.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.date_time_of_latest_update_of_dpp', 'app.004.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.date_time_of_latest_update_of_dpp', 'app.004.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'JTC-24 prEN_18223 (4.1.3.1 Table 1) (draft)'),
  ('battery.unique_battery_passport_identifier_unique_dpp_identifier', 'app.005.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Art. 77(3) and (10); Art. 3(66);
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1 and 4.2) (draft)'),
  ('battery.unique_battery_passport_identifier_unique_dpp_identifier', 'app.005.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 77(3) and (10); Art. 3(66);
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1 and 4.2) (draft)'),
  ('battery.unique_battery_passport_identifier_unique_dpp_identifier', 'app.005.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Art. 77(3) and (10); Art. 3(66);
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1 and 4.2) (draft)'),
  ('battery.unique_battery_passport_identifier_unique_dpp_identifier', 'app.005.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 77(3) and (10); Art. 3(66);
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1 and 4.2) (draft)'),
  ('battery.unique_battery_passport_identifier_unique_dpp_identifier', 'app.005.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Art. 77(3) and (10); Art. 3(66);
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1 and 4.2) (draft)'),
  ('battery.unique_battery_passport_identifier_unique_dpp_identifier', 'app.005.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 77(3) and (10); Art. 3(66);
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1 and 4.2) (draft)'),
  ('battery.unique_battery_passport_identifier_unique_dpp_identifier', 'app.005.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 77(3) and (10); Art. 3(66);
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1 and 4.2) (draft)'),
  ('battery.unique_battery_passport_identifier_unique_dpp_identifier', 'app.005.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 77(3) and (10); Art. 3(66);
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1 and 4.2) (draft)'),
  ('battery.unique_battery_identifier_unique_product_identifier', 'app.006.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Art. 77(3); Art. 3(66);
JTC-24 prEN_18219,
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1)'),
  ('battery.unique_battery_identifier_unique_product_identifier', 'app.006.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 77(3); Art. 3(66);
JTC-24 prEN_18219,
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1)'),
  ('battery.unique_battery_identifier_unique_product_identifier', 'app.006.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Art. 77(3); Art. 3(66);
JTC-24 prEN_18219,
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1)'),
  ('battery.unique_battery_identifier_unique_product_identifier', 'app.006.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 77(3); Art. 3(66);
JTC-24 prEN_18219,
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1)'),
  ('battery.unique_battery_identifier_unique_product_identifier', 'app.006.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Art. 77(3); Art. 3(66);
JTC-24 prEN_18219,
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1)'),
  ('battery.unique_battery_identifier_unique_product_identifier', 'app.006.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 77(3); Art. 3(66);
JTC-24 prEN_18219,
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1)'),
  ('battery.unique_battery_identifier_unique_product_identifier', 'app.006.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 77(3); Art. 3(66);
JTC-24 prEN_18219,
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1)'),
  ('battery.unique_battery_identifier_unique_product_identifier', 'app.006.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 77(3); Art. 3(66);
JTC-24 prEN_18219,
JTC-24 prEN_18222 (4.2) & prEN_18223 (4.1.3.1 Table 1)'),
  ('battery.battery_model_identifier', 'app.007.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Article 3(19); CF declaration IA (draft)'),
  ('battery.battery_model_identifier', 'app.007.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Article 3(19); CF declaration IA (draft)'),
  ('battery.battery_model_identifier', 'app.007.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Article 3(19); CF declaration IA (draft)'),
  ('battery.battery_model_identifier', 'app.007.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Article 3(19); CF declaration IA (draft)'),
  ('battery.battery_model_identifier', 'app.007.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Article 3(19); CF declaration IA (draft)'),
  ('battery.battery_model_identifier', 'app.007.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Article 3(19); CF declaration IA (draft)'),
  ('battery.battery_model_identifier', 'app.007.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Article 3(19); CF declaration IA (draft)'),
  ('battery.battery_model_identifier', 'app.007.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Article 3(19); CF declaration IA (draft)'),
  ('battery.battery_serial_number', 'app.008.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Article 38(6); Annex IX, 1'),
  ('battery.battery_serial_number', 'app.008.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Article 38(6); Annex IX, 1'),
  ('battery.battery_serial_number', 'app.008.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Article 38(6); Annex IX, 1'),
  ('battery.battery_serial_number', 'app.008.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Article 38(6); Annex IX, 1'),
  ('battery.battery_serial_number', 'app.008.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Article 38(6); Annex IX, 1'),
  ('battery.battery_serial_number', 'app.008.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Article 38(6); Annex IX, 1'),
  ('battery.battery_serial_number', 'app.008.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Article 38(6); Annex IX, 1'),
  ('battery.battery_serial_number', 'app.008.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Article 38(6); Annex IX, 1'),
  ('battery.unique_economic_operator_identifier', 'app.009.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'DRAFT_MANDATORY', 1000, 'ESPR Art. 2 (31), 12 (2); Annex XIII (1a) Annex VI Part A; Art. 3(66); Art. 77 (3)
JTC-24 prEN_18219 (4.1.1.1) (draft)'),
  ('battery.unique_economic_operator_identifier', 'app.009.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'DRAFT_MANDATORY', 999, 'ESPR Art. 2 (31), 12 (2); Annex XIII (1a) Annex VI Part A; Art. 3(66); Art. 77 (3)
JTC-24 prEN_18219 (4.1.1.1) (draft)'),
  ('battery.unique_economic_operator_identifier', 'app.009.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'DRAFT_MANDATORY', 998, 'ESPR Art. 2 (31), 12 (2); Annex XIII (1a) Annex VI Part A; Art. 3(66); Art. 77 (3)
JTC-24 prEN_18219 (4.1.1.1) (draft)'),
  ('battery.unique_economic_operator_identifier', 'app.009.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'DRAFT_MANDATORY', 997, 'ESPR Art. 2 (31), 12 (2); Annex XIII (1a) Annex VI Part A; Art. 3(66); Art. 77 (3)
JTC-24 prEN_18219 (4.1.1.1) (draft)'),
  ('battery.unique_economic_operator_identifier', 'app.009.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'DRAFT_MANDATORY', 996, 'ESPR Art. 2 (31), 12 (2); Annex XIII (1a) Annex VI Part A; Art. 3(66); Art. 77 (3)
JTC-24 prEN_18219 (4.1.1.1) (draft)'),
  ('battery.unique_economic_operator_identifier', 'app.009.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'ESPR Art. 2 (31), 12 (2); Annex XIII (1a) Annex VI Part A; Art. 3(66); Art. 77 (3)
JTC-24 prEN_18219 (4.1.1.1) (draft)'),
  ('battery.unique_economic_operator_identifier', 'app.009.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'ESPR Art. 2 (31), 12 (2); Annex XIII (1a) Annex VI Part A; Art. 3(66); Art. 77 (3)
JTC-24 prEN_18219 (4.1.1.1) (draft)'),
  ('battery.unique_economic_operator_identifier', 'app.009.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'ESPR Art. 2 (31), 12 (2); Annex XIII (1a) Annex VI Part A; Art. 3(66); Art. 77 (3)
JTC-24 prEN_18219 (4.1.1.1) (draft)'),
  ('battery.unique_manufacturer_identifier', 'app.010.battery_ev', 'ev', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex VI Part A (1); Art. 38(7); ESPR Art. 2(32); ESPR Art. 12(1); ESPR Annex III'),
  ('battery.unique_manufacturer_identifier', 'app.010.battery_lmt', 'lmt', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VI Part A (1); Art. 38(7); ESPR Art. 2(32); ESPR Art. 12(1); ESPR Annex III'),
  ('battery.unique_manufacturer_identifier', 'app.010.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex VI Part A (1); Art. 38(7); ESPR Art. 2(32); ESPR Art. 12(1); ESPR Annex III'),
  ('battery.unique_manufacturer_identifier', 'app.010.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VI Part A (1); Art. 38(7); ESPR Art. 2(32); ESPR Art. 12(1); ESPR Annex III'),
  ('battery.unique_manufacturer_identifier', 'app.010.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex VI Part A (1); Art. 38(7); ESPR Art. 2(32); ESPR Art. 12(1); ESPR Annex III'),
  ('battery.unique_manufacturer_identifier', 'app.010.battery_portable', 'portable', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VI Part A (1); Art. 38(7); ESPR Art. 2(32); ESPR Art. 12(1); ESPR Annex III'),
  ('battery.unique_manufacturer_identifier', 'app.010.battery_sli', 'sli', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VI Part A (1); Art. 38(7); ESPR Art. 2(32); ESPR Art. 12(1); ESPR Annex III'),
  ('battery.unique_manufacturer_identifier', 'app.010.battery_other', 'other', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VI Part A (1); Art. 38(7); ESPR Art. 2(32); ESPR Art. 12(1); ESPR Annex III'),
  ('battery.unique_facility_identifier', 'app.011.battery_ev', 'ev', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'DRAFT_MANDATORY', 1000, 'JTC-24 prEN_18219 (3.20) (draft); JTC-24 prEN_18219 (draft); ESPR Annex III'),
  ('battery.unique_facility_identifier', 'app.011.battery_lmt', 'lmt', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'DRAFT_MANDATORY', 999, 'JTC-24 prEN_18219 (3.20) (draft); JTC-24 prEN_18219 (draft); ESPR Annex III'),
  ('battery.unique_facility_identifier', 'app.011.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'DRAFT_MANDATORY', 998, 'JTC-24 prEN_18219 (3.20) (draft); JTC-24 prEN_18219 (draft); ESPR Annex III'),
  ('battery.unique_facility_identifier', 'app.011.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'DRAFT_MANDATORY', 997, 'JTC-24 prEN_18219 (3.20) (draft); JTC-24 prEN_18219 (draft); ESPR Annex III'),
  ('battery.unique_facility_identifier', 'app.011.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'DRAFT_MANDATORY', 996, 'JTC-24 prEN_18219 (3.20) (draft); JTC-24 prEN_18219 (draft); ESPR Annex III'),
  ('battery.unique_facility_identifier', 'app.011.battery_portable', 'portable', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'JTC-24 prEN_18219 (3.20) (draft); JTC-24 prEN_18219 (draft); ESPR Annex III'),
  ('battery.unique_facility_identifier', 'app.011.battery_sli', 'sli', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'JTC-24 prEN_18219 (3.20) (draft); JTC-24 prEN_18219 (draft); ESPR Annex III'),
  ('battery.unique_facility_identifier', 'app.011.battery_other', 'other', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'JTC-24 prEN_18219 (3.20) (draft); JTC-24 prEN_18219 (draft); ESPR Annex III'),
  ('battery.economic_operator_information', 'app.012.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Art. 3, 1(22)'),
  ('battery.economic_operator_information', 'app.012.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 3, 1(22)'),
  ('battery.economic_operator_information', 'app.012.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Art. 3, 1(22)'),
  ('battery.economic_operator_information', 'app.012.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 3, 1(22)'),
  ('battery.economic_operator_information', 'app.012.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Art. 3, 1(22)'),
  ('battery.economic_operator_information', 'app.012.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 3, 1(22)'),
  ('battery.economic_operator_information', 'app.012.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 3, 1(22)'),
  ('battery.economic_operator_information', 'app.012.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 3, 1(22)'),
  ('battery.manufacturer_information', 'app.013.battery_ev', 'ev', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex VI Part A (1); Art. 3, 1(33); Art. 38(7)'),
  ('battery.manufacturer_information', 'app.013.battery_lmt', 'lmt', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VI Part A (1); Art. 3, 1(33); Art. 38(7)'),
  ('battery.manufacturer_information', 'app.013.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex VI Part A (1); Art. 3, 1(33); Art. 38(7)'),
  ('battery.manufacturer_information', 'app.013.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VI Part A (1); Art. 3, 1(33); Art. 38(7)'),
  ('battery.manufacturer_information', 'app.013.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex VI Part A (1); Art. 3, 1(33); Art. 38(7)'),
  ('battery.manufacturer_information', 'app.013.battery_portable', 'portable', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VI Part A (1); Art. 3, 1(33); Art. 38(7)'),
  ('battery.manufacturer_information', 'app.013.battery_sli', 'sli', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VI Part A (1); Art. 3, 1(33); Art. 38(7)'),
  ('battery.manufacturer_information', 'app.013.battery_other', 'other', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VI Part A (1); Art. 3, 1(33); Art. 38(7)'),
  ('battery.manufacturing_place', 'app.014.battery_ev', 'ev', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1a); Annex VI, Part A(3); Labelling IA (draft)'),
  ('battery.manufacturing_place', 'app.014.battery_lmt', 'lmt', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1a); Annex VI, Part A(3); Labelling IA (draft)'),
  ('battery.manufacturing_place', 'app.014.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1a); Annex VI, Part A(3); Labelling IA (draft)'),
  ('battery.manufacturing_place', 'app.014.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1a); Annex VI, Part A(3); Labelling IA (draft)'),
  ('battery.manufacturing_place', 'app.014.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1a); Annex VI, Part A(3); Labelling IA (draft)'),
  ('battery.manufacturing_place', 'app.014.battery_portable', 'portable', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1a); Annex VI, Part A(3); Labelling IA (draft)'),
  ('battery.manufacturing_place', 'app.014.battery_sli', 'sli', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1a); Annex VI, Part A(3); Labelling IA (draft)'),
  ('battery.manufacturing_place', 'app.014.battery_other', 'other', null, 'MODEL_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1a); Annex VI, Part A(3); Labelling IA (draft)'),
  ('battery.manufacturing_date', 'app.015.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1a); Annex VI Part A (4); Annex VII Part B (1); Labelling IA (draft)'),
  ('battery.manufacturing_date', 'app.015.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1a); Annex VI Part A (4); Annex VII Part B (1); Labelling IA (draft)'),
  ('battery.manufacturing_date', 'app.015.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1a); Annex VI Part A (4); Annex VII Part B (1); Labelling IA (draft)'),
  ('battery.manufacturing_date', 'app.015.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1a); Annex VI Part A (4); Annex VII Part B (1); Labelling IA (draft)'),
  ('battery.manufacturing_date', 'app.015.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1a); Annex VI Part A (4); Annex VII Part B (1); Labelling IA (draft)'),
  ('battery.manufacturing_date', 'app.015.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1a); Annex VI Part A (4); Annex VII Part B (1); Labelling IA (draft)'),
  ('battery.manufacturing_date', 'app.015.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1a); Annex VI Part A (4); Annex VII Part B (1); Labelling IA (draft)'),
  ('battery.manufacturing_date', 'app.015.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1a); Annex VI Part A (4); Annex VII Part B (1); Labelling IA (draft)'),
  ('battery.date_of_putting_the_battery_into_service', 'app.016.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'Annex VII Part B (1)'),
  ('battery.date_of_putting_the_battery_into_service', 'app.016.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VII Part B (1)'),
  ('battery.date_of_putting_the_battery_into_service', 'app.016.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'VOLUNTARY', 998, 'Annex VII Part B (1)'),
  ('battery.date_of_putting_the_battery_into_service', 'app.016.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VII Part B (1)'),
  ('battery.date_of_putting_the_battery_into_service', 'app.016.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'VOLUNTARY', 996, 'Annex VII Part B (1)'),
  ('battery.date_of_putting_the_battery_into_service', 'app.016.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part B (1)'),
  ('battery.date_of_putting_the_battery_into_service', 'app.016.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part B (1)'),
  ('battery.date_of_putting_the_battery_into_service', 'app.016.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part B (1)'),
  ('battery.warranty_period_of_the_battery', 'app.017.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1m)'),
  ('battery.warranty_period_of_the_battery', 'app.017.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1m)'),
  ('battery.warranty_period_of_the_battery', 'app.017.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1m)'),
  ('battery.warranty_period_of_the_battery', 'app.017.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1m)'),
  ('battery.warranty_period_of_the_battery', 'app.017.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1m)'),
  ('battery.warranty_period_of_the_battery', 'app.017.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1m)'),
  ('battery.warranty_period_of_the_battery', 'app.017.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1m)'),
  ('battery.warranty_period_of_the_battery', 'app.017.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1m)'),
  ('battery.battery_category', 'app.018.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1a); Annex VI Part A (2)'),
  ('battery.battery_category', 'app.018.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1a); Annex VI Part A (2)'),
  ('battery.battery_category', 'app.018.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1a); Annex VI Part A (2)'),
  ('battery.battery_category', 'app.018.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1a); Annex VI Part A (2)'),
  ('battery.battery_category', 'app.018.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1a); Annex VI Part A (2)'),
  ('battery.battery_category', 'app.018.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1a); Annex VI Part A (2)'),
  ('battery.battery_category', 'app.018.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1a); Annex VI Part A (2)'),
  ('battery.battery_category', 'app.018.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1a); Annex VI Part A (2)'),
  ('battery.battery_mass', 'app.019.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1a); Annex VI Part A (5); Labelling IA (draft)'),
  ('battery.battery_mass', 'app.019.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1a); Annex VI Part A (5); Labelling IA (draft)'),
  ('battery.battery_mass', 'app.019.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1a); Annex VI Part A (5); Labelling IA (draft)'),
  ('battery.battery_mass', 'app.019.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1a); Annex VI Part A (5); Labelling IA (draft)'),
  ('battery.battery_mass', 'app.019.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1a); Annex VI Part A (5); Labelling IA (draft)'),
  ('battery.battery_mass', 'app.019.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1a); Annex VI Part A (5); Labelling IA (draft)'),
  ('battery.battery_mass', 'app.019.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1a); Annex VI Part A (5); Labelling IA (draft)'),
  ('battery.battery_mass', 'app.019.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1a); Annex VI Part A (5); Labelling IA (draft)'),
  ('battery.battery_status', 'app.020.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII 4(c)'),
  ('battery.battery_status', 'app.020.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII 4(c)'),
  ('battery.battery_status', 'app.020.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII 4(c)'),
  ('battery.battery_status', 'app.020.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII 4(c)'),
  ('battery.battery_status', 'app.020.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII 4(c)'),
  ('battery.battery_status', 'app.020.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII 4(c)'),
  ('battery.battery_status', 'app.020.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII 4(c)'),
  ('battery.battery_status', 'app.020.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII 4(c)'),
  ('battery.separate_collection_symbol', 'app.021.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1s); Art. 13(4);  Annex VI Part B'),
  ('battery.separate_collection_symbol', 'app.021.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1s); Art. 13(4);  Annex VI Part B'),
  ('battery.separate_collection_symbol', 'app.021.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1s); Art. 13(4);  Annex VI Part B'),
  ('battery.separate_collection_symbol', 'app.021.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1s); Art. 13(4);  Annex VI Part B'),
  ('battery.separate_collection_symbol', 'app.021.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1s); Art. 13(4);  Annex VI Part B'),
  ('battery.separate_collection_symbol', 'app.021.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1s); Art. 13(4);  Annex VI Part B'),
  ('battery.separate_collection_symbol', 'app.021.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1s); Art. 13(4);  Annex VI Part B'),
  ('battery.separate_collection_symbol', 'app.021.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1s); Art. 13(4);  Annex VI Part B'),
  ('battery.symbols_for_cadmium_and_lead', 'app.022.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1s) Art. 13(5);'),
  ('battery.symbols_for_cadmium_and_lead', 'app.022.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1s) Art. 13(5);'),
  ('battery.symbols_for_cadmium_and_lead', 'app.022.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1s) Art. 13(5);'),
  ('battery.symbols_for_cadmium_and_lead', 'app.022.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1s) Art. 13(5);'),
  ('battery.symbols_for_cadmium_and_lead', 'app.022.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1s) Art. 13(5);'),
  ('battery.symbols_for_cadmium_and_lead', 'app.022.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1s) Art. 13(5);'),
  ('battery.symbols_for_cadmium_and_lead', 'app.022.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1s) Art. 13(5);'),
  ('battery.symbols_for_cadmium_and_lead', 'app.022.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1s) Art. 13(5);'),
  ('battery.carbon_footprint_label', 'app.023.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Article 7(2) via Annex XIII (1c); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_label', 'app.023.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Article 7(2) via Annex XIII (1c); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_label', 'app.023.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Article 7(2) via Annex XIII (1c); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_label', 'app.023.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Article 7(2) via Annex XIII (1c); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_label', 'app.023.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Article 7(2) via Annex XIII (1c); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_label', 'app.023.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Article 7(2) via Annex XIII (1c); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_label', 'app.023.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Article 7(2) via Annex XIII (1c); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_label', 'app.023.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Article 7(2) via Annex XIII (1c); Labelling IA (draft) Annex V'),
  ('battery.extinguishing_agent', 'app.024.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex VI Part A (9); Labelling IA (draft)'),
  ('battery.extinguishing_agent', 'app.024.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VI Part A (9); Labelling IA (draft)'),
  ('battery.extinguishing_agent', 'app.024.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex VI Part A (9); Labelling IA (draft)'),
  ('battery.extinguishing_agent', 'app.024.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VI Part A (9); Labelling IA (draft)'),
  ('battery.extinguishing_agent', 'app.024.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex VI Part A (9); Labelling IA (draft)'),
  ('battery.extinguishing_agent', 'app.024.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VI Part A (9); Labelling IA (draft)'),
  ('battery.extinguishing_agent', 'app.024.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VI Part A (9); Labelling IA (draft)'),
  ('battery.extinguishing_agent', 'app.024.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VI Part A (9); Labelling IA (draft)'),
  ('battery.meaning_of_labels_and_symbols', 'app.025.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1s);Art. 74 1(e); Labelling IA (draft)'),
  ('battery.meaning_of_labels_and_symbols', 'app.025.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1s);Art. 74 1(e); Labelling IA (draft)'),
  ('battery.meaning_of_labels_and_symbols', 'app.025.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1s);Art. 74 1(e); Labelling IA (draft)'),
  ('battery.meaning_of_labels_and_symbols', 'app.025.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1s);Art. 74 1(e); Labelling IA (draft)'),
  ('battery.meaning_of_labels_and_symbols', 'app.025.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1s);Art. 74 1(e); Labelling IA (draft)'),
  ('battery.meaning_of_labels_and_symbols', 'app.025.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1s);Art. 74 1(e); Labelling IA (draft)'),
  ('battery.meaning_of_labels_and_symbols', 'app.025.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1s);Art. 74 1(e); Labelling IA (draft)'),
  ('battery.meaning_of_labels_and_symbols', 'app.025.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1s);Art. 74 1(e); Labelling IA (draft)'),
  ('battery.eu_declaration_of_conformity', 'app.026.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1r); Art. 18; Annex IX'),
  ('battery.eu_declaration_of_conformity', 'app.026.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1r); Art. 18; Annex IX'),
  ('battery.eu_declaration_of_conformity', 'app.026.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1r); Art. 18; Annex IX'),
  ('battery.eu_declaration_of_conformity', 'app.026.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1r); Art. 18; Annex IX'),
  ('battery.eu_declaration_of_conformity', 'app.026.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1r); Art. 18; Annex IX'),
  ('battery.eu_declaration_of_conformity', 'app.026.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1r); Art. 18; Annex IX'),
  ('battery.eu_declaration_of_conformity', 'app.026.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1r); Art. 18; Annex IX'),
  ('battery.eu_declaration_of_conformity', 'app.026.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1r); Art. 18; Annex IX'),
  ('battery.results_of_test_reports_proving_compliance', 'app.027.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (3); Annex VIII Part A 2(h)'),
  ('battery.results_of_test_reports_proving_compliance', 'app.027.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (3); Annex VIII Part A 2(h)'),
  ('battery.results_of_test_reports_proving_compliance', 'app.027.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (3); Annex VIII Part A 2(h)'),
  ('battery.results_of_test_reports_proving_compliance', 'app.027.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (3); Annex VIII Part A 2(h)'),
  ('battery.results_of_test_reports_proving_compliance', 'app.027.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (3); Annex VIII Part A 2(h)'),
  ('battery.results_of_test_reports_proving_compliance', 'app.027.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (3); Annex VIII Part A 2(h)'),
  ('battery.results_of_test_reports_proving_compliance', 'app.027.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (3); Annex VIII Part A 2(h)'),
  ('battery.results_of_test_reports_proving_compliance', 'app.027.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (3); Annex VIII Part A 2(h)'),
  ('battery.battery_carbon_footprint_per_functional_unit', 'app.028.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1c) → Art. 7; EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.battery_carbon_footprint_per_functional_unit', 'app.028.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1c) → Art. 7; EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.battery_carbon_footprint_per_functional_unit', 'app.028.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1c) → Art. 7; EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.battery_carbon_footprint_per_functional_unit', 'app.028.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1c) → Art. 7; EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.battery_carbon_footprint_per_functional_unit', 'app.028.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1c) → Art. 7; EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.battery_carbon_footprint_per_functional_unit', 'app.028.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1c) → Art. 7; EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.battery_carbon_footprint_per_functional_unit', 'app.028.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1c) → Art. 7; EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.battery_carbon_footprint_per_functional_unit', 'app.028.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1c) → Art. 7; EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', 'app.029.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', 'app.029.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', 'app.029.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', 'app.029.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', 'app.029.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', 'app.029.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', 'app.029.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage', 'app.029.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_main_product_production_lifecycle_stage', 'app.030.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_main_product_production_lifecycle_stage', 'app.030.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_main_product_production_lifecycle_stage', 'app.030.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_main_product_production_lifecycle_stage', 'app.030.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_main_product_production_lifecycle_stage', 'app.030.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_main_product_production_lifecycle_stage', 'app.030.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_main_product_production_lifecycle_stage', 'app.030.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_main_product_production_lifecycle_stage', 'app.030.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_distribution_lifecycle_stage', 'app.031.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII 1(c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_distribution_lifecycle_stage', 'app.031.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII 1(c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_distribution_lifecycle_stage', 'app.031.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII 1(c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_distribution_lifecycle_stage', 'app.031.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII 1(c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_distribution_lifecycle_stage', 'app.031.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII 1(c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_distribution_lifecycle_stage', 'app.031.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII 1(c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_distribution_lifecycle_stage', 'app.031.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII 1(c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_distribution_lifecycle_stage', 'app.031.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII 1(c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', 'app.032.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', 'app.032.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', 'app.032.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', 'app.032.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', 'app.032.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', 'app.032.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', 'app.032.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.contribution_of_end_of_life_and_recycling_lifecycle_stage', 'app.032.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1c) → Art. 7; Annex II (4); EV CF DA (draft); CF declaration IA (draft)'),
  ('battery.carbon_footprint_performance_class', 'app.033.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1c); Art. 7(2); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_performance_class', 'app.033.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1c); Art. 7(2); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_performance_class', 'app.033.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1c); Art. 7(2); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_performance_class', 'app.033.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1c); Art. 7(2); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_performance_class', 'app.033.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1c); Art. 7(2); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_performance_class', 'app.033.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1c); Art. 7(2); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_performance_class', 'app.033.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1c); Art. 7(2); Labelling IA (draft) Annex V'),
  ('battery.carbon_footprint_performance_class', 'app.033.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1c); Art. 7(2); Labelling IA (draft) Annex V'),
  ('battery.web_link_to_public_carbon_footprint_study', 'app.034.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1c); Art. 7 1(g); EV CF DA (draft)'),
  ('battery.web_link_to_public_carbon_footprint_study', 'app.034.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1c); Art. 7 1(g); EV CF DA (draft)'),
  ('battery.web_link_to_public_carbon_footprint_study', 'app.034.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1c); Art. 7 1(g); EV CF DA (draft)'),
  ('battery.web_link_to_public_carbon_footprint_study', 'app.034.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1c); Art. 7 1(g); EV CF DA (draft)'),
  ('battery.web_link_to_public_carbon_footprint_study', 'app.034.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1c); Art. 7 1(g); EV CF DA (draft)'),
  ('battery.web_link_to_public_carbon_footprint_study', 'app.034.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1c); Art. 7 1(g); EV CF DA (draft)'),
  ('battery.web_link_to_public_carbon_footprint_study', 'app.034.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1c); Art. 7 1(g); EV CF DA (draft)'),
  ('battery.web_link_to_public_carbon_footprint_study', 'app.034.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1c); Art. 7 1(g); EV CF DA (draft)'),
  ('battery.absolute_battery_carbon_footprint', 'app.035.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'n.a.'),
  ('battery.absolute_battery_carbon_footprint', 'app.035.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'VOLUNTARY', 999, 'n.a.'),
  ('battery.absolute_battery_carbon_footprint', 'app.035.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'VOLUNTARY', 998, 'n.a.'),
  ('battery.absolute_battery_carbon_footprint', 'app.035.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'VOLUNTARY', 997, 'n.a.'),
  ('battery.absolute_battery_carbon_footprint', 'app.035.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'VOLUNTARY', 996, 'n.a.'),
  ('battery.absolute_battery_carbon_footprint', 'app.035.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'n.a.'),
  ('battery.absolute_battery_carbon_footprint', 'app.035.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'n.a.'),
  ('battery.absolute_battery_carbon_footprint', 'app.035.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'n.a.'),
  ('battery.information_of_due_diligence_report', 'app.036.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Art. 52(3)'),
  ('battery.information_of_due_diligence_report', 'app.036.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 52(3)'),
  ('battery.information_of_due_diligence_report', 'app.036.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Art. 52(3)'),
  ('battery.information_of_due_diligence_report', 'app.036.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 52(3)'),
  ('battery.information_of_due_diligence_report', 'app.036.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Art. 52(3)'),
  ('battery.information_of_due_diligence_report', 'app.036.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 52(3)'),
  ('battery.information_of_due_diligence_report', 'app.036.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 52(3)'),
  ('battery.information_of_due_diligence_report', 'app.036.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 52(3)'),
  ('battery.third_party_assurances_of_recognised_schemes', 'app.037.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'Art. 49(d)'),
  ('battery.third_party_assurances_of_recognised_schemes', 'app.037.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'VOLUNTARY', 999, 'Art. 49(d)'),
  ('battery.third_party_assurances_of_recognised_schemes', 'app.037.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'VOLUNTARY', 998, 'Art. 49(d)'),
  ('battery.third_party_assurances_of_recognised_schemes', 'app.037.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'VOLUNTARY', 997, 'Art. 49(d)'),
  ('battery.third_party_assurances_of_recognised_schemes', 'app.037.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'VOLUNTARY', 996, 'Art. 49(d)'),
  ('battery.third_party_assurances_of_recognised_schemes', 'app.037.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 49(d)'),
  ('battery.third_party_assurances_of_recognised_schemes', 'app.037.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 49(d)'),
  ('battery.third_party_assurances_of_recognised_schemes', 'app.037.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 49(d)'),
  ('battery.supply_chain_indices', 'app.038.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'n.a.'),
  ('battery.supply_chain_indices', 'app.038.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'VOLUNTARY', 999, 'n.a.'),
  ('battery.supply_chain_indices', 'app.038.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'VOLUNTARY', 998, 'n.a.'),
  ('battery.supply_chain_indices', 'app.038.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'VOLUNTARY', 997, 'n.a.'),
  ('battery.supply_chain_indices', 'app.038.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'VOLUNTARY', 996, 'n.a.'),
  ('battery.supply_chain_indices', 'app.038.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'n.a.'),
  ('battery.supply_chain_indices', 'app.038.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'n.a.'),
  ('battery.supply_chain_indices', 'app.038.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'n.a.'),
  ('battery.battery_chemistry', 'app.039.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1b); Annex VI Part A (7); Labelling IA (draft)'),
  ('battery.battery_chemistry', 'app.039.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1b); Annex VI Part A (7); Labelling IA (draft)'),
  ('battery.battery_chemistry', 'app.039.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1b); Annex VI Part A (7); Labelling IA (draft)'),
  ('battery.battery_chemistry', 'app.039.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1b); Annex VI Part A (7); Labelling IA (draft)'),
  ('battery.battery_chemistry', 'app.039.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1b); Annex VI Part A (7); Labelling IA (draft)'),
  ('battery.battery_chemistry', 'app.039.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1b); Annex VI Part A (7); Labelling IA (draft)'),
  ('battery.battery_chemistry', 'app.039.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1b); Annex VI Part A (7); Labelling IA (draft)'),
  ('battery.battery_chemistry', 'app.039.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1b); Annex VI Part A (7); Labelling IA (draft)'),
  ('battery.critical_raw_materials', 'app.040.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1b); Annex VI Part A (10); Labelling IA (draft)'),
  ('battery.critical_raw_materials', 'app.040.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1b); Annex VI Part A (10); Labelling IA (draft)'),
  ('battery.critical_raw_materials', 'app.040.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1b); Annex VI Part A (10); Labelling IA (draft)'),
  ('battery.critical_raw_materials', 'app.040.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1b); Annex VI Part A (10); Labelling IA (draft)'),
  ('battery.critical_raw_materials', 'app.040.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1b); Annex VI Part A (10); Labelling IA (draft)'),
  ('battery.critical_raw_materials', 'app.040.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1b); Annex VI Part A (10); Labelling IA (draft)'),
  ('battery.critical_raw_materials', 'app.040.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1b); Annex VI Part A (10); Labelling IA (draft)'),
  ('battery.critical_raw_materials', 'app.040.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1b); Annex VI Part A (10); Labelling IA (draft)'),
  ('battery.materials_used_in_cathode_anode_and_electrolyte', 'app.041.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (2a)'),
  ('battery.materials_used_in_cathode_anode_and_electrolyte', 'app.041.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (2a)'),
  ('battery.materials_used_in_cathode_anode_and_electrolyte', 'app.041.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (2a)'),
  ('battery.materials_used_in_cathode_anode_and_electrolyte', 'app.041.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (2a)'),
  ('battery.materials_used_in_cathode_anode_and_electrolyte', 'app.041.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (2a)'),
  ('battery.materials_used_in_cathode_anode_and_electrolyte', 'app.041.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (2a)'),
  ('battery.materials_used_in_cathode_anode_and_electrolyte', 'app.041.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (2a)'),
  ('battery.materials_used_in_cathode_anode_and_electrolyte', 'app.041.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (2a)'),
  ('battery.hazardous_substances', 'app.042.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1b); Annex VI Part A (8); Labelling IA (draft),
Environmental Omnibus: Draft: 2025/0397 (COD), Art. 1 (4)'),
  ('battery.hazardous_substances', 'app.042.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1b); Annex VI Part A (8); Labelling IA (draft),
Environmental Omnibus: Draft: 2025/0397 (COD), Art. 1 (4)'),
  ('battery.hazardous_substances', 'app.042.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1b); Annex VI Part A (8); Labelling IA (draft),
Environmental Omnibus: Draft: 2025/0397 (COD), Art. 1 (4)'),
  ('battery.hazardous_substances', 'app.042.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1b); Annex VI Part A (8); Labelling IA (draft),
Environmental Omnibus: Draft: 2025/0397 (COD), Art. 1 (4)'),
  ('battery.hazardous_substances', 'app.042.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1b); Annex VI Part A (8); Labelling IA (draft),
Environmental Omnibus: Draft: 2025/0397 (COD), Art. 1 (4)'),
  ('battery.hazardous_substances', 'app.042.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1b); Annex VI Part A (8); Labelling IA (draft),
Environmental Omnibus: Draft: 2025/0397 (COD), Art. 1 (4)'),
  ('battery.hazardous_substances', 'app.042.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1b); Annex VI Part A (8); Labelling IA (draft),
Environmental Omnibus: Draft: 2025/0397 (COD), Art. 1 (4)'),
  ('battery.hazardous_substances', 'app.042.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1b); Annex VI Part A (8); Labelling IA (draft),
Environmental Omnibus: Draft: 2025/0397 (COD), Art. 1 (4)'),
  ('battery.impact_of_substances_on_environment_human_health_safety_persons', 'app.043.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1s); Art. 74 1(f)'),
  ('battery.impact_of_substances_on_environment_human_health_safety_persons', 'app.043.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1s); Art. 74 1(f)'),
  ('battery.impact_of_substances_on_environment_human_health_safety_persons', 'app.043.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1s); Art. 74 1(f)'),
  ('battery.impact_of_substances_on_environment_human_health_safety_persons', 'app.043.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1s); Art. 74 1(f)'),
  ('battery.impact_of_substances_on_environment_human_health_safety_persons', 'app.043.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1s); Art. 74 1(f)'),
  ('battery.impact_of_substances_on_environment_human_health_safety_persons', 'app.043.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1s); Art. 74 1(f)'),
  ('battery.impact_of_substances_on_environment_human_health_safety_persons', 'app.043.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1s); Art. 74 1(f)'),
  ('battery.impact_of_substances_on_environment_human_health_safety_persons', 'app.043.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1s); Art. 74 1(f)'),
  ('battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', 'app.044.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (2c);'),
  ('battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', 'app.044.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (2c);'),
  ('battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', 'app.044.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (2c);'),
  ('battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', 'app.044.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (2c);'),
  ('battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', 'app.044.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (2c);'),
  ('battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', 'app.044.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (2c);'),
  ('battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', 'app.044.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (2c);'),
  ('battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', 'app.044.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (2c);'),
  ('battery.part_numbers_for_components', 'app.045.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (2b)'),
  ('battery.part_numbers_for_components', 'app.045.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (2b)'),
  ('battery.part_numbers_for_components', 'app.045.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (2b)'),
  ('battery.part_numbers_for_components', 'app.045.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (2b)'),
  ('battery.part_numbers_for_components', 'app.045.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (2b)'),
  ('battery.part_numbers_for_components', 'app.045.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (2b)'),
  ('battery.part_numbers_for_components', 'app.045.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (2b)'),
  ('battery.part_numbers_for_components', 'app.045.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (2b)'),
  ('battery.information_on_sources_of_spare_parts', 'app.046.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (2b);'),
  ('battery.information_on_sources_of_spare_parts', 'app.046.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (2b);'),
  ('battery.information_on_sources_of_spare_parts', 'app.046.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (2b);'),
  ('battery.information_on_sources_of_spare_parts', 'app.046.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (2b);'),
  ('battery.information_on_sources_of_spare_parts', 'app.046.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (2b);'),
  ('battery.information_on_sources_of_spare_parts', 'app.046.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (2b);'),
  ('battery.information_on_sources_of_spare_parts', 'app.046.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (2b);'),
  ('battery.information_on_sources_of_spare_parts', 'app.046.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (2b);'),
  ('battery.safety_measures', 'app.047.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (2d); Art. 74(2)'),
  ('battery.safety_measures', 'app.047.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (2d); Art. 74(2)'),
  ('battery.safety_measures', 'app.047.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (2d); Art. 74(2)'),
  ('battery.safety_measures', 'app.047.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (2d); Art. 74(2)'),
  ('battery.safety_measures', 'app.047.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (2d); Art. 74(2)'),
  ('battery.safety_measures', 'app.047.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (2d); Art. 74(2)'),
  ('battery.safety_measures', 'app.047.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (2d); Art. 74(2)'),
  ('battery.safety_measures', 'app.047.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (2d); Art. 74(2)'),
  ('battery.pre_consumer_recycled_nickel_share', 'app.048.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_nickel_share', 'app.048.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_nickel_share', 'app.048.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_nickel_share', 'app.048.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_nickel_share', 'app.048.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_nickel_share', 'app.048.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_nickel_share', 'app.048.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_nickel_share', 'app.048.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_cobalt_share', 'app.049.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_cobalt_share', 'app.049.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_cobalt_share', 'app.049.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_cobalt_share', 'app.049.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_cobalt_share', 'app.049.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_cobalt_share', 'app.049.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_cobalt_share', 'app.049.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_cobalt_share', 'app.049.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_lithium_share', 'app.050.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_lithium_share', 'app.050.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_lithium_share', 'app.050.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_lithium_share', 'app.050.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_lithium_share', 'app.050.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_lithium_share', 'app.050.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_lithium_share', 'app.050.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.pre_consumer_recycled_lithium_share', 'app.050.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1e); Art. 8(1), Art. 3, 1(51)'),
  ('battery.post_consumer_recycled_nickel_share', 'app.051.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_nickel_share', 'app.051.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_nickel_share', 'app.051.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_nickel_share', 'app.051.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_nickel_share', 'app.051.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_nickel_share', 'app.051.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_nickel_share', 'app.051.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_nickel_share', 'app.051.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_cobalt_share', 'app.052.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_cobalt_share', 'app.052.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_cobalt_share', 'app.052.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_cobalt_share', 'app.052.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_cobalt_share', 'app.052.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_cobalt_share', 'app.052.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_cobalt_share', 'app.052.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_cobalt_share', 'app.052.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_lithium_share', 'app.053.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_lithium_share', 'app.053.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_lithium_share', 'app.053.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_lithium_share', 'app.053.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_lithium_share', 'app.053.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_lithium_share', 'app.053.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_lithium_share', 'app.053.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.post_consumer_recycled_lithium_share', 'app.053.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.recycled_lead_share', 'app.054.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.recycled_lead_share', 'app.054.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.recycled_lead_share', 'app.054.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.recycled_lead_share', 'app.054.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.recycled_lead_share', 'app.054.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.recycled_lead_share', 'app.054.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.recycled_lead_share', 'app.054.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.recycled_lead_share', 'app.054.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1e); Art. 8(1)'),
  ('battery.renewable_content_share', 'app.055.battery_ev', 'ev', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1f)'),
  ('battery.renewable_content_share', 'app.055.battery_lmt', 'lmt', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1f)'),
  ('battery.renewable_content_share', 'app.055.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1f)'),
  ('battery.renewable_content_share', 'app.055.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1f)'),
  ('battery.renewable_content_share', 'app.055.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1f)'),
  ('battery.renewable_content_share', 'app.055.battery_portable', 'portable', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1f)'),
  ('battery.renewable_content_share', 'app.055.battery_sli', 'sli', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1f)'),
  ('battery.renewable_content_share', 'app.055.battery_other', 'other', null, 'MODEL_YEAR_SITE', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1f)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', 'app.056.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Art. 74(1a)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', 'app.056.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 74(1a)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', 'app.056.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Art. 74(1a)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', 'app.056.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 74(1a)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', 'app.056.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Art. 74(1a)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', 'app.056.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 74(1a)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', 'app.056.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 74(1a)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention', 'app.056.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 74(1a)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', 'app.057.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Art. 74(1b); Art. 64(1); Art. 64(2)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', 'app.057.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 74(1b); Art. 64(1); Art. 64(2)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', 'app.057.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Art. 74(1b); Art. 64(1); Art. 64(2)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', 'app.057.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 74(1b); Art. 64(1); Art. 64(2)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', 'app.057.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Art. 74(1b); Art. 64(1); Art. 64(2)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', 'app.057.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 74(1b); Art. 64(1); Art. 64(2)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', 'app.057.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 74(1b); Art. 64(1); Art. 64(2)'),
  ('battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries', 'app.057.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 74(1b); Art. 64(1); Art. 64(2)'),
  ('battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', 'app.058.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Art. 74(1c)'),
  ('battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', 'app.058.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 74(1c)'),
  ('battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', 'app.058.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Art. 74(1c)'),
  ('battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', 'app.058.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 74(1c)'),
  ('battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', 'app.058.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Art. 74(1c)'),
  ('battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', 'app.058.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 74(1c)'),
  ('battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', 'app.058.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 74(1c)'),
  ('battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life', 'app.058.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 74(1c)'),
  ('battery.rated_capacity', 'app.059.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex IV Part A (1); Annex XIII (1g); Labelling IA (draft) Annex II Part A (VI) and Part C (C, 1)'),
  ('battery.rated_capacity', 'app.059.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex IV Part A (1); Annex XIII (1g); Labelling IA (draft) Annex II Part A (VI) and Part C (C, 1)'),
  ('battery.rated_capacity', 'app.059.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex IV Part A (1); Annex XIII (1g); Labelling IA (draft) Annex II Part A (VI) and Part C (C, 1)'),
  ('battery.rated_capacity', 'app.059.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex IV Part A (1); Annex XIII (1g); Labelling IA (draft) Annex II Part A (VI) and Part C (C, 1)'),
  ('battery.rated_capacity', 'app.059.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex IV Part A (1); Annex XIII (1g); Labelling IA (draft) Annex II Part A (VI) and Part C (C, 1)'),
  ('battery.rated_capacity', 'app.059.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex IV Part A (1); Annex XIII (1g); Labelling IA (draft) Annex II Part A (VI) and Part C (C, 1)'),
  ('battery.rated_capacity', 'app.059.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex IV Part A (1); Annex XIII (1g); Labelling IA (draft) Annex II Part A (VI) and Part C (C, 1)'),
  ('battery.rated_capacity', 'app.059.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex IV Part A (1); Annex XIII (1g); Labelling IA (draft) Annex II Part A (VI) and Part C (C, 1)'),
  ('battery.remaining_capacity', 'app.060.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'Annex VII Part A (1)'),
  ('battery.remaining_capacity', 'app.060.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VII Part A (1)'),
  ('battery.remaining_capacity', 'app.060.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'VOLUNTARY', 998, 'Annex VII Part A (1)'),
  ('battery.remaining_capacity', 'app.060.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VII Part A (1)'),
  ('battery.remaining_capacity', 'app.060.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'VOLUNTARY', 996, 'Annex VII Part A (1)'),
  ('battery.remaining_capacity', 'app.060.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part A (1)'),
  ('battery.remaining_capacity', 'app.060.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part A (1)'),
  ('battery.remaining_capacity', 'app.060.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part A (1)'),
  ('battery.capacity_fade', 'app.061.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex IV Part A (1); Annex IV (2)'),
  ('battery.capacity_fade', 'app.061.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex IV Part A (1); Annex IV (2)'),
  ('battery.capacity_fade', 'app.061.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex IV Part A (1); Annex IV (2)'),
  ('battery.capacity_fade', 'app.061.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex IV Part A (1); Annex IV (2)'),
  ('battery.capacity_fade', 'app.061.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex IV Part A (1); Annex IV (2)'),
  ('battery.capacity_fade', 'app.061.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex IV Part A (1); Annex IV (2)'),
  ('battery.capacity_fade', 'app.061.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex IV Part A (1); Annex IV (2)'),
  ('battery.capacity_fade', 'app.061.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex IV Part A (1); Annex IV (2)'),
  ('battery.certified_usable_battery_energy', 'app.062.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'n.a.'),
  ('battery.certified_usable_battery_energy', 'app.062.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'NOT_APPLICABLE', 999, 'n.a.'),
  ('battery.certified_usable_battery_energy', 'app.062.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'n.a.'),
  ('battery.certified_usable_battery_energy', 'app.062.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'NOT_APPLICABLE', 997, 'n.a.'),
  ('battery.certified_usable_battery_energy', 'app.062.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'n.a.'),
  ('battery.certified_usable_battery_energy', 'app.062.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'n.a.'),
  ('battery.certified_usable_battery_energy', 'app.062.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'n.a.'),
  ('battery.certified_usable_battery_energy', 'app.062.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'n.a.'),
  ('battery.remaining_usable_battery_energy', 'app.063.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'n.a.'),
  ('battery.remaining_usable_battery_energy', 'app.063.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'NOT_APPLICABLE', 999, 'n.a.'),
  ('battery.remaining_usable_battery_energy', 'app.063.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'n.a.'),
  ('battery.remaining_usable_battery_energy', 'app.063.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'NOT_APPLICABLE', 997, 'n.a.'),
  ('battery.remaining_usable_battery_energy', 'app.063.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'n.a.'),
  ('battery.remaining_usable_battery_energy', 'app.063.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'n.a.'),
  ('battery.remaining_usable_battery_energy', 'app.063.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'n.a.'),
  ('battery.remaining_usable_battery_energy', 'app.063.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'n.a.'),
  ('battery.state_of_certified_energy_soce', 'app.064.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex VII Part A (EV)'),
  ('battery.state_of_certified_energy_soce', 'app.064.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'NOT_APPLICABLE', 999, 'Annex VII Part A (EV)'),
  ('battery.state_of_certified_energy_soce', 'app.064.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Annex VII Part A (EV)'),
  ('battery.state_of_certified_energy_soce', 'app.064.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'NOT_APPLICABLE', 997, 'Annex VII Part A (EV)'),
  ('battery.state_of_certified_energy_soce', 'app.064.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Annex VII Part A (EV)'),
  ('battery.state_of_certified_energy_soce', 'app.064.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part A (EV)'),
  ('battery.state_of_certified_energy_soce', 'app.064.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part A (EV)'),
  ('battery.state_of_certified_energy_soce', 'app.064.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part A (EV)'),
  ('battery.state_of_charge_soc', 'app.065.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (4d); Article 3 1(27); Standardization request M/579'),
  ('battery.state_of_charge_soc', 'app.065.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (4d); Article 3 1(27); Standardization request M/579'),
  ('battery.state_of_charge_soc', 'app.065.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (4d); Article 3 1(27); Standardization request M/579'),
  ('battery.state_of_charge_soc', 'app.065.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (4d); Article 3 1(27); Standardization request M/579'),
  ('battery.state_of_charge_soc', 'app.065.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (4d); Article 3 1(27); Standardization request M/579'),
  ('battery.state_of_charge_soc', 'app.065.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (4d); Article 3 1(27); Standardization request M/579'),
  ('battery.state_of_charge_soc', 'app.065.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (4d); Article 3 1(27); Standardization request M/579'),
  ('battery.state_of_charge_soc', 'app.065.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (4d); Article 3 1(27); Standardization request M/579'),
  ('battery.minimum_voltage', 'app.066.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1h)'),
  ('battery.minimum_voltage', 'app.066.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1h)'),
  ('battery.minimum_voltage', 'app.066.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1h)'),
  ('battery.minimum_voltage', 'app.066.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1h)'),
  ('battery.minimum_voltage', 'app.066.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1h)'),
  ('battery.minimum_voltage', 'app.066.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1h)'),
  ('battery.minimum_voltage', 'app.066.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1h)'),
  ('battery.minimum_voltage', 'app.066.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1h)'),
  ('battery.maximum_voltage', 'app.067.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1h)'),
  ('battery.maximum_voltage', 'app.067.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1h)'),
  ('battery.maximum_voltage', 'app.067.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1h)'),
  ('battery.maximum_voltage', 'app.067.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1h)'),
  ('battery.maximum_voltage', 'app.067.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1h)'),
  ('battery.maximum_voltage', 'app.067.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1h)'),
  ('battery.maximum_voltage', 'app.067.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1h)'),
  ('battery.maximum_voltage', 'app.067.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1h)'),
  ('battery.nominal_voltage', 'app.068.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1h)'),
  ('battery.nominal_voltage', 'app.068.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1h)'),
  ('battery.nominal_voltage', 'app.068.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1h)'),
  ('battery.nominal_voltage', 'app.068.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1h)'),
  ('battery.nominal_voltage', 'app.068.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1h)'),
  ('battery.nominal_voltage', 'app.068.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1h)'),
  ('battery.nominal_voltage', 'app.068.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1h)'),
  ('battery.nominal_voltage', 'app.068.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1h)'),
  ('battery.original_power_capability', 'app.069.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1i); Art. 10, Annex IV Part B (4) → measurement at 80 % SoC and 20% SoC required; Annex IV (3)'),
  ('battery.original_power_capability', 'app.069.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1i); Art. 10, Annex IV Part B (4) → measurement at 80 % SoC and 20% SoC required; Annex IV (3)'),
  ('battery.original_power_capability', 'app.069.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1i); Art. 10, Annex IV Part B (4) → measurement at 80 % SoC and 20% SoC required; Annex IV (3)'),
  ('battery.original_power_capability', 'app.069.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1i); Art. 10, Annex IV Part B (4) → measurement at 80 % SoC and 20% SoC required; Annex IV (3)'),
  ('battery.original_power_capability', 'app.069.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1i); Art. 10, Annex IV Part B (4) → measurement at 80 % SoC and 20% SoC required; Annex IV (3)'),
  ('battery.original_power_capability', 'app.069.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1i); Art. 10, Annex IV Part B (4) → measurement at 80 % SoC and 20% SoC required; Annex IV (3)'),
  ('battery.original_power_capability', 'app.069.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1i); Art. 10, Annex IV Part B (4) → measurement at 80 % SoC and 20% SoC required; Annex IV (3)'),
  ('battery.original_power_capability', 'app.069.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1i); Art. 10, Annex IV Part B (4) → measurement at 80 % SoC and 20% SoC required; Annex IV (3)'),
  ('battery.remaining_power_capability', 'app.070.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'Art. 10: Annex IV (3) (only definition of power); Annex VII Part A (2) "where possible, remaining power capability"; Annex IV Part B (4) --> measurement at 80 % SoC and 20% SoC required'),
  ('battery.remaining_power_capability', 'app.070.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 10: Annex IV (3) (only definition of power); Annex VII Part A (2) "where possible, remaining power capability"; Annex IV Part B (4) --> measurement at 80 % SoC and 20% SoC required'),
  ('battery.remaining_power_capability', 'app.070.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'VOLUNTARY', 998, 'Art. 10: Annex IV (3) (only definition of power); Annex VII Part A (2) "where possible, remaining power capability"; Annex IV Part B (4) --> measurement at 80 % SoC and 20% SoC required'),
  ('battery.remaining_power_capability', 'app.070.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 10: Annex IV (3) (only definition of power); Annex VII Part A (2) "where possible, remaining power capability"; Annex IV Part B (4) --> measurement at 80 % SoC and 20% SoC required'),
  ('battery.remaining_power_capability', 'app.070.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'VOLUNTARY', 996, 'Art. 10: Annex IV (3) (only definition of power); Annex VII Part A (2) "where possible, remaining power capability"; Annex IV Part B (4) --> measurement at 80 % SoC and 20% SoC required'),
  ('battery.remaining_power_capability', 'app.070.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 10: Annex IV (3) (only definition of power); Annex VII Part A (2) "where possible, remaining power capability"; Annex IV Part B (4) --> measurement at 80 % SoC and 20% SoC required'),
  ('battery.remaining_power_capability', 'app.070.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 10: Annex IV (3) (only definition of power); Annex VII Part A (2) "where possible, remaining power capability"; Annex IV Part B (4) --> measurement at 80 % SoC and 20% SoC required'),
  ('battery.remaining_power_capability', 'app.070.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 10: Annex IV (3) (only definition of power); Annex VII Part A (2) "where possible, remaining power capability"; Annex IV Part B (4) --> measurement at 80 % SoC and 20% SoC required'),
  ('battery.power_fade', 'app.071.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex IV P(4) ("power fade" definition); Annex IV Part A (2) (power fade in %)
Annex IV Part B (4) → measurement at 80 % SoC required;'),
  ('battery.power_fade', 'app.071.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex IV P(4) ("power fade" definition); Annex IV Part A (2) (power fade in %)
Annex IV Part B (4) → measurement at 80 % SoC required;'),
  ('battery.power_fade', 'app.071.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex IV P(4) ("power fade" definition); Annex IV Part A (2) (power fade in %)
Annex IV Part B (4) → measurement at 80 % SoC required;'),
  ('battery.power_fade', 'app.071.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex IV P(4) ("power fade" definition); Annex IV Part A (2) (power fade in %)
Annex IV Part B (4) → measurement at 80 % SoC required;'),
  ('battery.power_fade', 'app.071.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex IV P(4) ("power fade" definition); Annex IV Part A (2) (power fade in %)
Annex IV Part B (4) → measurement at 80 % SoC required;'),
  ('battery.power_fade', 'app.071.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex IV P(4) ("power fade" definition); Annex IV Part A (2) (power fade in %)
Annex IV Part B (4) → measurement at 80 % SoC required;'),
  ('battery.power_fade', 'app.071.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex IV P(4) ("power fade" definition); Annex IV Part A (2) (power fade in %)
Annex IV Part B (4) → measurement at 80 % SoC required;'),
  ('battery.power_fade', 'app.071.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex IV P(4) ("power fade" definition); Annex IV Part A (2) (power fade in %)
Annex IV Part B (4) → measurement at 80 % SoC required;'),
  ('battery.maximum_permitted_battery_power', 'app.072.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1i) (power limits)'),
  ('battery.maximum_permitted_battery_power', 'app.072.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1i) (power limits)'),
  ('battery.maximum_permitted_battery_power', 'app.072.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1i) (power limits)'),
  ('battery.maximum_permitted_battery_power', 'app.072.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1i) (power limits)'),
  ('battery.maximum_permitted_battery_power', 'app.072.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1i) (power limits)'),
  ('battery.maximum_permitted_battery_power', 'app.072.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1i) (power limits)'),
  ('battery.maximum_permitted_battery_power', 'app.072.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1i) (power limits)'),
  ('battery.maximum_permitted_battery_power', 'app.072.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1i) (power limits)'),
  ('battery.ratio_between_nominal_battery_power_and_battery_energy', 'app.073.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'Annex IV Part B (2)'),
  ('battery.ratio_between_nominal_battery_power_and_battery_energy', 'app.073.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'VOLUNTARY', 999, 'Annex IV Part B (2)'),
  ('battery.ratio_between_nominal_battery_power_and_battery_energy', 'app.073.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'VOLUNTARY', 998, 'Annex IV Part B (2)'),
  ('battery.ratio_between_nominal_battery_power_and_battery_energy', 'app.073.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'VOLUNTARY', 997, 'Annex IV Part B (2)'),
  ('battery.ratio_between_nominal_battery_power_and_battery_energy', 'app.073.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'VOLUNTARY', 996, 'Annex IV Part B (2)'),
  ('battery.ratio_between_nominal_battery_power_and_battery_energy', 'app.073.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex IV Part B (2)'),
  ('battery.ratio_between_nominal_battery_power_and_battery_energy', 'app.073.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex IV Part B (2)'),
  ('battery.ratio_between_nominal_battery_power_and_battery_energy', 'app.073.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex IV Part B (2)'),
  ('battery.initial_round_trip_energy_efficiency', 'app.074.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1n); Art. 10: Annex IV (6); Annex IV Part A (4)'),
  ('battery.initial_round_trip_energy_efficiency', 'app.074.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1n); Art. 10: Annex IV (6); Annex IV Part A (4)'),
  ('battery.initial_round_trip_energy_efficiency', 'app.074.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1n); Art. 10: Annex IV (6); Annex IV Part A (4)'),
  ('battery.initial_round_trip_energy_efficiency', 'app.074.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1n); Art. 10: Annex IV (6); Annex IV Part A (4)'),
  ('battery.initial_round_trip_energy_efficiency', 'app.074.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1n); Art. 10: Annex IV (6); Annex IV Part A (4)'),
  ('battery.initial_round_trip_energy_efficiency', 'app.074.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1n); Art. 10: Annex IV (6); Annex IV Part A (4)'),
  ('battery.initial_round_trip_energy_efficiency', 'app.074.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1n); Art. 10: Annex IV (6); Annex IV Part A (4)'),
  ('battery.initial_round_trip_energy_efficiency', 'app.074.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1n); Art. 10: Annex IV (6); Annex IV Part A (4)'),
  ('battery.round_trip_energy_efficiency_at_50_of_cycle_life', 'app.075.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII 1(n); Annex IV (6)'),
  ('battery.round_trip_energy_efficiency_at_50_of_cycle_life', 'app.075.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII 1(n); Annex IV (6)'),
  ('battery.round_trip_energy_efficiency_at_50_of_cycle_life', 'app.075.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII 1(n); Annex IV (6)'),
  ('battery.round_trip_energy_efficiency_at_50_of_cycle_life', 'app.075.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII 1(n); Annex IV (6)'),
  ('battery.round_trip_energy_efficiency_at_50_of_cycle_life', 'app.075.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII 1(n); Annex IV (6)'),
  ('battery.round_trip_energy_efficiency_at_50_of_cycle_life', 'app.075.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII 1(n); Annex IV (6)'),
  ('battery.round_trip_energy_efficiency_at_50_of_cycle_life', 'app.075.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII 1(n); Annex IV (6)'),
  ('battery.round_trip_energy_efficiency_at_50_of_cycle_life', 'app.075.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII 1(n); Annex IV (6)'),
  ('battery.remaining_round_trip_energy_efficiency', 'app.076.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'Art. 10: Annex IV Part A (4); Article 14: Annex VII Part A (3); Annex IV (6)'),
  ('battery.remaining_round_trip_energy_efficiency', 'app.076.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 10: Annex IV Part A (4); Article 14: Annex VII Part A (3); Annex IV (6)'),
  ('battery.remaining_round_trip_energy_efficiency', 'app.076.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Art. 10: Annex IV Part A (4); Article 14: Annex VII Part A (3); Annex IV (6)'),
  ('battery.remaining_round_trip_energy_efficiency', 'app.076.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 10: Annex IV Part A (4); Article 14: Annex VII Part A (3); Annex IV (6)'),
  ('battery.remaining_round_trip_energy_efficiency', 'app.076.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Art. 10: Annex IV Part A (4); Article 14: Annex VII Part A (3); Annex IV (6)'),
  ('battery.remaining_round_trip_energy_efficiency', 'app.076.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 10: Annex IV Part A (4); Article 14: Annex VII Part A (3); Annex IV (6)'),
  ('battery.remaining_round_trip_energy_efficiency', 'app.076.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 10: Annex IV Part A (4); Article 14: Annex VII Part A (3); Annex IV (6)'),
  ('battery.remaining_round_trip_energy_efficiency', 'app.076.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 10: Annex IV Part A (4); Article 14: Annex VII Part A (3); Annex IV (6)'),
  ('battery.energy_round_trip_efficiency_fade', 'app.077.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex IV Part A (4)'),
  ('battery.energy_round_trip_efficiency_fade', 'app.077.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex IV Part A (4)'),
  ('battery.energy_round_trip_efficiency_fade', 'app.077.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex IV Part A (4)'),
  ('battery.energy_round_trip_efficiency_fade', 'app.077.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex IV Part A (4)'),
  ('battery.energy_round_trip_efficiency_fade', 'app.077.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex IV Part A (4)'),
  ('battery.energy_round_trip_efficiency_fade', 'app.077.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex IV Part A (4)'),
  ('battery.energy_round_trip_efficiency_fade', 'app.077.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex IV Part A (4)'),
  ('battery.energy_round_trip_efficiency_fade', 'app.077.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex IV Part A (4)'),
  ('battery.initial_self_discharge_rate', 'app.078.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'n.a.'),
  ('battery.initial_self_discharge_rate', 'app.078.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'VOLUNTARY', 999, 'n.a.'),
  ('battery.initial_self_discharge_rate', 'app.078.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'n.a.'),
  ('battery.initial_self_discharge_rate', 'app.078.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'VOLUNTARY', 997, 'n.a.'),
  ('battery.initial_self_discharge_rate', 'app.078.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'n.a.'),
  ('battery.initial_self_discharge_rate', 'app.078.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'n.a.'),
  ('battery.initial_self_discharge_rate', 'app.078.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'n.a.'),
  ('battery.initial_self_discharge_rate', 'app.078.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'n.a.'),
  ('battery.current_self_discharge_rate', 'app.079.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'n.a.'),
  ('battery.current_self_discharge_rate', 'app.079.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'VOLUNTARY', 999, 'n.a.'),
  ('battery.current_self_discharge_rate', 'app.079.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'n.a.'),
  ('battery.current_self_discharge_rate', 'app.079.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'VOLUNTARY', 997, 'n.a.'),
  ('battery.current_self_discharge_rate', 'app.079.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'n.a.'),
  ('battery.current_self_discharge_rate', 'app.079.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'n.a.'),
  ('battery.current_self_discharge_rate', 'app.079.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'n.a.'),
  ('battery.current_self_discharge_rate', 'app.079.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'n.a.'),
  ('battery.evolution_of_self_discharge_rates', 'app.080.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'Art. 14: Annex VII Part A (4)'),
  ('battery.evolution_of_self_discharge_rates', 'app.080.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Art. 14: Annex VII Part A (4)'),
  ('battery.evolution_of_self_discharge_rates', 'app.080.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Art. 14: Annex VII Part A (4)'),
  ('battery.evolution_of_self_discharge_rates', 'app.080.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Art. 14: Annex VII Part A (4)'),
  ('battery.evolution_of_self_discharge_rates', 'app.080.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Art. 14: Annex VII Part A (4)'),
  ('battery.evolution_of_self_discharge_rates', 'app.080.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Art. 14: Annex VII Part A (4)'),
  ('battery.evolution_of_self_discharge_rates', 'app.080.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Art. 14: Annex VII Part A (4)'),
  ('battery.evolution_of_self_discharge_rates', 'app.080.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Art. 14: Annex VII Part A (4)'),
  ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', 'app.081.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1o); Art. 10: Annex IV Part A (3) (+definition of internal resistance)'),
  ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', 'app.081.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1o); Art. 10: Annex IV Part A (3) (+definition of internal resistance)'),
  ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', 'app.081.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1o); Art. 10: Annex IV Part A (3) (+definition of internal resistance)'),
  ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', 'app.081.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1o); Art. 10: Annex IV Part A (3) (+definition of internal resistance)'),
  ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', 'app.081.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1o); Art. 10: Annex IV Part A (3) (+definition of internal resistance)'),
  ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', 'app.081.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1o); Art. 10: Annex IV Part A (3) (+definition of internal resistance)'),
  ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', 'app.081.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1o); Art. 10: Annex IV Part A (3) (+definition of internal resistance)'),
  ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', 'app.081.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1o); Art. 10: Annex IV Part A (3) (+definition of internal resistance)'),
  ('battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'app.082.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex IV, Part A(3)'),
  ('battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'app.082.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex IV, Part A(3)'),
  ('battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'app.082.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex IV, Part A(3)'),
  ('battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'app.082.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex IV, Part A(3)'),
  ('battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'app.082.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex IV, Part A(3)'),
  ('battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'app.082.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex IV, Part A(3)'),
  ('battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'app.082.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex IV, Part A(3)'),
  ('battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'app.082.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex IV, Part A(3)'),
  ('battery.expected_lifetime_in_calendar_years', 'app.083.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_in_calendar_years', 'app.083.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_in_calendar_years', 'app.083.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_in_calendar_years', 'app.083.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_in_calendar_years', 'app.083.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_in_calendar_years', 'app.083.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_in_calendar_years', 'app.083.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_in_calendar_years', 'app.083.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_number_of_charge_discharge_cycles', 'app.084.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_number_of_charge_discharge_cycles', 'app.084.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_number_of_charge_discharge_cycles', 'app.084.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_number_of_charge_discharge_cycles', 'app.084.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_number_of_charge_discharge_cycles', 'app.084.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_number_of_charge_discharge_cycles', 'app.084.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_number_of_charge_discharge_cycles', 'app.084.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.expected_lifetime_number_of_charge_discharge_cycles', 'app.084.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex IV, Part A(5); Annex XIII (1); Annex XIII (4a)'),
  ('battery.number_of_full_charging_and_discharging_cycles', 'app.085.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (4d); Art. 14: Annex VII Part B (5)'),
  ('battery.number_of_full_charging_and_discharging_cycles', 'app.085.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (4d); Art. 14: Annex VII Part B (5)'),
  ('battery.number_of_full_charging_and_discharging_cycles', 'app.085.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (4d); Art. 14: Annex VII Part B (5)'),
  ('battery.number_of_full_charging_and_discharging_cycles', 'app.085.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (4d); Art. 14: Annex VII Part B (5)'),
  ('battery.number_of_full_charging_and_discharging_cycles', 'app.085.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (4d); Art. 14: Annex VII Part B (5)'),
  ('battery.number_of_full_charging_and_discharging_cycles', 'app.085.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (4d); Art. 14: Annex VII Part B (5)'),
  ('battery.number_of_full_charging_and_discharging_cycles', 'app.085.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (4d); Art. 14: Annex VII Part B (5)'),
  ('battery.number_of_full_charging_and_discharging_cycles', 'app.085.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (4d); Art. 14: Annex VII Part B (5)'),
  ('battery.cycle_life_reference_test', 'app.086.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1j)'),
  ('battery.cycle_life_reference_test', 'app.086.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1j)'),
  ('battery.cycle_life_reference_test', 'app.086.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1j)'),
  ('battery.cycle_life_reference_test', 'app.086.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1j)'),
  ('battery.cycle_life_reference_test', 'app.086.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1j)'),
  ('battery.cycle_life_reference_test', 'app.086.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1j)'),
  ('battery.cycle_life_reference_test', 'app.086.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1j)'),
  ('battery.cycle_life_reference_test', 'app.086.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1j)'),
  ('battery.c_rate_of_relevant_cycle_life_test', 'app.087.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1p)'),
  ('battery.c_rate_of_relevant_cycle_life_test', 'app.087.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1p)'),
  ('battery.c_rate_of_relevant_cycle_life_test', 'app.087.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1p)'),
  ('battery.c_rate_of_relevant_cycle_life_test', 'app.087.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1p)'),
  ('battery.c_rate_of_relevant_cycle_life_test', 'app.087.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1p)'),
  ('battery.c_rate_of_relevant_cycle_life_test', 'app.087.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1p)'),
  ('battery.c_rate_of_relevant_cycle_life_test', 'app.087.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1p)'),
  ('battery.c_rate_of_relevant_cycle_life_test', 'app.087.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1p)'),
  ('battery.energy_throughput', 'app.088.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'Annex VII Part B (2)'),
  ('battery.energy_throughput', 'app.088.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VII Part B (2)'),
  ('battery.energy_throughput', 'app.088.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Annex VII Part B (2)'),
  ('battery.energy_throughput', 'app.088.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VII Part B (2)'),
  ('battery.energy_throughput', 'app.088.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Annex VII Part B (2)'),
  ('battery.energy_throughput', 'app.088.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part B (2)'),
  ('battery.energy_throughput', 'app.088.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part B (2)'),
  ('battery.energy_throughput', 'app.088.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part B (2)'),
  ('battery.capacity_throughput', 'app.089.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'Annex VII Part B (3)'),
  ('battery.capacity_throughput', 'app.089.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VII Part B (3)'),
  ('battery.capacity_throughput', 'app.089.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Annex VII Part B (3)'),
  ('battery.capacity_throughput', 'app.089.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VII Part B (3)'),
  ('battery.capacity_throughput', 'app.089.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Annex VII Part B (3)'),
  ('battery.capacity_throughput', 'app.089.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part B (3)'),
  ('battery.capacity_throughput', 'app.089.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part B (3)'),
  ('battery.capacity_throughput', 'app.089.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part B (3)'),
  ('battery.capacity_threshold_for_exhaustion', 'app.090.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1k)'),
  ('battery.capacity_threshold_for_exhaustion', 'app.090.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'NOT_APPLICABLE', 999, 'Annex XIII (1k)'),
  ('battery.capacity_threshold_for_exhaustion', 'app.090.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Annex XIII (1k)'),
  ('battery.capacity_threshold_for_exhaustion', 'app.090.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'NOT_APPLICABLE', 997, 'Annex XIII (1k)'),
  ('battery.capacity_threshold_for_exhaustion', 'app.090.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Annex XIII (1k)'),
  ('battery.capacity_threshold_for_exhaustion', 'app.090.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1k)'),
  ('battery.capacity_threshold_for_exhaustion', 'app.090.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1k)'),
  ('battery.capacity_threshold_for_exhaustion', 'app.090.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1k)'),
  ('battery.temperature_information', 'app.091.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (4d)'),
  ('battery.temperature_information', 'app.091.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (4d)'),
  ('battery.temperature_information', 'app.091.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (4d)'),
  ('battery.temperature_information', 'app.091.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (4d)'),
  ('battery.temperature_information', 'app.091.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (4d)'),
  ('battery.temperature_information', 'app.091.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (4d)'),
  ('battery.temperature_information', 'app.091.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (4d)'),
  ('battery.temperature_information', 'app.091.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (4d)'),
  ('battery.temperature_range_idle_state_lower_boundary', 'app.092.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_lower_boundary', 'app.092.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_lower_boundary', 'app.092.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_lower_boundary', 'app.092.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_lower_boundary', 'app.092.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_lower_boundary', 'app.092.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_lower_boundary', 'app.092.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_lower_boundary', 'app.092.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_upper_boundary', 'app.093.battery_ev', 'ev', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_upper_boundary', 'app.093.battery_lmt', 'lmt', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_upper_boundary', 'app.093.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_upper_boundary', 'app.093.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_upper_boundary', 'app.093.battery_industrial_without_bms', 'industrial', 'without_bms', 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_upper_boundary', 'app.093.battery_portable', 'portable', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_upper_boundary', 'app.093.battery_sli', 'sli', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (1l)'),
  ('battery.temperature_range_idle_state_upper_boundary', 'app.093.battery_other', 'other', null, 'MODEL', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (1l)'),
  ('battery.time_spent_in_extreme_temperatures_above_boundary', 'app.094.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_above_boundary', 'app.094.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_above_boundary', 'app.094.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_above_boundary', 'app.094.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_above_boundary', 'app.094.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_above_boundary', 'app.094.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_above_boundary', 'app.094.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_above_boundary', 'app.094.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_below_boundary', 'app.095.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_below_boundary', 'app.095.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_below_boundary', 'app.095.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_below_boundary', 'app.095.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_below_boundary', 'app.095.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_below_boundary', 'app.095.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_below_boundary', 'app.095.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part B (4)'),
  ('battery.time_spent_in_extreme_temperatures_below_boundary', 'app.095.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'app.096.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'app.096.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'app.096.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'app.096.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'app.096.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'app.096.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'app.096.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'app.096.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'app.097.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'NOT_APPLICABLE', 1000, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'app.097.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'app.097.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'NOT_APPLICABLE', 998, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'app.097.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'app.097.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'NOT_APPLICABLE', 996, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'app.097.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'app.097.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part B (4)'),
  ('battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'app.097.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part B (4)'),
  ('battery.number_of_deep_discharge_events', 'app.098.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'Annex VII Part B (4)'),
  ('battery.number_of_deep_discharge_events', 'app.098.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex VII Part B (4)'),
  ('battery.number_of_deep_discharge_events', 'app.098.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'VOLUNTARY', 998, 'Annex VII Part B (4)'),
  ('battery.number_of_deep_discharge_events', 'app.098.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex VII Part B (4)'),
  ('battery.number_of_deep_discharge_events', 'app.098.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'VOLUNTARY', 996, 'Annex VII Part B (4)'),
  ('battery.number_of_deep_discharge_events', 'app.098.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex VII Part B (4)'),
  ('battery.number_of_deep_discharge_events', 'app.098.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex VII Part B (4)'),
  ('battery.number_of_deep_discharge_events', 'app.098.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex VII Part B (4)'),
  ('battery.number_of_overcharge_events', 'app.099.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'VOLUNTARY', 1000, 'n.a.'),
  ('battery.number_of_overcharge_events', 'app.099.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'VOLUNTARY', 999, 'n.a.'),
  ('battery.number_of_overcharge_events', 'app.099.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'VOLUNTARY', 998, 'n.a.'),
  ('battery.number_of_overcharge_events', 'app.099.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'VOLUNTARY', 997, 'n.a.'),
  ('battery.number_of_overcharge_events', 'app.099.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'VOLUNTARY', 996, 'n.a.'),
  ('battery.number_of_overcharge_events', 'app.099.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'n.a.'),
  ('battery.number_of_overcharge_events', 'app.099.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'n.a.'),
  ('battery.number_of_overcharge_events', 'app.099.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'n.a.'),
  ('battery.information_on_accidents', 'app.100.battery_ev', 'ev', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.ev"}'::jsonb, 'CONFIRMED_MANDATORY', 1000, 'Annex XIII (4d)'),
  ('battery.information_on_accidents', 'app.100.battery_lmt', 'lmt', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.lmt"}'::jsonb, 'CONFIRMED_MANDATORY', 999, 'Annex XIII (4d)'),
  ('battery.information_on_accidents', 'app.100.battery_industrial_non_stationary', 'industrial', 'non_stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.non_stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 998, 'Annex XIII (4d)'),
  ('battery.information_on_accidents', 'app.100.battery_industrial_stationary', 'industrial', 'stationary_above_2kwh', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.stationary"}'::jsonb, 'CONFIRMED_MANDATORY', 997, 'Annex XIII (4d)'),
  ('battery.information_on_accidents', 'app.100.battery_industrial_without_bms', 'industrial', 'without_bms', 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.industrial.without_bms"}'::jsonb, 'CONFIRMED_MANDATORY', 996, 'Annex XIII (4d)'),
  ('battery.information_on_accidents', 'app.100.battery_portable', 'portable', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.portable"}'::jsonb, 'TBD', 995, 'Annex XIII (4d)'),
  ('battery.information_on_accidents', 'app.100.battery_sli', 'sli', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.sli"}'::jsonb, 'TBD', 994, 'Annex XIII (4d)'),
  ('battery.information_on_accidents', 'app.100.battery_other', 'other', null, 'ITEM', '{"field":"schemaCode","operator":"equals","value":"battery.other"}'::jsonb, 'TBD', 993, 'Annex XIII (4d)')
) as rows(field_code, rule_code, legal_category_code, technical_variant_code, data_granularity, condition_config, result_status, priority, source_note) on rows.field_code = fd.field_code
where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft'
on conflict (schema_version_id, rule_code) do nothing;

insert into public.field_regulatory_reference (field_definition_id, regulatory_reference_id, relation_type, notes)
select fd.id, rr.id, 'informs', 'BatteryPass-Ready Longlist v1.3 reference mapping'
from public.field_definition fd join public.schema_version sv on sv.id = fd.schema_version_id join public.schema_definition sd on sd.id = sv.schema_definition_id cross join public.regulatory_reference rr
where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft' and rr.source_code = 'BPR-LONGLIST'
on conflict do nothing;

update public.codelist set status = 'published' where code in ('battery.category', 'battery.status', 'battery.chemistry') and version = '1.0.0' and status = 'draft';
update public.schema_version sv set status = 'published' from public.schema_definition sd where sv.schema_definition_id = sd.id and sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft';

insert into public.battery_schema_profile (code, legal_category_code, technical_variant_code, validation_schema_version_id, longlist_schema_version_id, source_profile_code, status, notes)
select 'battery.ev.default', 'ev', null, (select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.ev' and sv.version = '1.0.0'), sv.id, 'battery.ev', 'active', 'BatteryPass reference configuration; not final EU Registry semantics.'
from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0'
on conflict (code) do update set validation_schema_version_id = excluded.validation_schema_version_id, longlist_schema_version_id = excluded.longlist_schema_version_id, status = excluded.status, updated_at = now();

insert into public.battery_schema_profile (code, legal_category_code, technical_variant_code, validation_schema_version_id, longlist_schema_version_id, source_profile_code, status, notes)
select 'battery.lmt.default', 'lmt', null, (select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.lmt' and sv.version = '1.0.0'), sv.id, 'battery.lmt', 'active', 'BatteryPass reference configuration; not final EU Registry semantics.'
from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0'
on conflict (code) do update set validation_schema_version_id = excluded.validation_schema_version_id, longlist_schema_version_id = excluded.longlist_schema_version_id, status = excluded.status, updated_at = now();

insert into public.battery_schema_profile (code, legal_category_code, technical_variant_code, validation_schema_version_id, longlist_schema_version_id, source_profile_code, status, notes)
select 'battery.industrial.without_bms', 'industrial', 'without_bms', (select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.industrial.without_bms' and sv.version = '1.0.0'), sv.id, 'battery.industrial.without_bms', 'active', 'BatteryPass reference configuration; not final EU Registry semantics.'
from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0'
on conflict (code) do update set validation_schema_version_id = excluded.validation_schema_version_id, longlist_schema_version_id = excluded.longlist_schema_version_id, status = excluded.status, updated_at = now();

insert into public.battery_schema_profile (code, legal_category_code, technical_variant_code, validation_schema_version_id, longlist_schema_version_id, source_profile_code, status, notes)
select 'battery.industrial.non_stationary_above_2kwh', 'industrial', 'non_stationary_above_2kwh', (select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.industrial.non_stationary' and sv.version = '1.0.0'), sv.id, 'battery.industrial.non_stationary', 'active', 'BatteryPass reference configuration; not final EU Registry semantics.'
from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0'
on conflict (code) do update set validation_schema_version_id = excluded.validation_schema_version_id, longlist_schema_version_id = excluded.longlist_schema_version_id, status = excluded.status, updated_at = now();

insert into public.battery_schema_profile (code, legal_category_code, technical_variant_code, validation_schema_version_id, longlist_schema_version_id, source_profile_code, status, notes)
select 'battery.industrial.stationary_above_2kwh', 'industrial', 'stationary_above_2kwh', (select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.industrial.stationary' and sv.version = '1.0.0'), sv.id, 'battery.industrial.stationary', 'active', 'BatteryPass reference configuration; not final EU Registry semantics.'
from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0'
on conflict (code) do update set validation_schema_version_id = excluded.validation_schema_version_id, longlist_schema_version_id = excluded.longlist_schema_version_id, status = excluded.status, updated_at = now();

insert into public.battery_schema_profile (code, legal_category_code, technical_variant_code, validation_schema_version_id, longlist_schema_version_id, source_profile_code, status, notes)
select 'battery.portable.reference', 'portable', null, null, sv.id, 'battery.portable', 'draft', 'BatteryPass reference configuration; not final EU Registry semantics.'
from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0'
on conflict (code) do update set validation_schema_version_id = excluded.validation_schema_version_id, longlist_schema_version_id = excluded.longlist_schema_version_id, status = excluded.status, updated_at = now();

insert into public.battery_schema_profile (code, legal_category_code, technical_variant_code, validation_schema_version_id, longlist_schema_version_id, source_profile_code, status, notes)
select 'battery.sli.reference', 'sli', null, null, sv.id, 'battery.sli', 'draft', 'BatteryPass reference configuration; not final EU Registry semantics.'
from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0'
on conflict (code) do update set validation_schema_version_id = excluded.validation_schema_version_id, longlist_schema_version_id = excluded.longlist_schema_version_id, status = excluded.status, updated_at = now();

insert into public.battery_schema_profile (code, legal_category_code, technical_variant_code, validation_schema_version_id, longlist_schema_version_id, source_profile_code, status, notes)
select 'battery.other.reference', 'other', null, null, sv.id, 'battery.other', 'draft', 'BatteryPass reference configuration; not final EU Registry semantics.'
from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0'
on conflict (code) do update set validation_schema_version_id = excluded.validation_schema_version_id, longlist_schema_version_id = excluded.longlist_schema_version_id, status = excluded.status, updated_at = now();

-- END GENERATED BATTERY REFERENCE CATALOG

create table if not exists public.battery_model_profile (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  schema_profile_id uuid references public.battery_schema_profile(id) on delete restrict,
  legal_category_code text not null,
  technical_variant_code text,
  passport_applicability text not null default 'TBD',
  applicability_reason text,
  battery_model_identifier text,
  rated_capacity_value numeric,
  rated_capacity_unit text,
  rated_energy_kwh numeric,
  battery_mass_kg numeric,
  battery_chemistry_code text,
  bms_present boolean,
  stationary boolean,
  economic_operator_name text,
  manufacturer_name text,
  manufacturing_place text,
  warranty_description text,
  source_type text not null default 'manual',
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battery_model_category_check check (legal_category_code in ('ev', 'lmt', 'industrial', 'portable', 'sli', 'other')),
  constraint battery_model_applicability_check check (passport_applicability in ('REQUIRED', 'NOT_REQUIRED', 'CONDITIONAL', 'TBD')),
  constraint battery_model_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected')),
  constraint battery_model_capacity_check check (rated_capacity_value is null or rated_capacity_value >= 0),
  constraint battery_model_energy_check check (rated_energy_kwh is null or rated_energy_kwh >= 0),
  constraint battery_model_mass_check check (battery_mass_kg is null or battery_mass_kg >= 0)
);

create table if not exists public.battery_batch (
  id uuid primary key default gen_random_uuid(),
  battery_model_profile_id uuid not null references public.battery_model_profile(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  batch_identifier text not null,
  manufacturing_site_identifier text,
  manufacturing_date date,
  calendar_year integer,
  visibility_level text not null default 'PUBLIC' references public.access_level(code) on delete restrict,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (battery_model_profile_id, batch_identifier),
  constraint battery_batch_year_check check (calendar_year is null or calendar_year between 1900 and 2200),
  constraint battery_batch_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected'))
);

create table if not exists public.battery_item (
  id uuid primary key default gen_random_uuid(),
  battery_model_profile_id uuid not null references public.battery_model_profile(id) on delete cascade,
  battery_batch_id uuid references public.battery_batch(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  serial_identifier text not null,
  unique_product_identifier text,
  battery_status_code text not null default 'original',
  manufacturing_date date,
  commissioned_at timestamptz,
  decommissioned_at timestamptz,
  visibility_level text not null default 'PUBLIC' references public.access_level(code) on delete restrict,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (battery_model_profile_id, serial_identifier),
  unique (unique_product_identifier),
  constraint battery_item_status_check check (battery_status_code in ('original', 'reused', 'repurposed', 'remanufactured', 'waste', 'exported', 'unknown')),
  constraint battery_item_dates_check check (decommissioned_at is null or commissioned_at is null or decommissioned_at >= commissioned_at),
  constraint battery_item_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected'))
);

create table if not exists public.battery_field_value (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  battery_model_profile_id uuid not null references public.battery_model_profile(id) on delete cascade,
  battery_batch_id uuid references public.battery_batch(id) on delete cascade,
  battery_item_id uuid references public.battery_item(id) on delete cascade,
  field_definition_id uuid not null references public.field_definition(id) on delete restrict,
  value_json jsonb not null,
  unit_code text,
  data_source text,
  source_reference text,
  evidence_status text not null default 'missing',
  verification_status text not null default 'unverified',
  observed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battery_field_scope_check check (battery_item_id is null or battery_batch_id is null),
  constraint battery_field_evidence_check check (evidence_status in ('missing', 'declared', 'uploaded', 'verified', 'rejected', 'not_applicable')),
  constraint battery_field_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected'))
);

create unique index if not exists battery_field_model_unique_idx
  on public.battery_field_value (battery_model_profile_id, field_definition_id)
  where battery_batch_id is null and battery_item_id is null;
create unique index if not exists battery_field_batch_unique_idx
  on public.battery_field_value (battery_batch_id, field_definition_id)
  where battery_batch_id is not null and battery_item_id is null;
create unique index if not exists battery_field_item_unique_idx
  on public.battery_field_value (battery_item_id, field_definition_id)
  where battery_item_id is not null;

create table if not exists public.battery_material_composition (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  battery_model_profile_id uuid not null references public.battery_model_profile(id) on delete cascade,
  material_name text not null,
  material_role text,
  substance_identifier text,
  mass_value numeric,
  mass_unit text,
  percentage numeric,
  is_critical boolean not null default false,
  is_hazardous boolean not null default false,
  recycled_content_percentage numeric,
  origin_country text,
  source_reference text,
  access_level_code text not null default 'PUBLIC' references public.access_level(code) on delete restrict,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battery_material_percentage_check check (percentage is null or percentage between 0 and 100),
  constraint battery_material_recycled_check check (recycled_content_percentage is null or recycled_content_percentage between 0 and 100),
  constraint battery_material_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected'))
);

create table if not exists public.battery_sustainability_data (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  battery_model_profile_id uuid not null references public.battery_model_profile(id) on delete cascade,
  battery_batch_id uuid references public.battery_batch(id) on delete cascade,
  manufacturing_site_identifier text,
  reporting_year integer,
  carbon_footprint_per_kwh numeric,
  absolute_carbon_footprint numeric,
  lifecycle_stage_contributions jsonb not null default '{}'::jsonb,
  carbon_footprint_class text,
  recycled_content jsonb not null default '{}'::jsonb,
  due_diligence_summary text,
  methodology text,
  verifier text,
  source_document_id uuid references public.product_documents(id) on delete set null,
  access_level_code text not null default 'PUBLIC' references public.access_level(code) on delete restrict,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battery_sustainability_year_check check (reporting_year is null or reporting_year between 1900 and 2200),
  constraint battery_sustainability_stage_check check (jsonb_typeof(lifecycle_stage_contributions) = 'object'),
  constraint battery_sustainability_recycled_check check (jsonb_typeof(recycled_content) = 'object'),
  constraint battery_sustainability_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected'))
);

create table if not exists public.battery_performance_spec (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  battery_model_profile_id uuid not null unique references public.battery_model_profile(id) on delete cascade,
  rated_capacity_value numeric,
  rated_capacity_unit text,
  certified_usable_energy_kwh numeric,
  minimum_voltage_v numeric,
  maximum_voltage_v numeric,
  nominal_voltage_v numeric,
  original_power_w numeric,
  maximum_permitted_power_w numeric,
  initial_round_trip_efficiency numeric,
  initial_internal_resistance_ohm numeric,
  expected_lifetime_years numeric,
  expected_cycle_count integer,
  idle_temperature_min_c numeric,
  idle_temperature_max_c numeric,
  test_reference text,
  source_document_id uuid references public.product_documents(id) on delete set null,
  access_level_code text not null default 'PUBLIC' references public.access_level(code) on delete restrict,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battery_performance_efficiency_check check (initial_round_trip_efficiency is null or initial_round_trip_efficiency between 0 and 100),
  constraint battery_performance_temperature_check check (idle_temperature_max_c is null or idle_temperature_min_c is null or idle_temperature_max_c >= idle_temperature_min_c),
  constraint battery_performance_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected'))
);

create table if not exists public.battery_compliance_document (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  battery_model_profile_id uuid not null references public.battery_model_profile(id) on delete cascade,
  product_document_id uuid not null references public.product_documents(id) on delete cascade,
  document_role text not null,
  supported_field_code text,
  validity_status text not null default 'unknown',
  access_level_code text not null default 'PUBLIC' references public.access_level(code) on delete restrict,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  unique (battery_model_profile_id, product_document_id, document_role),
  constraint battery_document_role_check check (document_role in ('declaration_of_conformity', 'test_report', 'carbon_footprint', 'due_diligence', 'label', 'safety', 'disassembly', 'repair', 'other')),
  constraint battery_document_validity_check check (validity_status in ('valid', 'expired', 'revoked', 'unknown')),
  constraint battery_document_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected'))
);

create table if not exists public.battery_disassembly_information (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  battery_model_profile_id uuid not null unique references public.battery_model_profile(id) on delete cascade,
  removal_instructions text,
  disassembly_instructions text,
  repair_instructions text,
  safety_measures text,
  spare_parts_information text,
  end_of_life_information text,
  source_document_id uuid references public.product_documents(id) on delete set null,
  access_level_code text not null default 'LEGITIMATE_INTEREST' references public.access_level(code) on delete restrict,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battery_disassembly_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected'))
);

create table if not exists public.battery_lifecycle_event (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  battery_item_id uuid not null references public.battery_item(id) on delete cascade,
  event_type text not null,
  event_time timestamptz not null,
  event_data jsonb not null default '{}'::jsonb,
  data_source text,
  verification_status text not null default 'unverified',
  access_level_code text not null default 'LEGITIMATE_INTEREST' references public.access_level(code) on delete restrict,
  supersedes_event_id uuid references public.battery_lifecycle_event(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint battery_event_data_check check (jsonb_typeof(event_data) = 'object'),
  constraint battery_event_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected'))
);

create index if not exists battery_batch_product_idx on public.battery_batch (product_id, manufacturing_date);
create index if not exists battery_item_product_idx on public.battery_item (product_id, serial_identifier);
create index if not exists battery_field_product_idx on public.battery_field_value (product_id, field_definition_id);
create index if not exists battery_material_product_idx on public.battery_material_composition (product_id);
create index if not exists battery_sustainability_product_idx on public.battery_sustainability_data (product_id, reporting_year);
create index if not exists battery_event_item_time_idx on public.battery_lifecycle_event (battery_item_id, event_time desc);

create or replace function public.greanlean_prevent_battery_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Battery history is append-only; add a superseding record instead';
end;
$$;

drop trigger if exists battery_lifecycle_event_append_only on public.battery_lifecycle_event;
create trigger battery_lifecycle_event_append_only
  before update or delete on public.battery_lifecycle_event
  for each row execute function public.greanlean_prevent_battery_history_mutation();

drop trigger if exists battery_schema_profile_touch_updated_at on public.battery_schema_profile;
create trigger battery_schema_profile_touch_updated_at before update on public.battery_schema_profile
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists battery_model_profile_touch_updated_at on public.battery_model_profile;
create trigger battery_model_profile_touch_updated_at before update on public.battery_model_profile
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists battery_batch_touch_updated_at on public.battery_batch;
create trigger battery_batch_touch_updated_at before update on public.battery_batch
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists battery_item_touch_updated_at on public.battery_item;
create trigger battery_item_touch_updated_at before update on public.battery_item
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists battery_field_value_touch_updated_at on public.battery_field_value;
create trigger battery_field_value_touch_updated_at before update on public.battery_field_value
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists battery_material_touch_updated_at on public.battery_material_composition;
create trigger battery_material_touch_updated_at before update on public.battery_material_composition
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists battery_sustainability_touch_updated_at on public.battery_sustainability_data;
create trigger battery_sustainability_touch_updated_at before update on public.battery_sustainability_data
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists battery_performance_touch_updated_at on public.battery_performance_spec;
create trigger battery_performance_touch_updated_at before update on public.battery_performance_spec
  for each row execute function public.greanlean_touch_updated_at();
drop trigger if exists battery_disassembly_touch_updated_at on public.battery_disassembly_information;
create trigger battery_disassembly_touch_updated_at before update on public.battery_disassembly_information
  for each row execute function public.greanlean_touch_updated_at();

alter table public.battery_schema_profile enable row level security;
alter table public.battery_model_profile enable row level security;
alter table public.battery_batch enable row level security;
alter table public.battery_item enable row level security;
alter table public.battery_field_value enable row level security;
alter table public.battery_material_composition enable row level security;
alter table public.battery_sustainability_data enable row level security;
alter table public.battery_performance_spec enable row level security;
alter table public.battery_compliance_document enable row level security;
alter table public.battery_disassembly_information enable row level security;
alter table public.battery_lifecycle_event enable row level security;

drop policy if exists "Public can read active battery schema profiles" on public.battery_schema_profile;
create policy "Public can read active battery schema profiles" on public.battery_schema_profile
  for select to anon, authenticated using (status = 'active');

drop policy if exists "Public can read published battery model profiles" on public.battery_model_profile;
create policy "Public can read published battery model profiles" on public.battery_model_profile
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
  );

drop policy if exists "Public can read public battery batches" on public.battery_batch;
create policy "Public can read public battery batches" on public.battery_batch for select to anon, authenticated using (
  visibility_level = 'PUBLIC' and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);
drop policy if exists "Public can read public battery items" on public.battery_item;
create policy "Public can read public battery items" on public.battery_item for select to anon, authenticated using (
  visibility_level = 'PUBLIC' and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);
drop policy if exists "Public can read public battery field values" on public.battery_field_value;
create policy "Public can read public battery field values" on public.battery_field_value for select to anon, authenticated using (
  exists (
    select 1 from public.products p
    join public.field_definition fd on fd.id = field_definition_id
    where p.id = product_id and p.status in ('published', 'updated', 'expired') and fd.access_level_code = 'PUBLIC'
  )
);

drop policy if exists "Public can read public battery materials" on public.battery_material_composition;
create policy "Public can read public battery materials" on public.battery_material_composition for select to anon, authenticated using (
  access_level_code = 'PUBLIC' and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);
drop policy if exists "Public can read public battery sustainability" on public.battery_sustainability_data;
create policy "Public can read public battery sustainability" on public.battery_sustainability_data for select to anon, authenticated using (
  access_level_code = 'PUBLIC' and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);
drop policy if exists "Public can read public battery performance" on public.battery_performance_spec;
create policy "Public can read public battery performance" on public.battery_performance_spec for select to anon, authenticated using (
  access_level_code = 'PUBLIC' and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);
drop policy if exists "Public can read public battery documents" on public.battery_compliance_document;
create policy "Public can read public battery documents" on public.battery_compliance_document for select to anon, authenticated using (
  access_level_code = 'PUBLIC' and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);
drop policy if exists "Public can read public battery disassembly" on public.battery_disassembly_information;
create policy "Public can read public battery disassembly" on public.battery_disassembly_information for select to anon, authenticated using (
  access_level_code = 'PUBLIC' and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);
drop policy if exists "Public can read public battery events" on public.battery_lifecycle_event;
create policy "Public can read public battery events" on public.battery_lifecycle_event for select to anon, authenticated using (
  access_level_code = 'PUBLIC' and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

comment on table public.battery_model_profile is
  'Phase 4 compatibility table linked to legacy products.id; future product_model migration adds the canonical model relation without rewriting legacy data.';
comment on table public.battery_field_value is
  'Static/configured BatteryPass values. Dynamic operating measurements must use battery_operating_metric.';

commit;

-- ============================================================================
-- SOURCE: supabase/migrations/0010_battery_dynamic_metrics.sql
-- SHA256: 15fc8c8bbe421f74da58157042d9b1dbb04cfe9147a7ee01230eebe291fd0ec6
-- ============================================================================
begin;

create table if not exists public.battery_metric_type (
  code text primary key,
  label_en text not null,
  label_zh text not null,
  default_unit text,
  source_field_code text,
  access_level_code text not null default 'LEGITIMATE_INTEREST' references public.access_level(code) on delete restrict,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint battery_metric_type_status_check check (status in ('draft', 'active', 'retired'))
);

create table if not exists public.battery_operating_metric (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  battery_item_id uuid not null references public.battery_item(id) on delete cascade,
  metric_type text not null references public.battery_metric_type(code) on delete restrict,
  metric_value numeric not null,
  unit text not null,
  measured_at timestamptz not null,
  data_source text not null,
  source_device text,
  source_device_key text generated always as (coalesce(source_device, '')) stored,
  verification_status text not null default 'unverified',
  access_level_code text not null default 'LEGITIMATE_INTEREST' references public.access_level(code) on delete restrict,
  ingestion_key text,
  created_at timestamptz not null default now(),
  unique (battery_item_id, metric_type, measured_at, source_device_key),
  unique (ingestion_key),
  constraint battery_metric_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected')),
  constraint battery_metric_ingestion_key_check check (ingestion_key is null or length(ingestion_key) between 8 and 200)
);

insert into public.battery_metric_type (code, label_en, label_zh, default_unit, source_field_code, access_level_code)
values
  ('REMAINING_CAPACITY', 'Remaining capacity', '剩余容量', 'Ah', 'battery.remaining_capacity', 'LEGITIMATE_INTEREST'),
  ('CAPACITY_FADE', 'Capacity fade', '容量衰减', '%', 'battery.capacity_fade', 'LEGITIMATE_INTEREST'),
  ('REMAINING_USABLE_ENERGY', 'Remaining usable battery energy', '剩余可用电池能量', 'kWh', 'battery.remaining_usable_battery_energy', 'LEGITIMATE_INTEREST'),
  ('SOCE', 'State of certified energy', '认证能量状态', '%', 'battery.state_of_certified_energy_soce', 'LEGITIMATE_INTEREST'),
  ('SOC', 'State of charge', '荷电状态', '%', 'battery.state_of_charge_soc', 'LEGITIMATE_INTEREST'),
  ('REMAINING_POWER_CAPABILITY', 'Remaining power capability', '剩余功率能力', 'W', 'battery.remaining_power_capability', 'LEGITIMATE_INTEREST'),
  ('POWER_FADE', 'Power fade', '功率衰减', '%', 'battery.power_fade', 'LEGITIMATE_INTEREST'),
  ('REMAINING_ROUND_TRIP_EFFICIENCY', 'Remaining round trip efficiency', '剩余往返能量效率', '%', 'battery.remaining_round_trip_energy_efficiency', 'LEGITIMATE_INTEREST'),
  ('ROUND_TRIP_EFFICIENCY_FADE', 'Round trip efficiency fade', '往返能量效率衰减', '%', 'battery.energy_round_trip_efficiency_fade', 'LEGITIMATE_INTEREST'),
  ('CURRENT_SELF_DISCHARGE_RATE', 'Current self-discharge rate', '当前自放电率', '%/month', 'battery.current_self_discharge_rate', 'LEGITIMATE_INTEREST'),
  ('SELF_DISCHARGE_EVOLUTION', 'Evolution of self-discharge rates', '自放电率变化', '%', 'battery.evolution_of_self_discharge_rates', 'LEGITIMATE_INTEREST'),
  ('INTERNAL_RESISTANCE_INCREASE', 'Internal resistance increase', '内阻增长', '%', 'battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'LEGITIMATE_INTEREST'),
  ('FULL_CYCLE_COUNT', 'Full charging and discharging cycles', '完整充放电循环次数', 'cycle', 'battery.number_of_full_charging_and_discharging_cycles', 'LEGITIMATE_INTEREST'),
  ('ENERGY_THROUGHPUT', 'Energy throughput', '能量吞吐量', 'kWh', 'battery.energy_throughput', 'LEGITIMATE_INTEREST'),
  ('CAPACITY_THROUGHPUT', 'Capacity throughput', '容量吞吐量', 'Ah', 'battery.capacity_throughput', 'LEGITIMATE_INTEREST'),
  ('TEMPERATURE', 'Temperature information', '温度信息', '°C', 'battery.temperature_information', 'LEGITIMATE_INTEREST'),
  ('HIGH_TEMPERATURE_DURATION', 'Time above temperature boundary', '高于温度边界的持续时间', 'h', 'battery.time_spent_in_extreme_temperatures_above_boundary', 'LEGITIMATE_INTEREST'),
  ('LOW_TEMPERATURE_DURATION', 'Time below temperature boundary', '低于温度边界的持续时间', 'h', 'battery.time_spent_in_extreme_temperatures_below_boundary', 'LEGITIMATE_INTEREST'),
  ('HIGH_TEMPERATURE_CHARGING_DURATION', 'Charging time above temperature boundary', '高温边界以上充电持续时间', 'h', 'battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'LEGITIMATE_INTEREST'),
  ('LOW_TEMPERATURE_CHARGING_DURATION', 'Charging time below temperature boundary', '低温边界以下充电持续时间', 'h', 'battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'LEGITIMATE_INTEREST'),
  ('DEEP_DISCHARGE_EVENT_COUNT', 'Deep discharge event count', '深度放电事件次数', 'count', 'battery.number_of_deep_discharge_events', 'LEGITIMATE_INTEREST'),
  ('OVERCHARGE_EVENT_COUNT', 'Overcharge event count', '过充事件次数', 'count', 'battery.number_of_overcharge_events', 'LEGITIMATE_INTEREST'),
  ('SOH_VOLUNTARY', 'State of health (voluntary)', '健康状态（自愿）', '%', null, 'LEGITIMATE_INTEREST')
on conflict (code) do update set
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  default_unit = excluded.default_unit,
  source_field_code = excluded.source_field_code,
  access_level_code = excluded.access_level_code;

create index if not exists battery_metric_item_time_idx
  on public.battery_operating_metric (battery_item_id, metric_type, measured_at desc);
create index if not exists battery_metric_product_time_idx
  on public.battery_operating_metric (product_id, measured_at desc);

create or replace view public.battery_operating_metric_latest
with (security_invoker = true)
as
select distinct on (battery_item_id, metric_type)
  id,
  product_id,
  battery_item_id,
  metric_type,
  metric_value,
  unit,
  measured_at,
  data_source,
  source_device,
  verification_status,
  access_level_code,
  created_at
from public.battery_operating_metric
order by battery_item_id, metric_type, measured_at desc, created_at desc;

comment on view public.battery_operating_metric_latest is
  'Read-only latest-value projection. The underlying operating metric history remains append-only.';

drop trigger if exists battery_operating_metric_append_only on public.battery_operating_metric;
create trigger battery_operating_metric_append_only
  before update or delete on public.battery_operating_metric
  for each row execute function public.greanlean_prevent_battery_history_mutation();

alter table public.battery_metric_type enable row level security;
alter table public.battery_operating_metric enable row level security;

drop policy if exists "Public can read battery metric types" on public.battery_metric_type;
create policy "Public can read battery metric types" on public.battery_metric_type
  for select to anon, authenticated using (status = 'active');

drop policy if exists "Public can read public battery operating metrics" on public.battery_operating_metric;
create policy "Public can read public battery operating metrics" on public.battery_operating_metric
  for select to anon, authenticated using (
    access_level_code = 'PUBLIC'
    and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
  );

commit;
