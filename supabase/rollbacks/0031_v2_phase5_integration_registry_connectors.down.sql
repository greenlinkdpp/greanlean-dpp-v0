begin;

drop view if exists public.connector_observability;
drop view if exists public.connector_credential_status;

drop function if exists public.v2_phase5_consume_rate_limit(uuid,uuid,uuid,text,timestamptz);

drop table if exists public.connector_audit_event;
drop table if exists public.bms_aggregation_snapshot;
alter table public.product_item drop constraint if exists product_item_phase5_id_tenant_unique;
drop table if exists public.connector_import_session;
drop table if exists public.registry_submission_v2;
drop table if exists public.external_identifier_mapping;
drop table if exists public.connector_dead_letter;
drop table if exists public.connector_webhook_event;
drop table if exists public.connector_receipt;
drop table if exists public.connector_attempt;
drop table if exists public.connector_job;
drop table if exists public.connector_rate_limit_counter;
drop table if exists public.connector_credential_reference;
drop table if exists public.connector_instance;
drop table if exists public.connector_definition;

drop function if exists public.v2_phase5_guard_append_only();
drop function if exists public.v2_phase5_guard_job();
drop function if exists public.v2_phase5_guard_connector_instance();

delete from public.role_capability where capability_id in (
  select id from public.capability where code in ('connector.view','connector.manage','connector.execute','connector.retry','connector.read_receipt','webhook.manage'));
delete from public.permission_profile_capability where capability_id in (
  select id from public.capability where code in ('connector.view','connector.manage','connector.execute','connector.retry','connector.read_receipt','webhook.manage'));
delete from public.capability where code in ('connector.view','connector.manage','connector.execute','connector.retry','connector.read_receipt','webhook.manage');
delete from public.greanlean_migration_ledger where migration_number = '0031';

commit;
