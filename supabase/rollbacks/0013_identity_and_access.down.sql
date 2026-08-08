begin;

do $$
begin
  if to_regclass('public.product_versions') is not null then
    drop policy if exists "Public can read published product versions" on public.product_versions;
    create policy "Public can read published product versions"
      on public.product_versions for select to anon
      using (
        lifecycle_status in ('published', 'updated', 'expired')
        and exists (
          select 1 from public.products p
          where p.id = product_id and p.status in ('published', 'updated', 'expired')
        )
      );
  end if;

  if to_regclass('public.dpp_audit_logs') is not null then
    drop trigger if exists dpp_legacy_audit_append_only on public.dpp_audit_logs;
    drop policy if exists "Platform administrators read audit logs" on public.dpp_audit_logs;
    drop policy if exists "Platform administrators append audit logs" on public.dpp_audit_logs;
    create policy "Authenticated can manage audit logs"
      on public.dpp_audit_logs for all to authenticated
      using (true) with check (true);
  end if;
end;
$$;

do $$
declare
  target_table text;
  managed_tables text[] := array[
    'dpp_category_profiles',
    'dpp_field_templates',
    'dpp_validation_rules',
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
    'dpp_blockchain_anchors'
  ];
begin
  foreach target_table in array managed_tables loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;
    execute format(
      'drop policy if exists %I on public.%I',
      'Platform administrators manage ' || target_table,
      target_table
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      'Authenticated can manage ' || replace(target_table, '_', ' '),
      target_table
    );
  end loop;
end;
$$;

drop trigger if exists dpp_access_audit_append_only on public.dpp_access_audit;
drop trigger if exists dpp_access_request_touch_updated_at on public.dpp_access_request;
drop trigger if exists dpp_access_grant_touch_updated_at on public.dpp_product_access_grant;
drop trigger if exists dpp_membership_touch_updated_at on public.dpp_user_membership;
drop trigger if exists dpp_organisation_touch_updated_at on public.dpp_organisation;

drop function if exists public.greanlean_prevent_access_audit_mutation();
drop function if exists public.greanlean_decide_access_request(uuid, text, text, timestamptz);
drop function if exists public.greanlean_submit_access_request(text, text, text, text, text, text, text, text);
drop function if exists public.greanlean_authorized_dpp_snapshot(text, text, text, text, text, text);
drop function if exists public.greanlean_public_dpp_snapshot(text);
drop function if exists public.greanlean_resolve_dpp_access(text, text, text, text, text, text);
drop function if exists public.greanlean_get_my_identity();
drop function if exists public.greanlean_product_access_level(uuid, uuid);
drop function if exists public.greanlean_is_platform_admin(uuid);
drop function if exists public.greanlean_filter_dpp_payload(jsonb, text);
drop function if exists public.greanlean_visibility_access_level(text);
drop function if exists public.greanlean_access_rank(text);

drop table if exists public.dpp_access_audit;
drop table if exists public.dpp_access_request;
drop table if exists public.dpp_product_access_grant;
drop table if exists public.dpp_user_membership;
drop table if exists public.dpp_organisation;

commit;
