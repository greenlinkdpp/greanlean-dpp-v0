begin;

drop function if exists public.greanlean_ingest_battery_events(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text,
  jsonb
);
drop function if exists public.greanlean_ingest_battery_metrics(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text,
  jsonb
);

drop trigger if exists battery_ingestion_request_append_only on public.battery_ingestion_request;
drop trigger if exists battery_source_device_touch_updated_at on public.battery_source_device;

alter table public.battery_lifecycle_event
  drop constraint if exists battery_lifecycle_event_ingestion_request_id_fkey,
  drop constraint if exists battery_lifecycle_event_source_device_id_fkey,
  drop constraint if exists battery_event_idempotency_key_check,
  drop constraint if exists battery_event_collection_mode_check,
  drop constraint if exists battery_event_quality_status_check,
  drop column if exists idempotency_key,
  drop column if exists ingestion_request_id,
  drop column if exists source_device_id,
  drop column if exists collection_mode,
  drop column if exists quality_status,
  drop column if exists received_at;

alter table public.battery_operating_metric
  drop constraint if exists battery_operating_metric_supersedes_metric_id_fkey,
  drop constraint if exists battery_operating_metric_ingestion_request_id_fkey,
  drop constraint if exists battery_operating_metric_source_device_id_fkey,
  drop constraint if exists battery_metric_correction_check,
  drop constraint if exists battery_metric_collection_mode_check,
  drop constraint if exists battery_metric_quality_status_check,
  drop column if exists correction_reason,
  drop column if exists supersedes_metric_id,
  drop column if exists ingestion_request_id,
  drop column if exists source_device_id,
  drop column if exists collection_mode,
  drop column if exists quality_status,
  drop column if exists received_at;

drop table if exists public.battery_ingestion_request;
drop table if exists public.battery_integration_credential;
drop table if exists public.battery_source_device;

-- The two canonical metric-type rows are intentionally retained if business
-- history references them. Retiring a metric definition is a forward change.

commit;
