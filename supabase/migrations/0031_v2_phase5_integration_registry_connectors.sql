begin;

-- Phase 5 adds an adapter boundary around the Phase 2-4 domain. External
-- contracts, credentials and responses must never become core domain truth.

create table public.connector_definition (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  name text not null,
  connector_type text not null check (connector_type in ('REGISTRY','REST_API','FILE_IMPORT','ERP','MES','PLM','BMS','WEBHOOK')),
  direction text not null check (direction in ('INBOUND','OUTBOUND','BIDIRECTIONAL')),
  capabilities jsonb not null default '[]'::jsonb check (jsonb_typeof(capabilities) = 'array'),
  supported_auth_modes jsonb not null default '[]'::jsonb check (jsonb_typeof(supported_auth_modes) = 'array'),
  config_schema jsonb not null default '{}'::jsonb check (jsonb_typeof(config_schema) = 'object'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','RETIRED')),
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'),
  created_at timestamptz not null default now()
);

create table public.connector_instance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_definition_id uuid not null references public.connector_definition(id) on delete restrict,
  name text not null,
  environment text not null check (environment in ('MOCK','TEST','SANDBOX','DEVELOPMENT','PRODUCTION')),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','DISABLED','SUSPENDED')),
  config_json jsonb not null default '{}'::jsonb check (jsonb_typeof(config_json) = 'object'),
  data_source_id uuid,
  mapping_profile_id uuid,
  rate_limit_profile jsonb not null default '{"perMinute":60,"burst":10}'::jsonb,
  retry_profile jsonb not null default '{"maxAttempts":3,"baseDelayMs":1000,"maxDelayMs":30000,"backoffMode":"EXPONENTIAL"}'::jsonb,
  circuit_state text not null default 'CLOSED' check (circuit_state in ('CLOSED','OPEN','HALF_OPEN')),
  circuit_opened_at timestamptz,
  last_successful_sync_at timestamptz,
  sync_cursor text,
  sync_watermark timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, name),
  constraint connector_instance_source_tenant_fk foreign key (data_source_id, tenant_id)
    references public.data_source(id, tenant_id) on delete restrict,
  constraint connector_instance_mapping_tenant_fk foreign key (mapping_profile_id, tenant_id)
    references public.mapping_profile(id, tenant_id) on delete restrict,
  constraint connector_instance_rate_limit_check check (jsonb_typeof(rate_limit_profile) = 'object'),
  constraint connector_instance_retry_check check (jsonb_typeof(retry_profile) = 'object'),
  constraint connector_instance_production_disabled check (environment <> 'PRODUCTION')
);

create table public.connector_credential_reference (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_instance_id uuid not null,
  secret_provider text not null check (secret_provider in ('ENVIRONMENT','TEST_VAULT','DEVELOPMENT_SECRET_MANAGER')),
  secret_reference text not null check (secret_reference ~ '^(env|test-vault|dev-secret)://[A-Za-z0-9._/-]+$'),
  credential_type text not null check (credential_type in ('API_KEY','BASIC','BEARER','OAUTH2_CLIENT_CREDENTIALS','HMAC')),
  owner_reference text not null,
  scope text,
  rotation_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(rotation_metadata) = 'object'),
  status text not null default 'CONFIGURED' check (status in ('CONFIGURED','VERIFIED','INVALID','ROTATION_DUE','REVOKED')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (connector_instance_id, credential_type, owner_reference),
  constraint connector_credential_instance_tenant_fk foreign key (connector_instance_id, tenant_id)
    references public.connector_instance(id, tenant_id) on delete restrict
);

