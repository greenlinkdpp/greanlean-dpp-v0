-- Phase: ESPR/Battery category profile foundation.
-- Run this in Supabase SQL Editor before using the new sector-template fields in the dashboard.

create extension if not exists "pgcrypto";

create table if not exists public.dpp_category_profiles (
  id uuid primary key default gen_random_uuid(),
  sector_code text not null,
  category_code text not null,
  subcategory_code text,
  profile_key text not null unique,
  profile_name text not null,
  profile_name_zh text,
  regulation_basis text,
  schema_version text default 'v1',
  parent_profile_key text,
  status text default 'active',
  sort_order integer default 100,
  field_schema jsonb default '{}'::jsonb,
  required_modules jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dpp_field_templates (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.dpp_category_profiles(profile_key) on delete cascade,
  module_key text not null,
  field_key text not null,
  field_label text not null,
  field_label_zh text,
  data_type text default 'text',
  unit text,
  required boolean default false,
  evidence_required boolean default false,
  visibility_level text default 'public',
  validation_hint text,
  options jsonb default '[]'::jsonb,
  sort_order integer default 100,
  created_at timestamptz default now(),
  unique (profile_key, field_key)
);

create table if not exists public.dpp_validation_rules (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.dpp_category_profiles(profile_key) on delete cascade,
  field_key text,
  module_key text,
  rule_type text not null,
  rule_config jsonb default '{}'::jsonb,
  severity text default 'warning',
  message text,
  message_zh text,
  created_at timestamptz default now()
);

alter table public.products
  add column if not exists sector_code text,
  add column if not exists category_code text,
  add column if not exists subcategory_code text,
  add column if not exists dpp_profile_key text;

alter table public.product_digital_identity
  add column if not exists data_carrier_type text default 'qr',
  add column if not exists data_carrier_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_dpp_profile_key_fkey'
  ) then
    alter table public.products
      add constraint products_dpp_profile_key_fkey
      foreign key (dpp_profile_key)
      references public.dpp_category_profiles(profile_key)
      on delete set null;
  end if;
end $$;

create table if not exists public.product_sector_field_values (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  profile_key text references public.dpp_category_profiles(profile_key) on delete set null,
  module_key text,
  field_key text not null,
  field_label text,
  field_label_zh text,
  field_value text,
  field_value_json jsonb,
  unit text,
  evidence_status text default 'pending',
  source_type text default 'manual',
  visibility_level text default 'public',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (product_id, field_key)
);

alter table public.dpp_category_profiles enable row level security;
alter table public.dpp_field_templates enable row level security;
alter table public.dpp_validation_rules enable row level security;
alter table public.product_sector_field_values enable row level security;

drop policy if exists "Authenticated can manage category profiles" on public.dpp_category_profiles;
create policy "Authenticated can manage category profiles" on public.dpp_category_profiles for all to authenticated using (true) with check (true);
drop policy if exists "Public can read active category profiles" on public.dpp_category_profiles;
create policy "Public can read active category profiles" on public.dpp_category_profiles for select to anon using (status = 'active');

drop policy if exists "Authenticated can manage field templates" on public.dpp_field_templates;
create policy "Authenticated can manage field templates" on public.dpp_field_templates for all to authenticated using (true) with check (true);
drop policy if exists "Public can read field templates" on public.dpp_field_templates;
create policy "Public can read field templates" on public.dpp_field_templates for select to anon using (
  exists (select 1 from public.dpp_category_profiles p where p.profile_key = dpp_field_templates.profile_key and p.status = 'active')
);

drop policy if exists "Authenticated can manage validation rules" on public.dpp_validation_rules;
create policy "Authenticated can manage validation rules" on public.dpp_validation_rules for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage sector field values" on public.product_sector_field_values;
create policy "Authenticated can manage sector field values" on public.product_sector_field_values for all to authenticated using (true) with check (true);
drop policy if exists "Public can read sector field values" on public.product_sector_field_values;
create policy "Public can read sector field values" on public.product_sector_field_values for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

