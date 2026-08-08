-- GREANLEAN BACKOFFICE ALIGNMENT M5 ROLLBACK
-- Refuses rollback after blockchain connector, request, or receipt data exists.

-- ============================================================================
-- SOURCE: supabase/rollbacks/0020_system_operation_security_boundary.down.sql
-- SHA256: 225a667086f6c9c3324fd04b82b3f4166e43f0cbf2ad85c8c0331d6f71503272
-- ============================================================================
begin;

do $$
begin
  if exists (select 1 from public.dpp_blockchain_connector limit 1)
    or exists (select 1 from public.dpp_blockchain_anchor_request limit 1)
    or exists (select 1 from public.dpp_blockchain_anchor_receipt limit 1)
  then
    raise exception '0020 rollback refused: blockchain connector, request, or receipt data exists';
  end if;
end;
$$;

revoke execute on function public.greanlean_request_blockchain_anchor(
  uuid,
  uuid,
  uuid
) from service_role;
revoke execute on function public.greanlean_record_blockchain_receipt(
  uuid,
  text,
  text,
  text,
  jsonb,
  timestamptz
) from service_role;

drop function if exists public.greanlean_record_blockchain_receipt(
  uuid,
  text,
  text,
  text,
  jsonb,
  timestamptz
);
drop function if exists public.greanlean_request_blockchain_anchor(
  uuid,
  uuid,
  uuid
);

drop trigger if exists registry_submission_environment_result_guard
  on public.registry_submission;
drop function if exists public.greanlean_guard_registry_environment_result();

drop trigger if exists dpp_legacy_registration_proof_append_only
  on public.dpp_registration_proofs;
drop trigger if exists dpp_legacy_blockchain_anchor_append_only
  on public.dpp_blockchain_anchors;
drop trigger if exists dpp_legacy_audit_append_only
  on public.dpp_audit_logs;

create trigger dpp_legacy_audit_append_only
  before update or delete on public.dpp_audit_logs
  for each row execute function public.greanlean_prevent_access_audit_mutation();

drop trigger if exists dpp_blockchain_receipt_append_only
  on public.dpp_blockchain_anchor_receipt;
drop trigger if exists dpp_blockchain_request_append_only
  on public.dpp_blockchain_anchor_request;
drop function if exists public.greanlean_prevent_system_record_mutation();

drop table if exists public.dpp_blockchain_anchor_receipt;
drop table if exists public.dpp_blockchain_anchor_request;
drop table if exists public.dpp_blockchain_connector;

do $$
declare
  target_table text;
  managed_tables text[] := array[
    'products',
    'product_sector_field_values',
    'product_versions',
    'product_suppliers',
    'supplier_products',
    'product_materials',
    'product_bom',
    'product_esg_metrics',
    'product_certificates',
    'product_traceability',
    'product_circularity',
    'product_consumer_transparency',
    'product_digital_identity',
    'product_documents',
    'product_data_governance',
    'dpp_registry_submissions',
    'dpp_registration_proofs',
    'dpp_evidence_links',
    'dpp_audit_logs',
    'dpp_blockchain_anchors'
  ];
begin
  foreach target_table in array managed_tables loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;
    execute format(
      'drop policy if exists %I on public.%I',
      'Platform administrators read ' || target_table,
      target_table
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.greanlean_is_platform_admin(auth.uid())) with check (public.greanlean_is_platform_admin(auth.uid()))',
      'Platform administrators manage ' || target_table,
      target_table
    );
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      target_table
    );
  end loop;
end;
$$;

drop policy if exists "Platform administrators read battery source devices"
  on public.battery_source_device;
drop policy if exists "Platform administrators read battery integration credentials"
  on public.battery_integration_credential;
drop policy if exists "Platform administrators read battery ingestion requests"
  on public.battery_ingestion_request;

create policy "Platform administrators manage battery source devices"
  on public.battery_source_device for all to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()))
  with check (public.greanlean_is_platform_admin(auth.uid()));
create policy "Platform administrators manage battery integration credentials"
  on public.battery_integration_credential for all to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()))
  with check (public.greanlean_is_platform_admin(auth.uid()));
create policy "Platform administrators read battery ingestion requests"
  on public.battery_ingestion_request for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

grant select, insert, update, delete
  on public.battery_source_device, public.battery_integration_credential
  to authenticated;
grant select on public.battery_ingestion_request to authenticated;

commit;