create table public.connector_rate_limit_counter (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_instance_id uuid not null,
  credential_reference_id uuid,
  credential_scope text not null,
  route_key text not null check (route_key ~ '^[A-Za-z0-9._:/-]{1,128}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  unique (tenant_id, connector_instance_id, credential_scope, route_key, window_started_at),
  constraint connector_rate_instance_tenant_fk foreign key (connector_instance_id, tenant_id)
    references public.connector_instance(id, tenant_id) on delete cascade,
  constraint connector_rate_credential_tenant_fk foreign key (credential_reference_id, tenant_id)
    references public.connector_credential_reference(id, tenant_id) on delete cascade,
  constraint connector_rate_credential_scope_check check (
    credential_scope = coalesce(credential_reference_id::text, 'NONE')
  )
);

create table public.connector_job (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_instance_id uuid not null,
  job_type text not null,
  direction text not null check (direction in ('INBOUND','OUTBOUND')),
  status text not null default 'QUEUED' check (status in ('QUEUED','RUNNING','SUCCEEDED','FAILED','RETRY_WAIT','DEAD_LETTER','CANCELLED')),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9._:-]{8,128}$'),
  subject_type text,
  subject_id uuid,
  passport_id uuid,
  version_id uuid,
  mapping_version_id uuid,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  correlation_id text not null,
  adapter_version text not null,
  operation_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(operation_snapshot) = 'object'),
  retry_count integer not null default 0 check (retry_count >= 0),
  next_attempt_at timestamptz,
  local_cancelled boolean not null default false,
  external_state_unknown boolean not null default false,
  unique (id, tenant_id),
  unique (connector_instance_id, idempotency_key),
  constraint connector_job_instance_tenant_fk foreign key (connector_instance_id, tenant_id)
    references public.connector_instance(id, tenant_id) on delete restrict,
  constraint connector_job_passport_tenant_fk foreign key (passport_id, tenant_id)
    references public.dpp_passport(id, tenant_id) on delete restrict,
  constraint connector_job_version_tenant_fk foreign key (version_id, tenant_id)
    references public.dpp_version(id, tenant_id) on delete restrict,
  constraint connector_job_mapping_tenant_fk foreign key (mapping_version_id, tenant_id)
    references public.mapping_version(id, tenant_id) on delete restrict,
  constraint connector_job_subject_check check (subject_type is null or subject_type in ('FAMILY','MODEL','SKU','BATCH','ITEM','PASSPORT'))
);

create table public.connector_attempt (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  job_id uuid not null,
  attempt_number integer not null check (attempt_number > 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('RUNNING','SUCCEEDED','FAILED','TIMED_OUT','RATE_LIMITED')),
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  response_fingerprint text check (response_fingerprint is null or response_fingerprint ~ '^[a-f0-9]{64}$'),
  http_status integer check (http_status is null or http_status between 100 and 599),
  error_code text,
  error_class text,
  retryable boolean not null default false,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (job_id, attempt_number),
  constraint connector_attempt_job_tenant_fk foreign key (job_id, tenant_id)
    references public.connector_job(id, tenant_id) on delete restrict
);

create table public.connector_receipt (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  job_id uuid not null,
  external_system text not null,
  external_request_id text,
  external_object_id text,
  external_status text not null,
  received_at timestamptz not null default now(),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  safe_result_json jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_result_json) = 'object'),
  adapter_version text not null,
  unique (id, tenant_id),
  constraint connector_receipt_job_tenant_fk foreign key (job_id, tenant_id)
    references public.connector_job(id, tenant_id) on delete restrict
);

create table public.connector_webhook_event (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_instance_id uuid not null,
  external_event_id text not null,
  event_timestamp timestamptz not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  signature_verified boolean not null,
  processing_status text not null default 'RECEIVED' check (processing_status in ('RECEIVED','PROCESSED','REJECTED','QUARANTINED','DUPLICATE')),
  rejection_code text,
  correlation_id text not null,
  received_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (connector_instance_id, external_event_id),
  constraint connector_webhook_instance_tenant_fk foreign key (connector_instance_id, tenant_id)
    references public.connector_instance(id, tenant_id) on delete restrict
);

