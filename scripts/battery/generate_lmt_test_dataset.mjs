import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "../..");
const schema = JSON.parse(await readFile(path.join(rootDirectory, "config/battery/schemas/LMT.json"), "utf8"));
const catalog = JSON.parse(await readFile(path.join(rootDirectory, "config/battery/battery-pass-ready-longlist-v1.3.json"), "utf8"));

const evidenceBase = "https://greanlean.com/test-evidence/lmt-48v15ah";
const percent = (percentageValue) => ({ percent: "%", percentageValue });
const percentMonth = (percentMonthValue) => ({ percentMonth: "%/month", percentMonthValue });
const carbon = (value) => ({
  "kgCO2-equivalentPerKilowattHourValue": value,
  "kgCO2-equivalentPerKilowattHour": "kgCO2-eq/kWh",
});
const voltage = (voltValue) => ({ voltValue, volt: "V" });

export const staticValues = {
  "battery.dpp_schema_version": "BatteryPass-Ready LMT schema 1.0 (test dataset)",
  "battery.dpp_status": { dppStatusValue: "Active" },
  "battery.dpp_granularity": "Item",
  "battery.unique_battery_identifier_unique_product_identifier": "https://greanlean.com/p/DPP-LMT-BAT-48V15AH",
  "battery.battery_model_identifier": "GL-LMT-48V15AH-NMC",
  "battery.battery_serial_number": "LMT-48V15AH-TEST-001",
  "battery.unique_economic_operator_identifier": "GL-EO-TEST-0001",
  "battery.unique_manufacturer_identifier": "GL-MFR-TEST-0001",
  "battery.unique_facility_identifier": "GL-FAC-TEST-SZX-0001",
  "battery.economic_operator_information": {
    name: "Greanlean DPP Test Operator",
    registeredTradeNameOrRegisteredTrademark: "GREANLEAN TEST DATA",
    postalAddress: "Test dataset, Shenzhen, Guangdong, China",
    webAddress: "https://greanlean.com",
    "e-mailAddress": "dpp-test@greanlean.com",
  },
  "battery.manufacturer_information": {
    name: "Greanlean Demonstration Battery Manufacturing",
    registeredTradeNameOrRegisteredTrademark: "GREANLEAN TEST DATA",
    postalAddress: "Test manufacturing site, Shenzhen, Guangdong, China",
    webAddress: "https://greanlean.com",
    "e-mailAddress": "dpp-test@greanlean.com",
  },
  "battery.manufacturing_place": "Test manufacturing site, Shenzhen, Guangdong, China",
  "battery.manufacturing_date": "2026-06-30",
  "battery.date_of_putting_the_battery_into_service": "2026-07-01",
  "battery.warranty_period_of_the_battery": "2028-06-30",
  "battery.battery_category": { batteryCategoryValue: "LMT battery" },
  "battery.battery_mass": { gramKg: "kg", gramKgValue: 4.2 },
  "battery.separate_collection_symbol": `${evidenceBase}/separate-collection-symbol`,
  "battery.symbols_for_cadmium_and_lead": `${evidenceBase}/cd-pb-symbol-declaration`,
  "battery.carbon_footprint_label": `${evidenceBase}/carbon-footprint-label`,
  "battery.extinguishing_agent": {
    agentFireClass: "Lithium-ion battery fire response",
    extinguishingAgent: "Water cooling and the manufacturer's emergency procedure; synthetic test guidance only.",
  },
  "battery.meaning_of_labels_and_symbols": "Synthetic test label set: separate collection, lithium-ion handling and carbon-footprint information. Not verified product labelling.",
  "battery.eu_declaration_of_conformity": `${evidenceBase}/eu-declaration-of-conformity`,
  "battery.results_of_test_reports_proving_compliance": `${evidenceBase}/test-reports`,
  "battery.battery_carbon_footprint_per_functional_unit": carbon(65),
  "battery.contribution_of_raw_material_acquisition_and_pre_processing_lifecycle_stage": carbon(28),
  "battery.contribution_of_main_product_production_lifecycle_stage": carbon(24),
  "battery.contribution_of_distribution_lifecycle_stage": carbon(5),
  "battery.contribution_of_end_of_life_and_recycling_lifecycle_stage": carbon(8),
  "battery.carbon_footprint_performance_class": "Test class pending delegated-act methodology and third-party verification",
  "battery.web_link_to_public_carbon_footprint_study": `${evidenceBase}/carbon-footprint-study`,
  "battery.absolute_battery_carbon_footprint": {
    "kgCO2-equivalentValue": 47,
    "kgCO2-equivalent": "kgCO2-eq",
  },
  "battery.information_of_due_diligence_report": `${evidenceBase}/supply-chain-due-diligence`,
  "battery.third_party_assurances_of_recognised_schemes": "Synthetic test declaration; no third-party assurance is claimed.",
  "battery.supply_chain_indices": "Synthetic test supply-chain index GL-SCI-TEST-001; requires supplier verification.",
  "battery.battery_chemistry": {
    chemicalCodeValue: "Li-ion NMC",
    additionallyPossibleValue: "Graphite anode and LiPF6-based electrolyte; synthetic test composition.",
  },
  "battery.critical_raw_materials": "Synthetic test declaration: lithium, cobalt, nickel, natural graphite and manganese; quantities require supplier verification.",
  "battery.materials_used_in_cathode_anode_and_electrolyte": "Cathode: NMC; anode: graphite; electrolyte: LiPF6 in organic carbonate solvents. Synthetic test composition, not laboratory verified.",
  "battery.hazardous_substances": "Synthetic declaration: no intentionally added cadmium, lead or mercury above applicable thresholds; supplier and laboratory verification required.",
  "battery.impact_of_substances_on_environment_human_health_safety_persons": "Lithium-ion electrolyte may be flammable and irritating; damaged cells may present thermal-runaway risk. Follow the synthetic test safety instructions and obtain verified SDS data.",
  "battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack": `${evidenceBase}/removal-and-disassembly`,
  "battery.part_numbers_for_components": `${evidenceBase}/component-part-numbers`,
  "battery.information_on_sources_of_spare_parts": `${evidenceBase}/spare-parts`,
  "battery.safety_measures": `${evidenceBase}/safety-measures`,
  "battery.pre_consumer_recycled_nickel_share": percent(3),
  "battery.pre_consumer_recycled_cobalt_share": percent(2),
  "battery.pre_consumer_recycled_lithium_share": percent(1),
  "battery.post_consumer_recycled_nickel_share": percent(7),
  "battery.post_consumer_recycled_cobalt_share": percent(5),
  "battery.post_consumer_recycled_lithium_share": percent(3),
  "battery.recycled_lead_share": percent(0),
  "battery.renewable_content_share": percent(15),
  "battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention": `${evidenceBase}/waste-prevention`,
  "battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries": `${evidenceBase}/separate-collection`,
  "battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life": `${evidenceBase}/collection-second-life-end-of-life`,
  "battery.rated_capacity": {
    amperehourMiliamperehourValue: 15,
    ampereHourMiliamperehour: "Ah",
  },
  "battery.capacity_fade": percent(2.7),
  "battery.minimum_voltage": voltage(39),
  "battery.maximum_voltage": voltage(54.6),
  "battery.nominal_voltage": voltage(48),
  "battery.original_power_capability": {
    wattValueAt80SoC: 750,
    wattValueAt20SoC: 600,
    watt: "W",
  },
  "battery.power_fade": percent(4),
  "battery.maximum_permitted_battery_power": { wattValue: 750, watt: "W" },
  "battery.ratio_between_nominal_battery_power_and_battery_energy": {
    wattPerWattHourValue: 1,
    wattPerWattHour: "W/Wh",
  },
  "battery.initial_round_trip_energy_efficiency": percent(94),
  "battery.round_trip_energy_efficiency_at_50_of_cycle_life": percent(91),
  "battery.energy_round_trip_efficiency_fade": percent(1.2),
  "battery.initial_self_discharge_rate": percentMonth(1.3),
  "battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended": {
    ohmValue: 1,
    ohm: "Ohm",
  },
  "battery.internal_resistance_increase_of_pack_cell_and_module_recommended": percent(3),
  "battery.expected_lifetime_in_calendar_years": 5,
  "battery.expected_lifetime_number_of_charge_discharge_cycles": 800,
  "battery.cycle_life_reference_test": "Synthetic IEC 61960-aligned cycle-life profile; not a laboratory certificate.",
  "battery.c_rate_of_relevant_cycle_life_test": {
    amperePerAmpereHourValue: 1,
    amperePerAmpereHour: "A/Ah",
  },
  "battery.temperature_range_idle_state_lower_boundary": {
    degreeCelsius: "°C",
    celsiusValue: -20,
  },
  "battery.temperature_range_idle_state_upper_boundary": {
    degreeCelsius: "°C",
    celsiusValue: 45,
  },
};

