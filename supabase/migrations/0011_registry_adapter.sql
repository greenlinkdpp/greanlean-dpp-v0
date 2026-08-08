begin;

create table if not exists public.registry_mapping (
  id uuid primary key default gen_random_uuid(),
  product_group_code text not null,
  mapping_version text not null,
  source_schema_version_id uuid not null references public.schema_version(id) on delete restrict,
  registry_schema_version text,
  operational_rule_version text not null,
  field_mappings jsonb not null,
  status text not null default 'draft',
  checksum_sha256 text not null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (product_group_code, mapping_version),
  constraint registry_mapping_status_check check (status in ('draft', 'validated', 'published', 'retired')),
  constraint registry_mapping_checksum_check check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint registry_mapping_publish_check check (status <> 'published' or published_at is not null)
);

create table if not exists public.registry_organisation_enrolment (
  id uuid primary key default gen_random_uuid(),
  organisation_reference text not null,
  environment text not null,
  legal_person_type text,
  organisation_identifier_type text,
  organisation_identifier_value text,
  application_identifier text,
  eu_login_link_status text not null default 'NOT_LINKED',
  application_status text not null default 'NOT_STARTED',
  verification_status text not null default 'NOT_VERIFIED',
  declaration_document_reference text,
  registry_correlation_id text,
  verified_until timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_reference, environment),
  constraint registry_enrolment_environment_check check (environment in ('TEST', 'PRODUCTION')),
  constraint registry_enrolment_eu_login_check check (eu_login_link_status in ('NOT_LINKED', 'LINKED', 'REVOKED')),
  constraint registry_enrolment_application_check check (application_status in ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED')),
  constraint registry_enrolment_verification_check check (verification_status in ('NOT_VERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'))
);

create table if not exists public.registry_submission (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  product_version_id uuid not null references public.product_versions(id) on delete restrict,
  enrolment_id uuid references public.registry_organisation_enrolment(id) on delete restrict,
  environment text not null default 'TEST',
  product_group text not null,
  granularity text not null,
  passport_id text,
  upi text,
  model_identifier text,
  batch_identifier text,
  commodity_code text,
  registry_uri text,
  backup_reference text,
  mapping_version text not null,
  registry_schema_version text,
  submission_method text not null default 'MANUAL_FILE',
  request_payload jsonb not null,
  request_hash text not null,
  response_payload jsonb,
  persistent_registration_id text,
  submission_status text not null default 'PREPARING',
  error_code text,
  error_message text,
  registry_correlation_id text,
  submitted_at timestamptz,
  completed_at timestamptz,
  retry_of_submission_id uuid references public.registry_submission(id) on delete restrict,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registry_submission_environment_check check (environment in ('TEST', 'PRODUCTION')),
  constraint registry_submission_group_check check (product_group in ('battery', 'textile', 'furniture', 'construction', 'consumer_electronics')),
  constraint registry_submission_granularity_check check (granularity in ('MODEL', 'BATCH', 'ITEM')),
  constraint registry_submission_method_check check (submission_method in ('MANUAL_FILE', 'UI', 'API')),
  constraint registry_submission_status_check check (submission_status in ('PREPARING', 'VALIDATING', 'READY', 'SUBMITTED', 'REJECTED', 'FAILED', 'ACCEPTED')),
  constraint registry_submission_hash_check check (request_hash ~ '^[a-f0-9]{64}$'),
  constraint registry_submission_battery_semantics_check check (
    not (product_group = 'battery' and submission_status = 'ACCEPTED' and registry_schema_version is null)
  )
);

create table if not exists public.registry_validation_result (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.registry_submission(id) on delete cascade,
  validation_stage text not null,
  rule_code text not null,
  field_code text,
  severity text not null,
  json_pointer text,
  error_code text,
  message_en text not null,
  message_zh text not null,
  source text not null default 'LOCAL',
  passed boolean not null,
  created_at timestamptz not null default now(),
  constraint registry_validation_stage_check check (validation_stage in ('MAPPING', 'PRE_SUBMISSION', 'REGISTRY_RESPONSE')),
  constraint registry_validation_severity_check check (severity in ('INFO', 'WARNING', 'ERROR', 'BLOCKER')),
  constraint registry_validation_source_check check (source in ('LOCAL', 'REGISTRY'))
);

create table if not exists public.registry_error_log (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.registry_submission(id) on delete cascade,
  error_category text not null,
  retryable boolean not null default false,
  http_status integer,
  error_code text,
  redacted_message text not null,
  registry_correlation_id text,
  attempt integer not null default 1,
  raw_error_excerpt jsonb,
  created_at timestamptz not null default now(),
  constraint registry_error_attempt_check check (attempt > 0),
  constraint registry_error_http_check check (http_status is null or http_status between 100 and 599)
);

