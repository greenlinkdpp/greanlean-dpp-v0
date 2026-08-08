with target_ids(dpp_id) as (
  values
    ('DPP-LMT-BAT-48V15AH'),
    ('DPP-GV-ESS-14K3-000001'),
    ('DPP-SFJK-31-1-REC'),
    ('DPP-CE-EARBUDS-001')
)
select
  target.dpp_id,
  product.id as product_id,
  product.status as product_status,
  pointer.publication_id,
  publication.status as publication_status,
  publication.version_number,
  publication.snapshot is not null as stored_snapshot_present,
  public.greanlean_public_canonical_dpp_snapshot(target.dpp_id) is not null
    as public_snapshot_present,
  (
    select control.read_mode
    from public.dpp_publication_read_control control
    where control.singleton = true
  ) as read_mode,
  (
    select owner_role.rolname
    from pg_proc function_definition
    join pg_roles owner_role
      on owner_role.oid = function_definition.proowner
    where function_definition.oid =
      'public.greanlean_public_canonical_dpp_snapshot(text)'::regprocedure
  ) as function_owner,
  (
    select function_definition.prosecdef
    from pg_proc function_definition
    where function_definition.oid =
      'public.greanlean_public_canonical_dpp_snapshot(text)'::regprocedure
  ) as security_definer,
  (
    select array_to_string(function_definition.proconfig, ',')
    from pg_proc function_definition
    where function_definition.oid =
      'public.greanlean_public_canonical_dpp_snapshot(text)'::regprocedure
  ) as function_config
from target_ids target
left join public.products product
  on product.dpp_id = target.dpp_id
left join public.dpp_product_publication_pointer pointer
  on pointer.product_id = product.id
left join public.dpp_publication publication
  on publication.id = pointer.publication_id
  and publication.product_id = pointer.product_id
order by target.dpp_id;