export const dynamicValues = {
  "battery.date_time_of_latest_update_of_dpp": "2026-07-23T14:00:00Z",
  "battery.unique_battery_passport_identifier_unique_dpp_identifier": "https://greanlean.com/p/DPP-LMT-BAT-48V15AH",
  "battery.battery_status": { batteryStatusValues: "original" },
  "battery.remaining_capacity": {
    amperehourMiliamperehourValue: 15,
    ampereHourMiliamperehour: "Ah",
  },
  "battery.state_of_charge_soc": percent(76),
  "battery.remaining_power_capability": {
    wattValueAt80SoC: 720,
    wattValueAt20SoC: 580,
    watt: "W",
  },
  "battery.remaining_round_trip_energy_efficiency": percent(92.8),
  "battery.current_self_discharge_rate": percentMonth(1.6),
  "battery.evolution_of_self_discharge_rates": percent(0.3),
  "battery.number_of_full_charging_and_discharging_cycles": 42,
  "battery.energy_throughput": { kilowattHourValue: 30.2, kilowattHour: "kWh" },
  "battery.capacity_throughput": {
    amperehourMiliamperehourValue: 630,
    amperehourMiliamperehour: "Ah",
  },
  "battery.temperature_information": { degreeCelsius: "°C", celsiusValue: 24 },
  "battery.time_spent_in_extreme_temperatures_above_boundary": 0,
  "battery.time_spent_in_extreme_temperatures_below_boundary": 0,
  "battery.time_spent_charging_during_extreme_temperatures_above_boundary": 0,
  "battery.time_spent_charging_during_extreme_temperatures_below_boundary": 0,
  "battery.number_of_deep_discharge_events": 0,
  "battery.number_of_overcharge_events": 0,
  "battery.information_on_accidents": `${evidenceBase}/accident-declaration-none-recorded`,
};

