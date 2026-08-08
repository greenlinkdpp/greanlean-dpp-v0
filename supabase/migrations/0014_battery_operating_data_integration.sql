begin;

insert into public.battery_metric_type (
  code,
  label_en,
  label_zh,
  default_unit,
  source_field_code,
  access_level_code,
  status
)
values
  (
    'FULL_CHARGE_CAPACITY',
    'Full charge capacity',
    '满充容量',
    'Ah',
    null,
    'LEGITIMATE_INTEREST',
    'active'
  ),
  (
    'CURRENT_INTERNAL_RESISTANCE',
    'Current internal resistance',
    '当前内阻',
    'mOhm',
    null,
    'LEGITIMATE_INTEREST',
    'active'
  )
on conflict (code) do update set
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  default_unit = excluded.default_unit,
  access_level_code = excluded.access_level_code,
  status = excluded.status;

alter table public.battery_operating_metric
  add column if not exists received_at timestamptz not null default now(),
  add column if not exists quality_status text not null default 'UNKNOWN',
  add column if not exists collection_mode text not null default 'DAILY_SNAPSHOT',
  add column if not exists source_device_id uuid,
  add column if not exists ingestion_request_id uuid,
  add column if not exists supersedes_metric_id uuid,
  add column if not exists correction_reason text;

alter table public.battery_lifecycle_event
  add column if not exists received_at timestamptz not null default now(),
  add column if not exists quality_status text not null default 'UNKNOWN',
  add column if not exists collection_mode text not null default 'EVENT_DRIVEN',
  add column if not exists source_device_id uuid,
  add column if not exists ingestion_request_id uuid,
  add column if not exists idempotency_key text;

alter table public.battery_operating_metric
  drop constraint if exists battery_metric_quality_status_check,
  add constraint battery_metric_quality_status_check
    check (quality_status in ('VALID', 'SUSPECT', 'INVALID', 'UNKNOWN')),
  drop constraint if exists battery_metric_collection_mode_check,
  add constraint battery_metric_collection_mode_check
    check (collection_mode in ('DAILY_SNAPSHOT', 'EVENT_DRIVEN', 'SERVICE_SNAPSHOT', 'MANUAL_VERIFIED_IMPORT')),
  drop constraint if exists battery_metric_correction_check,
  add constraint battery_metric_correction_check
    check (
      (supersedes_metric_id is null and correction_reason is null)
      or (supersedes_metric_id is not null and length(trim(correction_reason)) >= 5)
    ),
  drop constraint if exists battery_metric_verification_check,
  add constraint battery_metric_verification_check
    check (
      verification_status in (
        'unverified',
        'in_review',
        'verified',
        'rejected',
        'UNVERIFIED',
        'DEVICE_REPORTED',
        'MANUALLY_VERIFIED',
        'REJECTED'
      )
    );

alter table public.battery_lifecycle_event
  drop constraint if exists battery_event_quality_status_check,
  add constraint battery_event_quality_status_check
    check (quality_status in ('VALID', 'SUSPECT', 'INVALID', 'UNKNOWN')),
  drop constraint if exists battery_event_collection_mode_check,
  add constraint battery_event_collection_mode_check
    check (collection_mode in ('EVENT_DRIVEN', 'SERVICE_SNAPSHOT', 'MANUAL_VERIFIED_IMPORT')),
  drop constraint if exists battery_event_idempotency_key_check,
  add constraint battery_event_idempotency_key_check
    check (idempotency_key is null or length(idempotency_key) between 8 and 200),
  drop constraint if exists battery_event_verification_check,
  add constraint battery_event_verification_check
    check (
      verification_status in (
        'unverified',
        'in_review',
        'verified',
        'rejected',
        'UNVERIFIED',
        'DEVICE_REPORTED',
        'MANUALLY_VERIFIED',
        'REJECTED'
      )
    );

