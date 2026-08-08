-- GREANLEAN BACKOFFICE ALIGNMENT M3 VERIFICATION
-- Run after migration 0018. Every returned value must be true.

select
  (
    to_regprocedure(
      'public.greanlean_store_final_dpp_publication(uuid,text,text,text,jsonb,text,uuid,uuid)'
    ) is not null
  ) as final_publication_function_passed,
  (
    to_regprocedure(
      'public.greanlean_publish_final_approved_review(uuid,text,jsonb,text,uuid)'
    ) is not null
  ) as final_review_publication_function_passed,
  (
    not has_function_privilege(
      'anon',
      'public.greanlean_store_final_dpp_publication(uuid,text,text,text,jsonb,text,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.greanlean_store_final_dpp_publication(uuid,text,text,text,jsonb,text,uuid,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.greanlean_store_final_dpp_publication(uuid,text,text,text,jsonb,text,uuid,uuid)',
      'EXECUTE'
    )
  ) as final_publication_service_boundary_passed,
  (
    not has_function_privilege(
      'anon',
      'public.greanlean_publish_final_approved_review(uuid,text,jsonb,text,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.greanlean_publish_final_approved_review(uuid,text,jsonb,text,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.greanlean_publish_final_approved_review(uuid,text,jsonb,text,uuid)',
      'EXECUTE'
    )
  ) as final_review_service_boundary_passed,
  (
    not has_function_privilege(
      'service_role',
      'public.greanlean_store_dpp_publication(uuid,text,text,text,jsonb,text,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'service_role',
      'public.greanlean_publish_approved_review(uuid,text,uuid)',
      'EXECUTE'
    )
  ) as legacy_publication_functions_disabled_passed,
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
      and (
        'anon' = any(roles)
        or 'authenticated' = any(roles)
      )
  ) as no_direct_publication_write_policy_passed;