insert into public.dpp_category_profiles (
  sector_code, category_code, subcategory_code, profile_key, profile_name, profile_name_zh,
  regulation_basis, schema_version, sort_order, required_modules
)
values
  ('textile', 'apparel', 'garment', 'textile.apparel.garment.v1', 'Textile / Apparel / Garment', '纺织 / 服装 / 成衣', 'ESPR textile product group preparation', 'v1', 10, '["identity","materials","chemical_compliance","traceability","circularity","evidence"]'::jsonb),
  ('textile', 'fabric', 'woven_fabric', 'textile.fabric.woven.v1', 'Textile / Fabric / Woven fabric', '纺织 / 面料 / 梭织面料', 'ESPR textile product group preparation', 'v1', 20, '["identity","materials","chemical_compliance","performance","traceability","evidence"]'::jsonb),
  ('battery', 'ev_battery', 'battery_unit', 'battery.ev.unit.v1', 'Battery / EV battery / Battery unit', '电池 / 电动车电池 / 电池单元', 'EU Battery Regulation battery passport', 'v1', 30, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('battery', 'lmt_battery', 'battery_unit', 'battery.lmt.unit.v1', 'Battery / LMT battery / Battery unit', '电池 / LMT 电池 / 电池单元', 'BatteryPass-Ready LMT schema and EU Battery Regulation', 'v1', 31, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('battery', 'industrial_without_bms', 'battery_unit', 'battery.industrial.without_bms.v1', 'Battery / Industrial battery / Without BMS', '电池 / 工业电池 / 无 BMS', 'BatteryPass-Ready Industrial without BMS schema and EU Battery Regulation', 'v1', 32, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('battery', 'industrial_other_above_2kwh', 'battery_unit', 'battery.industrial.other_above_2kwh.v1', 'Battery / Industrial battery / Other above 2 kWh', '电池 / 工业电池 / 其他 2kWh 以上', 'BatteryPass-Ready Other Industrial above 2kWh schema and EU Battery Regulation', 'v1', 33, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('battery', 'industrial_stationary_above_2kwh', 'battery_unit', 'battery.industrial.stationary_above_2kwh.v1', 'Battery / Industrial battery / Stationary above 2 kWh', '电池 / 工业电池 / 固定式 2kWh 以上', 'BatteryPass-Ready Stationary Industrial above 2kWh schema and EU Battery Regulation', 'v1', 34, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('furniture', 'office_furniture', 'office_chair', 'furniture.office.chair.v1', 'Furniture / Office furniture / Office chair', '家具 / 办公家具 / 办公椅', 'ESPR furniture product group preparation', 'v1', 40, '["identity","materials","performance","repair","disassembly","circularity","evidence"]'::jsonb),
  ('construction', 'building_material', 'wpc_decking', 'construction.material.wpc_decking.v1', 'Construction / Building material / WPC decking', '建材 / 建筑材料 / 木塑地板', 'ESPR and construction product documentation readiness', 'v1', 50, '["identity","materials","performance","chemical_compliance","installation","circularity","evidence"]'::jsonb),
  ('consumer_electronics', 'audio_device', 'audio_device', 'consumer_electronics.audio_device.v1', 'Consumer electronics / Audio device', '消费电子 / 音频设备', 'ESPR consumer electronics product group preparation', 'v1', 60, '["identity","materials","battery_readiness","repair","software","circularity","evidence"]'::jsonb)
on conflict (profile_key) do update set
  sector_code = excluded.sector_code,
  category_code = excluded.category_code,
  subcategory_code = excluded.subcategory_code,
  profile_name = excluded.profile_name,
  profile_name_zh = excluded.profile_name_zh,
  regulation_basis = excluded.regulation_basis,
  schema_version = excluded.schema_version,
  sort_order = excluded.sort_order,
  required_modules = excluded.required_modules,
  updated_at = now();

insert into public.dpp_field_templates (
  profile_key, module_key, field_key, field_label, field_label_zh, data_type, unit,
  required, evidence_required, visibility_level, validation_hint, sort_order
)
values
  ('textile.fabric.woven.v1', 'materials', 'fiber_composition', 'Fiber composition', '纤维成分', 'text', null, true, true, 'public', 'Declare material percentages and link supplier or lab evidence.', 10),
  ('textile.fabric.woven.v1', 'chemical_compliance', 'restricted_substance_statement', 'Restricted substance statement', '受限物质声明', 'text', null, true, true, 'public', 'REACH/SVHC/RSL/PFAS statement or test report should be linked.', 20),
  ('textile.fabric.woven.v1', 'performance', 'durability_test_basis', 'Durability test basis', '耐久性测试依据', 'text', null, false, true, 'public', 'Reference abrasion, tensile, colour fastness or customer specification reports.', 30),
  ('textile.apparel.garment.v1', 'materials', 'fiber_composition', 'Fiber composition', '纤维成分', 'text', null, true, true, 'public', 'Declare shell/lining/trims where applicable.', 10),
  ('textile.apparel.garment.v1', 'circularity', 'care_repair_reuse_route', 'Care, repair and reuse route', '护理、维修与再使用路径', 'text', null, true, false, 'public', 'Consumer-facing care and end-of-life route.', 20),
  ('battery.ev.unit.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'Battery passport model identifier.', 10),
  ('battery.ev.unit.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit; EV guide example uses Ah.', 20),
  ('battery.ev.unit.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.ev.unit.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.ev.unit.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.ev.unit.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('battery.lmt.unit.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'BatteryPass-Ready product category specific identifier.', 10),
  ('battery.lmt.unit.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit.', 20),
  ('battery.lmt.unit.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.lmt.unit.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.lmt.unit.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.lmt.unit.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('battery.industrial.without_bms.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'BatteryPass-Ready product category specific identifier.', 10),
  ('battery.industrial.without_bms.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit.', 20),
  ('battery.industrial.without_bms.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.industrial.without_bms.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.industrial.without_bms.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.industrial.without_bms.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('battery.industrial.other_above_2kwh.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'BatteryPass-Ready product category specific identifier.', 10),
  ('battery.industrial.other_above_2kwh.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit.', 20),
  ('battery.industrial.other_above_2kwh.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.industrial.other_above_2kwh.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.industrial.other_above_2kwh.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.industrial.other_above_2kwh.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('battery.industrial.stationary_above_2kwh.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'BatteryPass-Ready product category specific identifier.', 10),
  ('battery.industrial.stationary_above_2kwh.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit.', 20),
  ('battery.industrial.stationary_above_2kwh.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.industrial.stationary_above_2kwh.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.industrial.stationary_above_2kwh.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.industrial.stationary_above_2kwh.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('furniture.office.chair.v1', 'performance', 'durability_test', 'Durability test', '耐久性测试', 'text', null, true, true, 'public', 'Reference seating durability and stability reports.', 10),
  ('furniture.office.chair.v1', 'repair', 'replaceable_parts', 'Replaceable parts', '可替换部件', 'text', null, true, false, 'public', 'List casters, gas lift, armrests, cushion or other service parts.', 20),
  ('construction.material.wpc_decking.v1', 'performance', 'declaration_of_performance', 'Declaration of performance', '性能声明', 'url', null, true, true, 'public', 'Reference DoP or performance report.', 10),
  ('construction.material.wpc_decking.v1', 'chemical_compliance', 'voc_or_reach_evidence', 'VOC / REACH evidence', 'VOC / REACH 证据', 'url', null, true, true, 'public', 'Reference VOC, formaldehyde, REACH or SVHC evidence.', 20),
  ('consumer_electronics.audio_device.v1', 'battery_readiness', 'battery_safety_document', 'Battery safety document', '电池安全文件', 'url', null, false, true, 'public', 'Reference MSDS, UN38.3 or battery handling evidence.', 10),
  ('consumer_electronics.audio_device.v1', 'software', 'firmware_security_update_policy', 'Firmware security update policy', '固件安全更新政策', 'text', null, false, false, 'public', 'Reserve field for connected electronics.', 20)
on conflict (profile_key, field_key) do update set
  module_key = excluded.module_key,
  field_label = excluded.field_label,
  field_label_zh = excluded.field_label_zh,
  data_type = excluded.data_type,
  unit = excluded.unit,
  required = excluded.required,
  evidence_required = excluded.evidence_required,
  visibility_level = excluded.visibility_level,
  validation_hint = excluded.validation_hint,
  sort_order = excluded.sort_order;

update public.products
set
  sector_code = coalesce(sector_code, 'textile'),
  category_code = coalesce(category_code, 'apparel'),
  subcategory_code = coalesce(subcategory_code, 'garment'),
  dpp_profile_key = coalesce(dpp_profile_key, 'textile.apparel.garment.v1')
where public_slug = 'demo-organic-cotton-tshirt'
   or dpp_id = 'DPP-DEMO-001';

update public.products
set
  sector_code = 'consumer_electronics',
  category_code = 'audio_device',
  subcategory_code = 'audio_device',
  dpp_profile_key = 'consumer_electronics.audio_device.v1'
where public_slug = 'demo-wireless-earbuds'
   or dpp_id = 'DPP-AUDIO-DEMO-001'
   or dpp_profile_key = 'electronics.consumer.audio.v1';
