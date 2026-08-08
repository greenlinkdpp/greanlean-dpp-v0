-- GREANLEAN BACKOFFICE ALIGNMENT M5 VERIFICATION
-- Run after migration 0020. Every returned value must be true.

select
  (
    select count(*) = 3
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'dpp_blockchain_connector',
        'dpp_blockchain_anchor_request',
        'dpp_blockchain_anchor_receipt'
      )
  ) as blockchain_boundary_tables_passed,
  (
    select count(*) = 3
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'dpp_blockchain_connector',
        'dpp_blockchain_anchor_request',
        'dpp_blockchain_anchor_receipt'
      )
      and relation.relrowsecurity
  ) as blockchain_boundary_rls_passed,
  (
    select count(*) = 0
    from pg_policies
    where schemaname = 'public'
      and tablename in (
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
        'dpp_blockchain_anchors',
        'battery_source_device',
        'battery_integration_credential',
        'battery_ingestion_request',
        'registry_submission',
        'registry_validation_result',
        'registry_error_log',
        'registry_registration_proof'
      )
      and cmd <> 'SELECT'
      and (
        'anon' = any(roles)
        or 'authenticated' = any(roles)
      )
  ) as no_browser_write_policies_passed,
  (
    not has_table_privilege('authenticated', 'public.products', 'INSERT')
    and not has_table_privilege('authenticated', 'public.products', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.products', 'DELETE')
    and not has_table_privilege('authenticated', 'public.product_versions', 'INSERT')
    and not has_table_privilege('authenticated', 'public.dpp_audit_logs', 'INSERT')
    and not has_table_privilege('authenticated', 'public.dpp_registry_submissions', 'INSERT')
    and not has_table_privilege('authenticated', 'public.dpp_blockchain_anchors', 'INSERT')
    and not has_table_privilege('authenticated', 'public.battery_source_device', 'INSERT')
    and not has_table_privilege('authenticated', 'public.registry_submission', 'INSERT')
  ) as browser_table_privileges_revoked_passed,
  (
    has_table_privilege('service_role', 'public.products', 'INSERT')
    and has_table_privilege('service_role', 'public.products', 'UPDATE')
    and has_table_privilege('service_role', 'public.product_materials', 'INSERT')
    and has_table_privilege('service_role', 'public.dpp_audit_logs', 'INSERT')
    and not has_table_privilege('service_role', 'public.dpp_audit_logs', 'DELETE')
  ) as service_write_boundary_passed,
  (
    to_regprocedure(
      'public.greanlean_request_blockchain_anchor(uuid,uuid,uuid)'
    ) is not null
    and to_regprocedure(
      'public.greanlean_record_blockchain_receipt(uuid,text,text,text,jsonb,timestamptz)'
    ) is not null
    and has_function_privilege(
      'service_role',
      'public.greanlean_request_blockchain_anchor(uuid,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.greanlean_request_blockchain_anchor(uuid,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.greanlean_record_blockchain_receipt(uuid,text,text,text,jsonb,timestamptz)',
      'EXECUTE'
    )
  ) as service_only_blockchain_functions_passed,
  (
    select count(*) = 0
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'dpp_blockchain_connector',
        'dpp_blockchain_anchor_request',
        'dpp_blockchain_anchor_receipt'
      )
      and column_name ~* '(plaintext|secret_value|private_key|api_key|access_token)'
  ) as no_plaintext_blockchain_secret_columns_passed,
  (
    select
      position(
        'BLOCKCHAIN_CONNECTOR_NOT_ACTIVE'
        in pg_get_functiondef(
          'public.greanlean_record_blockchain_receipt(uuid,text,text,text,jsonb,timestamptz)'::regprocedure
        )
      ) > 0
      and position(
        '''transactionHash'', null'
        in pg_get_functiondef(
          'public.greanlean_request_blockchain_anchor(uuid,uuid,uuid)'::regprocedure
        )
      ) > 0
  ) as no_unconfigured_transaction_hash_passed,
  (
    to_regprocedure(
      'public.greanlean_guard_registry_environment_result()'
    ) is not null
    and exists (
      select 1
      from pg_trigger
      where not tgisinternal
        and tgname = 'registry_submission_environment_result_guard'
    )
    and position(
      'REGISTRY_TEST_CANNOT_RECORD_PRODUCTION_SUCCESS'
      in pg_get_functiondef(
        'public.greanlean_guard_registry_environment_result()'::regprocedure
      )
    ) > 0
  ) as registry_environment_guard_passed,
  (
    select count(*) = 5
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'dpp_blockchain_request_append_only',
        'dpp_blockchain_receipt_append_only',
        'dpp_legacy_audit_append_only',
        'dpp_legacy_blockchain_anchor_append_only',
        'dpp_legacy_registration_proof_append_only'
      )
  ) as append_only_system_records_passed;
