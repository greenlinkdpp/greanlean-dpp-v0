with target_products as (
  select id, dpp_id, brand
  from public.products
  where dpp_id in (
    'DPP-LMT-BAT-48V15AH',
    'DPP-GV-ESS-14K3-000001',
    'DPP-SFJK-31-1-REC',
    'DPP-CE-EARBUDS-001'
  )
),
battery_counts as (
  select
    product.dpp_id,
    count(field_value.id)::integer as static_field_count,
    count(field_value.id) filter (
      where field_value.evidence_status in ('uploaded', 'verified')
    )::integer as evidence_ready_count,
    count(field_value.id) filter (
      where field_value.verification_status = 'verified'
    )::integer as verified_count
  from target_products product
  join public.battery_model_profile profile
    on profile.product_id = product.id
  left join public.battery_field_value field_value
    on field_value.battery_model_profile_id = profile.id
    and field_value.battery_batch_id is null
    and field_value.battery_item_id is null
  where product.dpp_id in (
    'DPP-LMT-BAT-48V15AH',
    'DPP-GV-ESS-14K3-000001'
  )
  group by product.dpp_id
),
suspect_content as (
  select count(*)::integer as suspect_count
  from public.battery_field_value field_value
  join public.battery_model_profile profile
    on profile.id = field_value.battery_model_profile_id
  join target_products product
    on product.id = profile.product_id
  where product.dpp_id in (
    'DPP-LMT-BAT-48V15AH',
    'DPP-GV-ESS-14K3-000001'
  )
    and field_value.value_json::text ~* (
      'demo|test data|test dataset|test manufacturing|synthetic|演示|测试数据'
    )
)
select
  (select count(*) from target_products) = 4
    as four_reference_products_passed,
  (select brand from target_products where dpp_id = 'DPP-LMT-BAT-48V15AH')
    = 'GREANLEAN Mobility'
    as lmt_brand_passed,
  (select brand from target_products where dpp_id = 'DPP-GV-ESS-14K3-000001')
    = 'GreenVault Energy Systems'
    as ess_brand_passed,
  coalesce((
    select static_field_count >= 60
    from battery_counts
    where dpp_id = 'DPP-LMT-BAT-48V15AH'
  ), false) as lmt_static_data_passed,
  coalesce((
    select static_field_count >= 60
    from battery_counts
    where dpp_id = 'DPP-GV-ESS-14K3-000001'
  ), false) as ess_static_data_passed,
  (select suspect_count from suspect_content) = 0
    as no_public_facing_test_wording_passed,
  coalesce((
    select evidence_ready_count = 0 and verified_count = 0
    from battery_counts
    where dpp_id = 'DPP-GV-ESS-14K3-000001'
  ), false) as no_false_ess_verification_claim_passed;

