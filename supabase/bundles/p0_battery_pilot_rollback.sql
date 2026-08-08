-- Generated from supabase/rollbacks/0025_p0_battery_pilot_foundation.down.sql. Do not edit this bundle directly.
begin;

do $$
begin
  if exists (select 1 from public.dpp_publication where battery_item_id is not null)
    or exists (select 1 from public.dpp_item_publication_pointer)
    or exists (select 1 from public.dpp_project)
    or exists (select 1 from public.dpp_identifier)
    or exists (select 1 from public.dpp_import_job)
    or exists (select 1 from public.dpp_economic_operator_profile)
  then
    raise exception 'P0_ROLLBACK_REQUIRES_DATA_EXPORT_OR_FORWARD_FIX';
  end if;
end;
$$;

drop trigger if exists dpp_publication_p0_subject_guard on public.dpp_publication;
drop trigger if exists dpp_publication_review_p0_subject_guard on public.dpp_publication_review;
drop trigger if exists dpp_applicability_append_only on public.dpp_applicability_assessment;
drop trigger if exists dpp_economic_operator_profile_immutable on public.dpp_economic_operator_profile;
drop trigger if exists battery_item_p0_hierarchy_guard on public.battery_item;
drop trigger if exists battery_batch_p0_hierarchy_guard on public.battery_batch;

drop function if exists public.greanlean_p0_bulk_create_battery_items(uuid,uuid,uuid,jsonb,text,uuid);
drop function if exists public.greanlean_p0_assign_product_model(uuid,uuid,uuid,uuid);
drop function if exists public.greanlean_p0_record_applicability(uuid,uuid,jsonb,jsonb,uuid);
drop function if exists public.greanlean_p0_save_economic_operator_profile(uuid,jsonb,uuid);
drop function if exists public.greanlean_p0_create_item_publication_review(uuid,uuid,text,text,text,jsonb,text,text,text,uuid);
drop function if exists public.greanlean_p0_publish_final_item_review(uuid,text,jsonb,text,uuid);
drop function if exists public.greanlean_p0_commit_bom_import(uuid,uuid,uuid,text,jsonb,uuid);
drop function if exists public.greanlean_p0_public_item_snapshot(text);
drop function if exists public.greanlean_p0_guard_economic_operator_profile();
drop function if exists public.greanlean_p0_guard_publication_subject();
drop function if exists public.greanlean_p0_guard_review_subject();
drop function if exists public.greanlean_p0_prevent_assessment_mutation();
drop function if exists public.greanlean_p0_validate_battery_hierarchy();
drop function if exists public.greanlean_p0_is_organisation_member(uuid,uuid);

drop table if exists public.dpp_item_publication_pointer;
drop table if exists public.dpp_import_error;
drop table if exists public.dpp_import_job;
drop table if exists public.dpp_identifier;
drop table if exists public.dpp_project_task;
drop table if exists public.dpp_applicability_assessment;
drop table if exists public.dpp_product_ownership;
drop table if exists public.dpp_economic_operator_profile;

alter table public.dpp_publication_review
  drop constraint if exists dpp_publication_review_change_reason_check,
  drop constraint if exists dpp_publication_review_subject_check,
  drop constraint if exists dpp_publication_review_subject_type_check,
  drop column if exists change_reason,
  drop column if exists subject_type,
  drop column if exists battery_item_id,
  drop column if exists organisation_id;

drop index if exists public.dpp_publication_review_one_open_item_idx;
drop index if exists public.dpp_publication_review_one_open_product_idx;
create unique index if not exists dpp_publication_review_one_open_idx
  on public.dpp_publication_review (product_id)
  where status in ('IN_REVIEW', 'APPROVED');

drop index if exists public.dpp_publication_one_current_item_idx;
drop index if exists public.dpp_publication_one_current_product_idx;
drop index if exists public.dpp_publication_item_version_idx;
drop index if exists public.dpp_publication_product_version_idx;

alter table public.dpp_publication
  drop constraint if exists dpp_publication_change_reason_check,
  drop constraint if exists dpp_publication_subject_check,
  drop constraint if exists dpp_publication_subject_type_check,
  add constraint dpp_publication_product_version_key unique (product_id, version_number),
  drop column if exists change_reason,
  drop column if exists subject_type,
  drop column if exists battery_item_id,
  drop column if exists organisation_id;

create unique index if not exists dpp_publication_one_current_idx
  on public.dpp_publication (product_id)
  where status = 'PUBLISHED';

alter table public.battery_item
  drop constraint if exists battery_item_id_organisation_key,
  drop constraint if exists battery_item_batch_model_product_organisation_fk,
  drop constraint if exists battery_item_model_product_organisation_fk,
  drop constraint if exists battery_item_batch_model_product_fk,
  drop constraint if exists battery_item_model_product_fk,
  drop constraint if exists battery_item_upi_https_check,
  drop constraint if exists battery_item_row_version_check,
  drop constraint if exists battery_item_demo_marker_check,
  drop constraint if exists battery_item_market_date_check,
  drop constraint if exists battery_item_p0_status_check;
drop index if exists public.battery_item_organisation_serial_idx;
alter table public.battery_item
  drop column if exists row_version,
  drop column if exists demo_marker,
  drop column if exists source_system,
  drop column if exists p0_item_status,
  drop column if exists placed_on_market_at,
  drop column if exists item_code,
  drop column if exists organisation_id;

alter table public.battery_batch
  drop constraint if exists battery_batch_model_product_organisation_fk,
  drop constraint if exists battery_batch_id_organisation_key,
  drop constraint if exists battery_batch_id_model_product_organisation_key,
  drop constraint if exists battery_batch_model_product_fk,
  drop constraint if exists battery_batch_id_model_product_key,
  drop constraint if exists battery_batch_row_version_check,
  drop constraint if exists battery_batch_overrides_check,
  drop constraint if exists battery_batch_status_check;
drop index if exists public.battery_batch_organisation_identifier_idx;
alter table public.battery_batch
  drop column if exists row_version,
  drop column if exists variant_overrides,
  drop column if exists batch_status,
  drop column if exists organisation_id;

alter table public.battery_model_profile
  drop constraint if exists battery_model_project_organisation_fk,
  drop constraint if exists battery_model_id_organisation_key,
  drop constraint if exists battery_model_id_product_organisation_key,
  drop constraint if exists battery_model_id_product_key,
  drop constraint if exists battery_model_row_version_check,
  drop constraint if exists battery_model_demo_marker_check,
  drop constraint if exists battery_model_status_check;
drop index if exists public.battery_model_organisation_identifier_idx;
alter table public.battery_model_profile
  drop column if exists row_version,
  drop column if exists demo_marker,
  drop column if exists inheritance_schema_version,
  drop column if exists model_status,
  drop column if exists project_id,
  drop column if exists organisation_id;

drop table if exists public.dpp_project;

alter table public.dpp_organisation
  drop constraint if exists dpp_organisation_row_version_check,
  drop constraint if exists dpp_organisation_locale_check,
  drop constraint if exists dpp_organisation_address_object_check;
drop index if exists public.dpp_organisation_tenant_slug_idx;
alter table public.dpp_organisation
  drop column if exists row_version,
  drop column if exists default_locale,
  drop column if exists registered_address,
  drop column if exists tenant_slug,
  drop column if exists display_name;

commit;
