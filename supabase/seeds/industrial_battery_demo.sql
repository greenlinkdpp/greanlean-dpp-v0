-- GreenVault ESS-14.3 synthetic industrial battery demo
-- Prerequisites: migrations 0009 and 0010 plus the legacy product profile tables.
-- Safe to run repeatedly. It does not modify unrelated products.

begin;

do $$
declare
  v_product_id uuid;
  v_model_id uuid;
  v_batch_id uuid;
  v_item_id uuid;
  v_schema_profile_id uuid;
begin
  if to_regclass('public.battery_model_profile') is null
     or to_regclass('public.battery_operating_metric') is null
     or to_regclass('public.dpp_category_profiles') is null then
    raise exception 'Battery prerequisites are missing. Apply product_category_profiles.sql and migrations 0009/0010 first.';
  end if;

  insert into public.dpp_category_profiles (
    sector_code,
    category_code,
    subcategory_code,
    profile_key,
    profile_name,
    profile_name_zh,
    regulation_basis,
    schema_version,
    status,
    sort_order,
    required_modules
  )
  values (
    'battery',
    'industrial_battery',
    'stationary_above_2kwh',
    'battery.industrial.stationary_above_2kwh.v1',
    'Battery / Industrial battery / Stationary above 2 kWh',
    '电池 / 工业电池 / 固定式 2kWh 以上',
    'EU Battery Regulation baseline and BatteryPass-Ready v1.3 implementation reference',
    'v1',
    'active',
    34,
    '["identity","manufacturing","materials","carbon_footprint","performance_durability","circularity","due_diligence","conformity","lifecycle"]'::jsonb
  )
  on conflict (profile_key) do update set
    profile_name = excluded.profile_name,
    profile_name_zh = excluded.profile_name_zh,
    regulation_basis = excluded.regulation_basis,
    required_modules = excluded.required_modules,
    updated_at = now();

  insert into public.products (
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
    unique_product_identifier,
    eu_registration_status,
    dpp_id,
    public_slug,
    main_image,
    season,
    care_instructions,
    care_instructions_zh,
    repair_instructions,
    repair_instructions_zh,
    end_of_life_instructions,
    end_of_life_instructions_zh
  )
  values (
    'GreenVault ESS-14.3 Industrial Battery Module',
    'GreenVault ESS-14.3 工业储能电池模块',
    'GV-ESS-14K3-2026',
    'GreenVault Demo',
    'Industrial Battery',
    'Stationary Industrial Battery Above 2 kWh',
    'battery',
    'industrial_battery',
    'stationary_above_2kwh',
    'battery.industrial.stationary_above_2kwh.v1',
    'Synthetic digital battery passport demo for a 14.336 kWh stationary LFP industrial energy-storage module. No live BMS, certification or Registry submission.',
    '14.336 kWh 固定式磷酸铁锂工业储能模块的合成数字电池护照演示。没有实时 BMS、法规认证或正式注册库提交。',
    'published',
    'v1.0.0-demo',
    'item',
    'https://www.greanlean.com/passports/green-vault-ess-14-3-demo-000001',
    'not_registered',
    'DPP-GV-ESS-14K3-000001',
    'green-vault-ess-14-3-demo-000001',
    '/images/green-vault-ess-14-3.png',
    '2026 Battery Passport Demo',
    'Keep the module within the declared temperature and voltage range. Maintain ventilation and inspect terminals and BMS alarms according to the service plan.',
    '电池模块应在声明的温度和电压范围内运行，保持通风，并按维护计划检查端子与 BMS 告警。',
    'Only trained and authorised personnel may isolate, diagnose, open or repair the module.',
    '只有经过培训并获得授权的人员才可以隔离、诊断、打开或维修该电池模块。',
    'Isolate the module, reduce SOC to the required transport range and deliver it to an authorised industrial-battery collection or treatment operator.',
    '隔离电池模块，将 SOC 降至要求的运输范围，并交付有资质的工业电池收集或处理机构。'
  )
  on conflict (dpp_id) do update set
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
    unique_product_identifier = excluded.unique_product_identifier,
    eu_registration_status = excluded.eu_registration_status,
    public_slug = excluded.public_slug,
    main_image = excluded.main_image,
    season = excluded.season,
    care_instructions = excluded.care_instructions,
    care_instructions_zh = excluded.care_instructions_zh,
    repair_instructions = excluded.repair_instructions,
    repair_instructions_zh = excluded.repair_instructions_zh,
    end_of_life_instructions = excluded.end_of_life_instructions,
    end_of_life_instructions_zh = excluded.end_of_life_instructions_zh,
    updated_at = now()
  returning id into v_product_id;

  select id into v_schema_profile_id
  from public.battery_schema_profile
  where code = 'battery.industrial.stationary';

  if v_schema_profile_id is null then
    raise exception 'Schema profile battery.industrial.stationary is missing. Apply migration 0009 first.';
  end if;

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
    'industrial',
    'stationary_above_2kwh',
    'REQUIRED',
    'Synthetic demo: stationary rechargeable industrial battery with rated energy above 2 kWh.',
    'GV-ESS-14K3-2026',
    280,
    'Ah',
    14.336,
    115,
    'LFP',
    true,
    true,
    'GreenVault Demo Energy Systems GmbH (fictional)',
    'GreenVault Demo Energy Systems GmbH (fictional)',
    'Hamburg, Germany (fictional demo)',
    'Demo condition: 10 years or 6000 cycles.',
    'SYNTHETIC_DEMO',
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
    'BATCH-202606-DEMO',
    'DEMO-HAMBURG-SITE',
    '2026-06-15',
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
    visibility_level,
    verification_status
  )
  values (
    v_model_id,
    v_batch_id,
    v_product_id,
    'GV14K3-DEMO-000001',
    'https://www.greanlean.com/passports/green-vault-ess-14-3-demo-000001',
    'original',
    '2026-06-15',
    'PUBLIC',
    'unverified'
  )
  on conflict (battery_model_profile_id, serial_identifier) do update set
    battery_batch_id = excluded.battery_batch_id,
    unique_product_identifier = excluded.unique_product_identifier,
    battery_status_code = excluded.battery_status_code,
    manufacturing_date = excluded.manufacturing_date,
    visibility_level = excluded.visibility_level,
    verification_status = excluded.verification_status,
    updated_at = now()
  returning id into v_item_id;

  delete from public.battery_field_value where product_id = v_product_id;

  insert into public.battery_field_value (
    product_id,
    battery_model_profile_id,
    field_definition_id,
    value_json,
    unit_code,
    data_source,
    source_reference,
    evidence_status,
    verification_status,
    observed_at
  )
  select
    v_product_id,
    v_model_id,
    fd.id,
    values_to_insert.value_json,
    values_to_insert.unit_code,
    'SYNTHETIC_DEMO',
    'docs/industrial-battery-demo.seed.json',
    'declared',
    'unverified',
    '2026-07-20T10:30:00Z'::timestamptz
  from (
    values
      ('battery.dpp_schema_version', '"eu-battery-demo-0.1"'::jsonb, null),
      ('battery.dpp_granularity', '"Item"'::jsonb, null),
      ('battery.unique_battery_passport_identifier_unique_dpp_identifier', '"DPP-GV-ESS-14K3-000001"'::jsonb, null),
      ('battery.unique_battery_identifier_unique_product_identifier', '"https://www.greanlean.com/passports/green-vault-ess-14-3-demo-000001"'::jsonb, null),
      ('battery.battery_model_identifier', '"GV-ESS-14K3-2026"'::jsonb, null),
      ('battery.battery_category', '{"batteryCategoryValue":"Industrial battery"}'::jsonb, null),
      ('battery.battery_mass', '{"gramKg":"kg","gramKgValue":115}'::jsonb, 'kg'),
      ('battery.battery_chemistry', '{"chemicalCodeValue":"LFP"}'::jsonb, null),
      ('battery.rated_capacity', '{"ampereHourMiliamperehour":"Ah","amperehourMiliamperehourValue":280}'::jsonb, 'Ah'),
      ('battery.nominal_voltage', '{"volt":"V","voltValue":51.2}'::jsonb, 'V'),
      ('battery.maximum_permitted_battery_power', '{"watt":"W","wattValue":10000}'::jsonb, 'W'),
      ('battery.initial_round_trip_energy_efficiency', '{"percent":"%","percentageValue":95}'::jsonb, '%'),
      ('battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', '{"ohm":"mOhm","ohmValue":18}'::jsonb, 'mOhm'),
      ('battery.expected_lifetime_in_calendar_years', '15'::jsonb, 'year'),
      ('battery.expected_lifetime_number_of_charge_discharge_cycles', '6000'::jsonb, 'cycle'),
      ('battery.temperature_range_idle_state_lower_boundary', '{"celsius":"C","celsiusValue":-20}'::jsonb, 'C'),
      ('battery.temperature_range_idle_state_upper_boundary', '{"celsius":"C","celsiusValue":45}'::jsonb, 'C'),
      ('battery.battery_carbon_footprint_per_functional_unit', '{"kgCO2-equivalentPerKilowattHour":"kgCO2-eq/kWh","kgCO2-equivalentPerKilowattHourValue":72}'::jsonb, 'kgCO2-eq/kWh')
  ) as values_to_insert(field_code, value_json, unit_code)
  join public.field_definition fd on fd.field_code = values_to_insert.field_code;

  insert into public.battery_field_value (
    product_id,
    battery_model_profile_id,
    battery_item_id,
    field_definition_id,
    value_json,
    data_source,
    source_reference,
    evidence_status,
    verification_status,
    observed_at
  )
  select
    v_product_id,
    v_model_id,
    v_item_id,
    fd.id,
    values_to_insert.value_json,
    'SYNTHETIC_DEMO',
    'docs/industrial-battery-demo.seed.json',
    'declared',
    'unverified',
    '2026-07-20T10:30:00Z'::timestamptz
  from (
    values
      ('battery.battery_serial_number', '"GV14K3-DEMO-000001"'::jsonb),
      ('battery.battery_status', '{"batteryStatusValue":"Original"}'::jsonb),
      ('battery.manufacturing_date', '"2026-06-15"'::jsonb)
  ) as values_to_insert(field_code, value_json)
  join public.field_definition fd on fd.field_code = values_to_insert.field_code;

  delete from public.battery_material_composition where product_id = v_product_id;
  insert into public.battery_material_composition (
    product_id,
    battery_model_profile_id,
    material_name,
    material_role,
    percentage,
    is_critical,
    is_hazardous,
    recycled_content_percentage,
    source_reference,
    access_level_code,
    verification_status
  )
  values
    (v_product_id, v_model_id, 'Cells and active materials', 'Cell system', 78, true, false, null, 'Synthetic demo composition', 'PUBLIC', 'unverified'),
    (v_product_id, v_model_id, 'Metal enclosure and structural parts', 'Enclosure', 10, false, false, 35, 'Synthetic demo composition', 'PUBLIC', 'unverified'),
    (v_product_id, v_model_id, 'BMS and electronic components', 'Electronics', 4, false, false, null, 'Synthetic demo composition', 'PUBLIC', 'unverified'),
    (v_product_id, v_model_id, 'Copper and aluminium connectors and wiring', 'Conductors', 3, true, false, 20, 'Synthetic demo composition', 'PUBLIC', 'unverified'),
    (v_product_id, v_model_id, 'Insulation, sealing and thermal materials', 'Auxiliary materials', 5, false, false, null, 'Synthetic demo composition', 'PUBLIC', 'unverified');

  delete from public.battery_sustainability_data where product_id = v_product_id;
  insert into public.battery_sustainability_data (
    product_id,
    battery_model_profile_id,
    battery_batch_id,
    manufacturing_site_identifier,
    reporting_year,
    carbon_footprint_per_kwh,
    absolute_carbon_footprint,
    lifecycle_stage_contributions,
    carbon_footprint_class,
    recycled_content,
    due_diligence_summary,
    methodology,
    verifier,
    access_level_code,
    verification_status
  )
  values (
    v_product_id,
    v_model_id,
    v_batch_id,
    'DEMO-HAMBURG-SITE',
    2026,
    72,
    1032,
    '{"rawMaterialsAndUpstream":720,"cellAndBatteryManufacturing":240,"distribution":36,"endOfLifeTreatment":36}'::jsonb,
    null,
    '{"lithiumPct":6,"aluminiumEnclosurePct":35,"copperConductorsPct":20,"cobalt":"NOT_APPLICABLE_DECLARED_LFP","nickel":"NOT_APPLICABLE_DECLARED_LFP","lead":"NOT_INTENTIONALLY_USED"}'::jsonb,
    'Demo policy record. No third-party verification. Illustrative supply-chain information.',
    'Synthetic demonstration method; not a regulatory carbon-footprint declaration.',
    null,
    'PUBLIC',
    'unverified'
  );

  insert into public.battery_performance_spec (
    product_id,
    battery_model_profile_id,
    rated_capacity_value,
    rated_capacity_unit,
    certified_usable_energy_kwh,
    minimum_voltage_v,
    maximum_voltage_v,
    nominal_voltage_v,
    original_power_w,
    maximum_permitted_power_w,
    initial_round_trip_efficiency,
    initial_internal_resistance_ohm,
    expected_lifetime_years,
    expected_cycle_count,
    idle_temperature_min_c,
    idle_temperature_max_c,
    test_reference,
    access_level_code,
    verification_status
  )
  values (
    v_product_id,
    v_model_id,
    280,
    'Ah',
    14.336,
    44.8,
    58.4,
    51.2,
    10000,
    15000,
    95,
    0.018,
    15,
    6000,
    -20,
    45,
    'Synthetic demo: 6000 cycles at 80% DoD and 25 C; 15 kW peak for 10 seconds.',
    'PUBLIC',
    'unverified'
  )
  on conflict (battery_model_profile_id) do update set
    rated_capacity_value = excluded.rated_capacity_value,
    rated_capacity_unit = excluded.rated_capacity_unit,
    certified_usable_energy_kwh = excluded.certified_usable_energy_kwh,
    minimum_voltage_v = excluded.minimum_voltage_v,
    maximum_voltage_v = excluded.maximum_voltage_v,
    nominal_voltage_v = excluded.nominal_voltage_v,
    original_power_w = excluded.original_power_w,
    maximum_permitted_power_w = excluded.maximum_permitted_power_w,
    initial_round_trip_efficiency = excluded.initial_round_trip_efficiency,
    initial_internal_resistance_ohm = excluded.initial_internal_resistance_ohm,
    expected_lifetime_years = excluded.expected_lifetime_years,
    expected_cycle_count = excluded.expected_cycle_count,
    idle_temperature_min_c = excluded.idle_temperature_min_c,
    idle_temperature_max_c = excluded.idle_temperature_max_c,
    test_reference = excluded.test_reference,
    access_level_code = excluded.access_level_code,
    verification_status = excluded.verification_status,
    updated_at = now();

  insert into public.battery_disassembly_information (
    product_id,
    battery_model_profile_id,
    removal_instructions,
    disassembly_instructions,
    repair_instructions,
    safety_measures,
    spare_parts_information,
    end_of_life_information,
    access_level_code,
    verification_status
  )
  values (
    v_product_id,
    v_model_id,
    'Isolate the battery, confirm zero charge/discharge current and reduce SOC to the safe service or transport range.',
    'Disconnect DC and communication interfaces; remove cover and insulation; disconnect busbars and sensing harnesses; remove BMS, auxiliaries and cells in the prescribed sequence.',
    'Only trained and authorised personnel may diagnose or repair the module.',
    'Control electric-shock, short-circuit, thermal-runaway and residual-energy risks. Follow the site emergency plan.',
    'Demo spare-parts catalogue pending.',
    'Separate cells, electronics, copper/aluminium parts and enclosure and deliver them to an authorised treatment operator.',
    'LEGITIMATE_INTEREST',
    'unverified'
  )
  on conflict (battery_model_profile_id) do update set
    removal_instructions = excluded.removal_instructions,
    disassembly_instructions = excluded.disassembly_instructions,
    repair_instructions = excluded.repair_instructions,
    safety_measures = excluded.safety_measures,
    spare_parts_information = excluded.spare_parts_information,
    end_of_life_information = excluded.end_of_life_information,
    access_level_code = excluded.access_level_code,
    verification_status = excluded.verification_status,
    updated_at = now();

  delete from public.battery_compliance_document where product_id = v_product_id;
  delete from public.product_documents where product_id = v_product_id;

  insert into public.product_documents (
    product_id,
    document_name,
    document_type,
    file_url,
    file_size,
    language,
    uploaded_by,
    version,
    visibility_level
  )
  values
    (v_product_id, 'Demo EU Declaration of Conformity placeholder', 'DoC', '/api/demo-document?file=demo-eu-declaration-of-conformity.pdf', null, 'EN / ZH', 'synthetic demo seed', 'demo', 'public'),
    (v_product_id, 'Demo UN 38.3 Test Summary placeholder', 'UN38.3', '/api/demo-document?file=demo-un38-3-test-summary.pdf', null, 'EN / ZH', 'synthetic demo seed', 'demo', 'authority'),
    (v_product_id, 'Demo IEC 62619 Report placeholder', 'IEC62619', '/api/demo-document?file=demo-iec-62619-report.pdf', null, 'EN / ZH', 'synthetic demo seed', 'demo', 'authority'),
    (v_product_id, 'Demo Safety Data Sheet placeholder', 'SDS', '/api/demo-document?file=demo-safety-data-sheet.pdf', null, 'EN / ZH', 'synthetic demo seed', 'demo', 'authority'),
    (v_product_id, 'Demo Carbon Footprint Declaration placeholder', 'Carbon footprint', '/api/demo-document?file=demo-carbon-footprint-declaration.pdf', null, 'EN / ZH', 'synthetic demo seed', 'demo', 'authority');

  insert into public.battery_compliance_document (
    product_id,
    battery_model_profile_id,
    product_document_id,
    document_role,
    validity_status,
    access_level_code,
    verification_status
  )
  select
    v_product_id,
    v_model_id,
    pd.id,
    case
      when pd.document_type = 'DoC' then 'declaration_of_conformity'
      when pd.document_type = 'Carbon footprint' then 'carbon_footprint'
      when pd.document_type = 'SDS' then 'safety'
      else 'test_report'
    end,
    'unknown',
    case when pd.document_type = 'DoC' then 'PUBLIC' else 'AUTHORITY_ONLY' end,
    'unverified'
  from public.product_documents pd
  where pd.product_id = v_product_id;

  insert into public.battery_lifecycle_event (
    product_id,
    battery_item_id,
    event_type,
    event_time,
    event_data,
    data_source,
    verification_status,
    access_level_code
  )
  select
    v_product_id,
    v_item_id,
    'passport_demo_created',
    '2026-07-20T10:30:00Z'::timestamptz,
    '{"lifecycleStatus":"ORIGINAL","placedOnMarket":"DEMO_ONLY","safetyIncidents":0,"repairEvents":0,"repurposingEvents":0}'::jsonb,
    'SYNTHETIC_DEMO',
    'unverified',
    'PUBLIC'
  where not exists (
    select 1
    from public.battery_lifecycle_event
    where battery_item_id = v_item_id
      and event_type = 'passport_demo_created'
      and event_time = '2026-07-20T10:30:00Z'::timestamptz
  );

  insert into public.battery_metric_type (
    code,
    label_en,
    label_zh,
    default_unit,
    source_field_code,
    access_level_code,
    status
  )
  values
    ('FULL_CHARGE_CAPACITY_DEMO', 'Full charge capacity (demo extension)', '满充容量（演示扩展）', 'Ah', null, 'LEGITIMATE_INTEREST', 'active'),
    ('FULL_EQUIVALENT_CYCLES_DEMO', 'Full equivalent cycles (demo extension)', '完整等效循环次数（演示扩展）', 'cycle', null, 'LEGITIMATE_INTEREST', 'active'),
    ('CURRENT_INTERNAL_RESISTANCE_DEMO', 'Current internal resistance (demo extension)', '当前内阻（演示扩展）', 'mOhm', null, 'LEGITIMATE_INTEREST', 'active')
  on conflict (code) do update set
    label_en = excluded.label_en,
    label_zh = excluded.label_zh,
    default_unit = excluded.default_unit,
    access_level_code = excluded.access_level_code,
    status = excluded.status;

  insert into public.battery_operating_metric (
    product_id,
    battery_item_id,
    metric_type,
    metric_value,
    unit,
    measured_at,
    data_source,
    source_device,
    verification_status,
    access_level_code,
    ingestion_key
  )
  values
    (v_product_id, v_item_id, 'SOC', 74, '%', '2026-07-20T10:30:00Z', 'SYNTHETIC_DEMO', 'Demo BMS simulator', 'unverified', 'LEGITIMATE_INTEREST', 'green-vault-demo-soc-20260720T103000Z'),
    (v_product_id, v_item_id, 'SOH_VOLUNTARY', 98.7, '%', '2026-07-20T10:30:00Z', 'SYNTHETIC_DEMO', 'Demo BMS simulator', 'unverified', 'LEGITIMATE_INTEREST', 'green-vault-demo-soh-20260720T103000Z'),
    (v_product_id, v_item_id, 'FULL_CHARGE_CAPACITY_DEMO', 276.4, 'Ah', '2026-07-20T10:30:00Z', 'SYNTHETIC_DEMO', 'Demo BMS simulator', 'unverified', 'LEGITIMATE_INTEREST', 'green-vault-demo-fcc-20260720T103000Z'),
    (v_product_id, v_item_id, 'FULL_EQUIVALENT_CYCLES_DEMO', 42, 'cycle', '2026-07-20T10:30:00Z', 'SYNTHETIC_DEMO', 'Demo BMS simulator', 'unverified', 'LEGITIMATE_INTEREST', 'green-vault-demo-fec-20260720T103000Z'),
    (v_product_id, v_item_id, 'TEMPERATURE', 26.4, 'C', '2026-07-20T10:30:00Z', 'SYNTHETIC_DEMO', 'Demo BMS simulator', 'unverified', 'LEGITIMATE_INTEREST', 'green-vault-demo-temp-20260720T103000Z'),
    (v_product_id, v_item_id, 'CURRENT_INTERNAL_RESISTANCE_DEMO', 18.6, 'mOhm', '2026-07-20T10:30:00Z', 'SYNTHETIC_DEMO', 'Demo BMS simulator', 'unverified', 'LEGITIMATE_INTEREST', 'green-vault-demo-ir-20260720T103000Z'),
    (v_product_id, v_item_id, 'ENERGY_THROUGHPUT', 1080, 'kWh', '2026-07-20T10:30:00Z', 'SYNTHETIC_DEMO', 'Demo BMS simulator', 'unverified', 'LEGITIMATE_INTEREST', 'green-vault-demo-energy-20260720T103000Z')
  on conflict (ingestion_key) do nothing;

  insert into public.product_data_governance (
    product_id,
    data_source,
    data_owner,
    audit_status,
    data_quality_score
  )
  select
    v_product_id,
    'docs/industrial-battery-demo.seed.json; all values are synthetic demonstration data.',
    'Greanlean demo',
    'No third-party verification. No live BMS connection. No formal EU DPP Registry submission.',
    60
  where not exists (
    select 1 from public.product_data_governance where product_id = v_product_id
  );
end $$;

commit;

select
  p.dpp_id,
  p.public_slug,
  bmp.battery_model_identifier,
  bb.batch_identifier,
  bi.serial_identifier,
  count(distinct bfv.id) as static_field_values,
  count(distinct bom.id) as operating_metric_history
from public.products p
join public.battery_model_profile bmp on bmp.product_id = p.id
join public.battery_batch bb on bb.battery_model_profile_id = bmp.id
join public.battery_item bi on bi.battery_model_profile_id = bmp.id
left join public.battery_field_value bfv on bfv.product_id = p.id
left join public.battery_operating_metric bom on bom.product_id = p.id
where p.dpp_id = 'DPP-GV-ESS-14K3-000001'
group by p.dpp_id, p.public_slug, bmp.battery_model_identifier, bb.batch_identifier, bi.serial_identifier;
