begin;
-- Generated from config/battery/eu-battery-passport-datapoints-v2.0.json.
-- Source: Digital Batteries Passport - data points by category, v2.0, 15 August 2026.

do $$
begin
  if to_regclass('public.battery_field_value') is null
    or to_regclass('public.schema_definition') is null
    or to_regclass('public.field_definition') is null
    or to_regclass('public.dpp_field_evidence_link') is null
  then
    raise exception '0026 requires schema, battery-domain and evidence migrations';
  end if;
end;
$$;

create table if not exists public.battery_regulatory_catalog (
  version text primary key,
  source_name text not null,
  source_version text not null,
  source_date date not null,
  regulation text not null,
  checksum_sha256 text not null,
  disclaimer_en text not null,
  disclaimer_zh text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint battery_regulatory_catalog_checksum_check check (checksum_sha256 ~ '^[a-f0-9]{64}$')
);

create table if not exists public.battery_regulatory_data_point (
  id uuid primary key default gen_random_uuid(),
  catalog_version text not null references public.battery_regulatory_catalog(version) on delete restrict,
  data_point_number integer not null check (data_point_number between 1 and 71),
  data_point_code text not null,
  name_en text not null,
  name_zh text not null,
  legal_source text not null,
  chapter_code text not null,
  source_note text not null,
  data_level text not null check (data_level in ('model','batch','individual','lifecycle')),
  data_type text not null check (data_type in ('string','integer','decimal','boolean','date','datetime','uri','object','array')),
  unit_code text,
  access_class text not null check (access_class in ('public','professional','regulator')),
  is_dynamic boolean not null,
  canonical_field_code text not null,
  legacy_field_codes jsonb not null default '[]'::jsonb check (jsonb_typeof(legacy_field_codes) = 'array'),
  mapping_quality text not null check (mapping_quality in ('A','B','C','D','E')),
  field_origin text not null,
  evidence_required boolean not null default false,
  default_expert_review_status text not null check (default_expert_review_status in ('not_required','pending','confirmed','questioned')),
  default_expert_review_note text,
  sort_order integer not null,
  unique (catalog_version, data_point_number),
  unique (catalog_version, data_point_code)
);

create table if not exists public.battery_regulatory_applicability (
  id uuid primary key default gen_random_uuid(),
  catalog_version text not null,
  data_point_number integer not null,
  battery_category text not null check (battery_category in ('ev','lmt','industrial')),
  requirement_status text not null check (requirement_status in ('mandatory','conditional','optional','future','duplicate','not_applicable')),
  source_note text not null,
  unique (catalog_version, data_point_number, battery_category),
  foreign key (catalog_version, data_point_number)
    references public.battery_regulatory_data_point(catalog_version, data_point_number) on delete restrict
);

alter table public.battery_field_value
  add column if not exists data_status text not null default 'declared',
  add column if not exists expert_review_status text not null default 'pending',
  add column if not exists expert_review_note text,
  add column if not exists field_origin text not null default 'batterypass_ready_v1_3';

alter table public.battery_field_value
  drop constraint if exists battery_field_data_status_check,
  add constraint battery_field_data_status_check check (data_status in ('missing','pending','declared','verified','not_applicable')),
  drop constraint if exists battery_field_expert_review_check,
  add constraint battery_field_expert_review_check check (expert_review_status in ('not_required','pending','confirmed','questioned')),
  drop constraint if exists battery_field_origin_check,
  add constraint battery_field_origin_check check (field_origin in ('eu_guidance_v2','batterypass_ready_v1_3','greanlean_extension','legacy'));

insert into public.battery_regulatory_catalog (
  version, source_name, source_version, source_date, regulation, checksum_sha256,
  disclaimer_en, disclaimer_zh, is_active
) values (
  '2.0.0', 'Digital Batteries Passport - data points by category', '2.0',
  '2026-08-15'::date, 'Regulation (EU) 2023/1542', '2aee2ed442eee2b6dd21676d269870572b578ccb165e940b7ec29b842fb18c52',
  'This guidance supports implementation but is not the European Commission''s official position and does not add to legal obligations.', '本指南用于支持实施准备，但不代表欧盟委员会正式立场，也不增加法规规定的权利义务。', true
)
on conflict (version) do update set
  checksum_sha256 = excluded.checksum_sha256,
  disclaimer_en = excluded.disclaimer_en,
  disclaimer_zh = excluded.disclaimer_zh,
  is_active = true;

update public.battery_regulatory_catalog set is_active = false where version <> '2.0.0';

