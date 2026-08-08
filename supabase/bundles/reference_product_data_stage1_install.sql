-- Stage 1 reference-product data normalisation.
-- Populates complete draft data without claiming third-party verification.

begin;

do $$
declare
  lmt_product_id uuid;
  ess_product_id uuid;
  lmt_profile_id uuid;
  ess_profile_id uuid;
begin
  select id into lmt_product_id
  from public.products
  where dpp_id = 'DPP-LMT-BAT-48V15AH';

  select id into ess_product_id
  from public.products
  where dpp_id = 'DPP-GV-ESS-14K3-000001';

  if lmt_product_id is null or ess_product_id is null then
    raise exception 'The LMT and industrial ESS reference products must exist.';
  end if;

  select id into lmt_profile_id
  from public.battery_model_profile
  where product_id = lmt_product_id;

  select id into ess_profile_id
  from public.battery_model_profile
  where product_id = ess_product_id;

  if lmt_profile_id is null or ess_profile_id is null then
    raise exception 'Both battery model profiles must exist.';
  end if;

  update public.products
  set
    brand = 'GREANLEAN Mobility',
    description = 'A removable 48 V 15 Ah NMC lithium-ion battery pack for electric bicycles, with safety, durability, material and authorised collection information.',
    description_zh = '用于电动自行车的 48V 15Ah 可拆卸 NMC 锂离子电池包，披露安全、耐久性、材料和授权回收信息。',
    updated_at = now()
  where id = lmt_product_id;

  update public.products
  set
    brand = 'GreenVault Energy Systems',
    description = 'A 14.336 kWh stationary industrial LFP battery module for commercial and industrial energy-storage systems.',
    description_zh = '面向工商业储能系统的 14.336 kWh 固定式工业磷酸铁锂电池模块。',
    updated_at = now()
  where id = ess_product_id;

  update public.battery_model_profile
  set
    economic_operator_name = 'GREANLEAN Mobility',
    manufacturer_name = 'GREANLEAN Battery Systems',
    manufacturing_place = 'Shenzhen, Guangdong, China',
    source_type = 'REFERENCE_DATA_UNVERIFIED',
    verification_status = 'unverified',
    updated_at = now()
  where id = lmt_profile_id;

  update public.battery_model_profile
  set
    economic_operator_name = 'GreenVault Energy Systems GmbH',
    manufacturer_name = 'GreenVault Energy Systems GmbH',
    manufacturing_place = 'Hamburg, Germany',
    source_type = 'REFERENCE_DATA_UNVERIFIED',
    verification_status = 'unverified',
    updated_at = now()
  where id = ess_profile_id;

  update public.battery_field_value value_row
  set
    value_json = case definition.field_code
      when 'battery.dpp_schema_version'
        then to_jsonb('BatteryPass-Ready LMT schema 1.0'::text)
      when 'battery.battery_serial_number'
        then to_jsonb('GLBAT48V15AH0001'::text)
      when 'battery.unique_economic_operator_identifier'
        then to_jsonb('GL-EO-0001'::text)
      when 'battery.unique_manufacturer_identifier'
        then to_jsonb('GL-MFR-0001'::text)
      when 'battery.unique_facility_identifier'
        then to_jsonb('GL-FAC-SZX-0001'::text)
      when 'battery.economic_operator_information'
        then '{
          "name":"GREANLEAN Mobility",
          "registeredTradeNameOrRegisteredTrademark":"GREANLEAN",
          "postalAddress":"Shenzhen, Guangdong, China",
          "webAddress":"https://greanlean.com",
          "e-mailAddress":"dpp@greanlean.com"
        }'::jsonb
      when 'battery.manufacturer_information'
        then '{
          "name":"GREANLEAN Battery Systems",
          "registeredTradeNameOrRegisteredTrademark":"GREANLEAN",
          "postalAddress":"Shenzhen, Guangdong, China",
          "webAddress":"https://greanlean.com",
          "e-mailAddress":"dpp@greanlean.com"
        }'::jsonb
      when 'battery.manufacturing_place'
        then to_jsonb('Shenzhen, Guangdong, China'::text)
      when 'battery.extinguishing_agent'
        then '{
          "agentFireClass":"Lithium-ion battery fire response",
          "extinguishingAgent":"Apply water cooling from a safe distance and follow the manufacturer emergency response procedure."
        }'::jsonb
      when 'battery.meaning_of_labels_and_symbols'
        then to_jsonb('Separate collection, lithium-ion handling and carbon-footprint information; label evidence pending verification.'::text)
      when 'battery.carbon_footprint_performance_class'
        then to_jsonb('Performance class pending delegated-act methodology and independent verification.'::text)
      when 'battery.third_party_assurances_of_recognised_schemes'
        then to_jsonb('No third-party assurance has been recorded.'::text)
      when 'battery.supply_chain_indices'
        then to_jsonb('GL-SCI-LMT-48V15AH-001; supplier verification pending.'::text)
      when 'battery.battery_chemistry'
        then '{
          "chemicalCodeValue":"Li-ion NMC",
          "additionallyPossibleValue":"Graphite anode and LiPF6-based electrolyte; supplier verification pending."
        }'::jsonb
      when 'battery.critical_raw_materials'
        then to_jsonb('Lithium, cobalt, nickel, natural graphite and manganese; quantities pending supplier verification.'::text)
      when 'battery.materials_used_in_cathode_anode_and_electrolyte'
        then to_jsonb('Cathode: NMC; anode: graphite; electrolyte: LiPF6 in organic carbonate solvents; supplier verification pending.'::text)
      when 'battery.hazardous_substances'
        then to_jsonb('Cadmium, lead and mercury declarations require supplier and laboratory verification.'::text)
      when 'battery.impact_of_substances_on_environment_human_health_safety_persons'
        then to_jsonb('Lithium-ion electrolyte may be flammable and irritating; damaged cells may present a thermal-runaway risk. Follow the safety data sheet and emergency instructions.'::text)
      when 'battery.cycle_life_reference_test'
        then to_jsonb('IEC 61960-aligned manufacturer cycle-life specification; laboratory evidence pending.'::text)
      else value_row.value_json
    end,
    data_source = 'REFERENCE_DATA_UNVERIFIED',
    source_reference = 'Product master data; supporting evidence pending upload.',
    evidence_status = case
      when value_row.evidence_status = 'missing' then 'declared'
      else value_row.evidence_status
    end,
    verification_status = 'unverified',
    observed_at = coalesce(value_row.observed_at, now()),
    updated_at = now()
  from public.field_definition definition
  where value_row.field_definition_id = definition.id
    and value_row.battery_model_profile_id = lmt_profile_id
    and value_row.battery_batch_id is null
    and value_row.battery_item_id is null;

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
    ess_product_id,
    ess_profile_id,
    source_value.field_definition_id,
    case definition.field_code
      when 'battery.dpp_schema_version'
        then to_jsonb('BatteryPass-Ready stationary industrial battery schema 1.0'::text)
      when 'battery.dpp_status'
        then '{"dppStatusValue":"Active"}'::jsonb
      when 'battery.dpp_granularity'
        then to_jsonb('Item'::text)
      when 'battery.unique_battery_identifier_unique_product_identifier'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001'::text)
      when 'battery.battery_model_identifier'
        then to_jsonb('GV-ESS-14K3-2026'::text)
      when 'battery.battery_serial_number'
        then to_jsonb('GVESS14K3000001'::text)
      when 'battery.unique_economic_operator_identifier'
        then to_jsonb('GV-EO-DE-0001'::text)
      when 'battery.unique_manufacturer_identifier'
        then to_jsonb('GV-MFR-DE-0001'::text)
      when 'battery.unique_facility_identifier'
        then to_jsonb('GV-FAC-HAM-0001'::text)
      when 'battery.economic_operator_information'
        then '{
          "name":"GreenVault Energy Systems GmbH",
          "registeredTradeNameOrRegisteredTrademark":"GreenVault Energy Systems",
          "postalAddress":"Hamburg, Germany",
          "webAddress":"https://greanlean.com",
          "e-mailAddress":"dpp@greanlean.com"
        }'::jsonb
      when 'battery.manufacturer_information'
        then '{
          "name":"GreenVault Energy Systems GmbH",
          "registeredTradeNameOrRegisteredTrademark":"GreenVault Energy Systems",
          "postalAddress":"Hamburg, Germany",
          "webAddress":"https://greanlean.com",
          "e-mailAddress":"dpp@greanlean.com"
        }'::jsonb
      when 'battery.manufacturing_place'
        then to_jsonb('Hamburg, Germany'::text)
      when 'battery.manufacturing_date'
        then to_jsonb('2026-06-15'::text)
      when 'battery.date_of_putting_the_battery_into_service'
        then to_jsonb('2026-07-01'::text)
      when 'battery.warranty_period_of_the_battery'
        then to_jsonb('2031-06-30'::text)
      when 'battery.battery_category'
        then '{"batteryCategoryValue":"Industrial battery"}'::jsonb
      when 'battery.battery_mass'
        then '{"gramKg":"kg","gramKgValue":115}'::jsonb
      when 'battery.separate_collection_symbol'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#separate-collection'::text)
      when 'battery.symbols_for_cadmium_and_lead'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#substance-labels'::text)
      when 'battery.carbon_footprint_label'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#carbon-footprint'::text)
      when 'battery.extinguishing_agent'
        then '{
          "agentFireClass":"Stationary lithium-ion battery fire response",
          "extinguishingAgent":"Isolate the energy-storage enclosure, apply water cooling where safe and follow the site emergency response plan."
        }'::jsonb
      when 'battery.meaning_of_labels_and_symbols'
        then to_jsonb('Separate collection, industrial battery handling, high-voltage safety and carbon-footprint information; label evidence pending verification.'::text)
      when 'battery.eu_declaration_of_conformity'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#declaration-of-conformity'::text)
      when 'battery.results_of_test_reports_proving_compliance'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#compliance-evidence'::text)
      when 'battery.battery_carbon_footprint_per_functional_unit'
        then '{"kgCO2-equivalentPerKilowattHour":"kgCO2-eq/kWh","kgCO2-equivalentPerKilowattHourValue":72}'::jsonb
      when 'battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage'
        then '{"kgCO2-equivalentPerKilowattHour":"kgCO2-eq/kWh","kgCO2-equivalentPerKilowattHourValue":30}'::jsonb
      when 'battery.contribution_of_main_product_production_lifecycle_stage'
        then '{"kgCO2-equivalentPerKilowattHour":"kgCO2-eq/kWh","kgCO2-equivalentPerKilowattHourValue":27}'::jsonb
      when 'battery.contribution_of_distribution_lifecycle_stage'
        then '{"kgCO2-equivalentPerKilowattHour":"kgCO2-eq/kWh","kgCO2-equivalentPerKilowattHourValue":7}'::jsonb
      when 'battery.contribution_of_end_of_life_and_recycling_lifecycle_stage'
        then '{"kgCO2-equivalentPerKilowattHour":"kgCO2-eq/kWh","kgCO2-equivalentPerKilowattHourValue":8}'::jsonb
      when 'battery.carbon_footprint_performance_class'
        then to_jsonb('Performance class pending delegated-act methodology and independent verification.'::text)
      when 'battery.web_link_to_public_carbon_footprint_study'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#carbon-footprint-study'::text)
      when 'battery.absolute_battery_carbon_footprint'
        then '{"kgCO2-equivalent":"kgCO2-eq","kgCO2-equivalentValue":1032}'::jsonb
      when 'battery.information_of_due_diligence_report'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#due-diligence'::text)
      when 'battery.third_party_assurances_of_recognised_schemes'
        then to_jsonb('No third-party assurance has been recorded.'::text)
      when 'battery.supply_chain_indices'
        then to_jsonb('GV-SCI-ESS-14K3-001; supplier verification pending.'::text)
      when 'battery.battery_chemistry'
        then '{
          "chemicalCodeValue":"Li-ion LFP",
          "additionallyPossibleValue":"Lithium iron phosphate cathode, graphite anode and LiPF6-based electrolyte; supplier verification pending."
        }'::jsonb
      when 'battery.critical_raw_materials'
        then to_jsonb('Lithium, natural graphite, copper and aluminium; quantities pending supplier verification.'::text)
      when 'battery.materials_used_in_cathode_anode_and_electrolyte'
        then to_jsonb('Cathode: lithium iron phosphate; anode: graphite; electrolyte: LiPF6 in organic carbonate solvents; supplier verification pending.'::text)
      when 'battery.hazardous_substances'
        then to_jsonb('Electrolyte and substance declarations require supplier and laboratory verification.'::text)
      when 'battery.impact_of_substances_on_environment_human_health_safety_persons'
        then to_jsonb('Lithium-ion electrolyte may be flammable and irritating; damaged cells may present a thermal-runaway and high-voltage risk. Follow the safety data sheet and site emergency instructions.'::text)
      when 'battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#disassembly'::text)
      when 'battery.part_numbers_for_components'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#components'::text)
      when 'battery.information_on_sources_of_spare_parts'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#spare-parts'::text)
      when 'battery.safety_measures'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#safety'::text)
      when 'battery.pre_consumer_recycled_nickel_share'
        then '{"percent":"%","percentageValue":0}'::jsonb
      when 'battery.pre_consumer_recycled_cobalt_share'
        then '{"percent":"%","percentageValue":0}'::jsonb
      when 'battery.pre_consumer_recycled_lithium_share'
        then '{"percent":"%","percentageValue":1}'::jsonb
      when 'battery.post_consumer_recycled_nickel_share'
        then '{"percent":"%","percentageValue":0}'::jsonb
      when 'battery.post_consumer_recycled_cobalt_share'
        then '{"percent":"%","percentageValue":0}'::jsonb
      when 'battery.post_consumer_recycled_lithium_share'
        then '{"percent":"%","percentageValue":3}'::jsonb
      when 'battery.recycled_lead_share'
        then '{"percent":"%","percentageValue":0}'::jsonb
      when 'battery.renewable_content_share'
        then '{"percent":"%","percentageValue":18}'::jsonb
      when 'battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#waste-prevention'::text)
      when 'battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#separate-collection'::text)
      when 'battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life'
        then to_jsonb('https://greanlean.com/p/DPP-GV-ESS-14K3-000001#end-of-life'::text)
      when 'battery.rated_capacity'
        then '{"ampereHourMiliamperehour":"Ah","amperehourMiliamperehourValue":280}'::jsonb
      when 'battery.capacity_fade'
        then '{"percent":"%","percentageValue":2}'::jsonb
      when 'battery.minimum_voltage'
        then '{"volt":"V","voltValue":44.8}'::jsonb
      when 'battery.maximum_voltage'
        then '{"volt":"V","voltValue":58.4}'::jsonb
      when 'battery.nominal_voltage'
        then '{"volt":"V","voltValue":51.2}'::jsonb
      when 'battery.original_power_capability'
        then '{"watt":"W","wattValueAt80SoC":10000,"wattValueAt20SoC":8000}'::jsonb
      when 'battery.power_fade'
        then '{"percent":"%","percentageValue":3}'::jsonb
      when 'battery.maximum_permitted_battery_power'
        then '{"watt":"W","wattValue":10000}'::jsonb
      when 'battery.ratio_between_nominal_battery_power_and_battery_energy'
        then '{"wattPerWattHour":"W/Wh","wattPerWattHourValue":0.6975}'::jsonb
      when 'battery.initial_round_trip_energy_efficiency'
        then '{"percent":"%","percentageValue":95}'::jsonb
      when 'battery.round_trip_energy_efficiency_at_50_of_cycle_life'
        then '{"percent":"%","percentageValue":92}'::jsonb
      when 'battery.energy_round_trip_efficiency_fade'
        then '{"percent":"%","percentageValue":1}'::jsonb
      when 'battery.initial_self_discharge_rate'
        then '{"percentMonth":"%/month","percentMonthValue":1}'::jsonb
      when 'battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended'
        then '{"ohm":"Ohm","ohmValue":0.018}'::jsonb
      when 'battery.internal_resistance_increase_of_pack_cell_and_module_recommended'
        then '{"percent":"%","percentageValue":3}'::jsonb
      when 'battery.expected_lifetime_in_calendar_years'
        then '15'::jsonb
      when 'battery.expected_lifetime_number_of_charge_discharge_cycles'
        then '6000'::jsonb
      when 'battery.cycle_life_reference_test'
        then to_jsonb('Manufacturer cycle-life specification; laboratory verification pending.'::text)
      when 'battery.c_rate_of_relevant_cycle_life_test'
        then '{"amperePerAmpereHour":"A/Ah","amperePerAmpereHourValue":0.5}'::jsonb
      when 'battery.temperature_range_idle_state_lower_boundary'
        then '{"degreeCelsius":"°C","celsiusValue":-20}'::jsonb
      when 'battery.temperature_range_idle_state_upper_boundary'
        then '{"degreeCelsius":"°C","celsiusValue":45}'::jsonb
      else source_value.value_json
    end,
    source_value.unit_code,
    'REFERENCE_DATA_UNVERIFIED',
    'Product master data; supporting evidence pending upload.',
    'declared',
    'unverified',
    now()
  from public.battery_field_value source_value
  join public.field_definition definition
    on definition.id = source_value.field_definition_id
  where source_value.battery_model_profile_id = lmt_profile_id
    and source_value.battery_batch_id is null
    and source_value.battery_item_id is null
  on conflict (battery_model_profile_id, field_definition_id)
    where battery_batch_id is null and battery_item_id is null
  do update set
    value_json = excluded.value_json,
    unit_code = excluded.unit_code,
    data_source = excluded.data_source,
    source_reference = excluded.source_reference,
    evidence_status = excluded.evidence_status,
    verification_status = excluded.verification_status,
    observed_at = excluded.observed_at,
    updated_at = now();

  update public.product_data_governance
  set
    audit_status = 'Manufacturer data review in progress'
      || E'\nThird-party verification evidence pending'
      || E'\nLast updated: 2026-07-26',
    verification_level = 'manufacturer_declared',
    last_verified_at = null,
    verified_by = null
  where product_id = (
    select id from public.products where dpp_id = 'DPP-CE-EARBUDS-001'
  );
end
$$;

commit;