create table public.connector_dead_letter (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  job_id uuid not null,
  failure_reason text not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  response_fingerprint text check (response_fingerprint is null or response_fingerprint ~ '^[a-f0-9]{64}$'),
  recovery_action text not null,
  last_attempt_id uuid,
  requeued_at timestamptz,
  requeued_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (job_id),
  constraint connector_dead_letter_job_tenant_fk foreign key (job_id, tenant_id)
    references public.connector_job(id, tenant_id) on delete restrict,
  constraint connector_dead_letter_attempt_tenant_fk foreign key (last_attempt_id, tenant_id)
    references public.connector_attempt(id, tenant_id) on delete restrict
);

create table public.external_identifier_mapping (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_instance_id uuid not null,
  subject_type text not null check (subject_type in ('FAMILY','MODEL','SKU','BATCH','ITEM','PASSPORT')),
  subject_id uuid not null,
  external_system text not null,
  external_identifier_type text not null,
  external_identifier text not null,
  issuer text not null,
  scheme text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','RETIRED')),
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (connector_instance_id, external_identifier_type, issuer, scheme, external_identifier),
  constraint external_identifier_instance_tenant_fk foreign key (connector_instance_id, tenant_id)
    references public.connector_instance(id, tenant_id) on delete restrict
);

create table public.registry_submission_v2 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_instance_id uuid not null,
  connector_job_id uuid not null,
  passport_id uuid not null,
  version_id uuid not null,
  operation text not null default 'SUBMIT' check (operation in ('SUBMIT','STATUS','CANCEL')),
  state text not null default 'PREPARING' check (state in ('NOT_SUBMITTED','PREPARING','VALIDATING','READY','SUBMITTED','ACCEPTED','REJECTED','FAILED')),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  registry_profile text not null,
  adapter_version text not null,
  submission_payload_hash text not null check (submission_payload_hash ~ '^[a-f0-9]{64}$'),
  external_request_id text,
  external_identifier_mapping_id uuid,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (connector_instance_id, version_id, operation),
  constraint registry_v2_instance_tenant_fk foreign key (connector_instance_id, tenant_id)
    references public.connector_instance(id, tenant_id) on delete restrict,
  constraint registry_v2_job_tenant_fk foreign key (connector_job_id, tenant_id)
    references public.connector_job(id, tenant_id) on delete restrict,
  constraint registry_v2_version_passport_tenant_fk foreign key (version_id, passport_id, tenant_id)
    references public.dpp_version(id, passport_id, tenant_id) on delete restrict,
  constraint registry_v2_external_mapping_tenant_fk foreign key (external_identifier_mapping_id, tenant_id)
    references public.external_identifier_mapping(id, tenant_id) on delete restrict
);

