-- GREANLEAN BACKOFFICE ALIGNMENT PHASE 1 VERIFICATION
-- Read-only verification for migrations 0015 and 0016.
-- Run only after both migrations. Every returned value must be true.

select
  (
    select count(*) = 5
    from unnest(array[
      to_regclass('public.dpp_publication'),
      to_regclass('public.dpp_product_publication_pointer'),
      to_regclass('public.dpp_publication_review'),
      to_regclass('public.dpp_publication_validation_run'),
      to_regclass('public.dpp_publication_validation_result')
    ]) item
    where item is not null
  ) as publication_tables_passed,
  (
    select count(*) = 5
    from pg_class relation
    join pg_namespace schema_namespace
      on schema_namespace.oid = relation.relnamespace
    where schema_namespace.nspname = 'public'
      and relation.relname in (
        'dpp_publication',
        'dpp_product_publication_pointer',
        'dpp_publication_review',
        'dpp_publication_validation_run',
        'dpp_publication_validation_result'
      )
      and relation.relrowsecurity
  ) as publication_rls_passed,
  (
    select count(*) = 4
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'dpp_publication_content_immutable',
        'dpp_publication_review_guard',
        'dpp_validation_run_append_only',
        'dpp_validation_result_append_only'
      )
  ) as append_only_controls_passed,
  (
    select count(*) = 0
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'dpp_publication',
        'dpp_product_publication_pointer',
        'dpp_publication_review',
        'dpp_publication_validation_run',
        'dpp_publication_validation_result'
      )
      and 'anon' = any(roles)
  ) as no_anonymous_publication_policy_passed,
  (
    select count(*) = 0
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'dpp_publication',
        'dpp_product_publication_pointer',
        'dpp_publication_review',
        'dpp_publication_validation_run',
        'dpp_publication_validation_result'
      )
      and cmd <> 'SELECT'
      and 'authenticated' = any(roles)
  ) as no_authenticated_direct_write_policy_passed,
  (
    select count(*) = 6
    from unnest(array[
      to_regprocedure(
        'public.greanlean_store_dpp_publication(uuid,text,text,text,jsonb,text,uuid,uuid)'
      ),
      to_regprocedure(
        'public.greanlean_withdraw_current_dpp_publication(uuid,uuid,text,uuid)'
      ),
      to_regprocedure(
        'public.greanlean_create_publication_review(uuid,text,text,text,jsonb,text,text,uuid)'
      ),
      to_regprocedure(
        'public.greanlean_record_publication_validation(uuid,text,jsonb,uuid)'
      ),
      to_regprocedure(
        'public.greanlean_decide_publication_review(uuid,text,text)'
      ),
      to_regprocedure(
        'public.greanlean_publish_approved_review(uuid,text,uuid)'
      )
    ]) item
    where item is not null
  ) as publication_functions_passed,
  (
    not has_function_privilege(
      'anon',
      'public.greanlean_store_dpp_publication(uuid,text,text,text,jsonb,text,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.greanlean_store_dpp_publication(uuid,text,text,text,jsonb,text,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.greanlean_create_publication_review(uuid,text,text,text,jsonb,text,text,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.greanlean_create_publication_review(uuid,text,text,text,jsonb,text,text,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.greanlean_publish_approved_review(uuid,text,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.greanlean_publish_approved_review(uuid,text,uuid)',
      'EXECUTE'
    )
  ) as service_only_publication_writes_passed,
  has_function_privilege(
    'authenticated',
    'public.greanlean_decide_publication_review(uuid,text,text)',
    'EXECUTE'
  ) as authenticated_review_execute_passed,
  (
    not has_function_privilege(
      'anon',
      'public.greanlean_decide_publication_review(uuid,text,text)',
      'EXECUTE'
    )
  ) as anonymous_review_execute_denied_passed,
  (
    select count(*) = 2
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'dpp_publication_one_current_idx',
        'dpp_publication_review_one_open_idx'
      )
  ) as single_current_version_controls_passed,
  (
    select count(*) = 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_versions'
      and column_name = 'snapshot'
  ) as legacy_product_versions_preserved_passed;