function setJsonPointer(target, pointer, value) {
  const segments = pointer.split("/").slice(1).map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  let node = target;
  for (const segment of segments.slice(0, -1)) node = node[segment] ||= {};
  node[segments.at(-1)] = value;
}

const lmtFields = catalog.fields.filter((field) => field.categoryRequirementStatus["battery.lmt"] !== "NOT_APPLICABLE");
const allValues = { ...staticValues, ...dynamicValues };
const missing = lmtFields.filter((field) => allValues[field.fieldCode] === undefined);
if (missing.length) throw new Error(`Missing LMT values: ${missing.map((field) => field.fieldCode).join(", ")}`);
if (Object.keys(staticValues).length !== 76 || Object.keys(dynamicValues).length !== 20) {
  throw new Error(`Expected 76 static and 20 dynamic values, got ${Object.keys(staticValues).length} and ${Object.keys(dynamicValues).length}.`);
}

const payload = {};
for (const field of lmtFields) setJsonPointer(payload, field.jsonPointers["battery.lmt"], allValues[field.fieldCode]);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(payload)) throw new Error(`Generated LMT JSON is invalid:\n${JSON.stringify(validate.errors, null, 2)}`);

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const staticRows = Object.entries(staticValues).map(([fieldCode, value]) => {
  const field = lmtFields.find((candidate) => candidate.fieldCode === fieldCode);
  return `  (${sqlLiteral(fieldCode)}, ${sqlLiteral(JSON.stringify(value))}::jsonb, ${field.unit ? sqlLiteral(field.unit.trim().replaceAll(/\s+/g, " ")) : "null"})`;
}).join(",\n");

