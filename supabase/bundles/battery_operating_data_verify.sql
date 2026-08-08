select
  (
    select count(*) = 3
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'battery_source_device',
        'battery_integration_credential',
        'battery_ingestion_request'
      )
  ) as integration_tables_passed,
  (
    select count(*) = 2
    from pg_proc function_row
    join pg_namespace namespace_row
      on namespace_row.oid = function_row.pronamespace
    where namespace_row.nspname = 'public'
      and function_row.proname in (
        'greanlean_ingest_battery_metrics',
        'greanlean_ingest_battery_events'
      )
  ) as ingestion_functions_passed,
  (
    select count(*) = 25
    from public.battery_metric_type
    where status = 'active'
  ) as metric_catalog_passed,
  (
    select count(*) = 2
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'battery_ingestion_request'
      and trigger_name = 'battery_ingestion_request_append_only'
  ) as append_only_ingestion_log_passed,
  (
    select count(*) = 0
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'battery_integration_credential',
        'battery_ingestion_request'
      )
      and 'anon' = any(roles)
  ) as no_anonymous_integration_access_passed,
  (
    select count(*) = 0
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'battery_integration_credential'
      and column_name in ('api_key', 'secret', 'plaintext_secret')
  ) as no_plaintext_secret_column_passed;