create table public.connector_import_session (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_instance_id uuid not null,
  connector_job_id uuid,
  mapping_version_id uuid not null,
  file_format text not null check (file_format in ('CSV','JSON')),
  file_hash text not null check (file_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'PREFLIGHT' check (status in ('PREFLIGHT','DRY_RUN','READY','COMMITTED','FAILED','QUARANTINED')),
  reconciliation_summary jsonb not null default '{"NEW":0,"UNCHANGED":0,"CHANGED":0,"CONFLICT":0,"REJECTED":0}'::jsonb,
  unmapped_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(unmapped_fields) = 'array'),
  error_summary jsonb not null default '[]'::jsonb check (jsonb_typeof(error_summary) = 'array'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  unique (id, tenant_id),
  constraint connector_import_instance_tenant_fk foreign key (connector_instance_id, tenant_id)
    references public.connector_instance(id, tenant_id) on delete restrict,
  constraint connector_import_job_tenant_fk foreign key (connector_job_id, tenant_id)
    references public.connector_job(id, tenant_id) on delete restrict,
  constraint connector_import_mapping_tenant_fk foreign key (mapping_version_id, tenant_id)
    references public.mapping_version(id, tenant_id) on delete restrict
);

-- Phase 2 already makes product_item.id globally unique and exposes
-- (id, tenant_id, model_id). This redundant pair is added only so Phase 5 can
-- express the Tenant relationship as a composite foreign key.
alter table public.product_item
  add constraint product_item_phase5_id_tenant_unique unique (id, tenant_id);

create table public.bms_aggregation_snapshot (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_instance_id uuid not null,
  item_id uuid not null,
  device_external_id text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  algorithm_version text not null,
  sample_count integer not null check (sample_count > 0),
  aggregate_json jsonb not null check (jsonb_typeof(aggregate_json) = 'object'),
  source_payload_hash text not null check (source_payload_hash ~ '^[a-f0-9]{64}$'),
  threshold_events jsonb not null default '[]'::jsonb check (jsonb_typeof(threshold_events) = 'array'),
  canonical_claim_id uuid,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (connector_instance_id, device_external_id, window_start, window_end, source_payload_hash),
  constraint bms_snapshot_instance_tenant_fk foreign key (connector_instance_id, tenant_id)
    references public.connector_instance(id, tenant_id) on delete restrict,
  constraint bms_snapshot_item_tenant_fk foreign key (item_id, tenant_id)
    references public.product_item(id, tenant_id) on delete restrict,
  constraint bms_snapshot_claim_tenant_fk foreign key (canonical_claim_id, tenant_id)
    references public.canonical_claim(id, tenant_id) on delete restrict,
  constraint bms_snapshot_window_check check (window_end >= window_start)
);

create table public.connector_audit_event (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  connector_instance_id uuid,
  connector_job_id uuid,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  correlation_id text not null,
  safe_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  constraint connector_audit_instance_tenant_fk foreign key (connector_instance_id, tenant_id)
    references public.connector_instance(id, tenant_id) on delete restrict,
  constraint connector_audit_job_tenant_fk foreign key (connector_job_id, tenant_id)
    references public.connector_job(id, tenant_id) on delete restrict
);

create index connector_job_queue_idx on public.connector_job(status, next_attempt_at, requested_at);
create index connector_job_tenant_instance_idx on public.connector_job(tenant_id, connector_instance_id, requested_at desc);
create index connector_attempt_job_idx on public.connector_attempt(job_id, attempt_number desc);
create index connector_receipt_job_idx on public.connector_receipt(job_id, received_at desc);
create index connector_webhook_received_idx on public.connector_webhook_event(connector_instance_id, received_at desc);
create index connector_rate_limit_cleanup_idx on public.connector_rate_limit_counter(window_started_at);
create index external_identifier_subject_idx on public.external_identifier_mapping(tenant_id, subject_type, subject_id);
create index registry_submission_pending_idx on public.registry_submission_v2(state, created_at) where state in ('SUBMITTED','VALIDATING');
create index bms_snapshot_item_idx on public.bms_aggregation_snapshot(tenant_id, item_id, window_end desc);

create or replace function public.v2_phase5_guard_connector_instance()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.environment = 'PRODUCTION' then raise exception 'CONNECTOR_PRODUCTION_FORBIDDEN'; end if;
  if coalesce(new.retry_profile->>'backoffMode','') not in ('EXPONENTIAL','FIXED')
    or coalesce((new.retry_profile->>'maxAttempts')::integer, 0) not between 1 and 10
  then raise exception 'CONNECTOR_CONFIG_INVALID'; end if;
  return new;
end;
$$;
create trigger connector_instance_guard before insert or update on public.connector_instance
for each row execute function public.v2_phase5_guard_connector_instance();

create or replace function public.v2_phase5_guard_job()
returns trigger language plpgsql security definer set search_path = public as $$
declare version_state text;
begin
  if new.job_type like 'REGISTRY_%' then
    if new.version_id is null or new.passport_id is null then raise exception 'REGISTRY_VERSION_NOT_PUBLISHED'; end if;
    select publication_state into version_state from public.dpp_version
      where id = new.version_id and passport_id = new.passport_id and tenant_id = new.tenant_id;
    if version_state is distinct from 'PUBLISHED' then raise exception 'REGISTRY_VERSION_NOT_PUBLISHED'; end if;
  end if;
  if new.direction = 'INBOUND' and new.mapping_version_id is null
    and new.job_type not in ('WEBHOOK_RECEIVE','BMS_AGGREGATE')
  then raise exception 'IMPORT_MAPPING_REQUIRED'; end if;
  return new;
end;
$$;
create trigger connector_job_guard before insert or update on public.connector_job
for each row execute function public.v2_phase5_guard_job();

create or replace function public.v2_phase5_guard_append_only()
returns trigger language plpgsql set search_path = public as $$
begin raise exception 'CONNECTOR_EVIDENCE_IMMUTABLE'; end;
$$;
create trigger connector_attempt_immutable before update or delete on public.connector_attempt for each row execute function public.v2_phase5_guard_append_only();
create trigger connector_receipt_immutable before update or delete on public.connector_receipt for each row execute function public.v2_phase5_guard_append_only();
create trigger connector_webhook_immutable before update or delete on public.connector_webhook_event for each row execute function public.v2_phase5_guard_append_only();
create trigger connector_audit_immutable before update or delete on public.connector_audit_event for each row execute function public.v2_phase5_guard_append_only();
create trigger bms_snapshot_immutable before update or delete on public.bms_aggregation_snapshot for each row execute function public.v2_phase5_guard_append_only();

create or replace function public.v2_phase5_consume_rate_limit(
  p_tenant_id uuid,
  p_connector_instance_id uuid,
  p_credential_reference_id uuid,
  p_route_key text,
  p_now timestamptz default now()
)
returns table(allowed boolean, limit_per_minute integer, remaining integer, retry_after_seconds integer)
language plpgsql security definer set search_path = public as $$
declare
  v_limit integer;
  v_window timestamptz := date_trunc('minute', p_now);
  v_count integer;
  v_scope text := coalesce(p_credential_reference_id::text, 'NONE');
begin
  if p_route_key is null or p_route_key !~ '^[A-Za-z0-9._:/-]{1,128}$' then
    raise exception 'CONNECTOR_CONFIG_INVALID';
  end if;

  select greatest(1, least(10000, coalesce((rate_limit_profile->>'perMinute')::integer, 60)))
  into v_limit
  from public.connector_instance
  where id = p_connector_instance_id
    and tenant_id = p_tenant_id
    and status = 'ACTIVE'
    and environment <> 'PRODUCTION';

  if v_limit is null then raise exception 'CONNECTOR_ACCESS_DENIED'; end if;
  if p_credential_reference_id is not null and not exists (
    select 1 from public.connector_credential_reference
    where id = p_credential_reference_id
      and tenant_id = p_tenant_id
      and connector_instance_id = p_connector_instance_id
      and status in ('CONFIGURED','VERIFIED','ROTATION_DUE')
  ) then raise exception 'CONNECTOR_CREDENTIAL_INVALID'; end if;

  insert into public.connector_rate_limit_counter(
    tenant_id, connector_instance_id, credential_reference_id, credential_scope,
    route_key, window_started_at, request_count
  ) values (
    p_tenant_id, p_connector_instance_id, p_credential_reference_id, v_scope,
    p_route_key, v_window, 1
  )
  on conflict (tenant_id, connector_instance_id, credential_scope, route_key, window_started_at)
  do update set request_count = public.connector_rate_limit_counter.request_count + 1,
    updated_at = now()
  returning request_count into v_count;

  return query select
    v_count <= v_limit,
    v_limit,
    greatest(v_limit - v_count, 0),
    case when v_count > v_limit then greatest(1, 60 - extract(second from p_now)::integer) else 0 end;
end;
$$;

create or replace view public.connector_credential_status with (security_invoker = true) as
select id, tenant_id, connector_instance_id,
  true as configured, credential_type, status, last_verified_at,
  nullif(rotation_metadata->>'dueAt','')::timestamptz as rotation_due_at,
  created_at, updated_at
from public.connector_credential_reference;

create or replace view public.connector_observability with (security_invoker = true) as
select i.tenant_id, i.id as connector_instance_id,
  coalesce(j.job_count, 0) as job_count,
  coalesce(j.success_count, 0) as success_count,
  coalesce(j.failure_count, 0) as failure_count,
  coalesce(j.retry_count, 0) as retry_count,
  coalesce(j.dead_letter_count, 0) as dead_letter_count,
  j.average_latency_ms,
  coalesce(a.http_2xx_count, 0) as external_http_2xx_count,
  coalesce(a.http_4xx_count, 0) as external_http_4xx_count,
  coalesce(a.http_5xx_count, 0) as external_http_5xx_count,
  coalesce(w.webhook_event_count, 0) as webhook_event_count,
  coalesce(s.webhook_reject_count, 0) as webhook_reject_count,
  coalesce(r.registry_pending_count, 0) as registry_pending_count,
  r.oldest_registry_pending_age_seconds,
  coalesce(b.bms_snapshot_count, 0) as bms_snapshot_count,
  coalesce(b.bms_sample_count, 0) as bms_sample_count,
  coalesce(s.bms_replay_reject_count, 0) as bms_replay_reject_count,
  coalesce(l.rate_limited_count, 0) as rate_limited_count
from public.connector_instance i
left join lateral (
  select count(*) as job_count,
    count(*) filter (where status = 'SUCCEEDED') as success_count,
    count(*) filter (where status in ('FAILED','DEAD_LETTER')) as failure_count,
    coalesce(sum(retry_count), 0) as retry_count,
    count(*) filter (where status = 'DEAD_LETTER') as dead_letter_count,
    avg(extract(epoch from (finished_at - started_at)) * 1000) filter (where finished_at is not null) as average_latency_ms
  from public.connector_job where connector_instance_id = i.id
) j on true
left join lateral (
  select count(*) filter (where http_status between 200 and 299) as http_2xx_count,
    count(*) filter (where http_status between 400 and 499) as http_4xx_count,
    count(*) filter (where http_status between 500 and 599) as http_5xx_count
  from public.connector_attempt where tenant_id = i.tenant_id and job_id in (
    select id from public.connector_job where connector_instance_id = i.id)
) a on true
left join lateral (
  select count(*) as webhook_event_count from public.connector_webhook_event
  where connector_instance_id = i.id
) w on true
left join lateral (
  select count(*) filter (where event_type = 'webhook.reject') as webhook_reject_count,
    count(*) filter (where event_type = 'bms.replay-reject') as bms_replay_reject_count
  from public.connector_audit_event where connector_instance_id = i.id
) s on true
left join lateral (
  select count(*) filter (where state in ('SUBMITTED','VALIDATING')) as registry_pending_count,
    max(extract(epoch from (now() - created_at))) filter (where state in ('SUBMITTED','VALIDATING')) as oldest_registry_pending_age_seconds
  from public.registry_submission_v2 where connector_instance_id = i.id
) r on true
left join lateral (
  select count(*) as bms_snapshot_count, coalesce(sum(sample_count), 0) as bms_sample_count
  from public.bms_aggregation_snapshot where connector_instance_id = i.id
) b on true
left join lateral (
  select coalesce(sum(greatest(request_count - greatest(1, least(10000, coalesce((i.rate_limit_profile->>'perMinute')::integer, 60))), 0)), 0) as rate_limited_count
  from public.connector_rate_limit_counter where connector_instance_id = i.id
) l on true;

insert into public.connector_definition(code,name,connector_type,direction,capabilities,supported_auth_modes,config_schema,status,version)
values
 ('REGISTRY_TEST','Registry TEST Adapter','REGISTRY','OUTBOUND','["SUBMIT","STATUS","CALLBACK","POLL"]','["NONE","API_KEY","HMAC"]','{"environment":{"enum":["MOCK","TEST","SANDBOX"]}}','ACTIVE','1.0.0'),
 ('GENERIC_REST','Generic REST Connector','REST_API','BIDIRECTIONAL','["GET","POST","PUT","PATCH","POLL"]','["NONE","API_KEY","BASIC","BEARER","OAUTH2_CLIENT_CREDENTIALS"]','{"httpsRequired":true,"hostAllowlist":{"type":"array"}}','ACTIVE','1.0.0'),
 ('GENERIC_FILE_IMPORT','Generic CSV/JSON Import','FILE_IMPORT','INBOUND','["PREFLIGHT","DRY_RUN","COMMIT"]','["NONE"]','{"formats":["CSV","JSON"]}','ACTIVE','1.0.0'),
 ('ERP_ADAPTER','Generic ERP Adapter','ERP','INBOUND','["LIST_CHANGED","FETCH_BY_EXTERNAL_ID","INCREMENTAL_SYNC"]','["API_KEY","BASIC","BEARER","OAUTH2_CLIENT_CREDENTIALS"]','{}','ACTIVE','1.0.0'),
 ('MES_ADAPTER','Generic MES Adapter','MES','INBOUND','["MODEL","BATCH","ITEM","PRODUCTION_EVENT","INSPECTION"]','["API_KEY","BASIC","BEARER"]','{}','ACTIVE','1.0.0'),
 ('PLM_ADAPTER','Generic PLM Adapter','PLM','INBOUND','["MODEL","BOM_REFERENCE","DOCUMENT","REVISION"]','["API_KEY","BASIC","BEARER"]','{}','ACTIVE','1.0.0'),
 ('BMS_AGGREGATION','BMS Aggregation Adapter','BMS','INBOUND','["LATEST","WINDOW_MIN_MAX_AVG","THRESHOLD_EVENT","CLAIM_RULE"]','["API_KEY","HMAC"]','{}','ACTIVE','1.0.0');

insert into public.capability(code, description, risk_class) values
 ('connector.view','View connector configuration and safe operational state','READ'),
 ('connector.manage','Manage connector instances and credential references','ADMIN'),
 ('connector.execute','Execute connector jobs','WRITE'),
 ('connector.retry','Retry or requeue connector jobs','WRITE'),
 ('connector.read_receipt','Read redacted connector receipts','READ'),
 ('webhook.manage','Manage webhook connector bindings','ADMIN')
on conflict (code) do update set description = excluded.description, risk_class = excluded.risk_class;

insert into public.role_capability(role_id, capability_id)
select r.id, c.id from public.role r join public.capability c on c.code = any(
  case r.code
    when 'tenant_admin' then array['connector.view','connector.manage','connector.execute','connector.retry','connector.read_receipt','webhook.manage']::text[]
    when 'dpp_manager' then array['connector.view','connector.execute','connector.retry','connector.read_receipt']::text[]
    when 'publisher' then array['connector.view','connector.execute','connector.retry','connector.read_receipt']::text[]
    when 'read_only' then array['connector.view','connector.read_receipt']::text[]
    else array[]::text[] end)
on conflict do nothing;

insert into public.permission_profile_capability(permission_profile_id, capability_id)
select p.id, c.id from public.permission_profile p join public.capability c on c.code = any(
  case p.code
    when 'PARTNER_CONSULTANT' then array['connector.view','connector.execute','connector.read_receipt']::text[]
    when 'PARTNER_READ_ONLY' then array['connector.view','connector.read_receipt']::text[]
    else array[]::text[] end)
on conflict do nothing;

alter table public.connector_definition enable row level security;
alter table public.connector_instance enable row level security;
alter table public.connector_credential_reference enable row level security;
alter table public.connector_rate_limit_counter enable row level security;
alter table public.connector_job enable row level security;
alter table public.connector_attempt enable row level security;
alter table public.connector_receipt enable row level security;
alter table public.connector_webhook_event enable row level security;
alter table public.connector_dead_letter enable row level security;
alter table public.external_identifier_mapping enable row level security;
alter table public.registry_submission_v2 enable row level security;
alter table public.connector_import_session enable row level security;
alter table public.bms_aggregation_snapshot enable row level security;
alter table public.connector_audit_event enable row level security;

create policy connector_definition_read on public.connector_definition for select to authenticated using (status <> 'RETIRED');
create policy connector_instance_read on public.connector_instance for select to authenticated using (
  public.v2_user_has_capability(tenant_id,'connector.view') or public.v2_user_has_partner_resource_capability(tenant_id,'connector.view','CONNECTOR',id,null));
create policy connector_instance_write on public.connector_instance for all to authenticated using (public.v2_user_has_capability(tenant_id,'connector.manage')) with check (public.v2_user_has_capability(tenant_id,'connector.manage'));
-- Deliberately no authenticated policy on connector_credential_reference: only
-- service_role can resolve provider/reference internals. API consumers use the view.
-- Rate-limit counters are service-only mutable internals. Authenticated users
-- consume rate limits through API routes and inspect aggregate observability.
create policy connector_job_read on public.connector_job for select to authenticated using (
  public.v2_user_has_capability(tenant_id,'connector.view') or public.v2_user_has_partner_resource_capability(tenant_id,'connector.view','CONNECTOR',connector_instance_id,null));
create policy connector_attempt_read on public.connector_attempt for select to authenticated using (public.v2_user_has_capability(tenant_id,'connector.view'));
create policy connector_receipt_read on public.connector_receipt for select to authenticated using (public.v2_user_has_capability(tenant_id,'connector.read_receipt'));
create policy connector_webhook_read on public.connector_webhook_event for select to authenticated using (public.v2_user_has_capability(tenant_id,'webhook.manage'));
create policy connector_dead_letter_read on public.connector_dead_letter for select to authenticated using (public.v2_user_has_capability(tenant_id,'connector.retry'));
create policy external_identifier_read on public.external_identifier_mapping for select to authenticated using (public.v2_user_has_capability(tenant_id,'connector.view'));
create policy registry_submission_v2_read on public.registry_submission_v2 for select to authenticated using (public.v2_user_has_capability(tenant_id,'registry.view'));
create policy connector_import_read on public.connector_import_session for select to authenticated using (public.v2_user_has_capability(tenant_id,'connector.view'));
create policy bms_snapshot_read on public.bms_aggregation_snapshot for select to authenticated using (public.v2_user_has_capability(tenant_id,'connector.view'));
create policy connector_audit_read on public.connector_audit_event for select to authenticated using (public.v2_user_has_capability(tenant_id,'connector.view'));

grant select on public.connector_credential_status, public.connector_observability to authenticated;
revoke all on public.connector_credential_reference from anon, authenticated;
revoke all on public.connector_rate_limit_counter from anon, authenticated;
revoke all on function public.v2_phase5_consume_rate_limit(uuid,uuid,uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.v2_phase5_consume_rate_limit(uuid,uuid,uuid,text,timestamptz) to service_role;

insert into public.greanlean_migration_ledger(migration_number,migration_name,checksum_sha256,environment,applied_by,result,notes)
values ('0031','v2_phase5_integration_registry_connectors',null,'development','codex','applied',
  'Integration core, connector jobs, safe credential references, TEST Registry, import, webhook, and BMS aggregation boundaries.')
on conflict (migration_number) do update set migration_name=excluded.migration_name, environment=excluded.environment,
  applied_by=excluded.applied_by, applied_at=now(), result=excluded.result, notes=excluded.notes;

commit;