create table if not exists public.registry_registration_proof (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.registry_submission(id) on delete restrict,
  environment text not null,
  registration_identifier text not null,
  commodity_code text,
  registrant_reference text,
  registered_at timestamptz not null,
  dpp_version_hash text not null,
  proof_document_reference text,
  seal_metadata jsonb,
  timestamp_metadata jsonb,
  generated_at timestamptz not null default now(),
  downloadable_until timestamptz,
  constraint registry_proof_environment_check check (environment in ('TEST', 'PRODUCTION')),
  constraint registry_proof_hash_check check (dpp_version_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists registry_submission_product_created_idx
  on public.registry_submission (product_id, created_at desc);
create index if not exists registry_submission_environment_status_idx
  on public.registry_submission (environment, submission_status, created_at desc);
create index if not exists registry_validation_submission_idx
  on public.registry_validation_result (submission_id, created_at);
create index if not exists registry_error_submission_idx
  on public.registry_error_log (submission_id, created_at desc);

create or replace function public.greanlean_validate_registry_submission_chain()
returns trigger
language plpgsql
as $$
declare
  prior public.registry_submission;
  enrolment_environment text;
begin
  if new.retry_of_submission_id is not null then
    select * into prior from public.registry_submission where id = new.retry_of_submission_id;
    if prior.id is null or prior.product_id <> new.product_id or prior.environment <> new.environment then
      raise exception 'Registry retries must keep the same product and environment';
    end if;
  end if;
  if new.enrolment_id is not null then
    select environment into enrolment_environment from public.registry_organisation_enrolment where id = new.enrolment_id;
    if enrolment_environment is distinct from new.environment then
      raise exception 'Registry enrolment and submission environments must match';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists registry_submission_chain_guard on public.registry_submission;
create trigger registry_submission_chain_guard
  before insert or update on public.registry_submission
  for each row execute function public.greanlean_validate_registry_submission_chain();

create or replace function public.greanlean_prevent_registry_evidence_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Registry validation, error, and proof records are append-only';
end;
$$;

drop trigger if exists registry_validation_append_only on public.registry_validation_result;
create trigger registry_validation_append_only before update or delete on public.registry_validation_result
  for each row execute function public.greanlean_prevent_registry_evidence_mutation();
drop trigger if exists registry_error_append_only on public.registry_error_log;
create trigger registry_error_append_only before update or delete on public.registry_error_log
  for each row execute function public.greanlean_prevent_registry_evidence_mutation();
drop trigger if exists registry_proof_append_only on public.registry_registration_proof;
create trigger registry_proof_append_only before update or delete on public.registry_registration_proof
  for each row execute function public.greanlean_prevent_registry_evidence_mutation();

insert into public.registry_mapping (
  product_group_code,
  mapping_version,
  source_schema_version_id,
  registry_schema_version,
  operational_rule_version,
  field_mappings,
  status,
  checksum_sha256,
  published_at
)
select
  'battery',
  'battery-test-file-1.0.0',
  sv.id,
  null,
  'DPP Registry User Guide v1.0',
  '{
    "scope": "TEST_MANUAL_FILE_ONLY",
    "officialRegistrySchemaAvailable": false,
    "fields": {
      "productGroup": "constant:battery",
      "granularity": "products.granularity_level",
      "passportId": "products.dpp_id",
      "upi": "products.unique_product_identifier|battery_item.unique_product_identifier",
      "modelIdentifier": "battery_model_profile.battery_model_identifier",
      "batchIdentifier": "battery_batch.batch_identifier",
      "commodityCode": "products.commodity_code",
      "dppVersion": "product_versions.version",
      "dppVersionHash": "product_versions.data_hash",
      "dppUri": "products.public_slug|products.dpp_id"
    }
  }'::jsonb,
  'published',
  encode(extensions.digest('battery-test-file-1.0.0|DPP Registry User Guide v1.0|TEST_MANUAL_FILE_ONLY', 'sha256'), 'hex'),
  now()
from public.schema_version sv
join public.schema_definition sd on sd.id = sv.schema_definition_id
where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'published'
on conflict (product_group_code, mapping_version) do nothing;

alter table public.registry_mapping enable row level security;
alter table public.registry_organisation_enrolment enable row level security;
alter table public.registry_submission enable row level security;
alter table public.registry_validation_result enable row level security;
alter table public.registry_error_log enable row level security;
alter table public.registry_registration_proof enable row level security;

comment on table public.registry_mapping is
  'Versioned local-to-Registry mapping. A null registry_schema_version means no official product-group semantic catalogue is available.';
comment on table public.registry_submission is
  'Server-managed Registry preparation and submission history. TEST and PRODUCTION records are isolated by environment.';
comment on table public.registry_registration_proof is
  'Append-only proof returned by Registry. Local preparation records must never create proof rows.';

commit;
