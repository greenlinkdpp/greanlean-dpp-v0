-- Generated from supabase/migrations/0025_p0_battery_pilot_foundation.sql. Do not edit this bundle directly.
begin;

do $$
begin
  if to_regclass('public.dpp_organisation') is null
    or to_regclass('public.battery_model_profile') is null
    or to_regclass('public.battery_batch') is null
    or to_regclass('public.battery_item') is null
    or to_regclass('public.dpp_publication') is null
  then
    raise exception '0025 requires identity, battery domain and publication migrations';
  end if;

  if exists (
    select 1
    from public.battery_batch batch
    join public.battery_model_profile model on model.id = batch.battery_model_profile_id
    where batch.product_id <> model.product_id
  ) then
    raise exception 'P0_MIGRATION_BLOCKED_BATCH_PRODUCT_MISMATCH';
  end if;

  if exists (
    select 1
    from public.battery_item item
    join public.battery_model_profile model on model.id = item.battery_model_profile_id
    left join public.battery_batch batch on batch.id = item.battery_batch_id
    where item.product_id <> model.product_id
       or (batch.id is not null and (
         batch.battery_model_profile_id <> item.battery_model_profile_id
         or batch.product_id <> item.product_id
       ))
  ) then
    raise exception 'P0_MIGRATION_BLOCKED_ITEM_HIERARCHY_MISMATCH';
  end if;
end;
$$;

alter table public.dpp_organisation
  add column if not exists display_name text,
  add column if not exists tenant_slug text,
  add column if not exists registered_address jsonb not null default '{}'::jsonb,
  add column if not exists default_locale text not null default 'zh-CN',
  add column if not exists row_version integer not null default 1;

update public.dpp_organisation
set display_name = coalesce(nullif(trim(display_name), ''), legal_name),
    tenant_slug = coalesce(
      nullif(trim(tenant_slug), ''),
      trim(both '-' from lower(regexp_replace(legal_name, '[^a-zA-Z0-9]+', '-', 'g')))
        || '-' || substring(id::text from 1 for 8)
    )
where display_name is null or tenant_slug is null;

alter table public.dpp_organisation
  alter column display_name set not null,
  alter column tenant_slug set not null;

create unique index if not exists dpp_organisation_tenant_slug_idx
  on public.dpp_organisation (tenant_slug);

alter table public.dpp_organisation
  drop constraint if exists dpp_organisation_address_object_check,
  add constraint dpp_organisation_address_object_check
    check (jsonb_typeof(registered_address) = 'object'),
  drop constraint if exists dpp_organisation_locale_check,
  add constraint dpp_organisation_locale_check
    check (default_locale in ('zh-CN', 'en')),
  drop constraint if exists dpp_organisation_row_version_check,
  add constraint dpp_organisation_row_version_check check (row_version > 0);

create table if not exists public.dpp_economic_operator_profile (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.dpp_organisation(id) on delete restrict,
  version integer not null,
  role_type text not null,
  legal_name_snapshot text not null,
  legal_address_snapshot jsonb not null,
  eu_contact_name text,
  eu_contact_email text,
  verification_status text not null default 'NOT_STARTED',
  verification_method text,
  verified_at timestamptz,
  verification_expires_at timestamptz,
  evidence_file_version_id uuid references public.dpp_file_version(id) on delete restrict,
  is_current boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organisation_id, version),
  constraint dpp_economic_operator_version_check check (version > 0),
  constraint dpp_economic_operator_role_check check (
    role_type in ('MANUFACTURER', 'IMPORTER', 'DISTRIBUTOR', 'AUTHORISED_REPRESENTATIVE', 'OTHER')
  ),
  constraint dpp_economic_operator_address_check check (jsonb_typeof(legal_address_snapshot) = 'object'),
  constraint dpp_economic_operator_email_check check (
    eu_contact_email is null or eu_contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint dpp_economic_operator_status_check check (
    verification_status in ('NOT_STARTED', 'PREPARING', 'SUBMITTED', 'VERIFIED', 'FAILED', 'EXPIRED')
  ),
  constraint dpp_economic_operator_verified_check check (
    verification_status <> 'VERIFIED' or verified_at is not null
  ),
  constraint dpp_economic_operator_expiry_check check (
    verification_expires_at is null or verified_at is null or verification_expires_at > verified_at
  )
);

create unique index if not exists dpp_economic_operator_current_idx
  on public.dpp_economic_operator_profile (organisation_id)
  where is_current;

create table if not exists public.dpp_project (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.dpp_organisation(id) on delete restrict,
  project_code text not null,
  name text not null,
  project_type text not null default 'PILOT',
  scope_summary text not null,
  target_market jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT',
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  target_date date,
  started_at timestamptz,
  completed_at timestamptz,
  applicability_result text,
  applicability_rule_version text,
  disclaimer_acknowledged_at timestamptz,
  row_version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, project_code),
  constraint dpp_project_id_organisation_key unique (id, organisation_id),
  constraint dpp_project_type_check check (project_type in ('ASSESSMENT', 'PILOT', 'FULL_ROLLOUT')),
  constraint dpp_project_status_check check (status in ('DRAFT', 'ACTIVE', 'BLOCKED', 'ACCEPTANCE', 'COMPLETED', 'ARCHIVED')),
  constraint dpp_project_market_check check (jsonb_typeof(target_market) = 'array'),
  constraint dpp_project_applicability_check check (
    applicability_result is null or applicability_result in (
      'PRELIMINARY_APPLICABLE', 'NOT_APPLICABLE', 'PENDING', 'INSUFFICIENT'
    )
  ),
  constraint dpp_project_dates_check check (
    completed_at is null or started_at is null or completed_at >= started_at
  ),
  constraint dpp_project_row_version_check check (row_version > 0)
);

create index if not exists dpp_project_organisation_status_idx
  on public.dpp_project (organisation_id, status, updated_at desc);

create table if not exists public.dpp_applicability_assessment (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.dpp_project(id) on delete restrict,
  organisation_id uuid not null references public.dpp_organisation(id) on delete restrict,
  rule_version text not null,
  input_snapshot jsonb not null,
  result text not null,
  result_reason text not null,
  pending_questions jsonb not null default '[]'::jsonb,
  disclaimer_text text not null,
  disclaimer_acknowledged boolean not null default false,
  assessed_by uuid references auth.users(id) on delete set null,
  assessed_at timestamptz not null default now(),
  supersedes_id uuid references public.dpp_applicability_assessment(id) on delete restrict,
  constraint dpp_applicability_project_organisation_fk
    foreign key (project_id, organisation_id)
    references public.dpp_project(id, organisation_id) on delete restrict,
  constraint dpp_applicability_input_check check (jsonb_typeof(input_snapshot) = 'object'),
  constraint dpp_applicability_pending_check check (jsonb_typeof(pending_questions) = 'array'),
  constraint dpp_applicability_result_check check (
    result in ('PRELIMINARY_APPLICABLE', 'NOT_APPLICABLE', 'PENDING', 'INSUFFICIENT')
  )
);

create index if not exists dpp_applicability_project_idx
  on public.dpp_applicability_assessment (project_id, assessed_at desc);

