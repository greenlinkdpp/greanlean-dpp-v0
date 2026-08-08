-- GREANLEAN BACKOFFICE ALIGNMENT M4 VERIFICATION
-- Run after migration 0019. Every returned value must be true.

select
  (
    select count(*) = 4
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'dpp_file_asset',
        'dpp_file_version',
        'dpp_field_evidence_link',
        'dpp_lifecycle_event'
      )
  ) as m4_tables_passed,
  (
    select count(*) = 4
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'dpp_file_asset',
        'dpp_file_version',
        'dpp_field_evidence_link',
        'dpp_lifecycle_event'
      )
      and relation.relrowsecurity
  ) as m4_rls_passed,
  (
    select count(*) = 3
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'dpp_file_version_append_only',
        'dpp_field_evidence_append_only',
        'dpp_lifecycle_append_only'
      )
  ) as append_only_history_passed,
  (
    to_regprocedure(
      'public.greanlean_create_file_asset(uuid,text,text,text,text,text,uuid)'
    ) is not null
    and to_regprocedure(
      'public.greanlean_append_file_version(uuid,integer,text,text,text,text,bigint,text,uuid,uuid)'
    ) is not null
    and to_regprocedure(
      'public.greanlean_link_file_evidence(uuid,uuid,text,text,jsonb,text,text,uuid,uuid)'
    ) is not null
    and to_regprocedure(
      'public.greanlean_append_lifecycle_event(uuid,text,text,text,timestamptz,jsonb,text,jsonb,text,text,text,uuid,uuid,text,uuid)'
    ) is not null
  ) as m4_functions_passed,
  (
    has_function_privilege(
      'service_role',
      'public.greanlean_create_file_asset(uuid,text,text,text,text,text,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.greanlean_create_file_asset(uuid,text,text,text,text,text,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.greanlean_create_file_asset(uuid,text,text,text,text,text,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.greanlean_append_file_version(uuid,integer,text,text,text,text,bigint,text,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.greanlean_append_file_version(uuid,integer,text,text,text,text,bigint,text,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.greanlean_append_file_version(uuid,integer,text,text,text,text,bigint,text,uuid,uuid)',
      'EXECUTE'
    )
  ) as service_only_file_writes_passed,
  (
    select count(*) = 0
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'dpp_file_asset',
        'dpp_file_version',
        'dpp_field_evidence_link',
        'dpp_lifecycle_event'
      )
      and cmd <> 'SELECT'
      and (
        'anon' = any(roles)
        or 'authenticated' = any(roles)
      )
  ) as no_direct_public_write_policy_passed,
  (
    select count(*) = 8
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'dpp_file_asset',
        'dpp_file_version',
        'dpp_field_evidence_link',
        'dpp_lifecycle_event'
      )
      and cmd = 'SELECT'
      and (
        'anon' = any(roles)
        or 'authenticated' = any(roles)
      )
  ) as split_read_access_policies_passed,
  (
    case
      when to_regclass('storage.buckets') is null then true
      else exists (
        select 1 from storage.buckets
        where id = 'dpp-evidence' and public = false
      )
    end
  ) as private_evidence_bucket_passed;
