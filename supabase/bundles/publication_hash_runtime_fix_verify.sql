with checks as (
  select
    'pgcrypto bytea digest'::text as check_name,
    1::bigint as expected,
    count(*)::bigint as actual
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'extensions'
    and procedure.proname = 'digest'
    and pg_get_function_identity_arguments(procedure.oid) = 'bytea, text'

  union all

  select
    'publication hash function search paths',
    3,
    count(*)
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'greanlean_prepare_publication_record',
      'greanlean_prepare_publication_review',
      'greanlean_prepare_lifecycle_event'
    )
    and coalesce(
      array_to_string(procedure.proconfig, ','),
      ''
    ) like '%search_path=public, extensions%'

  union all

  select
    'runtime sha256 probe',
    64,
    length(
      encode(
        extensions.digest(convert_to('greanlean-runtime-probe', 'UTF8'), 'sha256'),
        'hex'
      )
    )
)
select
  check_name,
  expected,
  actual,
  expected = actual as passed
from checks
order by check_name;
