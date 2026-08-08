-- GREANLEAN PUBLICATION REVIEW PERMISSION VERIFICATION
-- Run in a new, empty SQL Editor query after migration 0017.

select
  has_function_privilege(
    'authenticated',
    'public.greanlean_decide_publication_review(uuid,text,text)',
    'EXECUTE'
  ) as authenticated_review_execute_passed,
  not has_function_privilege(
    'anon',
    'public.greanlean_decide_publication_review(uuid,text,text)',
    'EXECUTE'
  ) as anonymous_review_execute_denied_passed,
  not has_function_privilege(
    'authenticated',
    'public.greanlean_publish_approved_review(uuid,text,uuid)',
    'EXECUTE'
  ) as authenticated_direct_publish_denied_passed,
  has_function_privilege(
    'service_role',
    'public.greanlean_publish_approved_review(uuid,text,uuid)',
    'EXECUTE'
  ) as service_role_publish_execute_passed;