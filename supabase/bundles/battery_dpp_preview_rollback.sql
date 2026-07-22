-- GREANLEAN BATTERY DPP PREVIEW ROLLBACK BUNDLE
-- DESTRUCTIVE: use only on a disposable Preview/Test database that has not
-- accepted business data. Once battery data exists, disable the application
-- feature flag and use a forward repair instead of running this file.

-- ============================================================================
-- SOURCE: supabase/rollbacks/0011_registry_adapter.down.sql
-- SHA256: 6fe15737f1ecfe96265eec4247839823b81805b4ec99da09fd5320cda955ca13
-- ============================================================================
begin;

drop trigger if exists registry_proof_append_only on public.registry_registration_proof;
drop trigger if exists registry_error_append_only on public.registry_error_log;
drop trigger if exists registry_validation_append_only on public.registry_validation_result;
drop trigger if exists registry_submission_chain_guard on public.registry_submission;
drop table if exists public.registry_registration_proof;
drop table if exists public.registry_error_log;
drop table if exists public.registry_validation_result;
drop table if exists public.registry_submission;
drop table if exists public.registry_organisation_enrolment;
drop table if exists public.registry_mapping;
drop function if exists public.greanlean_prevent_registry_evidence_mutation();
drop function if exists public.greanlean_validate_registry_submission_chain();

commit;

-- ============================================================================
-- SOURCE: supabase/rollbacks/0010_battery_dynamic_metrics.down.sql
-- SHA256: 02b16817208663175388f98139a6579bbba350f3f1d4d2e495a6e2178f3c1420
-- ============================================================================
begin;

drop trigger if exists battery_operating_metric_append_only on public.battery_operating_metric;
drop view if exists public.battery_operating_metric_latest;
drop table if exists public.battery_operating_metric;
drop table if exists public.battery_metric_type;

commit;

-- ============================================================================
-- SOURCE: supabase/rollbacks/0009_battery_domain.down.sql
-- SHA256: 29937c056a4cf8e791c67dc21af07c51455d37c54430684d30066fa35eaaa8a3
-- ============================================================================
begin;

drop trigger if exists battery_lifecycle_event_append_only on public.battery_lifecycle_event;
drop trigger if exists battery_disassembly_touch_updated_at on public.battery_disassembly_information;
drop trigger if exists battery_performance_touch_updated_at on public.battery_performance_spec;
drop trigger if exists battery_sustainability_touch_updated_at on public.battery_sustainability_data;
drop trigger if exists battery_material_touch_updated_at on public.battery_material_composition;
drop trigger if exists battery_field_value_touch_updated_at on public.battery_field_value;
drop trigger if exists battery_item_touch_updated_at on public.battery_item;
drop trigger if exists battery_batch_touch_updated_at on public.battery_batch;
drop trigger if exists battery_model_profile_touch_updated_at on public.battery_model_profile;
drop trigger if exists battery_schema_profile_touch_updated_at on public.battery_schema_profile;

drop table if exists public.battery_lifecycle_event;
drop table if exists public.battery_disassembly_information;
drop table if exists public.battery_compliance_document;
drop table if exists public.battery_performance_spec;
drop table if exists public.battery_sustainability_data;
drop table if exists public.battery_material_composition;
drop table if exists public.battery_field_value;
drop table if exists public.battery_item;
drop table if exists public.battery_batch;
drop table if exists public.battery_model_profile;
drop table if exists public.battery_schema_profile;

drop function if exists public.greanlean_prevent_battery_history_mutation();

-- Versioned reference Schema and field rows are intentionally retained.
commit;

-- ============================================================================
-- SOURCE: supabase/rollbacks/0007_field_definitions_and_rules.down.sql
-- SHA256: dbd00f898eefef237bd05b6be3d2ec1a8d9a9b73433c20b52d688e7fb89b5781
-- ============================================================================
begin;

drop trigger if exists access_policy_immutable_when_published on public.access_policy;
drop trigger if exists field_regulatory_reference_immutable_when_published on public.field_regulatory_reference;
drop trigger if exists applicability_rule_immutable_when_published on public.applicability_rule;
drop trigger if exists validation_rule_immutable_when_published on public.validation_rule;
drop trigger if exists field_definition_immutable_when_published on public.field_definition;
drop trigger if exists access_policy_touch_updated_at on public.access_policy;
drop trigger if exists applicability_rule_touch_updated_at on public.applicability_rule;
drop trigger if exists validation_rule_touch_updated_at on public.validation_rule;
drop trigger if exists field_definition_touch_updated_at on public.field_definition;

drop table if exists public.access_policy;
drop table if exists public.field_regulatory_reference;
drop table if exists public.applicability_rule;
drop table if exists public.validation_rule;
drop table if exists public.field_definition;

drop function if exists public.greanlean_protect_published_schema_child();

commit;

-- ============================================================================
-- SOURCE: supabase/rollbacks/0006_schema_registry.down.sql
-- SHA256: 983eed717f2dc4686405936835b1fab591a43b3cb77f4f9b8ce0cba693f7aa1a
-- ============================================================================
begin;

drop trigger if exists schema_version_immutable_when_published on public.schema_version;
drop trigger if exists codelist_value_immutable_when_published on public.codelist_value;
drop trigger if exists codelist_immutable_when_published on public.codelist;
drop trigger if exists codelist_touch_updated_at on public.codelist;
drop trigger if exists regulatory_reference_touch_updated_at on public.regulatory_reference;
drop trigger if exists schema_definition_touch_updated_at on public.schema_definition;

drop table if exists public.codelist_value;
drop table if exists public.codelist;
drop table if exists public.regulatory_reference;
drop table if exists public.schema_version;
drop table if exists public.schema_definition;
drop table if exists public.access_level;

drop function if exists public.greanlean_protect_schema_version();
drop function if exists public.greanlean_protect_codelist_value();
drop function if exists public.greanlean_protect_codelist();
drop function if exists public.greanlean_touch_updated_at();

commit;

-- ============================================================================
-- SOURCE: supabase/rollbacks/0001_project_migration_ledger.down.sql
-- SHA256: 009b4ea252096c55952c14fa6d318c6e500b7ea6df2a313e27d0d26c23d650b6
-- ============================================================================
begin;

drop table if exists public.greanlean_migration_ledger;

commit;
