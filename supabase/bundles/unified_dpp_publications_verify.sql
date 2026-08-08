with checks as (
  select
    1 as sort_order,
    'unified case products'::text as check_name,
    4::bigint as expected,
    count(*)::bigint as actual
  from public.products
  where dpp_id in (
    'DPP-LMT-BAT-48V15AH',
    'DPP-GV-ESS-14K3-000001',
    'DPP-TEX-TSHIRT-001',
    'DPP-CE-EARBUDS-001'
  )

  union all

  select 2, 'active legacy identifier aliases', 6, count(*)
  from public.dpp_identifier_alias
  where is_active = true
    and alias in (
      'DPP-DEMO-001',
      'demo-organic-cotton-tshirt',
      'DPP-AUDIO-DEMO-001',
      'demo-wireless-earbuds',
      'green-vault-ess-14-3-demo-000001',
      'DPP-BAT-IND-ESS-14336-001'
    )

  union all

  select 3, 'v2 unified publication snapshots', 4, count(*)
  from public.product_versions v
  join public.products p on p.id = v.product_id
  where v.version = 'v2.0'
    and v.lifecycle_status = 'published'
    and v.change_type = 'unified_publication'
    and v.snapshot->>'source' = 'database-publication'
    and jsonb_typeof(v.snapshot->'publicDpp') = 'object'
    and p.dpp_id in (
      'DPP-LMT-BAT-48V15AH',
      'DPP-GV-ESS-14K3-000001',
      'DPP-TEX-TSHIRT-001',
      'DPP-CE-EARBUDS-001'
    )

  union all

  select 4, 'publication hashes', 4, count(*)
  from public.product_versions v
  join public.products p on p.id = v.product_id
  where v.version = 'v2.0'
    and v.change_type = 'unified_publication'
    and v.hash_algorithm = 'SHA-256'
    and v.data_hash ~ '^[a-f0-9]{64}$'
    and p.dpp_id in (
      'DPP-LMT-BAT-48V15AH',
      'DPP-GV-ESS-14K3-000001',
      'DPP-TEX-TSHIRT-001',
      'DPP-CE-EARBUDS-001'
    )

  union all

  select 5, 'industrial battery materials', 3, count(*)
  from public.product_materials m
  join public.products p on p.id = m.product_id
  where p.dpp_id = 'DPP-GV-ESS-14K3-000001'

  union all

  select 6, 'industrial battery components', 3, count(*)
  from public.product_bom b
  join public.products p on p.id = b.product_id
  where p.dpp_id = 'DPP-GV-ESS-14K3-000001'

  union all

  select 7, 'industrial battery evidence placeholders', 3, count(*)
  from public.product_certificates c
  join public.products p on p.id = c.product_id
  where p.dpp_id = 'DPP-GV-ESS-14K3-000001'
    and c.verification_status = 'pending'
    and c.certificate_url is null

  union all

  select 8, 'fabricated verified certificate claims', 0, count(*)
  from public.product_certificates c
  join public.products p on p.id = c.product_id
  where p.dpp_id in ('DPP-TEX-TSHIRT-001', 'DPP-CE-EARBUDS-001')
    and (
      c.verification_status = 'verified'
      or c.certificate_url is not null
      or c.issuer is not null
      or c.certificate_number is not null
    )
)
select
  check_name,
  expected,
  actual,
  actual = expected as passed
from checks
order by sort_order;