create table if not exists public.battery_source_device (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.dpp_organisation(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete cascade,
  battery_item_id uuid not null references public.battery_item(id) on delete cascade,
  device_identifier text not null,
  source_system text not null,
  display_name text,
  status text not null default 'ACTIVE',
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battery_source_device_identifier_check
    check (length(trim(device_identifier)) between 3 and 160),
  constraint battery_source_device_system_check
    check (source_system in ('BMS', 'EMS', 'GATEWAY', 'SERVICE_SYSTEM', 'IMPORT_SYSTEM')),
  constraint battery_source_device_status_check
    check (status in ('ACTIVE', 'SUSPENDED', 'RETIRED')),
  constraint battery_source_device_metadata_check
    check (jsonb_typeof(metadata) = 'object'),
  unique (organisation_id, device_identifier),
  unique (id, battery_item_id, product_id)
);

create table if not exists public.battery_integration_credential (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.dpp_organisation(id) on delete restrict,
  source_device_id uuid not null references public.battery_source_device(id) on delete cascade,
  key_prefix text not null unique,
  secret_hash text not null unique,
  scopes text[] not null default array['metrics:write', 'events:write']::text[],
  status text not null default 'ACTIVE',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  last_used_at timestamptz,
  rate_limit_per_minute integer not null default 120,
  rotated_from_id uuid references public.battery_integration_credential(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint battery_integration_key_prefix_check
    check (key_prefix ~ '^gln_bat_[a-z0-9]{8,32}$'),
  constraint battery_integration_secret_hash_check
    check (secret_hash ~ '^[a-f0-9]{64}$'),
  constraint battery_integration_scopes_check
    check (
      cardinality(scopes) > 0
      and scopes <@ array['metrics:write', 'events:write']::text[]
    ),
  constraint battery_integration_status_check
    check (status in ('ACTIVE', 'ROTATED', 'REVOKED')),
  constraint battery_integration_validity_check
    check (valid_until is null or valid_until > valid_from),
  constraint battery_integration_rate_limit_check
    check (rate_limit_per_minute between 1 and 10000)
);

create table if not exists public.battery_ingestion_request (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.battery_integration_credential(id) on delete restrict,
  source_device_id uuid not null references public.battery_source_device(id) on delete restrict,
  battery_item_id uuid not null references public.battery_item(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  request_type text not null,
  idempotency_key text not null,
  request_timestamp timestamptz not null,
  received_at timestamptz not null default now(),
  payload_hash text not null,
  signature_status text not null default 'NOT_CONFIGURED',
  result_status text not null,
  record_count integer not null default 0,
  correlation_id text,
  created_at timestamptz not null default now(),
  constraint battery_ingestion_request_type_check
    check (request_type in ('METRICS', 'EVENTS')),
  constraint battery_ingestion_idempotency_key_check
    check (length(idempotency_key) between 8 and 200),
  constraint battery_ingestion_payload_hash_check
    check (payload_hash ~ '^[a-f0-9]{64}$'),
  constraint battery_ingestion_signature_status_check
    check (signature_status in ('NOT_CONFIGURED', 'VERIFIED')),
  constraint battery_ingestion_result_status_check
    check (result_status in ('ACCEPTED', 'REJECTED')),
  constraint battery_ingestion_record_count_check
    check (record_count between 0 and 500),
  unique (credential_id, idempotency_key)
);

alter table public.battery_operating_metric
  drop constraint if exists battery_operating_metric_source_device_id_fkey,
  add constraint battery_operating_metric_source_device_id_fkey
    foreign key (source_device_id)
    references public.battery_source_device(id)
    on delete restrict,
  drop constraint if exists battery_operating_metric_ingestion_request_id_fkey,
  add constraint battery_operating_metric_ingestion_request_id_fkey
    foreign key (ingestion_request_id)
    references public.battery_ingestion_request(id)
    on delete restrict,
  drop constraint if exists battery_operating_metric_supersedes_metric_id_fkey,
  add constraint battery_operating_metric_supersedes_metric_id_fkey
    foreign key (supersedes_metric_id)
    references public.battery_operating_metric(id)
    on delete restrict;

alter table public.battery_lifecycle_event
  drop constraint if exists battery_lifecycle_event_source_device_id_fkey,
  add constraint battery_lifecycle_event_source_device_id_fkey
    foreign key (source_device_id)
    references public.battery_source_device(id)
    on delete restrict,
  drop constraint if exists battery_lifecycle_event_ingestion_request_id_fkey,
  add constraint battery_lifecycle_event_ingestion_request_id_fkey
    foreign key (ingestion_request_id)
    references public.battery_ingestion_request(id)
    on delete restrict;

create unique index if not exists battery_lifecycle_event_idempotency_idx
  on public.battery_lifecycle_event (idempotency_key)
  where idempotency_key is not null;
create index if not exists battery_source_device_item_idx
  on public.battery_source_device (battery_item_id, status);
create index if not exists battery_credential_device_idx
  on public.battery_integration_credential (source_device_id, status);
create index if not exists battery_ingestion_rate_limit_idx
  on public.battery_ingestion_request (credential_id, received_at desc);
create index if not exists battery_metric_history_projection_idx
  on public.battery_operating_metric (battery_item_id, measured_at desc, metric_type);

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
  created_at,
  received_at,
  quality_status,
  collection_mode,
  source_device_id,
  ingestion_request_id,
  supersedes_metric_id,
  correction_reason
from public.battery_operating_metric
order by battery_item_id, metric_type, measured_at desc, created_at desc;

drop trigger if exists battery_source_device_touch_updated_at on public.battery_source_device;
create trigger battery_source_device_touch_updated_at
  before update on public.battery_source_device
  for each row execute function public.greanlean_touch_updated_at();

drop trigger if exists battery_ingestion_request_append_only on public.battery_ingestion_request;
create trigger battery_ingestion_request_append_only
  before update or delete on public.battery_ingestion_request
  for each row execute function public.greanlean_prevent_battery_history_mutation();

alter table public.battery_source_device enable row level security;
alter table public.battery_integration_credential enable row level security;
alter table public.battery_ingestion_request enable row level security;

drop policy if exists "Platform administrators manage battery source devices" on public.battery_source_device;
create policy "Platform administrators manage battery source devices"
  on public.battery_source_device
  for all
  to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()))
  with check (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators manage battery integration credentials" on public.battery_integration_credential;
create policy "Platform administrators manage battery integration credentials"
  on public.battery_integration_credential
  for all
  to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()))
  with check (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators read battery ingestion requests" on public.battery_ingestion_request;
create policy "Platform administrators read battery ingestion requests"
  on public.battery_ingestion_request
  for select
  to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

create or replace function public.greanlean_ingest_battery_metrics(
  target_credential_id uuid,
  target_source_device_id uuid,
  target_battery_item_id uuid,
  target_product_id uuid,
  target_idempotency_key text,
  target_request_timestamp timestamptz,
  target_payload_hash text,
  target_correlation_id text,
  target_metrics jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
  metric_row jsonb;
  metric_count integer;
begin
  if jsonb_typeof(target_metrics) <> 'array' then
    raise exception 'BATTERY_METRICS_ARRAY_REQUIRED';
  end if;
  metric_count := jsonb_array_length(target_metrics);
  if metric_count < 1 or metric_count > 100 then
    raise exception 'BATTERY_METRIC_BATCH_SIZE_INVALID';
  end if;

  insert into public.battery_ingestion_request (
    credential_id,
    source_device_id,
    battery_item_id,
    product_id,
    request_type,
    idempotency_key,
    request_timestamp,
    payload_hash,
    result_status,
    record_count,
    correlation_id
  )
  values (
    target_credential_id,
    target_source_device_id,
    target_battery_item_id,
    target_product_id,
    'METRICS',
    target_idempotency_key,
    target_request_timestamp,
    target_payload_hash,
    'ACCEPTED',
    metric_count,
    target_correlation_id
  )
  on conflict (credential_id, idempotency_key) do nothing
  returning id into request_id;

  if request_id is null then
    select id
      into request_id
    from public.battery_ingestion_request
    where credential_id = target_credential_id
      and idempotency_key = target_idempotency_key;
    return jsonb_build_object(
      'requestId', request_id,
      'duplicate', true,
      'recordCount', 0
    );
  end if;

  for metric_row in select value from jsonb_array_elements(target_metrics)
  loop
    insert into public.battery_operating_metric (
      product_id,
      battery_item_id,
      metric_type,
      metric_value,
      unit,
      measured_at,
      received_at,
      data_source,
      source_device,
      source_device_id,
      quality_status,
      verification_status,
      collection_mode,
      access_level_code,
      ingestion_key,
      ingestion_request_id
    )
    values (
      target_product_id,
      target_battery_item_id,
      metric_row->>'metricType',
      (metric_row->>'metricValue')::numeric,
      metric_row->>'unit',
      (metric_row->>'measuredAt')::timestamptz,
      now(),
      metric_row->>'dataSource',
      metric_row->>'sourceDevice',
      target_source_device_id,
      metric_row->>'qualityStatus',
      metric_row->>'verificationStatus',
      metric_row->>'collectionMode',
      'LEGITIMATE_INTEREST',
      target_credential_id::text || ':' || target_idempotency_key || ':' || (metric_row->>'metricType'),
      request_id
    );
  end loop;

  return jsonb_build_object(
    'requestId', request_id,
    'duplicate', false,
    'recordCount', metric_count
  );
end;
$$;

create or replace function public.greanlean_ingest_battery_events(
  target_credential_id uuid,
  target_source_device_id uuid,
  target_battery_item_id uuid,
  target_product_id uuid,
  target_idempotency_key text,
  target_request_timestamp timestamptz,
  target_payload_hash text,
  target_correlation_id text,
  target_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
  event_row jsonb;
  event_count integer;
begin
  if jsonb_typeof(target_events) <> 'array' then
    raise exception 'BATTERY_EVENTS_ARRAY_REQUIRED';
  end if;
  event_count := jsonb_array_length(target_events);
  if event_count < 1 or event_count > 100 then
    raise exception 'BATTERY_EVENT_BATCH_SIZE_INVALID';
  end if;

  insert into public.battery_ingestion_request (
    credential_id,
    source_device_id,
    battery_item_id,
    product_id,
    request_type,
    idempotency_key,
    request_timestamp,
    payload_hash,
    result_status,
    record_count,
    correlation_id
  )
  values (
    target_credential_id,
    target_source_device_id,
    target_battery_item_id,
    target_product_id,
    'EVENTS',
    target_idempotency_key,
    target_request_timestamp,
    target_payload_hash,
    'ACCEPTED',
    event_count,
    target_correlation_id
  )
  on conflict (credential_id, idempotency_key) do nothing
  returning id into request_id;

  if request_id is null then
    select id
      into request_id
    from public.battery_ingestion_request
    where credential_id = target_credential_id
      and idempotency_key = target_idempotency_key;
    return jsonb_build_object(
      'requestId', request_id,
      'duplicate', true,
      'recordCount', 0
    );
  end if;

  for event_row in select value from jsonb_array_elements(target_events)
  loop
    insert into public.battery_lifecycle_event (
      product_id,
      battery_item_id,
      event_type,
      event_time,
      event_data,
      data_source,
      source_device_id,
      received_at,
      quality_status,
      verification_status,
      collection_mode,
      access_level_code,
      ingestion_request_id,
      idempotency_key
    )
    values (
      target_product_id,
      target_battery_item_id,
      event_row->>'eventType',
      (event_row->>'eventTime')::timestamptz,
      coalesce(event_row->'eventData', '{}'::jsonb),
      event_row->>'dataSource',
      target_source_device_id,
      now(),
      event_row->>'qualityStatus',
      event_row->>'verificationStatus',
      event_row->>'collectionMode',
      'LEGITIMATE_INTEREST',
      request_id,
      target_credential_id::text || ':' || target_idempotency_key || ':' || (event_row->>'eventType')
    );
  end loop;

  return jsonb_build_object(
    'requestId', request_id,
    'duplicate', false,
    'recordCount', event_count
  );
end;
$$;

revoke all on function public.greanlean_ingest_battery_metrics(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text,
  jsonb
) from public, anon, authenticated;
grant execute on function public.greanlean_ingest_battery_metrics(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text,
  jsonb
) to service_role;

revoke all on function public.greanlean_ingest_battery_events(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text,
  jsonb
) from public, anon, authenticated;
grant execute on function public.greanlean_ingest_battery_events(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text,
  jsonb
) to service_role;

comment on table public.battery_source_device is
  'Device-to-battery binding for BMS, EMS, gateway, service and verified import sources.';
comment on table public.battery_integration_credential is
  'Server-only API credential metadata. Only a SHA-256 secret hash is stored; plaintext keys are returned once.';
comment on table public.battery_ingestion_request is
  'Append-only idempotency and ingestion audit record. Raw secrets and complete payloads are never stored.';

commit;
