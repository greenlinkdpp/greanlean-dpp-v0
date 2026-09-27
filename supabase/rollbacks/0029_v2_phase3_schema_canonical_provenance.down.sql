begin;

drop policy if exists canonical_claim_insert on public.canonical_claim;
drop policy if exists canonical_claim_select on public.canonical_claim;
drop policy if exists provenance_record_insert on public.provenance_record;
drop policy if exists provenance_record_select on public.provenance_record;
drop policy if exists transformation_result_insert on public.transformation_result;
drop policy if exists transformation_result_select on public.transformation_result;
drop policy if exists mapping_rule_write on public.mapping_rule;
drop policy if exists mapping_rule_select on public.mapping_rule;
drop policy if exists mapping_version_update on public.mapping_version;
drop policy if exists mapping_version_insert on public.mapping_version;
drop policy if exists mapping_version_select on public.mapping_version;
drop policy if exists mapping_profile_update on public.mapping_profile;
drop policy if exists mapping_profile_insert on public.mapping_profile;
drop policy if exists mapping_profile_select on public.mapping_profile;
drop policy if exists source_record_insert on public.source_record;
drop policy if exists source_record_select on public.source_record;
drop policy if exists data_source_update on public.data_source;
drop policy if exists data_source_insert on public.data_source;
drop policy if exists data_source_select on public.data_source;

drop table if exists public.canonical_claim;
drop table if exists public.provenance_record;
drop table if exists public.transformation_result;
drop table if exists public.mapping_rule;
drop table if exists public.mapping_version;
drop table if exists public.mapping_profile;
drop table if exists public.source_record;
drop table if exists public.data_source;

drop function if exists public.v2_phase3_validate_claim();
drop function if exists public.v2_phase3_partner_field_visible(uuid);
drop function if exists public.v2_phase3_validate_provenance();
drop function if exists public.v2_phase3_validate_mapping_rule();
drop function if exists public.v2_phase3_protect_mapping_rule();
drop function if exists public.v2_phase3_protect_active_mapping_version();
drop function if exists public.v2_phase3_validate_mapping_profile();
drop function if exists public.v2_phase3_subject_exists(uuid, text, uuid);

drop policy if exists access_policy_v2_select on public.access_policy;
drop policy if exists field_regulatory_reference_v2_public_select on public.field_regulatory_reference;
drop policy if exists field_regulatory_reference_v2_select on public.field_regulatory_reference;
drop policy if exists applicability_rule_v2_public_select on public.applicability_rule;
drop policy if exists applicability_rule_v2_select on public.applicability_rule;
drop policy if exists validation_rule_v2_public_select on public.validation_rule;
drop policy if exists validation_rule_v2_select on public.validation_rule;
drop policy if exists field_definition_v2_write on public.field_definition;
drop policy if exists field_definition_v2_public_select on public.field_definition;
drop policy if exists field_definition_v2_select on public.field_definition;
drop policy if exists schema_version_v2_update on public.schema_version;
drop policy if exists schema_version_v2_insert on public.schema_version;
drop policy if exists schema_version_v2_public_select on public.schema_version;
drop policy if exists schema_version_v2_select on public.schema_version;
drop policy if exists schema_definition_v2_update on public.schema_definition;
drop policy if exists schema_definition_v2_insert on public.schema_definition;
drop policy if exists schema_definition_v2_public_select on public.schema_definition;
drop policy if exists schema_definition_v2_select on public.schema_definition;

create policy "Authenticated can read schema definitions"
  on public.schema_definition for select to authenticated using (true);
create policy "Public can read active schema definitions"
  on public.schema_definition for select to anon using (status = 'active');
create policy "Authenticated can read schema versions"
  on public.schema_version for select to authenticated using (true);
create policy "Public can read published schema versions"
  on public.schema_version for select to anon using (status = 'published');
create policy "Authenticated can read field definitions"
  on public.field_definition for select to authenticated using (true);
create policy "Public can read published field definitions"
  on public.field_definition for select to anon using (
    exists (select 1 from public.schema_version sv where sv.id = schema_version_id and sv.status = 'published')
  );
create policy "Authenticated can read validation rules"
  on public.validation_rule for select to authenticated using (true);