const metricRows = [
  ["REMAINING_CAPACITY", 15, "Ah"],
  ["SOC", 76, "%"],
  ["REMAINING_POWER_CAPABILITY", 720, "W"],
  ["REMAINING_ROUND_TRIP_EFFICIENCY", 92.8, "%"],
  ["CURRENT_SELF_DISCHARGE_RATE", 1.6, "%/month"],
  ["SELF_DISCHARGE_EVOLUTION", 0.3, "%"],
  ["FULL_CYCLE_COUNT", 42, "cycle"],
  ["ENERGY_THROUGHPUT", 30.2, "kWh"],
  ["CAPACITY_THROUGHPUT", 630, "Ah"],
  ["TEMPERATURE", 24, "°C"],
  ["HIGH_TEMPERATURE_DURATION", 0, "Minutes"],
  ["LOW_TEMPERATURE_DURATION", 0, "Minutes"],
  ["HIGH_TEMPERATURE_CHARGING_DURATION", 0, "Minutes"],
  ["LOW_TEMPERATURE_CHARGING_DURATION", 0, "Minutes"],
  ["DEEP_DISCHARGE_EVENT_COUNT", 0, "count"],
  ["OVERCHARGE_EVENT_COUNT", 0, "count"],
].map(([code, value, unit]) => `  (${sqlLiteral(code)}, ${value}, ${sqlLiteral(unit)})`).join(",\n");

