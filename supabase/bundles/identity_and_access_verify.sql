select
  (
    select count(*) = 5
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'dpp_organisation',
        'dpp_user_membership',
        'dpp_product_access_grant',
        'dpp_access_request',
        'dpp_access_audit'
      )
  ) as identity_access_tables_passed,
  (
    select count(*) = 8
    from pg_proc function_row
    join pg_namespace namespace_row
      on namespace_row.oid = function_row.pronamespace
    where namespace_row.nspname = 'public'
      and function_row.proname in (
        'greanlean_is_platform_admin',
        'greanlean_product_access_level',
        'greanlean_get_my_identity',
        'greanlean_resolve_dpp_access',
        'greanlean_public_dpp_snapshot',
        'greanlean_authorized_dpp_snapshot',
        'greanlean_submit_access_request',
        'greanlean_decide_access_request'
      )
  ) as server_functions_passed,
  (
    select count(*) = 1
    from public.dpp_organisation
    where id = '00000000-0000-4000-8000-000000000013'
      and organisation_type = 'platform_operator'
      and verification_status = 'verified'
  ) as platform_operator_passed,
  (
    select count(*) = 2
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'dpp_access_audit'
      and trigger_name = 'dpp_access_audit_append_only'
  ) as append_only_audit_passed,
  (
    select count(*) = 0
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'dpp_organisation',
        'dpp_user_membership',
        'dpp_product_access_grant',
        'dpp_access_request',
        'dpp_access_audit'
      )
      and 'anon' = any(roles)
  ) as no_anonymous_access_passed,
  (
    select count(*) = 0
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_versions'
      and 'anon' = any(roles)
  ) as no_public_snapshot_policy_passed;