create policy "Public can read published validation rules"
  on public.validation_rule for select to anon using (
    exists (select 1 from public.schema_version sv where sv.id = schema_version_id and sv.status = 'published')
  );
create policy "Authenticated can read applicability rules"
  on public.applicability_rule for select to authenticated using (true);
create policy "Public can read published applicability rules"
  on public.applicability_rule for select to anon using (
    exists (select 1 from public.schema_version sv where sv.id = schema_version_id and sv.status = 'published')
  );
create policy "Authenticated can read field regulatory references"
  on public.field_regulatory_reference for select to authenticated using (true);
create policy "Public can read published field regulatory references"
  on public.field_regulatory_reference for select to anon using (
    exists (
      select 1 from public.field_definition fd
      join public.schema_version sv on sv.id = fd.schema_version_id
      where fd.id = field_definition_id and sv.status = 'published'
    )
  );
create policy "Authenticated can read access policies"
  on public.access_policy for select to authenticated using (true);

-- Tenant extensions cannot exist in the Phase 2 model. Remove their Phase 3-owned
-- configuration after the new Source/Mapping/Claim tables have been dropped.
alter table public.field_definition disable trigger field_definition_immutable_when_published;
alter table public.validation_rule disable trigger validation_rule_immutable_when_published;
alter table public.applicability_rule disable trigger applicability_rule_immutable_when_published;
alter table public.field_regulatory_reference disable trigger field_regulatory_reference_immutable_when_published;
alter table public.access_policy disable trigger access_policy_immutable_when_published;
alter table public.schema_version disable trigger schema_version_immutable_when_published;

delete from public.field_regulatory_reference
where field_definition_id in (
  select fd.id from public.field_definition fd
  join public.schema_version sv on sv.id = fd.schema_version_id
  join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sd.owner_type = 'TENANT_EXTENSION'
);
delete from public.access_policy where schema_version_id in (
  select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sd.owner_type = 'TENANT_EXTENSION'
);
delete from public.applicability_rule where schema_version_id in (
  select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sd.owner_type = 'TENANT_EXTENSION'
);
delete from public.validation_rule where schema_version_id in (
  select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sd.owner_type = 'TENANT_EXTENSION'
);
delete from public.field_definition where schema_version_id in (
  select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id
  where sd.owner_type = 'TENANT_EXTENSION'
);
delete from public.schema_version where schema_definition_id in (
  select id from public.schema_definition where owner_type = 'TENANT_EXTENSION'
);
delete from public.schema_definition where owner_type = 'TENANT_EXTENSION';

alter table public.schema_version enable trigger schema_version_immutable_when_published;
alter table public.access_policy enable trigger access_policy_immutable_when_published;
alter table public.field_regulatory_reference enable trigger field_regulatory_reference_immutable_when_published;
alter table public.applicability_rule enable trigger applicability_rule_immutable_when_published;
alter table public.validation_rule enable trigger validation_rule_immutable_when_published;
alter table public.field_definition enable trigger field_definition_immutable_when_published;

drop index if exists public.field_definition_v2_subject_levels_idx;
drop index if exists public.schema_definition_v2_owner_idx;

alter table public.field_definition
  drop constraint if exists field_definition_resolution_policy_v2_check,
  drop constraint if exists field_definition_display_v2_check,
  drop constraint if exists field_definition_verification_v2_check,
  drop constraint if exists field_definition_subject_levels_v2_check,
  drop constraint if exists field_definition_cardinality_v2_check,
  drop column if exists resolution_policy,
  drop column if exists deprecated_by,
  drop column if exists display_metadata,
  drop column if exists verification_requirement,
  drop column if exists vocabulary_reference,
  drop column if exists semantic_uri,
  drop column if exists subject_levels,
  drop column if exists cardinality,
  drop column if exists semantic_name;

alter table public.schema_definition
  drop constraint if exists schema_definition_id_tenant_id_key,
  drop constraint if exists schema_definition_owner_scope_check,
  drop constraint if exists schema_definition_owner_type_check,
  drop column if exists created_by,
  drop column if exists tenant_id,
  drop column if exists owner_type;

delete from public.greanlean_migration_ledger where migration_number = '0029';

commit;