create table if not exists public.dpp_project_task (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.dpp_project(id) on delete cascade,
  organisation_id uuid not null references public.dpp_organisation(id) on delete restrict,
  task_type text not null,
  title text not null,
  description text,
  status text not null default 'OPEN',
  priority text not null default 'MEDIUM',
  assignee_user_id uuid references auth.users(id) on delete set null,
  responsible_department text,
  due_at timestamptz,
  blocked_reason text,
  related_entity_type text,
  related_entity_id uuid,
  source_assessment_id uuid references public.dpp_applicability_assessment(id) on delete restrict,
  completed_at timestamptz,
  row_version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dpp_project_task_project_organisation_fk
    foreign key (project_id, organisation_id)
    references public.dpp_project(id, organisation_id) on delete cascade,
  constraint dpp_project_task_type_check check (task_type in ('APPLICABILITY', 'DATA_GAP', 'EVIDENCE', 'REVIEW', 'ACCEPTANCE', 'OTHER')),
  constraint dpp_project_task_status_check check (status in ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED')),
  constraint dpp_project_task_priority_check check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  constraint dpp_project_task_completion_check check ((status = 'DONE') = (completed_at is not null)),
  constraint dpp_project_task_row_version_check check (row_version > 0)
);

create index if not exists dpp_project_task_project_status_idx
  on public.dpp_project_task (project_id, status, priority, due_at);

create table if not exists public.dpp_product_ownership (
  product_id uuid primary key references public.products(id) on delete restrict,
  organisation_id uuid references public.dpp_organisation(id) on delete restrict,
  project_id uuid references public.dpp_project(id) on delete set null,
  ownership_status text not null default 'UNASSIGNED',
  source_type text not null default 'LEGACY_UNASSIGNED',
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint dpp_product_ownership_status_check check (ownership_status in ('ACTIVE', 'UNASSIGNED', 'DISPUTED', 'ARCHIVED')),
  constraint dpp_product_ownership_assignment_check check (
    (ownership_status = 'UNASSIGNED' and organisation_id is null)
    or (ownership_status <> 'UNASSIGNED' and organisation_id is not null)
  ),
  constraint dpp_product_ownership_project_scope_check check (
    project_id is null or organisation_id is not null
  ),
  constraint dpp_product_ownership_project_organisation_fk
    foreign key (project_id, organisation_id)
    references public.dpp_project(id, organisation_id)
);

alter table public.battery_model_profile
  add column if not exists organisation_id uuid references public.dpp_organisation(id) on delete restrict,
  add column if not exists project_id uuid references public.dpp_project(id) on delete set null,
  add column if not exists model_status text not null default 'ACTIVE',
  add column if not exists inheritance_schema_version text not null default 'battery-p0-1.0',
  add column if not exists demo_marker text,
  add column if not exists row_version integer not null default 1;

alter table public.battery_model_profile
  drop constraint if exists battery_model_status_check,
  add constraint battery_model_status_check check (model_status in ('DRAFT', 'ACTIVE', 'RETIRED')),
  drop constraint if exists battery_model_demo_marker_check,
  add constraint battery_model_demo_marker_check check (demo_marker is null or demo_marker = 'SYNTHETIC'),
  drop constraint if exists battery_model_row_version_check,
  add constraint battery_model_row_version_check check (row_version > 0);

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_model_profile'::regclass and conname = 'battery_model_id_product_key') then
    alter table public.battery_model_profile add constraint battery_model_id_product_key unique (id, product_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_model_profile'::regclass and conname = 'battery_model_id_product_organisation_key') then
    alter table public.battery_model_profile add constraint battery_model_id_product_organisation_key unique (id, product_id, organisation_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_model_profile'::regclass and conname = 'battery_model_id_organisation_key') then
    alter table public.battery_model_profile add constraint battery_model_id_organisation_key unique (id, organisation_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_model_profile'::regclass and conname = 'battery_model_project_organisation_fk') then
    alter table public.battery_model_profile add constraint battery_model_project_organisation_fk
      foreign key (project_id, organisation_id) references public.dpp_project(id, organisation_id);
  end if;
end;
$$;

create unique index if not exists battery_model_organisation_identifier_idx
  on public.battery_model_profile (organisation_id, battery_model_identifier)
  where organisation_id is not null and battery_model_identifier is not null;

alter table public.battery_batch
  add column if not exists organisation_id uuid references public.dpp_organisation(id) on delete restrict,
  add column if not exists batch_status text not null default 'ACTIVE',
  add column if not exists variant_overrides jsonb not null default '{}'::jsonb,
  add column if not exists row_version integer not null default 1;

alter table public.battery_batch
  drop constraint if exists battery_batch_status_check,
  add constraint battery_batch_status_check check (batch_status in ('DRAFT', 'ACTIVE', 'RETIRED')),
  drop constraint if exists battery_batch_overrides_check,
  add constraint battery_batch_overrides_check check (jsonb_typeof(variant_overrides) = 'object'),
  drop constraint if exists battery_batch_row_version_check,
  add constraint battery_batch_row_version_check check (row_version > 0);

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_batch'::regclass and conname = 'battery_batch_id_model_product_key') then
    alter table public.battery_batch add constraint battery_batch_id_model_product_key unique (id, battery_model_profile_id, product_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_batch'::regclass and conname = 'battery_batch_id_model_product_organisation_key') then
    alter table public.battery_batch add constraint battery_batch_id_model_product_organisation_key unique (id, battery_model_profile_id, product_id, organisation_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_batch'::regclass and conname = 'battery_batch_id_organisation_key') then
    alter table public.battery_batch add constraint battery_batch_id_organisation_key unique (id, organisation_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_batch'::regclass and conname = 'battery_batch_model_product_fk') then
    alter table public.battery_batch add constraint battery_batch_model_product_fk
      foreign key (battery_model_profile_id, product_id) references public.battery_model_profile(id, product_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_batch'::regclass and conname = 'battery_batch_model_product_organisation_fk') then
    alter table public.battery_batch add constraint battery_batch_model_product_organisation_fk
      foreign key (battery_model_profile_id, product_id, organisation_id)
      references public.battery_model_profile(id, product_id, organisation_id) on delete cascade;
  end if;
end;
$$;

create unique index if not exists battery_batch_organisation_identifier_idx
  on public.battery_batch (organisation_id, battery_model_profile_id, batch_identifier)
  where organisation_id is not null;

alter table public.battery_item
  add column if not exists organisation_id uuid references public.dpp_organisation(id) on delete restrict,
  add column if not exists item_code text,
  add column if not exists placed_on_market_at date,
  add column if not exists p0_item_status text not null default 'ACTIVE',
  add column if not exists source_system text,
  add column if not exists demo_marker text,
  add column if not exists row_version integer not null default 1;

alter table public.battery_item
  drop constraint if exists battery_item_p0_status_check,
  add constraint battery_item_p0_status_check check (
    p0_item_status in ('DRAFT', 'ACTIVE', 'PUBLISHED', 'IN_SERVICE', 'REUSED', 'REMANUFACTURED', 'END_OF_LIFE', 'ARCHIVED')
  ),
  drop constraint if exists battery_item_market_date_check,
  add constraint battery_item_market_date_check check (
    placed_on_market_at is null or manufacturing_date is null or placed_on_market_at >= manufacturing_date
  ),
  drop constraint if exists battery_item_demo_marker_check,
  add constraint battery_item_demo_marker_check check (demo_marker is null or demo_marker = 'SYNTHETIC'),
  drop constraint if exists battery_item_row_version_check,
  add constraint battery_item_row_version_check check (row_version > 0),
  drop constraint if exists battery_item_upi_https_check,
  add constraint battery_item_upi_https_check check (
    unique_product_identifier is null or unique_product_identifier ~ '^https://[^[:space:]]+$'
  ) not valid;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_item'::regclass and conname = 'battery_item_model_product_fk') then
    alter table public.battery_item add constraint battery_item_model_product_fk
      foreign key (battery_model_profile_id, product_id) references public.battery_model_profile(id, product_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_item'::regclass and conname = 'battery_item_model_product_organisation_fk') then
    alter table public.battery_item add constraint battery_item_model_product_organisation_fk
      foreign key (battery_model_profile_id, product_id, organisation_id)
      references public.battery_model_profile(id, product_id, organisation_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_item'::regclass and conname = 'battery_item_batch_model_product_fk') then
    alter table public.battery_item add constraint battery_item_batch_model_product_fk
      foreign key (battery_batch_id, battery_model_profile_id, product_id)
      references public.battery_batch(id, battery_model_profile_id, product_id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_item'::regclass and conname = 'battery_item_batch_model_product_organisation_fk') then
    alter table public.battery_item add constraint battery_item_batch_model_product_organisation_fk
      foreign key (battery_batch_id, battery_model_profile_id, product_id, organisation_id)
      references public.battery_batch(id, battery_model_profile_id, product_id, organisation_id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.battery_item'::regclass and conname = 'battery_item_id_organisation_key') then
    alter table public.battery_item add constraint battery_item_id_organisation_key unique (id, organisation_id);
  end if;
end;
$$;

create unique index if not exists battery_item_organisation_serial_idx
  on public.battery_item (organisation_id, serial_identifier)
  where organisation_id is not null;

create table if not exists public.dpp_identifier (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.dpp_organisation(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  battery_model_profile_id uuid references public.battery_model_profile(id) on delete restrict,
  battery_batch_id uuid references public.battery_batch(id) on delete restrict,
  battery_item_id uuid references public.battery_item(id) on delete restrict,
  identifier_type text not null,
  value text not null,
  normalized_value text not null,
  public_key text,
  is_primary boolean not null default false,
  status text not null default 'ACTIVE',
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (normalized_value),
  unique (public_key),
  constraint dpp_identifier_target_check check (
    num_nonnulls(product_id, battery_model_profile_id, battery_batch_id, battery_item_id) = 1
  ),
  constraint dpp_identifier_type_check check (identifier_type in ('UPI_URL', 'GTIN', 'SGTIN', 'SERIAL', 'INTERNAL', 'OTHER')),
  constraint dpp_identifier_upi_check check (
    identifier_type <> 'UPI_URL'
    or (battery_item_id is not null and value ~ '^https://[^[:space:]]+$' and public_key is not null)
  ),
  constraint dpp_identifier_status_check check (status in ('ACTIVE', 'RETIRED')),
  constraint dpp_identifier_validity_check check (valid_to is null or valid_to > valid_from),
  constraint dpp_identifier_item_organisation_fk
    foreign key (battery_item_id, organisation_id)
    references public.battery_item(id, organisation_id) on delete restrict
);

create unique index if not exists dpp_identifier_primary_type_idx
  on public.dpp_identifier (
    organisation_id,
    identifier_type,
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(battery_model_profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(battery_batch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(battery_item_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) where is_primary and status = 'ACTIVE';

create table if not exists public.dpp_import_job (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.dpp_organisation(id) on delete restrict,
  project_id uuid references public.dpp_project(id) on delete set null,
  job_type text not null,
  template_version text not null,
  idempotency_key text not null,
  input_hash text not null,
  status text not null default 'PREVIEWED',
  total_rows integer not null default 0,
  successful_rows integer not null default 0,
  warning_rows integer not null default 0,
  failed_rows integer not null default 0,
  result_summary jsonb not null default '{}'::jsonb,
  submitted_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, job_type, idempotency_key),
  constraint dpp_import_project_organisation_fk
    foreign key (project_id, organisation_id)
    references public.dpp_project(id, organisation_id),
  constraint dpp_import_job_type_check check (job_type in ('BATTERY_ITEMS', 'BOM', 'FIELD_VALUES')),
  constraint dpp_import_job_status_check check (status in ('PREVIEWED', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED')),
  constraint dpp_import_job_hash_check check (input_hash ~ '^[a-f0-9]{64}$'),
  constraint dpp_import_job_counts_check check (
    total_rows >= 0 and successful_rows >= 0 and warning_rows >= 0 and failed_rows >= 0
  )
);

create table if not exists public.dpp_import_error (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dpp_import_job(id) on delete cascade,
  sheet_name text,
  row_number integer,
  column_name text,
  field_key text,
  error_code text not null,
  message text not null,
  raw_value text,
  severity text not null default 'ERROR',
  suggested_fix text,
  created_at timestamptz not null default now(),
  constraint dpp_import_error_row_check check (row_number is null or row_number > 0),
  constraint dpp_import_error_severity_check check (severity in ('WARNING', 'ERROR', 'BLOCKER'))
);

alter table public.dpp_publication
  add column if not exists organisation_id uuid references public.dpp_organisation(id) on delete restrict,
  add column if not exists battery_item_id uuid references public.battery_item(id) on delete restrict,
  add column if not exists subject_type text not null default 'PRODUCT',
  add column if not exists change_reason text;

alter table public.dpp_publication
  drop constraint if exists dpp_publication_subject_type_check,
  add constraint dpp_publication_subject_type_check check (subject_type in ('PRODUCT', 'BATTERY_ITEM')),
  drop constraint if exists dpp_publication_subject_check,
  add constraint dpp_publication_subject_check check (
    (subject_type = 'PRODUCT' and battery_item_id is null)
    or (subject_type = 'BATTERY_ITEM' and battery_item_id is not null and organisation_id is not null)
  ),
  drop constraint if exists dpp_publication_change_reason_check,
  add constraint dpp_publication_change_reason_check check (
    battery_item_id is null or version_number = 1 or length(trim(coalesce(change_reason, ''))) >= 10
  );

alter table public.dpp_publication
  drop constraint if exists dpp_publication_product_version_key;
drop index if exists public.dpp_publication_one_current_idx;

create unique index if not exists dpp_publication_product_version_idx
  on public.dpp_publication (product_id, version_number)
  where battery_item_id is null;
create unique index if not exists dpp_publication_item_version_idx
  on public.dpp_publication (battery_item_id, version_number)
  where battery_item_id is not null;
create unique index if not exists dpp_publication_one_current_product_idx
  on public.dpp_publication (product_id)
  where status = 'PUBLISHED' and battery_item_id is null;
create unique index if not exists dpp_publication_one_current_item_idx
  on public.dpp_publication (battery_item_id)
  where status = 'PUBLISHED' and battery_item_id is not null;

create table if not exists public.dpp_item_publication_pointer (
  battery_item_id uuid primary key references public.battery_item(id) on delete restrict,
  publication_id uuid not null unique references public.dpp_publication(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.dpp_publication_review
  add column if not exists organisation_id uuid references public.dpp_organisation(id) on delete restrict,
  add column if not exists battery_item_id uuid references public.battery_item(id) on delete restrict,
  add column if not exists subject_type text not null default 'PRODUCT',
  add column if not exists change_reason text;

alter table public.dpp_publication_review
  drop constraint if exists dpp_publication_review_subject_type_check,
  add constraint dpp_publication_review_subject_type_check check (subject_type in ('PRODUCT', 'BATTERY_ITEM')),
  drop constraint if exists dpp_publication_review_subject_check,
  add constraint dpp_publication_review_subject_check check (
    (subject_type = 'PRODUCT' and battery_item_id is null)
    or (subject_type = 'BATTERY_ITEM' and battery_item_id is not null and organisation_id is not null)
  ),
  drop constraint if exists dpp_publication_review_change_reason_check,
  add constraint dpp_publication_review_change_reason_check check (
    battery_item_id is null or base_publication_id is null or length(trim(coalesce(change_reason, ''))) >= 10
  );

drop index if exists public.dpp_publication_review_one_open_idx;
create unique index if not exists dpp_publication_review_one_open_product_idx
  on public.dpp_publication_review (product_id)
  where status in ('IN_REVIEW', 'APPROVED') and battery_item_id is null;
create unique index if not exists dpp_publication_review_one_open_item_idx
  on public.dpp_publication_review (battery_item_id)
  where status in ('IN_REVIEW', 'APPROVED') and battery_item_id is not null;

create or replace function public.greanlean_p0_is_organisation_member(
  target_organisation_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.greanlean_is_platform_admin(check_user_id) or exists (
    select 1
    from public.dpp_user_membership membership
    join public.dpp_organisation organisation on organisation.id = membership.organisation_id
    where membership.user_id = check_user_id
      and membership.organisation_id = target_organisation_id
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
      and organisation.status = 'active'
  );
$$;

create or replace function public.greanlean_p0_validate_battery_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  model_record public.battery_model_profile%rowtype;
  batch_record public.battery_batch%rowtype;
  owner_organisation_id uuid;
begin
  select * into model_record
  from public.battery_model_profile
  where id = new.battery_model_profile_id;

  if model_record.id is null or model_record.product_id <> new.product_id then
    raise exception 'BATTERY_MODEL_PRODUCT_MISMATCH' using errcode = '23514';
  end if;

  if new.organisation_id is not null then
    if model_record.organisation_id is distinct from new.organisation_id then
      raise exception 'BATTERY_MODEL_ORGANISATION_MISMATCH' using errcode = '23514';
    end if;
    select ownership.organisation_id into owner_organisation_id
    from public.dpp_product_ownership ownership
    where ownership.product_id = new.product_id and ownership.ownership_status = 'ACTIVE';
    if owner_organisation_id is distinct from new.organisation_id then
      raise exception 'BATTERY_PRODUCT_ORGANISATION_MISMATCH' using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'battery_item' and new.battery_batch_id is not null then
    select * into batch_record from public.battery_batch where id = new.battery_batch_id;
    if batch_record.id is null
      or batch_record.product_id <> new.product_id
      or batch_record.battery_model_profile_id <> new.battery_model_profile_id
      or batch_record.organisation_id is distinct from new.organisation_id
    then
      raise exception 'BATTERY_ITEM_BATCH_MISMATCH' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists battery_batch_p0_hierarchy_guard on public.battery_batch;
create trigger battery_batch_p0_hierarchy_guard
  before insert or update on public.battery_batch
  for each row execute function public.greanlean_p0_validate_battery_hierarchy();

drop trigger if exists battery_item_p0_hierarchy_guard on public.battery_item;
create trigger battery_item_p0_hierarchy_guard
  before insert or update on public.battery_item
  for each row execute function public.greanlean_p0_validate_battery_hierarchy();

create or replace function public.greanlean_p0_prevent_assessment_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'APPLICABILITY_ASSESSMENT_APPEND_ONLY' using errcode = '55000';
end;
$$;

create or replace function public.greanlean_p0_guard_economic_operator_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ECONOMIC_OPERATOR_PROFILE_DELETE_FORBIDDEN' using errcode = '55000';
  end if;
  if new.id is distinct from old.id
    or new.organisation_id is distinct from old.organisation_id
    or new.version is distinct from old.version
    or new.role_type is distinct from old.role_type
    or new.legal_name_snapshot is distinct from old.legal_name_snapshot
    or new.legal_address_snapshot is distinct from old.legal_address_snapshot
    or new.eu_contact_name is distinct from old.eu_contact_name
    or new.eu_contact_email is distinct from old.eu_contact_email
    or new.verification_status is distinct from old.verification_status
    or new.verification_method is distinct from old.verification_method
    or new.verified_at is distinct from old.verified_at
    or new.verification_expires_at is distinct from old.verification_expires_at
    or new.evidence_file_version_id is distinct from old.evidence_file_version_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'ECONOMIC_OPERATOR_PROFILE_VERSION_IMMUTABLE' using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists dpp_economic_operator_profile_immutable on public.dpp_economic_operator_profile;
create trigger dpp_economic_operator_profile_immutable
  before update or delete on public.dpp_economic_operator_profile
  for each row execute function public.greanlean_p0_guard_economic_operator_profile();

drop trigger if exists dpp_applicability_append_only on public.dpp_applicability_assessment;
create trigger dpp_applicability_append_only
  before update or delete on public.dpp_applicability_assessment
  for each row execute function public.greanlean_p0_prevent_assessment_mutation();

create or replace function public.greanlean_p0_guard_publication_subject()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organisation_id is distinct from old.organisation_id
    or new.battery_item_id is distinct from old.battery_item_id
    or new.subject_type is distinct from old.subject_type
    or new.change_reason is distinct from old.change_reason
  then
    raise exception 'DPP_PUBLICATION_SUBJECT_IMMUTABLE' using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists dpp_publication_p0_subject_guard on public.dpp_publication;
create trigger dpp_publication_p0_subject_guard
  before update on public.dpp_publication
  for each row execute function public.greanlean_p0_guard_publication_subject();

create or replace function public.greanlean_p0_guard_review_subject()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organisation_id is distinct from old.organisation_id
    or new.battery_item_id is distinct from old.battery_item_id
    or new.subject_type is distinct from old.subject_type
    or new.change_reason is distinct from old.change_reason
  then
    raise exception 'DPP_PUBLICATION_REVIEW_SUBJECT_IMMUTABLE' using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists dpp_publication_review_p0_subject_guard on public.dpp_publication_review;
create trigger dpp_publication_review_p0_subject_guard
  before update on public.dpp_publication_review
  for each row execute function public.greanlean_p0_guard_review_subject();

create or replace function public.greanlean_p0_bulk_create_battery_items(
  target_organisation_id uuid,
  target_product_id uuid,
  target_batch_id uuid,
  item_rows jsonb,
  idempotency_key_value text,
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  model_record public.battery_model_profile%rowtype;
  batch_record public.battery_batch%rowtype;
  job_record public.dpp_import_job%rowtype;
  item_row jsonb;
  item_id uuid;
  public_key_value text;
  upi_value text;
  created_items jsonb := '[]'::jsonb;
  row_count integer;
begin
  if jsonb_typeof(item_rows) <> 'array' then
    raise exception 'BATTERY_ITEMS_ARRAY_REQUIRED' using errcode = '22023';
  end if;
  row_count := jsonb_array_length(item_rows);
  if row_count < 1 or row_count > 100 then
    raise exception 'BATTERY_ITEM_BULK_LIMIT' using errcode = '22023';
  end if;
  if length(trim(coalesce(idempotency_key_value, ''))) < 8 then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = '22023';
  end if;

  select * into job_record from public.dpp_import_job
  where organisation_id = target_organisation_id
    and job_type = 'BATTERY_ITEMS'
    and idempotency_key = idempotency_key_value;
  if job_record.id is not null then
    return job_record.result_summary;
  end if;

  select * into model_record from public.battery_model_profile
  where product_id = target_product_id and organisation_id = target_organisation_id;
  if model_record.id is null then
    raise exception 'BATTERY_MODEL_ORGANISATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if target_batch_id is not null then
    select * into batch_record from public.battery_batch where id = target_batch_id;
    if batch_record.id is null
      or batch_record.battery_model_profile_id <> model_record.id
      or batch_record.product_id <> target_product_id
      or batch_record.organisation_id <> target_organisation_id
    then
      raise exception 'BATTERY_ITEM_BATCH_MISMATCH' using errcode = '23514';
    end if;
  end if;

  insert into public.dpp_import_job (
    organisation_id, project_id, job_type, template_version, idempotency_key,
    input_hash, status, total_rows, submitted_by, started_at
  ) values (
    target_organisation_id, model_record.project_id, 'BATTERY_ITEMS', 'battery-items-p0-1.0',
    idempotency_key_value, encode(extensions.digest(convert_to(item_rows::text, 'UTF8'), 'sha256'), 'hex'),
    'PROCESSING', row_count, actor_user_id, now()
  ) returning * into job_record;

  for item_row in select value from jsonb_array_elements(item_rows) loop
    if length(trim(coalesce(item_row ->> 'serialNumber', ''))) = 0 then
      raise exception 'BATTERY_ITEM_SERIAL_REQUIRED' using errcode = '22023';
    end if;
    public_key_value := coalesce(
      nullif(trim(item_row ->> 'publicKey'), ''),
      'BAT-' || upper(substring(encode(extensions.digest(
        convert_to(target_organisation_id::text || ':' || item_row ->> 'serialNumber', 'UTF8'),
        'sha256'
      ), 'hex') from 1 for 20))
    );
    upi_value := coalesce(
      nullif(trim(item_row ->> 'upi'), ''),
      'https://www.greanlean.com/p/' || public_key_value
    );

    insert into public.battery_item (
      battery_model_profile_id, battery_batch_id, product_id, organisation_id,
      serial_identifier, item_code, unique_product_identifier, manufacturing_date,
      p0_item_status, source_system, demo_marker, verification_status
    ) values (
      model_record.id, target_batch_id, target_product_id, target_organisation_id,
      trim(item_row ->> 'serialNumber'), nullif(trim(item_row ->> 'itemCode'), ''), upi_value,
      nullif(item_row ->> 'manufacturedAt', '')::date,
      'DRAFT', coalesce(nullif(trim(item_row ->> 'sourceSystem'), ''), 'P0_BULK_IMPORT'),
      case when item_row ->> 'demoMarker' = 'SYNTHETIC' then 'SYNTHETIC' else null end,
      'unverified'
    ) returning id into item_id;

    insert into public.dpp_identifier (
      organisation_id, battery_item_id, identifier_type, value, normalized_value,
      public_key, is_primary, created_by
    ) values (
      target_organisation_id, item_id, 'UPI_URL', upi_value, lower(upi_value),
      public_key_value, true, actor_user_id
    );
    insert into public.dpp_identifier (
      organisation_id, battery_item_id, identifier_type, value, normalized_value,
      is_primary, created_by
    ) values (
      target_organisation_id, item_id, 'SERIAL', trim(item_row ->> 'serialNumber'),
      upper(trim(item_row ->> 'serialNumber')), true, actor_user_id
    );

    created_items := created_items || jsonb_build_array(jsonb_build_object(
      'itemId', item_id,
      'serialNumber', trim(item_row ->> 'serialNumber'),
      'upi', upi_value,
      'publicKey', public_key_value
    ));
  end loop;

  update public.dpp_import_job
  set status = 'COMPLETED', successful_rows = row_count, completed_at = now(),
      result_summary = jsonb_build_object('jobId', job_record.id, 'created', created_items)
  where id = job_record.id
  returning * into job_record;
  return job_record.result_summary;
end;
$$;

create or replace function public.greanlean_p0_assign_product_model(
  target_organisation_id uuid,
  target_project_id uuid,
  target_product_id uuid,
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  model_record public.battery_model_profile%rowtype;
  current_owner uuid;
begin
  if target_project_id is not null and not exists (
    select 1 from public.dpp_project
    where id = target_project_id and organisation_id = target_organisation_id
  ) then
    raise exception 'PROJECT_ORGANISATION_MISMATCH' using errcode = '23514';
  end if;
  select organisation_id into current_owner
  from public.dpp_product_ownership where product_id = target_product_id;
  if current_owner is not null and current_owner <> target_organisation_id then
    raise exception 'PRODUCT_ALREADY_OWNED_BY_ANOTHER_ORGANISATION' using errcode = '23514';
  end if;
  select * into model_record from public.battery_model_profile
  where product_id = target_product_id;
  if model_record.id is null then
    raise exception 'BATTERY_MODEL_NOT_FOUND' using errcode = 'P0002';
  end if;
  insert into public.dpp_product_ownership (
    product_id, organisation_id, project_id, ownership_status, source_type,
    assigned_by, assigned_at, updated_at
  ) values (
    target_product_id, target_organisation_id, target_project_id, 'ACTIVE',
    'EXPLICIT_P0_ASSIGNMENT', actor_user_id, now(), now()
  ) on conflict (product_id) do update set
    organisation_id = excluded.organisation_id,
    project_id = excluded.project_id,
    ownership_status = 'ACTIVE',
    source_type = 'EXPLICIT_P0_ASSIGNMENT',
    assigned_by = excluded.assigned_by,
    assigned_at = now(),
    updated_at = now();
  update public.battery_model_profile
  set organisation_id = target_organisation_id,
      project_id = target_project_id,
      updated_at = now(),
      row_version = row_version + 1
  where id = model_record.id;
  update public.battery_batch
  set organisation_id = target_organisation_id,
      updated_at = now(),
      row_version = row_version + 1
  where battery_model_profile_id = model_record.id;
  update public.battery_item
  set organisation_id = target_organisation_id,
      updated_at = now(),
      row_version = row_version + 1
  where battery_model_profile_id = model_record.id;
  return jsonb_build_object(
    'productId', target_product_id,
    'modelId', model_record.id,
    'organisationId', target_organisation_id,
    'projectId', target_project_id
  );
end;
$$;

create or replace function public.greanlean_p0_save_economic_operator_profile(
  target_organisation_id uuid,
  profile_data jsonb,
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
  inserted_record public.dpp_economic_operator_profile%rowtype;
begin
  if not exists (select 1 from public.dpp_organisation where id = target_organisation_id and status = 'active') then
    raise exception 'ORGANISATION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if jsonb_typeof(profile_data) <> 'object' then
    raise exception 'ECONOMIC_OPERATOR_PROFILE_OBJECT_REQUIRED' using errcode = '22023';
  end if;
  select coalesce(max(version), 0) + 1 into next_version
  from public.dpp_economic_operator_profile where organisation_id = target_organisation_id;
  update public.dpp_economic_operator_profile
  set is_current = false
  where organisation_id = target_organisation_id and is_current;
  insert into public.dpp_economic_operator_profile (
    organisation_id, version, role_type, legal_name_snapshot, legal_address_snapshot,
    eu_contact_name, eu_contact_email, verification_status, verification_method,
    verified_at, verification_expires_at, evidence_file_version_id, is_current, created_by
  ) values (
    target_organisation_id,
    next_version,
    upper(coalesce(profile_data ->> 'roleType', 'OTHER')),
    trim(profile_data ->> 'legalName'),
    coalesce(profile_data -> 'legalAddress', '{}'::jsonb),
    nullif(trim(profile_data ->> 'euContactName'), ''),
    nullif(trim(profile_data ->> 'euContactEmail'), ''),
    upper(coalesce(profile_data ->> 'verificationStatus', 'NOT_STARTED')),
    nullif(trim(profile_data ->> 'verificationMethod'), ''),
    nullif(profile_data ->> 'verifiedAt', '')::timestamptz,
    nullif(profile_data ->> 'verificationExpiresAt', '')::timestamptz,
    nullif(profile_data ->> 'evidenceFileVersionId', '')::uuid,
    true,
    actor_user_id
  ) returning * into inserted_record;
  return to_jsonb(inserted_record);
end;
$$;

create or replace function public.greanlean_p0_record_applicability(
  target_project_id uuid,
  target_organisation_id uuid,
  assessment_data jsonb,
  gap_tasks jsonb,
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_id uuid;
  assessment_record public.dpp_applicability_assessment%rowtype;
  task_row jsonb;
begin
  if not exists (
    select 1 from public.dpp_project
    where id = target_project_id and organisation_id = target_organisation_id
  ) then
    raise exception 'PROJECT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if jsonb_typeof(assessment_data) <> 'object' or jsonb_typeof(gap_tasks) <> 'array' then
    raise exception 'APPLICABILITY_PAYLOAD_INVALID' using errcode = '22023';
  end if;
  select id into previous_id from public.dpp_applicability_assessment
  where project_id = target_project_id order by assessed_at desc limit 1;
  insert into public.dpp_applicability_assessment (
    project_id, organisation_id, rule_version, input_snapshot, result,
    result_reason, pending_questions, disclaimer_text, disclaimer_acknowledged,
    assessed_by, supersedes_id
  ) values (
    target_project_id, target_organisation_id,
    assessment_data ->> 'ruleVersion',
    assessment_data -> 'input',
    assessment_data ->> 'result',
    assessment_data ->> 'reason',
    coalesce(assessment_data -> 'pendingQuestions', '[]'::jsonb),
    assessment_data ->> 'disclaimer',
    coalesce((assessment_data ->> 'disclaimerAcknowledged')::boolean, false),
    actor_user_id, previous_id
  ) returning * into assessment_record;
  for task_row in select value from jsonb_array_elements(gap_tasks) loop
    insert into public.dpp_project_task (
      project_id, organisation_id, task_type, title, description, status,
      priority, responsible_department, source_assessment_id, created_by, updated_by
    ) values (
      target_project_id, target_organisation_id,
      coalesce(task_row ->> 'taskType', 'DATA_GAP'),
      task_row ->> 'title', task_row ->> 'description', 'OPEN',
      coalesce(task_row ->> 'priority', 'HIGH'),
      task_row ->> 'responsibleDepartment', assessment_record.id,
      actor_user_id, actor_user_id
    );
  end loop;
  update public.dpp_project
  set applicability_result = assessment_record.result,
      applicability_rule_version = assessment_record.rule_version,
      disclaimer_acknowledged_at = case
        when assessment_record.disclaimer_acknowledged then now()
        else disclaimer_acknowledged_at
      end,
      updated_by = actor_user_id,
      updated_at = now(),
      row_version = row_version + 1
  where id = target_project_id;
  return jsonb_build_object(
    'assessmentId', assessment_record.id,
    'result', assessment_record.result,
    'taskCount', jsonb_array_length(gap_tasks)
  );
end;
$$;

create or replace function public.greanlean_p0_create_item_publication_review(
  target_product_id uuid,
  target_battery_item_id uuid,
  target_schema_version text,
  target_profile_key text,
  target_profile_version text,
  target_candidate_snapshot jsonb,
  target_canonical_payload text,
  target_source_fingerprint text,
  change_reason_value text default null,
  submitting_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  product_record public.products%rowtype;
  item_record public.battery_item%rowtype;
  current_publication_id uuid;
  inserted_review public.dpp_publication_review%rowtype;
  effective_submitter uuid := coalesce(submitting_user_id, auth.uid());
begin
  select * into product_record from public.products where id = target_product_id for update;
  select * into item_record from public.battery_item where id = target_battery_item_id for update;
  if product_record.id is null or item_record.id is null or item_record.product_id <> target_product_id then
    raise exception 'BATTERY_ITEM_PRODUCT_MISMATCH' using errcode = 'P0002';
  end if;
  if item_record.organisation_id is null or item_record.unique_product_identifier !~ '^https://[^[:space:]]+$' then
    raise exception 'BATTERY_ITEM_PUBLISHABLE_UPI_REQUIRED' using errcode = '22023';
  end if;
  if target_profile_key is distinct from product_record.dpp_profile_key
    or target_candidate_snapshot #>> '{publication,productId}' is distinct from target_product_id::text
    or target_candidate_snapshot #>> '{publication,subjectType}' is distinct from 'BATTERY_ITEM'
    or target_candidate_snapshot #>> '{classification,productGranularity}' is distinct from 'ITEM'
  then
    raise exception 'ITEM_REVIEW_CANDIDATE_MISMATCH' using errcode = '22023';
  end if;
  if target_source_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'REVIEW_SOURCE_FINGERPRINT_INVALID' using errcode = '22023';
  end if;

  select pointer.publication_id into current_publication_id
  from public.dpp_item_publication_pointer pointer
  where pointer.battery_item_id = target_battery_item_id;
  if current_publication_id is not null and length(trim(coalesce(change_reason_value, ''))) < 10 then
    raise exception 'PUBLICATION_CHANGE_REASON_REQUIRED' using errcode = '22023';
  end if;

  insert into public.dpp_publication_review (
    product_id, base_publication_id, schema_version, profile_key, profile_version,
    candidate_snapshot, canonical_payload, candidate_hash, source_fingerprint,
    status, submitted_by, submitted_at, organisation_id, battery_item_id,
    subject_type, change_reason
  ) values (
    target_product_id, current_publication_id, trim(target_schema_version),
    trim(target_profile_key), trim(target_profile_version), target_candidate_snapshot,
    target_canonical_payload, repeat('0', 64), target_source_fingerprint,
    'IN_REVIEW', effective_submitter, now(), item_record.organisation_id,
    item_record.id, 'BATTERY_ITEM', nullif(trim(change_reason_value), '')
  ) returning * into inserted_review;

  insert into public.dpp_audit_logs (
    product_id, actor_name, actor_role, action_type, target_table, target_id,
    previous_hash, new_hash, notes, visibility_level
  ) values (
    target_product_id, coalesce(effective_submitter::text, 'service_role'),
    case when effective_submitter is null then 'service_role' else 'authenticated_server_actor' end,
    'DPP_ITEM_REVIEW_SUBMITTED', 'dpp_publication_review', inserted_review.id,
    (select snapshot_hash from public.dpp_publication where id = current_publication_id),
    inserted_review.candidate_hash,
    format('Battery item %s candidate submitted for review', target_battery_item_id),
    'internal'
  );
  return jsonb_build_object(
    'reviewId', inserted_review.id,
    'productId', inserted_review.product_id,
    'batteryItemId', inserted_review.battery_item_id,
    'basePublicationId', inserted_review.base_publication_id,
    'candidateHash', inserted_review.candidate_hash,
    'status', inserted_review.status,
    'submittedAt', inserted_review.submitted_at
  );
end;
$$;

create or replace function public.greanlean_p0_publish_final_item_review(
  target_review_id uuid,
  current_source_fingerprint text,
  final_snapshot jsonb,
  final_canonical_payload text,
  publishing_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  review_record public.dpp_publication_review%rowtype;
  item_record public.battery_item%rowtype;
  current_publication_id uuid;
  next_version_number integer;
  snapshot_publication_id uuid;
  snapshot_version_number integer;
  snapshot_published_at timestamptz;
  snapshot_supersedes_id uuid;
  inserted_publication public.dpp_publication%rowtype;
  effective_publisher uuid := coalesce(publishing_user_id, auth.uid());
begin
  select * into review_record from public.dpp_publication_review
  where id = target_review_id and status = 'APPROVED' and subject_type = 'BATTERY_ITEM'
  for update;
  if review_record.id is null then
    raise exception 'APPROVED_ITEM_PUBLICATION_REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;
  if review_record.source_fingerprint is distinct from current_source_fingerprint then
    raise exception 'PUBLICATION_SOURCE_CHANGED_AFTER_REVIEW' using errcode = '40001';
  end if;
  if review_record.latest_validation_run_id is null or exists (
    select 1 from public.dpp_publication_validation_result result
    where result.validation_run_id = review_record.latest_validation_run_id
      and result.severity = 'BLOCKER' and result.passed = false
  ) then
    raise exception 'PUBLICATION_REVIEW_BLOCKERS_REMAIN' using errcode = '55000';
  end if;
  if (final_snapshot - 'publication' - 'integrity')
    is distinct from (review_record.candidate_snapshot - 'publication' - 'integrity')
  then
    raise exception 'PUBLICATION_REVIEWED_CONTENT_CHANGED' using errcode = '40001';
  end if;

  select * into item_record from public.battery_item
  where id = review_record.battery_item_id and product_id = review_record.product_id
  for update;
  if item_record.id is null or item_record.organisation_id is distinct from review_record.organisation_id then
    raise exception 'BATTERY_ITEM_REVIEW_SCOPE_MISMATCH' using errcode = '40001';
  end if;
  select publication_id into current_publication_id from public.dpp_item_publication_pointer
  where battery_item_id = item_record.id for update;
  if current_publication_id is distinct from review_record.base_publication_id then
    raise exception 'PUBLICATION_VERSION_CONFLICT' using errcode = '40001';
  end if;

  begin
    snapshot_publication_id := (final_snapshot #>> '{publication,publicationId}')::uuid;
    snapshot_version_number := (final_snapshot #>> '{publication,version}')::integer;
    snapshot_published_at := (final_snapshot #>> '{publication,publishedAt}')::timestamptz;
    snapshot_supersedes_id := nullif(final_snapshot #>> '{publication,supersedesPublicationId}', '')::uuid;
  exception when others then
    raise exception 'PUBLICATION_FINAL_METADATA_INVALID' using errcode = '22023';
  end;
  select coalesce(max(version_number), 0) + 1 into next_version_number
  from public.dpp_publication where battery_item_id = item_record.id;
  if snapshot_version_number is distinct from next_version_number
    or snapshot_supersedes_id is distinct from current_publication_id
    or final_snapshot #>> '{publication,status}' is distinct from 'PUBLISHED'
    or final_snapshot #>> '{publication,productId}' is distinct from review_record.product_id::text
    or final_snapshot #>> '{publication,subjectType}' is distinct from 'BATTERY_ITEM'
    or final_snapshot #>> '{publication,publishedBy}' is distinct from effective_publisher::text
  then
    raise exception 'ITEM_PUBLICATION_FINAL_METADATA_MISMATCH' using errcode = '40001';
  end if;
  if snapshot_publication_id is null or snapshot_published_at is null then
    raise exception 'PUBLICATION_FINAL_METADATA_REQUIRED' using errcode = '22023';
  end if;

  if current_publication_id is not null then
    update public.dpp_publication set status = 'SUPERSEDED' where id = current_publication_id;
  end if;
  insert into public.dpp_publication (
    id, product_id, version_number, status, schema_version, profile_key,
    profile_version, snapshot, canonical_payload, snapshot_hash, published_by,
    published_at, supersedes_id, organisation_id, battery_item_id, subject_type,
    change_reason
  ) values (
    snapshot_publication_id, review_record.product_id, next_version_number,
    'PUBLISHED', review_record.schema_version, review_record.profile_key,
    review_record.profile_version, final_snapshot, final_canonical_payload,
    repeat('0', 64), effective_publisher, snapshot_published_at,
    current_publication_id, review_record.organisation_id, item_record.id,
    'BATTERY_ITEM', review_record.change_reason
  ) returning * into inserted_publication;

  insert into public.dpp_item_publication_pointer (battery_item_id, publication_id, updated_by, updated_at)
  values (item_record.id, inserted_publication.id, effective_publisher, now())
  on conflict (battery_item_id) do update set
    publication_id = excluded.publication_id,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
  update public.dpp_publication_review set
    status = 'PUBLISHED', published_publication_id = inserted_publication.id
  where id = review_record.id;
  update public.battery_item set p0_item_status = 'PUBLISHED', updated_at = now(), row_version = row_version + 1
  where id = item_record.id;

  insert into public.dpp_audit_logs (
    product_id, actor_name, actor_role, action_type, target_table, target_id,
    previous_hash, new_hash, notes, visibility_level
  ) values (
    review_record.product_id, coalesce(effective_publisher::text, 'service_role'),
    case when effective_publisher is null then 'service_role' else 'authenticated_server_actor' end,
    'DPP_ITEM_PUBLICATION_CREATED', 'dpp_publication', inserted_publication.id,
    (select snapshot_hash from public.dpp_publication where id = current_publication_id),
    inserted_publication.snapshot_hash,
    format('Published immutable battery item version %s', next_version_number),
    'internal'
  );
  return jsonb_build_object(
    'publicationId', inserted_publication.id,
    'productId', inserted_publication.product_id,
    'batteryItemId', inserted_publication.battery_item_id,
    'versionNumber', inserted_publication.version_number,
    'snapshotHash', inserted_publication.snapshot_hash,
    'status', inserted_publication.status,
    'publishedAt', inserted_publication.published_at
  );
end;
$$;

create or replace function public.greanlean_p0_commit_bom_import(
  target_job_id uuid,
  target_organisation_id uuid,
  target_product_id uuid,
  expected_input_hash text,
  bom_rows jsonb,
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  job_record public.dpp_import_job%rowtype;
  bom_row jsonb;
  inserted_count integer := 0;
begin
  if jsonb_typeof(bom_rows) <> 'array' or jsonb_array_length(bom_rows) < 1 then
    raise exception 'BOM_ROWS_REQUIRED' using errcode = '22023';
  end if;
  select * into job_record from public.dpp_import_job
  where id = target_job_id and organisation_id = target_organisation_id and job_type = 'BOM'
  for update;
  if job_record.id is null then
    raise exception 'BOM_IMPORT_JOB_NOT_FOUND' using errcode = 'P0002';
  end if;
  if job_record.status = 'COMPLETED' then
    return job_record.result_summary;
  end if;
  if job_record.status <> 'PREVIEWED' or job_record.failed_rows > 0
    or job_record.input_hash is distinct from expected_input_hash
  then
    raise exception 'BOM_IMPORT_PREFLIGHT_MISMATCH' using errcode = '40001';
  end if;
  if not exists (
    select 1 from public.dpp_product_ownership ownership
    where ownership.product_id = target_product_id
      and ownership.organisation_id = target_organisation_id
      and ownership.ownership_status = 'ACTIVE'
  ) then
    raise exception 'BOM_IMPORT_PRODUCT_SCOPE_DENIED' using errcode = '42501';
  end if;

  update public.dpp_import_job set status = 'PROCESSING', started_at = now() where id = job_record.id;
  for bom_row in select value from jsonb_array_elements(bom_rows) loop
    if length(trim(coalesce(bom_row ->> 'componentName', ''))) = 0
      or length(trim(coalesce(bom_row ->> 'materialName', ''))) = 0
    then
      raise exception 'BOM_IMPORT_REQUIRED_VALUE_MISSING' using errcode = '22023';
    end if;
    insert into public.product_bom (
      product_id, component_name, component_name_zh, component_type,
      component_type_zh, quantity, unit, position
    ) values (
      target_product_id, trim(bom_row ->> 'componentName'),
      nullif(trim(bom_row ->> 'componentNameZh'), ''),
      nullif(trim(bom_row ->> 'componentType'), ''),
      nullif(trim(bom_row ->> 'componentTypeZh'), ''),
      coalesce(nullif(bom_row ->> 'quantity', '')::numeric, 1),
      coalesce(nullif(trim(bom_row ->> 'unit'), ''), 'item'),
      nullif(trim(bom_row ->> 'position'), '')
    );
    insert into public.product_materials (
      product_id, material_name, material_name_zh, material_type,
      percentage, recycled_content, origin_country, chemical_info,
      recyclability, certification
    ) values (
      target_product_id, trim(bom_row ->> 'materialName'),
      nullif(trim(bom_row ->> 'materialNameZh'), ''),
      nullif(trim(bom_row ->> 'materialType'), ''),
      nullif(bom_row ->> 'percentage', '')::numeric,
      nullif(bom_row ->> 'recycledContent', '')::numeric,
      nullif(trim(bom_row ->> 'originCountry'), ''),
      nullif(trim(bom_row ->> 'chemicalInformation'), ''),
      nullif(trim(bom_row ->> 'recyclability'), ''),
      nullif(trim(bom_row ->> 'certification'), '')
    );
    inserted_count := inserted_count + 1;
  end loop;
  update public.dpp_import_job set
    status = 'COMPLETED', successful_rows = inserted_count, failed_rows = 0,
    completed_at = now(),
    result_summary = result_summary || jsonb_build_object(
      'jobId', id, 'productId', target_product_id, 'insertedRows', inserted_count,
      'status', 'COMPLETED'
    )
  where id = job_record.id
  returning * into job_record;
  insert into public.dpp_audit_logs (
    product_id, actor_name, actor_role, action_type, target_table, target_id,
    notes, visibility_level
  ) values (
    target_product_id, coalesce(actor_user_id::text, 'service_role'),
    'authenticated_server_actor', 'DPP_BOM_IMPORT_COMMITTED',
    'dpp_import_job', job_record.id,
    format('Committed %s preflighted BOM rows', inserted_count), 'internal'
  );
  return job_record.result_summary;
end;
$$;

create or replace function public.greanlean_p0_public_item_snapshot(target_identifier text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  resolved_item_id uuid;
  resolved_product_identifier text;
  target_snapshot jsonb;
begin
  select identifier.battery_item_id, product.dpp_id
  into resolved_item_id, resolved_product_identifier
  from public.dpp_identifier identifier
  join public.battery_item item on item.id = identifier.battery_item_id
  join public.products product on product.id = item.product_id
  where identifier.identifier_type = 'UPI_URL'
    and identifier.status = 'ACTIVE'
    and lower(product.status) in ('published', 'updated', 'expired')
    and (
      identifier.public_key = target_identifier
      or identifier.value = target_identifier
      or identifier.normalized_value = lower(target_identifier)
    )
  order by identifier.is_primary desc, identifier.created_at desc
  limit 1;
  if resolved_item_id is null then return null; end if;

  select publication.snapshot into target_snapshot
  from public.dpp_item_publication_pointer pointer
  join public.dpp_publication publication
    on publication.id = pointer.publication_id
    and publication.battery_item_id = pointer.battery_item_id
    and publication.status = 'PUBLISHED'
  where pointer.battery_item_id = resolved_item_id;
  if target_snapshot is null then return null; end if;
  target_snapshot := public.greanlean_project_canonical_snapshot(target_snapshot, 'PUBLIC');
  target_snapshot := jsonb_set(target_snapshot, '{publication,productId}', to_jsonb(resolved_product_identifier), true);
  target_snapshot := jsonb_set(
    target_snapshot,
    '{publication,publicationId}',
    to_jsonb(resolved_product_identifier || ':v' || coalesce(target_snapshot #>> '{publication,version}', '0')),
    true
  );
  target_snapshot := jsonb_set(target_snapshot, '{publication,publishedBy}', 'null'::jsonb, true);
  target_snapshot := jsonb_set(target_snapshot, '{publication,supersedesPublicationId}', 'null'::jsonb, true);
  return jsonb_build_object('productIdentifier', resolved_product_identifier, 'snapshot', target_snapshot);
end;
$$;

revoke all on function public.greanlean_p0_bulk_create_battery_items(uuid,uuid,uuid,jsonb,text,uuid) from public, anon, authenticated;
revoke all on function public.greanlean_p0_assign_product_model(uuid,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.greanlean_p0_save_economic_operator_profile(uuid,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.greanlean_p0_record_applicability(uuid,uuid,jsonb,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.greanlean_p0_create_item_publication_review(uuid,uuid,text,text,text,jsonb,text,text,text,uuid) from public, anon, authenticated;
revoke all on function public.greanlean_p0_publish_final_item_review(uuid,text,jsonb,text,uuid) from public, anon, authenticated;
revoke all on function public.greanlean_p0_commit_bom_import(uuid,uuid,uuid,text,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.greanlean_p0_public_item_snapshot(text) from public, anon, authenticated;
grant execute on function public.greanlean_p0_bulk_create_battery_items(uuid,uuid,uuid,jsonb,text,uuid) to service_role;
grant execute on function public.greanlean_p0_assign_product_model(uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.greanlean_p0_save_economic_operator_profile(uuid,jsonb,uuid) to service_role;
grant execute on function public.greanlean_p0_record_applicability(uuid,uuid,jsonb,jsonb,uuid) to service_role;
grant execute on function public.greanlean_p0_create_item_publication_review(uuid,uuid,text,text,text,jsonb,text,text,text,uuid) to service_role;
grant execute on function public.greanlean_p0_publish_final_item_review(uuid,text,jsonb,text,uuid) to service_role;
grant execute on function public.greanlean_p0_commit_bom_import(uuid,uuid,uuid,text,jsonb,uuid) to service_role;
grant execute on function public.greanlean_p0_public_item_snapshot(text) to anon, authenticated;
grant execute on function public.greanlean_p0_is_organisation_member(uuid,uuid) to authenticated, service_role;

alter table public.dpp_economic_operator_profile enable row level security;
alter table public.dpp_project enable row level security;
alter table public.dpp_applicability_assessment enable row level security;
alter table public.dpp_project_task enable row level security;
alter table public.dpp_product_ownership enable row level security;
alter table public.dpp_identifier enable row level security;
alter table public.dpp_import_job enable row level security;
alter table public.dpp_import_error enable row level security;
alter table public.dpp_item_publication_pointer enable row level security;

revoke all on public.dpp_economic_operator_profile, public.dpp_project,
  public.dpp_applicability_assessment, public.dpp_project_task,
  public.dpp_product_ownership, public.dpp_identifier,
  public.dpp_import_job, public.dpp_import_error,
  public.dpp_item_publication_pointer from anon, authenticated;

grant select on public.dpp_economic_operator_profile, public.dpp_project,
  public.dpp_applicability_assessment, public.dpp_project_task,
  public.dpp_product_ownership, public.dpp_identifier,
  public.dpp_import_job, public.dpp_import_error,
  public.dpp_item_publication_pointer to authenticated;

drop policy if exists "Members read economic operator profiles" on public.dpp_economic_operator_profile;
create policy "Members read economic operator profiles"
  on public.dpp_economic_operator_profile for select to authenticated
  using (public.greanlean_p0_is_organisation_member(organisation_id, auth.uid()));
drop policy if exists "Members read projects" on public.dpp_project;
create policy "Members read projects"
  on public.dpp_project for select to authenticated
  using (public.greanlean_p0_is_organisation_member(organisation_id, auth.uid()));
drop policy if exists "Members read applicability assessments" on public.dpp_applicability_assessment;
create policy "Members read applicability assessments"
  on public.dpp_applicability_assessment for select to authenticated
  using (public.greanlean_p0_is_organisation_member(organisation_id, auth.uid()));
drop policy if exists "Members read project tasks" on public.dpp_project_task;
create policy "Members read project tasks"
  on public.dpp_project_task for select to authenticated
  using (public.greanlean_p0_is_organisation_member(organisation_id, auth.uid()));
drop policy if exists "Members read product ownership" on public.dpp_product_ownership;
create policy "Members read product ownership"
  on public.dpp_product_ownership for select to authenticated
  using (organisation_id is not null and public.greanlean_p0_is_organisation_member(organisation_id, auth.uid()));
drop policy if exists "Members read identifiers" on public.dpp_identifier;
create policy "Members read identifiers"
  on public.dpp_identifier for select to authenticated
  using (public.greanlean_p0_is_organisation_member(organisation_id, auth.uid()));
drop policy if exists "Members read import jobs" on public.dpp_import_job;
create policy "Members read import jobs"
  on public.dpp_import_job for select to authenticated
  using (public.greanlean_p0_is_organisation_member(organisation_id, auth.uid()));
drop policy if exists "Members read import errors" on public.dpp_import_error;
create policy "Members read import errors"
  on public.dpp_import_error for select to authenticated
  using (exists (
    select 1 from public.dpp_import_job job
    where job.id = dpp_import_error.job_id
      and public.greanlean_p0_is_organisation_member(job.organisation_id, auth.uid())
  ));
drop policy if exists "Members read item publication pointers" on public.dpp_item_publication_pointer;
create policy "Members read item publication pointers"
  on public.dpp_item_publication_pointer for select to authenticated
  using (exists (
    select 1 from public.battery_item item
    where item.id = dpp_item_publication_pointer.battery_item_id
      and item.organisation_id is not null
      and public.greanlean_p0_is_organisation_member(item.organisation_id, auth.uid())
  ));

comment on table public.dpp_project is 'P0 DPP delivery project scoped to one organisation.';
comment on table public.dpp_applicability_assessment is 'Append-only preliminary applicability assessment; never a legal certification.';
comment on table public.dpp_identifier is 'Versioned typed identifiers. UPI_URL values are HTTPS, globally unique and resolvable.';
comment on column public.battery_item.demo_marker is 'SYNTHETIC marks development and automated-test data only.';

commit;
