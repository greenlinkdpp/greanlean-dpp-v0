-- Generated bundle. Do not edit directly.
-- Verify migration 0026. Every returned value must be true.
select
  (select count(*) = 71 from public.battery_regulatory_data_point where catalog_version = '2.0.0') as data_points_passed,
  (select count(*) = 213 from public.battery_regulatory_applicability where catalog_version = '2.0.0') as category_statuses_passed,
  (select count(*) = 1 from public.battery_regulatory_catalog where version = '2.0.0' and is_active) as active_catalog_passed,
  (select count(*) = 10 from (select distinct chapter_code from public.battery_regulatory_data_point where catalog_version = '2.0.0') chapters) as chapters_passed,
  (select count(*) = 71 from public.battery_regulatory_applicability where catalog_version = '2.0.0' and battery_category = 'industrial') as industrial_scope_passed,
  (select count(*) = 12 from public.field_definition field join public.schema_version version on version.id = field.schema_version_id join public.schema_definition definition on definition.id = version.schema_definition_id where definition.code = 'battery.eu_guidance' and version.version = '2.0.0') as extension_fields_passed,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='battery_field_value' and column_name='data_status') as data_status_passed,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='battery_field_value' and column_name='expert_review_status') as expert_review_passed,
  not exists (
    select 1 from public.battery_field_value value
    join public.products product on product.id = value.product_id
    join public.field_definition field on field.id = value.field_definition_id
    where product.dpp_id = 'DPP-GV-ESS-14K3-000001'
      and value.verification_status = 'verified'
      and not exists (select 1 from public.dpp_field_evidence_link link where link.product_id = product.id and link.field_code = field.field_code)
  ) as greenvault_unverified_without_evidence_passed,
  exists (
    select 1 from public.battery_model_profile profile
    join public.products product on product.id = profile.product_id
    where product.dpp_id = 'DPP-GV-ESS-14K3-000001'
      and profile.legal_category_code = 'industrial'
  ) as greenvault_industrial_classification_passed;