insert into public.battery_regulatory_data_point (
  catalog_version, data_point_number, data_point_code, name_en, name_zh, legal_source,
  chapter_code, source_note, data_level, data_type, unit_code, access_class, is_dynamic,
  canonical_field_code, legacy_field_codes, mapping_quality, field_origin, evidence_required,
  default_expert_review_status, default_expert_review_note, sort_order
) values
  ('2.0.0', 1, 'DP-01', 'Unique identifier', '唯一标识符', 'BR Article 77(3)', 'identity', 'Mandatory for EV, LMT and industrial batteries.', 'individual', 'uri', null, 'public', false, 'battery.unique_battery_identifier_unique_product_identifier', '["battery.unique_battery_passport_identifier_unique_dpp_identifier"]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm identifier scheme and item-level issuance policy.', 10),
  ('2.0.0', 2, 'DP-02', 'Identity of who is registering and/or is responsible for the battery passport', '电池护照登记方及责任主体身份', 'BR Article 77(3)', 'identity', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'object', null, 'regulator', false, 'battery.economic_operator_information', '["battery.unique_economic_operator_identifier"]'::jsonb, 'B', 'eu_guidance_v2', true, 'pending', 'Confirm the responsible economic operator and identifier.', 20),
  ('2.0.0', 3, 'DP-03', 'Manufacturer name, registered trade name or registered trademark', '制造商名称、注册商号或注册商标', 'BR Annex VI A(1)', 'manufacturing', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'string', null, 'public', false, 'battery.manufacturer_information', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'not_required', null, 30),
  ('2.0.0', 4, 'DP-04', 'Manufacturer postal address, indicating a single contact point', '制造商邮政地址及单一联系点', 'BR Annex VI A(1)', 'manufacturing', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'string', null, 'public', false, 'battery.manufacturer_postal_address', '["battery.manufacturer_information"]'::jsonb, 'B', 'eu_guidance_v2', false, 'pending', 'Confirm a single contact point is included.', 40),
  ('2.0.0', 5, 'DP-05', 'Manufacturer web and email address, if available', '制造商网站和电子邮箱（如有）', 'BR Annex VI A(1)', 'manufacturing', 'Optional; fill when the data is available.', 'model', 'object', null, 'public', false, 'battery.manufacturer_web_email', '["battery.manufacturer_information"]'::jsonb, 'B', 'eu_guidance_v2', false, 'not_required', null, 50),
  ('2.0.0', 6, 'DP-06', 'Battery category', '电池类别', 'BR Annex VI A(2)', 'identity', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'string', null, 'public', false, 'battery.battery_category', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm the category against Article 3 definitions.', 60),
  ('2.0.0', 7, 'DP-07', 'Model identification and batch or serial number, product number or another identifying element', '型号标识及批次号、序列号、产品编号或其他识别要素', 'BR Annex VI A(2)', 'identity', 'Mandatory; the applicable identifying element depends on passport granularity.', 'individual', 'object', null, 'public', false, 'battery.battery_model_identifier', '["battery.battery_serial_number"]'::jsonb, 'B', 'eu_guidance_v2', false, 'pending', 'Review model, batch and serial inheritance at publication.', 70),
  ('2.0.0', 8, 'DP-08', 'Place of manufacture', '制造地点', 'BR Annex VI A(3)', 'manufacturing', 'Geographical location of the battery manufacturing plant.', 'batch', 'string', null, 'public', false, 'battery.manufacturing_place', '["battery.unique_facility_identifier"]'::jsonb, 'A', 'eu_guidance_v2', false, 'not_required', null, 80),
  ('2.0.0', 9, 'DP-09', 'Date of manufacturing (month and year)', '制造日期（年和月）', 'BR Annex VI A(4)', 'manufacturing', 'Mandatory for EV, LMT and industrial batteries.', 'batch', 'date', null, 'public', false, 'battery.manufacturing_date', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'not_required', null, 90),
  ('2.0.0', 10, 'DP-10', 'Weight', '电池重量', 'BR Annex VI A(5)', 'identity', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'decimal', 'kg', 'public', false, 'battery.battery_mass', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'not_required', null, 100),
  ('2.0.0', 11, 'DP-11', 'Capacity', '额定容量', 'BR Annex VI A(6)', 'performance', 'Mandatory static capacity declaration.', 'model', 'decimal', 'Ah', 'public', false, 'battery.rated_capacity', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm rated capacity and test basis.', 110),
  ('2.0.0', 12, 'DP-12', 'Chemistry', '电池化学体系', 'BR Annex VI A(7)', 'materials', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'string', null, 'public', false, 'battery.battery_chemistry', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Use an approved chemistry code where available.', 120),
  ('2.0.0', 13, 'DP-13', 'Hazardous substances other than mercury, cadmium or lead', '除汞、镉或铅以外的危险物质', 'BR Annex VI A(8)', 'materials', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'array', null, 'public', false, 'battery.hazardous_substances', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm substance identifiers and concentration basis.', 130),
  ('2.0.0', 14, 'DP-14', 'Usable extinguishing agent', '可用灭火剂', 'BR Annex VI A(9)', 'safety', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'string', null, 'public', false, 'battery.extinguishing_agent', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm against product safety documentation.', 140),
  ('2.0.0', 15, 'DP-15', 'Critical raw materials above 0.1% by weight', '质量占比超过 0.1% 的关键原材料', 'BR Annex VI A(10)', 'materials', 'Mandatory where concentration exceeds 0.1% weight by weight.', 'model', 'array', '% w/w', 'public', false, 'battery.critical_raw_materials', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm threshold calculation and material identifiers.', 150),
  ('2.0.0', 16, 'DP-16', 'Material composition of the battery', '电池材料组成', 'BR Annex XIII 1(b)', 'materials', 'Do not fill/display; repeats chemistry, hazardous substances and critical raw materials already required.', 'model', 'object', null, 'professional', false, 'battery.material_composition_duplicate', '["battery.battery_chemistry","battery.hazardous_substances","battery.critical_raw_materials"]'::jsonb, 'D', 'eu_guidance_v2', false, 'not_required', null, 160),
  ('2.0.0', 17, 'DP-17', 'Carbon footprint declaration', '碳足迹声明', 'BR Annex XIII 1(c)', 'sustainability', 'Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.', 'batch', 'uri', null, 'public', false, 'battery.carbon_footprint_declaration', '["battery.web_link_to_public_carbon_footprint_study"]'::jsonb, 'B', 'eu_guidance_v2', true, 'pending', 'Await the implementing-act format.', 170),
  ('2.0.0', 18, 'DP-18', 'Carbon footprint label', '碳足迹标签', 'BR Annex XIII 1(c)', 'sustainability', 'Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.', 'batch', 'uri', null, 'public', false, 'battery.carbon_footprint_label', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Await the implementing-act format.', 180),
  ('2.0.0', 19, 'DP-19', 'Responsible sourcing information in the battery due diligence report', '电池尽职调查报告中的负责任采购信息', 'BR Annex XIII 1(d)', 'sustainability', 'Not to be filled/displayed as of February 2027; Article 48(1) applies from August 2027.', 'model', 'uri', null, 'public', false, 'battery.information_of_due_diligence_report', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm Article 48 applicability and effective date.', 190),
  ('2.0.0', 20, 'DP-20', 'Recovered cobalt share in active materials', '活性材料中的再生钴占比', 'BR Annex XIII 1(e)', 'sustainability', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.', 'batch', 'decimal', '%', 'public', false, 'battery.recovered_cobalt_share', '["battery.pre_consumer_recycled_cobalt_share","battery.post_consumer_recycled_cobalt_share"]'::jsonb, 'B', 'eu_guidance_v2', true, 'pending', 'Do not combine pre- and post-consumer values without an approved method.', 200),
  ('2.0.0', 21, 'DP-21', 'Recovered lithium share in active materials', '活性材料中的再生锂占比', 'BR Annex XIII 1(e)', 'sustainability', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.', 'batch', 'decimal', '%', 'public', false, 'battery.recovered_lithium_share', '["battery.pre_consumer_recycled_lithium_share","battery.post_consumer_recycled_lithium_share"]'::jsonb, 'B', 'eu_guidance_v2', true, 'pending', 'Do not combine pre- and post-consumer values without an approved method.', 210),
  ('2.0.0', 22, 'DP-22', 'Recovered nickel share in active materials', '活性材料中的再生镍占比', 'BR Annex XIII 1(e)', 'sustainability', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.', 'batch', 'decimal', '%', 'public', false, 'battery.recovered_nickel_share', '["battery.pre_consumer_recycled_nickel_share","battery.post_consumer_recycled_nickel_share"]'::jsonb, 'B', 'eu_guidance_v2', true, 'pending', 'Do not combine pre- and post-consumer values without an approved method.', 220),
  ('2.0.0', 23, 'DP-23', 'Recovered lead share in the battery', '电池中的再生铅占比', 'BR Annex XIII 1(e)', 'sustainability', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.', 'batch', 'decimal', '%', 'public', false, 'battery.recycled_lead_share', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm the delegated-act calculation method.', 230),
  ('2.0.0', 24, 'DP-24', 'Share of renewable content', '可再生来源含量占比', 'BR Annex XIII 1(f)', 'sustainability', 'Mandatory for EV, LMT and industrial batteries.', 'batch', 'decimal', '%', 'public', false, 'battery.renewable_content_share', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm definition and calculation basis.', 240),
  ('2.0.0', 25, 'DP-25', 'Rated capacity (Ah)', '额定容量（Ah）', 'BR Annex XIII 1(g)', 'performance', 'Do not fill/display; repeats data point 11.', 'model', 'decimal', 'Ah', 'public', false, 'battery.rated_capacity', '[]'::jsonb, 'D', 'eu_guidance_v2', false, 'not_required', null, 250),
  ('2.0.0', 26, 'DP-26', 'Minimal voltage, with temperature range when relevant', '最低电压（相关时含温度范围）', 'BR Annex XIII 1(h)', 'performance', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'object', 'V', 'public', false, 'battery.minimum_voltage', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm temperature boundaries where relevant.', 260),
  ('2.0.0', 27, 'DP-27', 'Nominal voltage, with temperature range when relevant', '标称电压（相关时含温度范围）', 'BR Annex XIII 1(h)', 'performance', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'object', 'V', 'public', false, 'battery.nominal_voltage', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm temperature boundaries where relevant.', 270),
  ('2.0.0', 28, 'DP-28', 'Maximum voltage, with temperature range when relevant', '最高电压（相关时含温度范围）', 'BR Annex XIII 1(h)', 'performance', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'object', 'V', 'public', false, 'battery.maximum_voltage', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm temperature boundaries where relevant.', 280),
  ('2.0.0', 29, 'DP-29', 'Original power capability', '初始功率能力', 'BR Annex XIII 1(i)', 'performance', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'object', 'W', 'public', false, 'battery.original_power_capability', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm the reference conditions.', 290),
  ('2.0.0', 30, 'DP-30', 'Power limits, with temperature range when relevant', '功率限制（相关时含温度范围）', 'BR Annex XIII 1(i)', 'performance', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'object', 'W', 'public', false, 'battery.maximum_permitted_battery_power', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm all applicable power and temperature limits.', 300),
  ('2.0.0', 31, 'DP-31', 'Expected battery lifetime expressed in cycles', '以循环次数表示的预期电池寿命', 'BR Annex XIII 1(j)', 'performance', 'For industrial batteries, applicable where lifetime can be expressed in cycles.', 'model', 'integer', 'cycles', 'public', false, 'battery.expected_lifetime_number_of_charge_discharge_cycles', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm industrial applicability and reference conditions.', 310),
  ('2.0.0', 32, 'DP-32', 'Reference test for expected battery lifetime in cycles', '预期循环寿命的参考测试', 'BR Annex XIII 1(j)', 'performance', 'For industrial batteries, applicable where lifetime can be expressed in cycles.', 'model', 'string', null, 'professional', false, 'battery.cycle_life_reference_test', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm test standard, version and conditions.', 320),
  ('2.0.0', 33, 'DP-33', 'Capacity threshold for exhaustion', '容量衰竭阈值', 'BR Annex XIII 1(k)', 'performance', 'Mandatory for EV; not to be filled/displayed for LMT and industrial batteries.', 'model', 'decimal', '%', 'public', false, 'battery.capacity_threshold_for_exhaustion', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'EV-only data point under this guidance.', 330),
  ('2.0.0', 34, 'DP-34', 'Temperature range the battery can withstand when not in use', '电池闲置时可承受的温度范围', 'BR Annex XIII 1(l)', 'performance', 'Reference-test temperature range is mandatory for all three categories.', 'model', 'object', '°C', 'public', false, 'battery.idle_temperature_range', '["battery.temperature_range_idle_state_lower_boundary","battery.temperature_range_idle_state_upper_boundary"]'::jsonb, 'B', 'eu_guidance_v2', true, 'pending', 'Store lower and upper boundaries with the reference test.', 340),
  ('2.0.0', 35, 'DP-35', 'Commercial warranty period for calendar life', '日历寿命商业质保期', 'BR Annex XIII 1(m)', 'performance', 'Applicable where a commercial warranty is envisaged.', 'model', 'string', null, 'public', false, 'battery.warranty_period_of_the_battery', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Mark not applicable when no commercial warranty exists.', 350),
  ('2.0.0', 36, 'DP-36', 'Initial round trip energy efficiency', '初始往返能量效率', 'BR Annex XIII 1(n)', 'performance', 'For industrial batteries, applicable only to relevant battery designs.', 'model', 'decimal', '%', 'public', false, 'battery.initial_round_trip_energy_efficiency', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm industrial applicability and test conditions.', 360),
  ('2.0.0', 37, 'DP-37', 'Round trip energy efficiency at 50% of cycle life', '循环寿命 50% 时的往返能量效率', 'BR Annex XIII 1(n)', 'performance', 'For industrial batteries, applicable only to relevant battery designs.', 'model', 'decimal', '%', 'public', false, 'battery.round_trip_energy_efficiency_at_50_of_cycle_life', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm industrial applicability and test conditions.', 370),
  ('2.0.0', 38, 'DP-38', 'Internal battery cell and pack resistance', '电芯及电池包内阻', 'BR Annex XIII 1(o)', 'performance', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'object', 'Ω', 'professional', false, 'battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Separate cell and pack values where available.', 380),
  ('2.0.0', 39, 'DP-39', 'C-rate of the relevant cycle-life test', '相关循环寿命测试的倍率', 'BR Annex XIII 1(p)', 'performance', 'For industrial batteries, applicable only to relevant battery designs.', 'model', 'decimal', 'C-rate', 'professional', false, 'battery.c_rate_of_relevant_cycle_life_test', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm test method and industrial applicability.', 390),
  ('2.0.0', 40, 'DP-40', 'Marking requirements in Article 13(4)', '第 13(4) 条标识要求', 'BR Annex XIII 1(q)', 'safety', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'uri', null, 'public', false, 'battery.separate_collection_symbol', '["battery.meaning_of_labels_and_symbols"]'::jsonb, 'B', 'eu_guidance_v2', true, 'pending', 'Review complete Article 13(4) marking coverage.', 400),
  ('2.0.0', 41, 'DP-41', 'Cadmium or lead symbol under Article 13(5)', '第 13(5) 条镉或铅化学符号', 'BR Annex XIII 1(q)', 'safety', 'Applicable where the cadmium or lead threshold requires the symbol.', 'model', 'uri', null, 'public', false, 'battery.symbols_for_cadmium_and_lead', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm threshold applicability before marking not applicable.', 410),
  ('2.0.0', 42, 'DP-42', 'EU declaration of conformity', '欧盟符合性声明', 'BR Annex XIII 1(r)', 'safety', 'Declaration referred to in Article 18.', 'model', 'uri', null, 'public', false, 'battery.eu_declaration_of_conformity', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Verify signed declaration, version and scope.', 420),
  ('2.0.0', 43, 'DP-43', 'Prevention and management information for waste batteries', '废旧电池预防与管理信息', 'BR Annex XIII 1(s)', 'safety', 'Information laid down in Article 74(1)(a) to (f).', 'model', 'object', null, 'public', false, 'battery.waste_battery_prevention_and_management_information', '["battery.information_on_the_role_of_end_users_in_contributing_to_waste_prevention","battery.information_on_the_role_of_end_users_in_contributing_to_the_separate_collection_of_waste_batteries","battery.information_on_battery_collection_preparation_for_second_life_and_on_treatment_at_end_of_life"]'::jsonb, 'B', 'eu_guidance_v2', true, 'pending', 'Confirm all six Article 74(1) information elements.', 430),
  ('2.0.0', 44, 'DP-44', 'Printable, downloadable and savable instructions for use', '可打印、下载和保存的使用说明', 'BR Annex XIII 1(t)', 'safety', 'Not to be filled/displayed as of February 2027; application provisions are on hold pending Omnibus adoption.', 'model', 'uri', null, 'public', false, 'battery.instructions_for_use', '[]'::jsonb, 'E', 'eu_guidance_v2', true, 'pending', 'Await final application provisions.', 440),
  ('2.0.0', 45, 'DP-45', 'Detailed composition of cathode, anode and electrolyte', '正极、负极和电解质的详细组成', 'BR Annex XIII 2(a)', 'materials', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'object', null, 'professional', false, 'battery.materials_used_in_cathode_anode_and_electrolyte', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm composition depth and confidential-data access policy.', 450),
  ('2.0.0', 46, 'DP-46', 'Part numbers for components', '组件零件编号', 'BR Annex XIII 2(b)', 'repair', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'array', null, 'professional', false, 'battery.part_numbers_for_components', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm component scope and revision control.', 460),
  ('2.0.0', 47, 'DP-47', 'Contact details of sources for replacement spares', '替换备件来源联系方式', 'BR Annex XIII 2(b)', 'repair', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'array', null, 'professional', false, 'battery.information_on_sources_of_spare_parts', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm contacts are maintained and actionable.', 470),
  ('2.0.0', 48, 'DP-48', 'Dismantling information', '拆解信息', 'BR Annex XIII 2(c)', 'repair', 'Include exploded diagrams, disassembly sequence, fasteners, tools, damage warnings, cell count and layout.', 'model', 'uri', null, 'professional', false, 'battery.dismantling_information_manuals_for_the_removal_and_the_disassembly_of_the_battery_pack', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Verify all minimum dismantling elements are covered.', 480),
  ('2.0.0', 49, 'DP-49', 'Safety measures', '安全措施', 'BR Annex XIII 2(d)', 'safety', 'Mandatory for EV, LMT and industrial batteries.', 'model', 'uri', null, 'professional', false, 'battery.safety_measures', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm measures for transport, service, dismantling and emergencies.', 490),
  ('2.0.0', 50, 'DP-50', 'Results of test reports proving compliance', '证明合规的测试报告结果', 'BR Annex XIII 3', 'evidence', 'Covers Regulation requirements and delegated or implementing acts adopted under it.', 'model', 'array', null, 'regulator', false, 'battery.results_of_test_reports_proving_compliance', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Verify report issuer, scope, version and result.', 500),
  ('2.0.0', 51, 'DP-51', 'Rated capacity (dynamic)', '额定容量（动态值）', 'BR Annex XIII 4(a)', 'health', 'Same concept as data point 11, but recorded dynamically; industrial batteries where applicable.', 'individual', 'decimal', 'Ah', 'professional', true, 'battery.dynamic_rated_capacity', '["battery.rated_capacity"]'::jsonb, 'E', 'eu_guidance_v2', false, 'pending', 'Use item-level measurements; do not overwrite the static rated declaration.', 510),
  ('2.0.0', 52, 'DP-52', 'Capacity fade', '容量衰减', 'BR Annex XIII 4(a)', 'health', 'Industrial batteries where applicable.', 'individual', 'decimal', '%', 'professional', true, 'battery.capacity_fade', '[]'::jsonb, 'E', 'eu_guidance_v2', false, 'pending', 'Migrate legacy static values to item-level snapshots.', 520),
  ('2.0.0', 53, 'DP-53', 'Power', '当前功率能力', 'BR Annex XIII 4(a)', 'health', 'Industrial batteries where applicable.', 'individual', 'decimal', 'W', 'professional', true, 'battery.remaining_power_capability', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm measurement basis and state-of-charge conditions.', 530),
  ('2.0.0', 54, 'DP-54', 'Power fade', '功率衰减', 'BR Annex XIII 4(a)', 'health', 'Industrial batteries where applicable.', 'individual', 'decimal', '%', 'professional', true, 'battery.power_fade', '[]'::jsonb, 'E', 'eu_guidance_v2', false, 'pending', 'Migrate legacy static values to item-level snapshots.', 540),
  ('2.0.0', 55, 'DP-55', 'Internal resistance', '当前内阻', 'BR Annex XIII 4(a)', 'health', 'Industrial batteries where applicable.', 'individual', 'decimal', 'Ω', 'professional', true, 'battery.current_internal_resistance', '["battery.initial_internal_resistance_of_battery_cell_and_pack_module_recommended"]'::jsonb, 'E', 'eu_guidance_v2', false, 'pending', 'Keep current resistance separate from initial reference resistance.', 550),
  ('2.0.0', 56, 'DP-56', 'Internal resistance increase', '内阻增长', 'BR Annex XIII 4(a)', 'health', 'Industrial batteries where applicable.', 'individual', 'decimal', '%', 'professional', true, 'battery.internal_resistance_increase_of_pack_cell_and_module_recommended', '[]'::jsonb, 'E', 'eu_guidance_v2', false, 'pending', 'Migrate legacy static values to item-level snapshots.', 560),
  ('2.0.0', 57, 'DP-57', 'Energy round trip efficiency', '当前往返能量效率', 'BR Annex XIII 4(a)', 'health', 'Applicable where this technical parameter is relevant.', 'individual', 'decimal', '%', 'professional', true, 'battery.remaining_round_trip_energy_efficiency', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Record not applicable only after technical review.', 570),
  ('2.0.0', 58, 'DP-58', 'Energy round trip efficiency fade', '往返能量效率衰减', 'BR Annex XIII 4(a)', 'health', 'Applicable where this technical parameter is relevant.', 'individual', 'decimal', '%', 'professional', true, 'battery.energy_round_trip_efficiency_fade', '[]'::jsonb, 'E', 'eu_guidance_v2', false, 'pending', 'Migrate legacy static values to item-level snapshots.', 580),
  ('2.0.0', 59, 'DP-59', 'Expected lifetime under reference conditions in cycles', '参考条件下以循环次数表示的预期寿命', 'BR Annex XIII 4(a)', 'performance', 'Except non-cycle applications; industrial batteries where applicable.', 'model', 'integer', 'cycles', 'professional', false, 'battery.expected_lifetime_number_of_charge_discharge_cycles', '[]'::jsonb, 'B', 'eu_guidance_v2', true, 'pending', 'Related to DP31; preserve the Annex XIII 4(a) context.', 590),
  ('2.0.0', 60, 'DP-60', 'Expected lifetime under reference conditions in calendar years', '参考条件下以日历年表示的预期寿命', 'BR Annex XIII 4(a)', 'performance', 'Industrial batteries where applicable.', 'model', 'decimal', 'years', 'professional', false, 'battery.expected_lifetime_in_calendar_years', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Confirm reference conditions and industrial applicability.', 600),
  ('2.0.0', 61, 'DP-61', 'State of certified energy (SOCE)', '认证能量状态（SOCE）', 'BR Annex XIII 4(b)', 'health', 'Mandatory for EV; not to be filled/displayed for LMT and industrial batteries.', 'individual', 'decimal', '%', 'professional', true, 'battery.state_of_certified_energy_soce', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'EV-only data point under this guidance.', 610),
  ('2.0.0', 62, 'DP-62', 'Remaining capacity', '剩余容量', 'BR Annex XIII 4(b)', 'health', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable.', 'individual', 'decimal', 'Ah', 'professional', true, 'battery.remaining_capacity', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm industrial applicability.', 620),
  ('2.0.0', 63, 'DP-63', 'Remaining power capability', '剩余功率能力', 'BR Annex XIII 4(b)', 'health', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.', 'individual', 'decimal', 'W', 'professional', true, 'battery.remaining_power_capability', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm industrial applicability and measurement conditions.', 630),
  ('2.0.0', 64, 'DP-64', 'Remaining round trip efficiency', '剩余往返能量效率', 'BR Annex XIII 4(b)', 'health', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.', 'individual', 'decimal', '%', 'professional', true, 'battery.remaining_round_trip_energy_efficiency', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm industrial applicability.', 640),
  ('2.0.0', 65, 'DP-65', 'Evolution of self-discharging rates', '自放电率变化', 'BR Annex XIII 4(b)', 'health', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.', 'individual', 'decimal', '%', 'professional', true, 'battery.evolution_of_self_discharge_rates', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm industrial applicability and observation period.', 650),
  ('2.0.0', 66, 'DP-66', 'Ohmic resistance', '欧姆内阻', 'BR Annex XIII 4(b)', 'health', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.', 'individual', 'decimal', 'Ω', 'professional', true, 'battery.current_internal_resistance', '[]'::jsonb, 'C', 'eu_guidance_v2', false, 'pending', 'Confirm terminology and industrial applicability.', 660),
  ('2.0.0', 67, 'DP-67', 'Battery lifecycle status', '电池生命周期状态', 'BR Annex XIII 4(c)', 'lifecycle', 'Allowed values: original, repurposed, re-used, remanufactured or waste.', 'lifecycle', 'string', null, 'public', true, 'battery.battery_status', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Keep separate from the passport record publication status.', 670),
  ('2.0.0', 68, 'DP-68', 'Number of charging and discharging cycles', '充放电循环次数', 'BR Annex XIII 4(d)', 'lifecycle', 'Applicable where this information is relevant and recorded.', 'individual', 'integer', 'cycles', 'professional', true, 'battery.number_of_full_charging_and_discharging_cycles', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Confirm counter definition and reset policy.', 680),
  ('2.0.0', 69, 'DP-69', 'Negative events such as accidents', '事故等负面事件', 'BR Annex XIII 4(d)', 'lifecycle', 'Applicable where a negative event has occurred.', 'lifecycle', 'array', null, 'professional', true, 'battery.information_on_accidents', '[]'::jsonb, 'A', 'eu_guidance_v2', true, 'pending', 'Retain event time, source and evidence.', 690),
  ('2.0.0', 70, 'DP-70', 'Periodically recorded operating environmental conditions, including temperature', '定期记录的运行环境条件（含温度）', 'BR Annex XIII 4(d)', 'health', 'Applicable where operating environmental conditions are recorded.', 'individual', 'object', '°C', 'professional', true, 'battery.temperature_information', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Preserve observation time, source device and environmental context.', 700),
  ('2.0.0', 71, 'DP-71', 'Periodically recorded state of charge', '定期记录的荷电状态', 'BR Annex XIII 4(d)', 'health', 'Applicable where state of charge is periodically recorded.', 'individual', 'decimal', '%', 'professional', true, 'battery.state_of_charge_soc', '[]'::jsonb, 'A', 'eu_guidance_v2', false, 'pending', 'Preserve observation time and source device.', 710)
on conflict (catalog_version, data_point_number) do update set
  data_point_code = excluded.data_point_code,
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  legal_source = excluded.legal_source,
  chapter_code = excluded.chapter_code,
  source_note = excluded.source_note,
  data_level = excluded.data_level,
  data_type = excluded.data_type,
  unit_code = excluded.unit_code,
  access_class = excluded.access_class,
  is_dynamic = excluded.is_dynamic,
  canonical_field_code = excluded.canonical_field_code,
  legacy_field_codes = excluded.legacy_field_codes,
  mapping_quality = excluded.mapping_quality,
  field_origin = excluded.field_origin,
  evidence_required = excluded.evidence_required,
  default_expert_review_status = excluded.default_expert_review_status,
  default_expert_review_note = excluded.default_expert_review_note,
  sort_order = excluded.sort_order;

insert into public.battery_regulatory_applicability (
  catalog_version, data_point_number, battery_category, requirement_status, source_note
) values
  ('2.0.0', 1, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 1, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 1, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 2, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 2, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 2, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 3, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 3, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 3, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 4, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 4, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 4, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 5, 'ev', 'optional', 'Optional; fill when the data is available.'),
  ('2.0.0', 5, 'lmt', 'optional', 'Optional; fill when the data is available.'),
  ('2.0.0', 5, 'industrial', 'optional', 'Optional; fill when the data is available.'),
  ('2.0.0', 6, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 6, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 6, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 7, 'ev', 'mandatory', 'Mandatory; the applicable identifying element depends on passport granularity.'),
  ('2.0.0', 7, 'lmt', 'mandatory', 'Mandatory; the applicable identifying element depends on passport granularity.'),
  ('2.0.0', 7, 'industrial', 'mandatory', 'Mandatory; the applicable identifying element depends on passport granularity.'),
  ('2.0.0', 8, 'ev', 'mandatory', 'Geographical location of the battery manufacturing plant.'),
  ('2.0.0', 8, 'lmt', 'mandatory', 'Geographical location of the battery manufacturing plant.'),
  ('2.0.0', 8, 'industrial', 'mandatory', 'Geographical location of the battery manufacturing plant.'),
  ('2.0.0', 9, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 9, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 9, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 10, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 10, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 10, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 11, 'ev', 'mandatory', 'Mandatory static capacity declaration.'),
  ('2.0.0', 11, 'lmt', 'mandatory', 'Mandatory static capacity declaration.'),
  ('2.0.0', 11, 'industrial', 'mandatory', 'Mandatory static capacity declaration.'),
  ('2.0.0', 12, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 12, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 12, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 13, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 13, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 13, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 14, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 14, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 14, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 15, 'ev', 'mandatory', 'Mandatory where concentration exceeds 0.1% weight by weight.'),
  ('2.0.0', 15, 'lmt', 'mandatory', 'Mandatory where concentration exceeds 0.1% weight by weight.'),
  ('2.0.0', 15, 'industrial', 'mandatory', 'Mandatory where concentration exceeds 0.1% weight by weight.'),
  ('2.0.0', 16, 'ev', 'duplicate', 'Do not fill/display; repeats chemistry, hazardous substances and critical raw materials already required.'),
  ('2.0.0', 16, 'lmt', 'duplicate', 'Do not fill/display; repeats chemistry, hazardous substances and critical raw materials already required.'),
  ('2.0.0', 16, 'industrial', 'duplicate', 'Do not fill/display; repeats chemistry, hazardous substances and critical raw materials already required.'),
  ('2.0.0', 17, 'ev', 'future', 'Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.'),
  ('2.0.0', 17, 'lmt', 'future', 'Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.'),
  ('2.0.0', 17, 'industrial', 'future', 'Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.'),
  ('2.0.0', 18, 'ev', 'future', 'Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.'),
  ('2.0.0', 18, 'lmt', 'future', 'Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.'),
  ('2.0.0', 18, 'industrial', 'future', 'Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.'),
  ('2.0.0', 19, 'ev', 'future', 'Not to be filled/displayed as of February 2027; Article 48(1) applies from August 2027.'),
  ('2.0.0', 19, 'lmt', 'future', 'Not to be filled/displayed as of February 2027; Article 48(1) applies from August 2027.'),
  ('2.0.0', 19, 'industrial', 'future', 'Not to be filled/displayed as of February 2027; Article 48(1) applies from August 2027.'),
  ('2.0.0', 20, 'ev', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 20, 'lmt', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 20, 'industrial', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 21, 'ev', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 21, 'lmt', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 21, 'industrial', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 22, 'ev', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 22, 'lmt', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 22, 'industrial', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 23, 'ev', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 23, 'lmt', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 23, 'industrial', 'future', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.'),
  ('2.0.0', 24, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 24, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 24, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 25, 'ev', 'duplicate', 'Do not fill/display; repeats data point 11.'),
  ('2.0.0', 25, 'lmt', 'duplicate', 'Do not fill/display; repeats data point 11.'),
  ('2.0.0', 25, 'industrial', 'duplicate', 'Do not fill/display; repeats data point 11.'),
  ('2.0.0', 26, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 26, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 26, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 27, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 27, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 27, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 28, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 28, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 28, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 29, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 29, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 29, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 30, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 30, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 30, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 31, 'ev', 'mandatory', 'For industrial batteries, applicable where lifetime can be expressed in cycles.'),
  ('2.0.0', 31, 'lmt', 'mandatory', 'For industrial batteries, applicable where lifetime can be expressed in cycles.'),
  ('2.0.0', 31, 'industrial', 'conditional', 'For industrial batteries, applicable where lifetime can be expressed in cycles.'),
  ('2.0.0', 32, 'ev', 'mandatory', 'For industrial batteries, applicable where lifetime can be expressed in cycles.'),
  ('2.0.0', 32, 'lmt', 'mandatory', 'For industrial batteries, applicable where lifetime can be expressed in cycles.'),
  ('2.0.0', 32, 'industrial', 'conditional', 'For industrial batteries, applicable where lifetime can be expressed in cycles.'),
  ('2.0.0', 33, 'ev', 'mandatory', 'Mandatory for EV; not to be filled/displayed for LMT and industrial batteries.'),
  ('2.0.0', 33, 'lmt', 'not_applicable', 'Mandatory for EV; not to be filled/displayed for LMT and industrial batteries.'),
  ('2.0.0', 33, 'industrial', 'not_applicable', 'Mandatory for EV; not to be filled/displayed for LMT and industrial batteries.'),
  ('2.0.0', 34, 'ev', 'mandatory', 'Reference-test temperature range is mandatory for all three categories.'),
  ('2.0.0', 34, 'lmt', 'mandatory', 'Reference-test temperature range is mandatory for all three categories.'),
  ('2.0.0', 34, 'industrial', 'mandatory', 'Reference-test temperature range is mandatory for all three categories.'),
  ('2.0.0', 35, 'ev', 'conditional', 'Applicable where a commercial warranty is envisaged.'),
  ('2.0.0', 35, 'lmt', 'conditional', 'Applicable where a commercial warranty is envisaged.'),
  ('2.0.0', 35, 'industrial', 'conditional', 'Applicable where a commercial warranty is envisaged.'),
  ('2.0.0', 36, 'ev', 'mandatory', 'For industrial batteries, applicable only to relevant battery designs.'),
  ('2.0.0', 36, 'lmt', 'mandatory', 'For industrial batteries, applicable only to relevant battery designs.'),
  ('2.0.0', 36, 'industrial', 'conditional', 'For industrial batteries, applicable only to relevant battery designs.'),
  ('2.0.0', 37, 'ev', 'mandatory', 'For industrial batteries, applicable only to relevant battery designs.'),
  ('2.0.0', 37, 'lmt', 'mandatory', 'For industrial batteries, applicable only to relevant battery designs.'),
  ('2.0.0', 37, 'industrial', 'conditional', 'For industrial batteries, applicable only to relevant battery designs.'),
  ('2.0.0', 38, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 38, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 38, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 39, 'ev', 'mandatory', 'For industrial batteries, applicable only to relevant battery designs.'),
  ('2.0.0', 39, 'lmt', 'mandatory', 'For industrial batteries, applicable only to relevant battery designs.'),
  ('2.0.0', 39, 'industrial', 'conditional', 'For industrial batteries, applicable only to relevant battery designs.'),
  ('2.0.0', 40, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 40, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 40, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 41, 'ev', 'conditional', 'Applicable where the cadmium or lead threshold requires the symbol.'),
  ('2.0.0', 41, 'lmt', 'conditional', 'Applicable where the cadmium or lead threshold requires the symbol.'),
  ('2.0.0', 41, 'industrial', 'conditional', 'Applicable where the cadmium or lead threshold requires the symbol.'),
  ('2.0.0', 42, 'ev', 'mandatory', 'Declaration referred to in Article 18.'),
  ('2.0.0', 42, 'lmt', 'mandatory', 'Declaration referred to in Article 18.'),
  ('2.0.0', 42, 'industrial', 'mandatory', 'Declaration referred to in Article 18.'),
  ('2.0.0', 43, 'ev', 'mandatory', 'Information laid down in Article 74(1)(a) to (f).'),
  ('2.0.0', 43, 'lmt', 'mandatory', 'Information laid down in Article 74(1)(a) to (f).'),
  ('2.0.0', 43, 'industrial', 'mandatory', 'Information laid down in Article 74(1)(a) to (f).'),
  ('2.0.0', 44, 'ev', 'future', 'Not to be filled/displayed as of February 2027; application provisions are on hold pending Omnibus adoption.'),
  ('2.0.0', 44, 'lmt', 'future', 'Not to be filled/displayed as of February 2027; application provisions are on hold pending Omnibus adoption.'),
  ('2.0.0', 44, 'industrial', 'future', 'Not to be filled/displayed as of February 2027; application provisions are on hold pending Omnibus adoption.'),
  ('2.0.0', 45, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 45, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 45, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 46, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 46, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 46, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 47, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 47, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 47, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 48, 'ev', 'mandatory', 'Include exploded diagrams, disassembly sequence, fasteners, tools, damage warnings, cell count and layout.'),
  ('2.0.0', 48, 'lmt', 'mandatory', 'Include exploded diagrams, disassembly sequence, fasteners, tools, damage warnings, cell count and layout.'),
  ('2.0.0', 48, 'industrial', 'mandatory', 'Include exploded diagrams, disassembly sequence, fasteners, tools, damage warnings, cell count and layout.'),
  ('2.0.0', 49, 'ev', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 49, 'lmt', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 49, 'industrial', 'mandatory', 'Mandatory for EV, LMT and industrial batteries.'),
  ('2.0.0', 50, 'ev', 'mandatory', 'Covers Regulation requirements and delegated or implementing acts adopted under it.'),
  ('2.0.0', 50, 'lmt', 'mandatory', 'Covers Regulation requirements and delegated or implementing acts adopted under it.'),
  ('2.0.0', 50, 'industrial', 'mandatory', 'Covers Regulation requirements and delegated or implementing acts adopted under it.'),
  ('2.0.0', 51, 'ev', 'mandatory', 'Same concept as data point 11, but recorded dynamically; industrial batteries where applicable.'),
  ('2.0.0', 51, 'lmt', 'mandatory', 'Same concept as data point 11, but recorded dynamically; industrial batteries where applicable.'),
  ('2.0.0', 51, 'industrial', 'conditional', 'Same concept as data point 11, but recorded dynamically; industrial batteries where applicable.'),
  ('2.0.0', 52, 'ev', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 52, 'lmt', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 52, 'industrial', 'conditional', 'Industrial batteries where applicable.'),
  ('2.0.0', 53, 'ev', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 53, 'lmt', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 53, 'industrial', 'conditional', 'Industrial batteries where applicable.'),
  ('2.0.0', 54, 'ev', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 54, 'lmt', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 54, 'industrial', 'conditional', 'Industrial batteries where applicable.'),
  ('2.0.0', 55, 'ev', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 55, 'lmt', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 55, 'industrial', 'conditional', 'Industrial batteries where applicable.'),
  ('2.0.0', 56, 'ev', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 56, 'lmt', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 56, 'industrial', 'conditional', 'Industrial batteries where applicable.'),
  ('2.0.0', 57, 'ev', 'conditional', 'Applicable where this technical parameter is relevant.'),
  ('2.0.0', 57, 'lmt', 'conditional', 'Applicable where this technical parameter is relevant.'),
  ('2.0.0', 57, 'industrial', 'conditional', 'Applicable where this technical parameter is relevant.'),
  ('2.0.0', 58, 'ev', 'conditional', 'Applicable where this technical parameter is relevant.'),
  ('2.0.0', 58, 'lmt', 'conditional', 'Applicable where this technical parameter is relevant.'),
  ('2.0.0', 58, 'industrial', 'conditional', 'Applicable where this technical parameter is relevant.'),
  ('2.0.0', 59, 'ev', 'mandatory', 'Except non-cycle applications; industrial batteries where applicable.'),
  ('2.0.0', 59, 'lmt', 'mandatory', 'Except non-cycle applications; industrial batteries where applicable.'),
  ('2.0.0', 59, 'industrial', 'conditional', 'Except non-cycle applications; industrial batteries where applicable.'),
  ('2.0.0', 60, 'ev', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 60, 'lmt', 'mandatory', 'Industrial batteries where applicable.'),
  ('2.0.0', 60, 'industrial', 'conditional', 'Industrial batteries where applicable.'),
  ('2.0.0', 61, 'ev', 'mandatory', 'Mandatory for EV; not to be filled/displayed for LMT and industrial batteries.'),
  ('2.0.0', 61, 'lmt', 'not_applicable', 'Mandatory for EV; not to be filled/displayed for LMT and industrial batteries.'),
  ('2.0.0', 61, 'industrial', 'not_applicable', 'Mandatory for EV; not to be filled/displayed for LMT and industrial batteries.'),
  ('2.0.0', 62, 'ev', 'not_applicable', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable.'),
  ('2.0.0', 62, 'lmt', 'mandatory', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable.'),
  ('2.0.0', 62, 'industrial', 'conditional', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable.'),
  ('2.0.0', 63, 'ev', 'not_applicable', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 63, 'lmt', 'mandatory', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 63, 'industrial', 'conditional', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 64, 'ev', 'not_applicable', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 64, 'lmt', 'mandatory', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 64, 'industrial', 'conditional', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 65, 'ev', 'not_applicable', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 65, 'lmt', 'mandatory', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 65, 'industrial', 'conditional', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 66, 'ev', 'not_applicable', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 66, 'lmt', 'mandatory', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 66, 'industrial', 'conditional', 'Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.'),
  ('2.0.0', 67, 'ev', 'mandatory', 'Allowed values: original, repurposed, re-used, remanufactured or waste.'),
  ('2.0.0', 67, 'lmt', 'mandatory', 'Allowed values: original, repurposed, re-used, remanufactured or waste.'),
  ('2.0.0', 67, 'industrial', 'mandatory', 'Allowed values: original, repurposed, re-used, remanufactured or waste.'),
  ('2.0.0', 68, 'ev', 'conditional', 'Applicable where this information is relevant and recorded.'),
  ('2.0.0', 68, 'lmt', 'conditional', 'Applicable where this information is relevant and recorded.'),
  ('2.0.0', 68, 'industrial', 'conditional', 'Applicable where this information is relevant and recorded.'),
  ('2.0.0', 69, 'ev', 'conditional', 'Applicable where a negative event has occurred.'),
  ('2.0.0', 69, 'lmt', 'conditional', 'Applicable where a negative event has occurred.'),
  ('2.0.0', 69, 'industrial', 'conditional', 'Applicable where a negative event has occurred.'),
  ('2.0.0', 70, 'ev', 'conditional', 'Applicable where operating environmental conditions are recorded.'),
  ('2.0.0', 70, 'lmt', 'conditional', 'Applicable where operating environmental conditions are recorded.'),
  ('2.0.0', 70, 'industrial', 'conditional', 'Applicable where operating environmental conditions are recorded.'),
  ('2.0.0', 71, 'ev', 'conditional', 'Applicable where state of charge is periodically recorded.'),
  ('2.0.0', 71, 'lmt', 'conditional', 'Applicable where state of charge is periodically recorded.'),
  ('2.0.0', 71, 'industrial', 'conditional', 'Applicable where state of charge is periodically recorded.')
on conflict (catalog_version, data_point_number, battery_category) do update set
  requirement_status = excluded.requirement_status,
  source_note = excluded.source_note;

insert into public.schema_definition (
  code, sector_code, legal_category_code, source_name, name_en, name_zh,
  description_en, description_zh, status
) values (
  'battery.eu_guidance', 'battery', null, 'Digital Batteries Passport - data points by category',
  'EU battery-passport guidance extensions', '欧盟电池护照指南扩展字段',
  'Storage definitions for v2.0 data points not present in the BatteryPass-Ready adapter.',
  '保存 BatteryPass-Ready 适配器中不存在的 v2.0 数据点；法规状态由独立适用性表维护。', 'active'
)
on conflict (code) do nothing;

insert into public.schema_version (
  schema_definition_id, version, source_version, json_schema, checksum_sha256,
  effective_from, status, created_by
)
select id, '2.0.0', '2.0',
  jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','title','Digital Batteries Passport - data points by category'),
  '2aee2ed442eee2b6dd21676d269870572b578ccb165e940b7ec29b842fb18c52', '2026-08-15'::date, 'draft', 'migration-0026'
from public.schema_definition where code = 'battery.eu_guidance'
on conflict (schema_definition_id, version) do nothing;

with sv as (
  select version.id, version.status
  from public.schema_version version
  join public.schema_definition definition on definition.id = version.schema_definition_id
  where definition.code = 'battery.eu_guidance' and version.version = '2.0.0'
)
insert into public.field_definition (
  schema_version_id, field_code, label_en, label_zh, description_en, data_type,
  unit_code, data_behavior, data_granularity, access_level_code,
  requirement_status, evidence_requirement, sort_order
)
select sv.id, rows.field_code, rows.label_en, rows.label_zh,
  rows.description_en, rows.data_type, rows.unit_code, rows.data_behavior,
  rows.data_granularity, rows.access_level_code, 'TBD', rows.evidence_requirement, rows.sort_order
from (values
  ('battery.manufacturer_postal_address', 'Manufacturer postal address, indicating a single contact point', '制造商邮政地址及单一联系点', 'Mandatory for EV, LMT and industrial batteries.', 'string', null, 'STATIC', 'MODEL', 'PUBLIC', '{"required":false,"dataPoint":"DP-04","legalSource":"BR Annex VI A(1)"}'::jsonb, 40),
  ('battery.manufacturer_web_email', 'Manufacturer web and email address, if available', '制造商网站和电子邮箱（如有）', 'Optional; fill when the data is available.', 'object', null, 'STATIC', 'MODEL', 'PUBLIC', '{"required":false,"dataPoint":"DP-05","legalSource":"BR Annex VI A(1)"}'::jsonb, 50),
  ('battery.material_composition_duplicate', 'Material composition of the battery', '电池材料组成', 'Do not fill/display; repeats chemistry, hazardous substances and critical raw materials already required.', 'object', null, 'STATIC', 'MODEL', 'LEGITIMATE_INTEREST', '{"required":false,"dataPoint":"DP-16","legalSource":"BR Annex XIII 1(b)"}'::jsonb, 160),
  ('battery.carbon_footprint_declaration', 'Carbon footprint declaration', '碳足迹声明', 'Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.', 'uri', null, 'STATIC', 'BATCH', 'PUBLIC', '{"required":true,"dataPoint":"DP-17","legalSource":"BR Annex XIII 1(c)"}'::jsonb, 170),
  ('battery.recovered_cobalt_share', 'Recovered cobalt share in active materials', '活性材料中的再生钴占比', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.', 'decimal', '%', 'STATIC', 'BATCH', 'PUBLIC', '{"required":true,"dataPoint":"DP-20","legalSource":"BR Annex XIII 1(e)"}'::jsonb, 200),
  ('battery.recovered_lithium_share', 'Recovered lithium share in active materials', '活性材料中的再生锂占比', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.', 'decimal', '%', 'STATIC', 'BATCH', 'PUBLIC', '{"required":true,"dataPoint":"DP-21","legalSource":"BR Annex XIII 1(e)"}'::jsonb, 210),
  ('battery.recovered_nickel_share', 'Recovered nickel share in active materials', '活性材料中的再生镍占比', 'Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.', 'decimal', '%', 'STATIC', 'BATCH', 'PUBLIC', '{"required":true,"dataPoint":"DP-22","legalSource":"BR Annex XIII 1(e)"}'::jsonb, 220),
  ('battery.idle_temperature_range', 'Temperature range the battery can withstand when not in use', '电池闲置时可承受的温度范围', 'Reference-test temperature range is mandatory for all three categories.', 'object', '°C', 'STATIC', 'MODEL', 'PUBLIC', '{"required":true,"dataPoint":"DP-34","legalSource":"BR Annex XIII 1(l)"}'::jsonb, 340),
  ('battery.waste_battery_prevention_and_management_information', 'Prevention and management information for waste batteries', '废旧电池预防与管理信息', 'Information laid down in Article 74(1)(a) to (f).', 'object', null, 'STATIC', 'MODEL', 'PUBLIC', '{"required":true,"dataPoint":"DP-43","legalSource":"BR Annex XIII 1(s)"}'::jsonb, 430),
  ('battery.instructions_for_use', 'Printable, downloadable and savable instructions for use', '可打印、下载和保存的使用说明', 'Not to be filled/displayed as of February 2027; application provisions are on hold pending Omnibus adoption.', 'uri', null, 'STATIC', 'MODEL', 'PUBLIC', '{"required":true,"dataPoint":"DP-44","legalSource":"BR Annex XIII 1(t)"}'::jsonb, 440),
  ('battery.dynamic_rated_capacity', 'Rated capacity (dynamic)', '额定容量（动态值）', 'Same concept as data point 11, but recorded dynamically; industrial batteries where applicable.', 'decimal', 'Ah', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', '{"required":false,"dataPoint":"DP-51","legalSource":"BR Annex XIII 4(a)"}'::jsonb, 510),
  ('battery.current_internal_resistance', 'Internal resistance', '当前内阻', 'Industrial batteries where applicable.', 'decimal', 'Ω', 'DYNAMIC', 'ITEM', 'LEGITIMATE_INTEREST', '{"required":false,"dataPoint":"DP-55","legalSource":"BR Annex XIII 4(a)"}'::jsonb, 550)
) as rows(field_code, label_en, label_zh, description_en, data_type, unit_code, data_behavior, data_granularity, access_level_code, evidence_requirement, sort_order)
cross join sv
where sv.status = 'draft'
on conflict (schema_version_id, field_code) do nothing;

update public.schema_version version
set status = 'published', published_at = coalesce(published_at, now())
from public.schema_definition definition
where definition.id = version.schema_definition_id
  and definition.code = 'battery.eu_guidance'
  and version.version = '2.0.0'
  and version.status = 'draft';

update public.battery_field_value value
set data_status = case when value.verification_status = 'verified' then 'verified' else 'declared' end,
    field_origin = case when value.field_origin = 'legacy' then 'legacy' else 'batterypass_ready_v1_3' end
where value.data_status in ('missing','pending','declared','verified');

update public.battery_model_profile profile
set legal_category_code = 'industrial', stationary = true
from public.products product
where product.id = profile.product_id
  and product.dpp_id = 'DPP-GV-ESS-14K3-000001';

update public.battery_field_value value
set verification_status = 'unverified',
    data_status = 'declared',
    expert_review_status = 'pending',
    evidence_status = case when value.evidence_status = 'verified' then 'missing' else value.evidence_status end
from public.products product, public.field_definition field
where product.id = value.product_id
  and field.id = value.field_definition_id
  and product.dpp_id = 'DPP-GV-ESS-14K3-000001'
  and not exists (
    select 1 from public.dpp_field_evidence_link link
    where link.product_id = product.id and link.field_code = field.field_code
  );

alter table public.battery_regulatory_catalog enable row level security;
alter table public.battery_regulatory_data_point enable row level security;
alter table public.battery_regulatory_applicability enable row level security;
revoke all on public.battery_regulatory_catalog, public.battery_regulatory_data_point,
  public.battery_regulatory_applicability from anon, authenticated;
grant select on public.battery_regulatory_catalog, public.battery_regulatory_data_point,
  public.battery_regulatory_applicability to anon, authenticated;

drop policy if exists "Public reads active battery regulatory catalogs" on public.battery_regulatory_catalog;
create policy "Public reads active battery regulatory catalogs" on public.battery_regulatory_catalog
  for select to anon, authenticated using (is_active);
drop policy if exists "Public reads active battery data points" on public.battery_regulatory_data_point;
create policy "Public reads active battery data points" on public.battery_regulatory_data_point
  for select to anon, authenticated using (exists (
    select 1 from public.battery_regulatory_catalog catalog
    where catalog.version = catalog_version and catalog.is_active
  ));
drop policy if exists "Public reads active battery applicability" on public.battery_regulatory_applicability;
create policy "Public reads active battery applicability" on public.battery_regulatory_applicability
  for select to anon, authenticated using (exists (
    select 1 from public.battery_regulatory_catalog catalog
    where catalog.version = catalog_version and catalog.is_active
  ));

insert into public.greanlean_migration_ledger (
  migration_number, migration_name, checksum_sha256, environment, applied_by, result, notes
) values (
  '0026', 'battery_regulatory_datapoints_v2', '2aee2ed442eee2b6dd21676d269870572b578ccb165e940b7ec29b842fb18c52', 'supabase', current_user, 'applied',
  'Installs the 71-point category-specific battery passport catalog and value provenance metadata.'
)
on conflict (migration_number) do update set
  checksum_sha256 = excluded.checksum_sha256,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = 'applied',
  notes = excluded.notes;

commit;