const sql = `-- BatteryPass LMT validation dataset for DPP-LMT-BAT-48V15AH.
-- TEST DATA ONLY: all generated declarations and measurements remain unverified.
-- This seed must not be used as evidence of regulatory compliance or product certification.

begin;

update public.products
set
  name = '48V 15Ah Removable E-bike Lithium-ion Battery Pack',
  name_zh = '48V 15Ah 可拆卸电动自行车锂离子电池包',
  sku = 'GL-LMT-BAT-48V15AH',
  brand = 'GREANLEAN TEST DATA',
  category = 'Light means of transport battery',
  subcategory = 'Removable e-bike lithium-ion battery pack',
  sector_code = 'battery',
  category_code = 'lmt_battery',
  subcategory_code = 'battery_unit',
  dpp_profile_key = 'battery.lmt.unit.v1',
  description = 'Synthetic BatteryPass LMT validation dataset for a removable 48 V 15 Ah lithium-ion e-bike battery pack. Values are unverified and must be replaced with manufacturer, supplier and laboratory evidence before commercial use.',
  description_zh = '用于 BatteryPass LMT 结构验证的 48V 15Ah 可拆卸电动自行车锂离子电池包测试数据。所有推定值均未验证，商业使用前必须替换为制造商、供应商和实验室证据。',
  current_version = 'v1.1',
  granularity_level = 'item',
  commodity_code = '850760',
  unique_product_identifier = 'https://greanlean.com/p/DPP-LMT-BAT-48V15AH',
  main_image = '/images/lmt-ebike-battery-48v15ah.png',
  updated_at = now()
where id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697'
   or dpp_id = 'DPP-LMT-BAT-48V15AH';

update public.battery_model_profile bmp
set
  legal_category_code = 'lmt',
  passport_applicability = 'REQUIRED',
  applicability_reason = '轻型交通工具电池属于欧盟电池护照法定适用范围。',
  battery_model_identifier = 'GL-LMT-48V15AH-NMC',
  rated_capacity_value = 15,
  rated_capacity_unit = 'Ah',
  rated_energy_kwh = 0.72,
  battery_mass_kg = 4.2,
  battery_chemistry_code = 'Li-ion NMC',
  bms_present = true,
  stationary = false,
  economic_operator_name = 'Greanlean DPP Test Operator',
  manufacturer_name = 'Greanlean Demonstration Battery Manufacturing',
  manufacturing_place = 'Test manufacturing site, Shenzhen, Guangdong, China',
  warranty_description = 'Synthetic test warranty end date: 2028-06-30; not a commercial warranty commitment.',
  source_type = 'synthetic_test',
  verification_status = 'unverified',
  updated_at = now()
from public.products p
where bmp.product_id = p.id
  and (p.id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697' or p.dpp_id = 'DPP-LMT-BAT-48V15AH')
  and bmp.verification_status <> 'verified';

update public.battery_item bi
set
  unique_product_identifier = 'https://greanlean.com/p/DPP-LMT-BAT-48V15AH',
  battery_status_code = 'original',
  manufacturing_date = '2026-06-30',
  commissioned_at = '2026-07-01T00:00:00Z',
  visibility_level = 'PUBLIC',
  verification_status = 'unverified',
  updated_at = now()
from public.products p
where bi.product_id = p.id
  and bi.serial_identifier = 'LMT-48V15AH-TEST-001'
  and (p.id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697' or p.dpp_id = 'DPP-LMT-BAT-48V15AH')
  and bi.verification_status <> 'verified';

with _lmt_test_values (field_code, value_json, unit_code) as (
  values
${staticRows}
)
insert into public.battery_field_value (
  product_id, battery_model_profile_id, field_definition_id, value_json, unit_code,
  data_source, source_reference, evidence_status, verification_status, observed_at
)
select
  p.id, bmp.id, fd.id, v.value_json, v.unit_code,
  'synthetic_test', 'lmt-48v15ah-batterypass-test-v1', 'declared', 'unverified', '2026-07-23T14:00:00Z'
from _lmt_test_values v
join public.schema_definition sd on sd.code = 'battery.longlist'
join public.schema_version sv on sv.schema_definition_id = sd.id and sv.status = 'published'
join public.field_definition fd on fd.schema_version_id = sv.id and fd.field_code = v.field_code
join public.products p on p.id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697' or p.dpp_id = 'DPP-LMT-BAT-48V15AH'
join public.battery_model_profile bmp on bmp.product_id = p.id
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
  updated_at = now()
where public.battery_field_value.verification_status <> 'verified';

with _lmt_test_metrics (metric_type, metric_value, unit) as (
  values
${metricRows}
)
insert into public.battery_operating_metric (
  product_id, battery_item_id, metric_type, metric_value, unit, measured_at,
  data_source, source_device, verification_status, access_level_code, ingestion_key
)
select
  p.id, bi.id, m.metric_type, m.metric_value, m.unit, '2026-07-23T14:00:00Z',
  'synthetic_test', 'BatteryPass LMT test fixture', 'unverified', 'LEGITIMATE_INTEREST',
  'lmt-test-v1:' || lower(m.metric_type)
from _lmt_test_metrics m
join public.products p on p.id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697' or p.dpp_id = 'DPP-LMT-BAT-48V15AH'
join public.battery_item bi on bi.product_id = p.id and bi.serial_identifier = 'LMT-48V15AH-TEST-001'
on conflict (ingestion_key) do nothing;

insert into public.battery_lifecycle_event (
  product_id, battery_item_id, event_type, event_time, event_data,
  data_source, verification_status, access_level_code
)
select
  p.id, bi.id, 'accident_declaration', '2026-07-23T14:00:00Z',
  '{"uri":"https://greanlean.com/test-evidence/lmt-48v15ah/accident-declaration-none-recorded","status":"none_recorded","testData":true}'::jsonb,
  'synthetic_test', 'unverified', 'LEGITIMATE_INTEREST'
from public.products p
join public.battery_item bi on bi.product_id = p.id and bi.serial_identifier = 'LMT-48V15AH-TEST-001'
where (p.id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697' or p.dpp_id = 'DPP-LMT-BAT-48V15AH')
  and not exists (
    select 1
    from public.battery_lifecycle_event existing
    where existing.battery_item_id = bi.id
      and existing.event_type = 'accident_declaration'
      and existing.data_source = 'synthetic_test'
  );

insert into public.battery_performance_spec (
  product_id, battery_model_profile_id, rated_capacity_value, rated_capacity_unit,
  certified_usable_energy_kwh, minimum_voltage_v, maximum_voltage_v, nominal_voltage_v,
  original_power_w, maximum_permitted_power_w, initial_round_trip_efficiency,
  initial_internal_resistance_ohm, expected_lifetime_years, expected_cycle_count,
  idle_temperature_min_c, idle_temperature_max_c, test_reference, verification_status
)
select
  p.id, bmp.id, 15, 'Ah', 0.72, 39, 54.6, 48, 750, 750, 94, 1, 5, 800,
  -20, 45, 'Synthetic BatteryPass LMT test profile; not a laboratory certificate.', 'unverified'
from public.products p
join public.battery_model_profile bmp on bmp.product_id = p.id
where p.id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697' or p.dpp_id = 'DPP-LMT-BAT-48V15AH'
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
  verification_status = 'unverified',
  updated_at = now()
where public.battery_performance_spec.verification_status <> 'verified';

insert into public.battery_sustainability_data (
  product_id, battery_model_profile_id, reporting_year, carbon_footprint_per_kwh,
  absolute_carbon_footprint, lifecycle_stage_contributions, carbon_footprint_class,
  recycled_content, due_diligence_summary, methodology, verifier, verification_status
)
select
  p.id, bmp.id, 2026, 65, 47,
  '{"raw_materials":28,"production":24,"distribution":5,"end_of_life":8}'::jsonb,
  'Test class pending delegated-act methodology',
  '{"pre_consumer_nickel":3,"pre_consumer_cobalt":2,"pre_consumer_lithium":1,"post_consumer_nickel":7,"post_consumer_cobalt":5,"post_consumer_lithium":3,"renewable_content":15}'::jsonb,
  'Synthetic test declaration; supplier due-diligence evidence is required.',
  'Synthetic BatteryPass validation values; not a regulatory carbon-footprint study.',
  'Unverified test dataset',
  'unverified'
from public.products p
join public.battery_model_profile bmp on bmp.product_id = p.id
where (p.id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697' or p.dpp_id = 'DPP-LMT-BAT-48V15AH')
  and not exists (
    select 1 from public.battery_sustainability_data existing
    where existing.battery_model_profile_id = bmp.id and existing.reporting_year = 2026
  );

insert into public.battery_disassembly_information (
  product_id, battery_model_profile_id, removal_instructions, disassembly_instructions,
  repair_instructions, safety_measures, spare_parts_information, end_of_life_information,
  verification_status
)
select
  p.id, bmp.id,
  'Switch off the e-bike, unlock the pack and remove it using the handle. Synthetic test instruction.',
  'Qualified personnel only; isolate terminals before opening the enclosure. Synthetic test instruction.',
  'Replace only approved external service parts. Cell-level repair requires an authorised battery service provider.',
  'Do not crush, puncture, short-circuit or expose to fire. Quarantine damaged or swollen packs.',
  'Synthetic spare-parts reference: GL-LMT-48V15AH service catalogue.',
  'Return to an authorised waste-battery collection point; do not dispose of in household waste.',
  'unverified'
from public.products p
join public.battery_model_profile bmp on bmp.product_id = p.id
where p.id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697' or p.dpp_id = 'DPP-LMT-BAT-48V15AH'
on conflict (battery_model_profile_id) do update set
  removal_instructions = excluded.removal_instructions,
  disassembly_instructions = excluded.disassembly_instructions,
  repair_instructions = excluded.repair_instructions,
  safety_measures = excluded.safety_measures,
  spare_parts_information = excluded.spare_parts_information,
  end_of_life_information = excluded.end_of_life_information,
  verification_status = 'unverified',
  updated_at = now()
where public.battery_disassembly_information.verification_status <> 'verified';

commit;

select
  p.dpp_id,
  bmp.battery_model_identifier,
  count(distinct bfv.id) filter (where bfv.data_source = 'synthetic_test') as static_test_fields,
  count(distinct bom.id) filter (where bom.data_source = 'synthetic_test') as dynamic_test_metrics,
  count(distinct ble.id) filter (where ble.data_source = 'synthetic_test') as lifecycle_test_events
from public.products p
join public.battery_model_profile bmp on bmp.product_id = p.id
left join public.battery_field_value bfv on bfv.battery_model_profile_id = bmp.id
left join public.battery_item bi on bi.battery_model_profile_id = bmp.id
left join public.battery_operating_metric bom on bom.battery_item_id = bi.id
left join public.battery_lifecycle_event ble on ble.battery_item_id = bi.id
where p.id = 'a0de52dc-8655-4339-b7b6-c9a6940f9697' or p.dpp_id = 'DPP-LMT-BAT-48V15AH'
group by p.dpp_id, bmp.battery_model_identifier;
`;

const demoDirectory = path.join(rootDirectory, "config/battery/demo");
const seedDirectory = path.join(rootDirectory, "supabase/seeds");
await mkdir(demoDirectory, { recursive: true });
await mkdir(seedDirectory, { recursive: true });
await writeFile(path.join(demoDirectory, "lmt-48v15ah-batterypass-test.json"), `${JSON.stringify(payload, null, 2)}\n`);
await writeFile(path.join(seedDirectory, "lmt_48v15ah_batterypass_test.sql"), sql);

console.log(`Generated and validated ${lmtFields.length} LMT fields.`);
console.log("JSON: config/battery/demo/lmt-48v15ah-batterypass-test.json");
console.log("SQL: supabase/seeds/lmt_48v15ah_batterypass_test.sql");
