-- Development-only V1 reference fixture required by migration 0012.
-- SYNTHETIC TEST DATA ONLY. Never use these values as compliance evidence,
-- certification claims, production customer data, or a production seed.
--
-- Prerequisites:
--   1. supabase/schema.sql
--   2. supabase/product_category_profiles.sql
--   3. migrations 0001, 0006, 0007, 0009, 0010 and 0011
--
-- Safe to run repeatedly. It creates only the missing LMT reference product
-- and its minimum model/batch/item hierarchy. The richer BatteryPass test
-- dataset can then be applied with lmt_48v15ah_batterypass_test.sql.

begin;

do $$
declare
  v_product_id uuid;
  v_model_id uuid;
  v_batch_id uuid;
  v_schema_profile_id uuid;
begin
  if to_regclass('public.products') is null
     or to_regclass('public.dpp_category_profiles') is null
     or to_regclass('public.battery_model_profile') is null
     or to_regclass('public.battery_batch') is null
     or to_regclass('public.battery_item') is null then
    raise exception 'Development reference fixture prerequisites are missing.';
  end if;

  select id into v_schema_profile_id
  from public.battery_schema_profile
  where code = 'battery.lmt.default';

  if v_schema_profile_id is null then
    raise exception 'Battery schema profile battery.lmt.default is missing. Apply migration 0009 first.';
  end if;

  insert into public.products (
    id,
    name,
    name_zh,
    sku,
    brand,
    category,
    subcategory,
    sector_code,
    category_code,
    subcategory_code,
    dpp_profile_key,
    description,
    description_zh,
    status,
    current_version,
    granularity_level,
    commodity_code,
    unique_product_identifier,
    eu_registration_status,
    dpp_id,
    public_slug,
    main_image
  )
  values (
    'a0de52dc-8655-4339-b7b6-c9a6940f9697',
    '48V 15Ah Removable E-bike Lithium-ion Battery Pack',
    '48V 15Ah 可拆卸电动自行车锂离子电池包',
    'GL-LMT-BAT-48V15AH',
    'GREANLEAN TEST DATA',
    'Light means of transport battery',
    'Removable e-bike lithium-ion battery pack',
    'battery',
    'lmt_battery',
    'battery_unit',
    'battery.lmt.unit.v1',
    'Synthetic development fixture for validating the V1-to-V2 migration path. All values are unverified.',
    '用于验证 V1 到 V2 迁移路径的合成开发数据。所有数值均未经验证。',
    'published',
    'v1.1',
    'item',
    '850760',
    'https://greanlean.com/p/DPP-LMT-BAT-48V15AH',
    'not_registered',
    'DPP-LMT-BAT-48V15AH',
    'lmt-battery-48v15ah-test',
    '/images/lmt-ebike-battery-48v15ah.png'
  )
  on conflict (id) do update set
    name = excluded.name,
    name_zh = excluded.name_zh,
    sku = excluded.sku,
    brand = excluded.brand,
    category = excluded.category,
    subcategory = excluded.subcategory,
    sector_code = excluded.sector_code,
    category_code = excluded.category_code,
    subcategory_code = excluded.subcategory_code,
    dpp_profile_key = excluded.dpp_profile_key,
    description = excluded.description,
    description_zh = excluded.description_zh,
    status = excluded.status,
    current_version = excluded.current_version,
    granularity_level = excluded.granularity_level,
    commodity_code = excluded.commodity_code,
    unique_product_identifier = excluded.unique_product_identifier,
    eu_registration_status = excluded.eu_registration_status,
    dpp_id = excluded.dpp_id,
    public_slug = excluded.public_slug,
    main_image = excluded.main_image,
    updated_at = now()
  returning id into v_product_id;

  insert into public.battery_model_profile (
    product_id,
    schema_profile_id,
    legal_category_code,
    technical_variant_code,
    passport_applicability,
    applicability_reason,
    battery_model_identifier,
    rated_capacity_value,
    rated_capacity_unit,
    rated_energy_kwh,
    battery_mass_kg,
    battery_chemistry_code,
    bms_present,
    stationary,
    economic_operator_name,
    manufacturer_name,
    manufacturing_place,
    warranty_description,
    source_type,
    verification_status
  )
  values (
    v_product_id,
    v_schema_profile_id,
    'lmt',
    null,
    'REQUIRED',
    'Synthetic development fixture for the EU Battery Regulation LMT passport path.',
    'GL-LMT-48V15AH-NMC',
    15,
    'Ah',
    0.72,
    4.2,
    'Li-ion NMC',
    true,
    false,
    'Greanlean DPP Test Operator (fictional)',
    'Greanlean Demonstration Battery Manufacturing (fictional)',
    'Test manufacturing site, Shenzhen, China (fictional)',
    'Synthetic test warranty; not a commercial commitment.',
    'synthetic_test',
    'unverified'
  )
  on conflict (product_id) do update set
    schema_profile_id = excluded.schema_profile_id,
    legal_category_code = excluded.legal_category_code,
    technical_variant_code = excluded.technical_variant_code,
    passport_applicability = excluded.passport_applicability,
    applicability_reason = excluded.applicability_reason,
    battery_model_identifier = excluded.battery_model_identifier,
    rated_capacity_value = excluded.rated_capacity_value,
    rated_capacity_unit = excluded.rated_capacity_unit,
    rated_energy_kwh = excluded.rated_energy_kwh,
    battery_mass_kg = excluded.battery_mass_kg,
    battery_chemistry_code = excluded.battery_chemistry_code,
    bms_present = excluded.bms_present,
    stationary = excluded.stationary,
    economic_operator_name = excluded.economic_operator_name,
    manufacturer_name = excluded.manufacturer_name,
    manufacturing_place = excluded.manufacturing_place,
    warranty_description = excluded.warranty_description,
    source_type = excluded.source_type,
    verification_status = excluded.verification_status,
    updated_at = now()
  returning id into v_model_id;

  insert into public.battery_batch (
    battery_model_profile_id,
    product_id,
    batch_identifier,
    manufacturing_site_identifier,
    manufacturing_date,
    calendar_year,
    visibility_level,
    verification_status
  )
  values (
    v_model_id,
    v_product_id,
    'LMT-48V15AH-TEST-BATCH-001',
    'GL-FAC-TEST-SZX-0001',
    '2026-06-30',
    2026,
    'PUBLIC',
    'unverified'
  )
  on conflict (battery_model_profile_id, batch_identifier) do update set
    manufacturing_site_identifier = excluded.manufacturing_site_identifier,
    manufacturing_date = excluded.manufacturing_date,
    calendar_year = excluded.calendar_year,
    visibility_level = excluded.visibility_level,
    verification_status = excluded.verification_status,
    updated_at = now()
  returning id into v_batch_id;

  insert into public.battery_item (
    battery_model_profile_id,
    battery_batch_id,
    product_id,
    serial_identifier,
    unique_product_identifier,
    battery_status_code,
    manufacturing_date,
    commissioned_at,
    visibility_level,
    verification_status
  )
  values (
    v_model_id,
    v_batch_id,
    v_product_id,
    'LMT-48V15AH-TEST-001',
    'https://greanlean.com/p/DPP-LMT-BAT-48V15AH',
    'original',
    '2026-06-30',
    '2026-07-01T00:00:00Z',
    'PUBLIC',
    'unverified'
  )
  on conflict (battery_model_profile_id, serial_identifier) do update set
    battery_batch_id = excluded.battery_batch_id,
    unique_product_identifier = excluded.unique_product_identifier,
    battery_status_code = excluded.battery_status_code,
    manufacturing_date = excluded.manufacturing_date,
    commissioned_at = excluded.commissioned_at,
    visibility_level = excluded.visibility_level,
    verification_status = excluded.verification_status,
    updated_at = now();
end;
$$;

commit;
