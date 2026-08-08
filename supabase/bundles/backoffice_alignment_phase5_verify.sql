-- GREANLEAN BACKOFFICE ALIGNMENT M6 FOUNDATION VERIFICATION
-- Run after migration 0021. Every returned value must be true.

select
  (
    select count(*) = 4
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'dpp_publication_read_control',
        'dpp_migration_batch',
        'dpp_migration_issue',
        'dpp_publication_comparison'
      )
  ) as migration_control_tables_passed,
  (
    select count(*) = 4
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'dpp_publication_read_control',
        'dpp_migration_batch',
        'dpp_migration_issue',
        'dpp_publication_comparison'
      )
      and relation.relrowsecurity
  ) as migration_control_rls_passed,
  (
    select count(*) = 1
      and bool_and(read_mode in ('LEGACY', 'CANONICAL'))
    from public.dpp_publication_read_control
    where singleton = true
  ) as publication_read_control_passed,
  (
    to_regprocedure(
      'public.greanlean_project_canonical_field_array(jsonb,text)'
    ) is not null
    and to_regprocedure(
      'public.greanlean_project_canonical_snapshot(jsonb,text)'
    ) is not null
    and to_regprocedure(
      'public.greanlean_public_canonical_dpp_snapshot(text)'
    ) is not null
    and to_regprocedure(
      'public.greanlean_authorized_canonical_dpp_snapshot(text,text,text,text,text,text)'
    ) is not null
    and to_regprocedure(
      'public.greanlean_set_publication_read_mode(text,uuid)'
    ) is not null
  ) as canonical_read_functions_passed,
  (
    has_function_privilege(
      'anon',
      'public.greanlean_public_canonical_dpp_snapshot(text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.greanlean_authorized_canonical_dpp_snapshot(text,text,text,text,text,text)',
      'EXECUTE'
    )
    and has_function_privilege(
      'authenticated',
      'public.greanlean_authorized_canonical_dpp_snapshot(text,text,text,text,text,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.greanlean_set_publication_read_mode(text,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.greanlean_set_publication_read_mode(text,uuid)',
      'EXECUTE'
    )
  ) as canonical_function_permissions_passed,
  (
    select count(*) = 0
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'dpp_publication_read_control',
        'dpp_migration_batch',
        'dpp_migration_issue',
        'dpp_publication_comparison'
      )
      and cmd <> 'SELECT'
      and (
        'anon' = any(roles)
        or 'authenticated' = any(roles)
      )
  ) as no_browser_migration_write_policy_passed,
  (
    not has_table_privilege(
      'authenticated',
      'public.dpp_publication_read_control',
      'UPDATE'
    )
    and not has_table_privilege(
      'authenticated',
      'public.dpp_migration_batch',
      'INSERT'
    )
    and has_table_privilege(
      'service_role',
      'public.dpp_migration_batch',
      'INSERT'
    )
    and has_table_privilege(
      'service_role',
      'public.dpp_publication_comparison',
      'INSERT'
    )
  ) as migration_write_boundary_passed,
  (
    to_regclass('public.registry_submission') is null
    or (
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'registry_submission'
          and column_name = 'publication_id'
          and is_nullable = 'YES'
      )
      and exists (
        select 1
        from pg_constraint constraint_record
        join pg_class relation
          on relation.oid = constraint_record.conrelid
        join pg_namespace namespace
          on namespace.oid = relation.relnamespace
        where namespace.nspname = 'public'
          and relation.relname = 'registry_submission'
          and constraint_record.conname = 'registry_submission_publication_source_check'
      )
    )
  ) as registry_publication_link_passed,
  (
    position(
      'sourceRecord'
      in pg_get_functiondef(
        'public.greanlean_project_canonical_field_array(jsonb,text)'::regprocedure
      )
    ) > 0
    and position(
      'CANONICAL_CUTOVER_REQUIRES_FOUR_CURRENT_PUBLICATIONS'
      in pg_get_functiondef(
        'public.greanlean_set_publication_read_mode(text,uuid)'::regprocedure
      )
    ) > 0
  ) as projection_and_cutover_guard_passed;
