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
