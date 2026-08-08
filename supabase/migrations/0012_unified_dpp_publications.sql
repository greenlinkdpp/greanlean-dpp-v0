begin;

create table if not exists public.dpp_identifier_alias (
  alias text primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  alias_type text not null default 'legacy',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint dpp_identifier_alias_type_check
    check (alias_type in ('legacy', 'dpp_id', 'public_slug', 'gs1', 'external'))
);

alter table public.dpp_identifier_alias enable row level security;
drop policy if exists "Public can resolve active DPP aliases" on public.dpp_identifier_alias;
create policy "Public can resolve active DPP aliases"
  on public.dpp_identifier_alias for select to anon, authenticated
  using (is_active = true);

comment on table public.dpp_identifier_alias is
  'Stable aliases for retired DPP identifiers and public slugs. Aliases resolve identity only and never contain product content.';

create table if not exists public.greanlean_0012_data_backup (
  table_name text not null,
  row_id uuid not null,
  payload jsonb not null,
  backed_up_at timestamptz not null default now(),
  primary key (table_name, row_id)
);

do $$
declare
  expected_count integer;
begin
  select count(*) into expected_count
  from public.products
  where dpp_id in (
    'DPP-LMT-BAT-48V15AH',
    'DPP-GV-ESS-14K3-000001',
    'DPP-DEMO-001',
    'DPP-TEX-TSHIRT-001',
    'DPP-AUDIO-DEMO-001',
    'DPP-CE-EARBUDS-001'
  );
  if expected_count <> 4 then
    raise exception
      '0012 expected exactly four unified DPP case products, found %', expected_count;
  end if;
end;
$$;

insert into public.greanlean_0012_data_backup (table_name, row_id, payload)
select 'products', id, to_jsonb(p)
from public.products p
where dpp_id in (
  'DPP-LMT-BAT-48V15AH',
  'DPP-GV-ESS-14K3-000001',
  'DPP-DEMO-001',
  'DPP-TEX-TSHIRT-001',
  'DPP-AUDIO-DEMO-001',
  'DPP-CE-EARBUDS-001'
)
on conflict do nothing;

insert into public.greanlean_0012_data_backup (table_name, row_id, payload)
select 'product_digital_identity', i.id, to_jsonb(i)
from public.product_digital_identity i
join public.products p on p.id = i.product_id
where p.dpp_id in ('DPP-DEMO-001', 'DPP-TEX-TSHIRT-001', 'DPP-AUDIO-DEMO-001', 'DPP-CE-EARBUDS-001')
on conflict do nothing;

insert into public.greanlean_0012_data_backup (table_name, row_id, payload)
select 'product_certificates', c.id, to_jsonb(c)
from public.product_certificates c
join public.products p on p.id = c.product_id
where p.dpp_id in ('DPP-DEMO-001', 'DPP-TEX-TSHIRT-001', 'DPP-AUDIO-DEMO-001', 'DPP-CE-EARBUDS-001')
on conflict do nothing;

insert into public.greanlean_0012_data_backup (table_name, row_id, payload)
select 'product_esg_metrics', e.id, to_jsonb(e)
from public.product_esg_metrics e
join public.products p on p.id = e.product_id
where p.dpp_id in ('DPP-DEMO-001', 'DPP-TEX-TSHIRT-001', 'DPP-AUDIO-DEMO-001', 'DPP-CE-EARBUDS-001')
on conflict do nothing;

insert into public.greanlean_0012_data_backup (table_name, row_id, payload)
select 'product_traceability', t.id, to_jsonb(t)
from public.product_traceability t
join public.products p on p.id = t.product_id
where p.dpp_id in ('DPP-DEMO-001', 'DPP-TEX-TSHIRT-001', 'DPP-AUDIO-DEMO-001', 'DPP-CE-EARBUDS-001')
on conflict do nothing;

insert into public.greanlean_0012_data_backup (table_name, row_id, payload)
select 'product_consumer_transparency', t.id, to_jsonb(t)
from public.product_consumer_transparency t
join public.products p on p.id = t.product_id
where p.dpp_id in ('DPP-DEMO-001', 'DPP-TEX-TSHIRT-001', 'DPP-AUDIO-DEMO-001', 'DPP-CE-EARBUDS-001')
on conflict do nothing;

insert into public.greanlean_0012_data_backup (table_name, row_id, payload)
select 'product_documents', d.id, to_jsonb(d)
from public.product_documents d
join public.products p on p.id = d.product_id
where p.dpp_id in ('DPP-DEMO-001', 'DPP-TEX-TSHIRT-001', 'DPP-AUDIO-DEMO-001', 'DPP-CE-EARBUDS-001')
on conflict do nothing;

update public.products
set
  dpp_id = 'DPP-TEX-TSHIRT-001',
  public_slug = 'organic-cotton-tshirt-001',
  current_version = 'v2.0',
  unique_product_identifier = 'https://www.greanlean.com/p/DPP-TEX-TSHIRT-001',
  description = 'A 95% organic-cotton T-shirt with recycled-polyester sewing thread, low-impact dyeing, production traceability and textile recovery information.',
  description_zh = '采用 95% 有机棉和再生涤纶缝纫线，记录低影响染色、生产追溯和纺织品回收信息。',
  care_instructions = 'Machine wash cold with similar colours. Do not bleach. Line dry where possible.',
  care_instructions_zh = '建议冷水机洗并与相近颜色衣物同洗；不可漂白，优先自然晾干。',
  repair_instructions = 'Repair minor seam damage with standard thread before replacement or disposal.',
  repair_instructions_zh = '轻微线缝破损可使用普通缝纫线修补，优先维修后再考虑更换或回收。',
  end_of_life_instructions = 'Reuse, donate or return through textile collection channels. Remove non-textile trims where required.',
  end_of_life_instructions_zh = '优先再使用、捐赠或通过纺织品回收渠道回收；按回收方要求移除非纺织辅料。',
  updated_at = now()
where dpp_id in ('DPP-DEMO-001', 'DPP-TEX-TSHIRT-001');

update public.products
set
  dpp_id = 'DPP-CE-EARBUDS-001',
  public_slug = 'wireless-earbuds-001',
  current_version = 'v2.0',
  unique_product_identifier = 'https://www.greanlean.com/p/DPP-CE-EARBUDS-001',
  description = 'Wireless Bluetooth earbuds with a rechargeable charging case, replaceable ear tips, material disclosure and WEEE recovery information.',
  description_zh = '配备充电盒和可更换耳塞的无线蓝牙耳机，披露主要材料、内置电池、维修和 WEEE 回收信息。',
  care_instructions = 'Keep dry, clean the ear tips regularly and charge only with a compatible USB-C power source.',
  care_instructions_zh = '保持产品干燥，定期清洁耳塞，并仅使用兼容的 USB-C 电源充电。',
  repair_instructions = 'Battery and electronic repairs must be completed by an authorised service provider.',
  repair_instructions_zh = '电池和电子部件应由授权服务商检查和维修。',
  end_of_life_instructions = 'Use authorised WEEE and battery collection channels; do not dispose with household waste.',
  end_of_life_instructions_zh = '通过授权 WEEE 和电池收集渠道回收，请勿作为生活垃圾丢弃。',
  updated_at = now()
where dpp_id in ('DPP-AUDIO-DEMO-001', 'DPP-CE-EARBUDS-001');

update public.products
set
  current_version = 'v2.0',
  unique_product_identifier = 'https://www.greanlean.com/p/DPP-LMT-BAT-48V15AH',
  description = 'A removable 48 V 15 Ah NMC lithium-ion battery pack for electric bicycles, with safety, durability, material and authorised collection information.',
  description_zh = '用于电动自行车的 48V 15Ah 可拆卸 NMC 锂离子电池包，披露安全、耐久性、材料和授权回收信息。',
  updated_at = now()
where dpp_id = 'DPP-LMT-BAT-48V15AH';

update public.products
set
  public_slug = 'green-vault-ess-14-3-000001',
  current_version = 'v2.0',
  unique_product_identifier = 'https://www.greanlean.com/p/DPP-GV-ESS-14K3-000001',
  description = 'A 14.336 kWh stationary industrial LFP battery module for commercial energy-storage systems.',
  description_zh = '面向工商业储能系统的 14.336 kWh 固定式工业磷酸铁锂电池模块。',
  care_instructions = 'Operate within the declared voltage and temperature limits and follow the system maintenance schedule.',
  care_instructions_zh = '在声明的电压和温度范围内运行，并按储能系统维护计划进行检查。',
  repair_instructions = 'Service, module isolation and replacement may only be performed by trained high-voltage technicians.',
  repair_instructions_zh = '检修、模组隔离和更换仅限经过培训的高压系统技术人员操作。',
  end_of_life_instructions = 'Isolate the module and transfer it to an authorised industrial-battery collection or repurposing operator.',
  end_of_life_instructions_zh = '隔离电池模组，并交由授权工业电池回收或梯次利用运营方处理。',
  updated_at = now()
where dpp_id = 'DPP-GV-ESS-14K3-000001';

update public.product_digital_identity i
set
  product_uuid = case when p.dpp_id = 'DPP-TEX-TSHIRT-001' then 'DPP-TEX-TSHIRT-001' else 'DPP-CE-EARBUDS-001' end,
  serial_id = case when p.dpp_id = 'DPP-TEX-TSHIRT-001' then 'TEX-OC-000001' else 'EARBUDS-000001' end,
  digital_link_url = 'https://www.greanlean.com/p/' || p.dpp_id,
  qr_code_id = 'QR-' || p.dpp_id
from public.products p
where p.id = i.product_id
  and p.dpp_id in ('DPP-TEX-TSHIRT-001', 'DPP-CE-EARBUDS-001');

update public.product_certificates c
set
  certificate_number = null,
  issuer = null,
  certificate_url = null,
  verification_status = 'pending'
from public.products p
where p.id = c.product_id
  and p.dpp_id in ('DPP-TEX-TSHIRT-001', 'DPP-CE-EARBUDS-001');

update public.product_esg_metrics e
set
  lca_report_url = null,
  verified_by = null,
  methodology = case
    when p.dpp_id = 'DPP-TEX-TSHIRT-001'
      then 'Screening estimate based on material composition, factory energy and logistics records; third-party verification pending.'
    else 'Screening estimate based on component composition, assembly energy and logistics records; third-party verification pending.'
  end
from public.products p
where p.id = e.product_id
  and p.dpp_id in ('DPP-TEX-TSHIRT-001', 'DPP-CE-EARBUDS-001');

update public.product_traceability t
set
  facility_name = case
    when t.event_type like '%sourcing%' then 'Declared component or material supplier'
    when t.event_type = 'manufacturing' then 'Declared assembly facility'
    else 'EU distribution facility'
  end,
  facility_name_zh = case
    when t.event_type like '%sourcing%' then '已申报的材料或组件供应商'
    when t.event_type = 'manufacturing' then '已申报的装配工厂'
    else '欧盟分拨设施'
  end,
  verification_status = 'pending',
  notes = 'Organisation name and supporting evidence pending verification.',
  notes_zh = '组织名称和支持性证据待核验。'
from public.products p
where p.id = t.product_id
  and p.dpp_id in ('DPP-TEX-TSHIRT-001', 'DPP-CE-EARBUDS-001');

update public.product_consumer_transparency t
set
  brand_story = case when p.dpp_id = 'DPP-TEX-TSHIRT-001'
    then 'A cotton-rich garment designed for long use, repair and responsible textile collection.'
    else 'A compact audio product with disclosed materials, battery information and responsible electronics collection routes.' end,
  brand_story_zh = case when p.dpp_id = 'DPP-TEX-TSHIRT-001'
    then '一件面向长期使用、维修和负责任纺织品回收的棉质服装。'
    else '一款披露材料、电池信息和电子产品回收路径的便携音频产品。' end,
  sustainability_story = case when p.dpp_id = 'DPP-TEX-TSHIRT-001'
    then 'The passport records fibre composition, production traceability, care and recovery information.'
    else 'The passport records material composition, restricted-substance evidence status, repair and WEEE information.' end,
  sustainability_story_zh = case when p.dpp_id = 'DPP-TEX-TSHIRT-001'
    then '护照记录纤维成分、生产追溯、护理和回收信息。'
    else '护照记录材料组成、受限物质证据状态、维修和 WEEE 信息。' end
from public.products p
where p.id = t.product_id
  and p.dpp_id in ('DPP-TEX-TSHIRT-001', 'DPP-CE-EARBUDS-001');

update public.product_documents d
set
  document_name = case
    when p.dpp_id = 'DPP-TEX-TSHIRT-001' then 'Product carbon footprint supporting file - pending'
    when d.document_type = 'DoC' then 'EU Declaration of Conformity - pending'
    else 'Battery safety data sheet - pending'
  end,
  file_url = null
from public.products p
where p.id = d.product_id
  and p.dpp_id in ('DPP-TEX-TSHIRT-001', 'DPP-CE-EARBUDS-001');

insert into public.product_materials (
  id, product_id, material_name, material_name_zh, material_type, material_type_zh,
  percentage, recycled_content, origin_country, chemical_info, chemical_info_zh,
  recyclability, recyclability_zh, certification
)
select x.id, p.id, x.name, x.name_zh, x.type, x.type_zh, x.percentage,
  x.recycled, 'China', x.chemical, x.chemical_zh, x.recyclability,
  x.recyclability_zh, x.certification
from public.products p
cross join (values
  ('12000000-0000-4000-8000-000000000001'::uuid, 'LFP cell modules', '磷酸铁锂电芯模组', 'Active battery material', '电池活性材料', 72::numeric, 0::numeric, 'Lithium, iron, phosphate, graphite and electrolyte declarations pending.', '锂、铁、磷酸盐、石墨和电解液声明待补充。', 'Authorised industrial-battery recycling stream', '进入授权工业电池回收体系', 'Supplier material declaration pending'),
  ('12000000-0000-4000-8000-000000000002'::uuid, 'Steel and aluminium enclosure', '钢制与铝制外壳', 'Enclosure', '外壳', 18::numeric, 25::numeric, 'Restricted-substance declaration pending.', '受限物质声明待补充。', 'Metal recycling stream', '进入金属回收体系', 'Supplier material declaration pending'),
  ('12000000-0000-4000-8000-000000000003'::uuid, 'BMS, contactors and wiring', 'BMS、接触器与线束', 'Electronics', '电子组件', 10::numeric, 0::numeric, 'RoHS and REACH evidence pending.', 'RoHS 与 REACH 证据待补充。', 'WEEE stream after qualified dismantling', '由专业人员拆解后进入 WEEE 回收体系', 'Electrical component evidence pending')
) as x(id, name, name_zh, type, type_zh, percentage, recycled, chemical, chemical_zh, recyclability, recyclability_zh, certification)
where p.dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (id) do nothing;

insert into public.product_bom (
  id, product_id, component_name, component_name_zh, component_type,
  component_type_zh, quantity, unit, position
)
select x.id, p.id, x.name, x.name_zh, x.type, x.type_zh, x.quantity, x.unit, x.position
from public.products p
cross join (values
  ('12100000-0000-4000-8000-000000000001'::uuid, '51.2 V 280 Ah LFP battery module', '51.2V 280Ah 磷酸铁锂电池模组', 'Battery module', '电池模组', 1::numeric, 'module', 'Energy-storage cabinet'),
  ('12100000-0000-4000-8000-000000000002'::uuid, 'Battery management system', '电池管理系统', 'BMS', '电池管理系统', 1::numeric, 'set', 'Inside module'),
  ('12100000-0000-4000-8000-000000000003'::uuid, 'High-voltage protection and connector set', '高压保护与连接器组件', 'Electrical protection', '电气保护组件', 1::numeric, 'set', 'Inside module')
) as x(id, name, name_zh, type, type_zh, quantity, unit, position)
where p.dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (id) do nothing;

insert into public.product_esg_metrics (
  id, product_id, carbon_footprint, energy_consumption, waste_generation,
  recycled_content, chemical_management, methodology, verified_by
)
select '12200000-0000-4000-8000-000000000001'::uuid, id, 1032, 420, 9.8, 6,
  'Battery material, hazardous-substance and supplier declarations pending.',
  'Screening estimate per battery module based on material composition, assembly energy and logistics; third-party verification pending.',
  null
from public.products where dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (id) do nothing;

insert into public.product_certificates (
  id, product_id, certificate_name, certificate_name_zh, certificate_type,
  certificate_type_zh, verification_status, visibility_level
)
select x.id, p.id, x.name, x.name_zh, x.type, x.type_zh, 'pending', 'public'
from public.products p
cross join (values
  ('12300000-0000-4000-8000-000000000001'::uuid, 'UN38.3 transport test summary - pending', 'UN38.3 运输测试摘要 - 待提供', 'Battery safety', '电池安全'),
  ('12300000-0000-4000-8000-000000000002'::uuid, 'IEC 62619 industrial battery safety evidence - pending', 'IEC 62619 工业电池安全证据 - 待提供', 'Battery safety', '电池安全'),
  ('12300000-0000-4000-8000-000000000003'::uuid, 'EU battery declaration of conformity - pending', '欧盟电池符合性声明 - 待提供', 'Conformity', '符合性声明')
) as x(id, name, name_zh, type, type_zh)
where p.dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (id) do nothing;

insert into public.product_traceability (
  id, product_id, event_type, event_name, event_name_zh, event_date, country,
  city, facility_name, facility_name_zh, verification_status, notes, notes_zh
)
select x.id, p.id, x.type, x.name, x.name_zh, x.event_date, x.country,
  x.city, x.facility, x.facility_zh, 'pending',
  'Organisation name and supporting evidence pending verification.',
  '组织名称和支持性证据待核验。'
from public.products p
cross join (values
  ('12400000-0000-4000-8000-000000000001'::uuid, 'cell sourcing', 'LFP cell procurement recorded', '已记录磷酸铁锂电芯采购', '2026-05-08'::timestamptz, 'China', 'Shenzhen', 'Declared cell supplier', '已申报电芯供应商'),
  ('12400000-0000-4000-8000-000000000002'::uuid, 'manufacturing', 'Module assembly and end-of-line test', '模组装配与出厂测试', '2026-06-18'::timestamptz, 'China', 'Dongguan', 'Declared battery assembly facility', '已申报电池装配工厂'),
  ('12400000-0000-4000-8000-000000000003'::uuid, 'delivery', 'Delivery to system integrator', '交付储能系统集成商', '2026-07-02'::timestamptz, 'Germany', 'Hamburg', 'Declared system integration facility', '已申报系统集成设施')
) as x(id, type, name, name_zh, event_date, country, city, facility, facility_zh)
where p.dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (id) do nothing;

insert into public.product_circularity (
  id, product_id, repairability_score, recyclability_score, take_back_program,
  resale_supported, remanufacturing_supported, disassembly_guide,
  recycling_instructions, end_of_life_info
)
select '12500000-0000-4000-8000-000000000001'::uuid, id, 68, 88,
  'Authorised industrial-battery collection, service and repurposing network.',
  false, true,
  'Trained high-voltage technicians must isolate, discharge and remove the module before dismantling.',
  'Recover enclosure metals, copper, electronics and battery active materials through authorised facilities.',
  'Assess for second-life use before transfer to an authorised industrial-battery recycler.'
from public.products where dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (id) do nothing;

insert into public.product_consumer_transparency (
  id, product_id, brand_story, brand_story_zh, sustainability_story,
  sustainability_story_zh, consumer_notice, consumer_notice_zh, packaging_info
)
select '12600000-0000-4000-8000-000000000001'::uuid, id,
  'A modular stationary battery designed for commercial energy-storage systems.',
  '一款面向工商业储能系统的模块化固定式电池。',
  'The passport records material, carbon, durability, service and recovery information.',
  '护照记录材料、碳足迹、耐久性、维护和回收信息。',
  'Installation, operation and service are restricted to trained personnel.',
  '安装、运行和检修仅限经过培训的专业人员。',
  'Reusable transport frame; packaging record pending.'
from public.products where dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (id) do nothing;

insert into public.product_digital_identity (
  id, product_id, product_uuid, gtin, style_id, batch_id, serial_id,
  digital_link_url, data_carrier_type, qr_code_id
)
select '12700000-0000-4000-8000-000000000001'::uuid, id,
  'DPP-GV-ESS-14K3-000001', '06900000014336', 'GV-ESS-14K3-2026',
  'GV-ESS-BATCH-2026-01', 'GVESS14K3000001',
  'https://www.greanlean.com/p/DPP-GV-ESS-14K3-000001', 'qr',
  'QR-DPP-GV-ESS-14K3-000001'
from public.products where dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (id) do nothing;

insert into public.product_documents (
  id, product_id, document_name, document_type, language, uploaded_by,
  version, visibility_level
)
select x.id, p.id, x.name, x.type, 'EN / ZH', 'greanlean', 'v2.0', 'public'
from public.products p
cross join (values
  ('12800000-0000-4000-8000-000000000001'::uuid, 'Industrial battery safety evidence package - pending', 'Battery safety'),
  ('12800000-0000-4000-8000-000000000002'::uuid, 'Product carbon footprint supporting file - pending', 'Product carbon footprint')
) as x(id, name, type)
where p.dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (id) do nothing;

insert into public.product_data_governance (
  product_id, data_source, data_owner, audit_status, data_quality_score
)
select p.id, 'Published database records and declared product data',
  'Economic operator', 'company_statement_evidence_pending', 70
from public.products p
where p.dpp_id in (
  'DPP-LMT-BAT-48V15AH',
  'DPP-GV-ESS-14K3-000001',
  'DPP-TEX-TSHIRT-001',
  'DPP-CE-EARBUDS-001'
)
and not exists (
  select 1 from public.product_data_governance g where g.product_id = p.id
);

create or replace function public.greanlean_build_unified_public_snapshot(
  target_product_id uuid,
  battery_presentation jsonb default '{}'::jsonb
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'product', to_jsonb(p),
    'materials', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_materials x where x.product_id = p.id), '[]'::jsonb),
    'bom', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_bom x where x.product_id = p.id), '[]'::jsonb),
    'esg', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_esg_metrics x where x.product_id = p.id), '[]'::jsonb),
    'certificates', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_certificates x where x.product_id = p.id), '[]'::jsonb),
    'traceability', coalesce((select jsonb_agg(to_jsonb(x) order by x.event_date) from public.product_traceability x where x.product_id = p.id), '[]'::jsonb),
    'circularity', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_circularity x where x.product_id = p.id), '[]'::jsonb),
    'consumerTransparency', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_consumer_transparency x where x.product_id = p.id), '[]'::jsonb),
    'digitalIdentity', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_digital_identity x where x.product_id = p.id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_documents x where x.product_id = p.id), '[]'::jsonb),
    'governance', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_data_governance x where x.product_id = p.id), '[]'::jsonb),
    'sectorFieldValues', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.product_sector_field_values x where x.product_id = p.id and coalesce(x.visibility_level, 'public') = 'public' and lower(x.field_key) not in ('state_of_health', 'state_of_charge')), '[]'::jsonb),
    'batteryPresentation', battery_presentation
  )
  from public.products p
  where p.id = target_product_id;
$$;

with publications as (
  select
    p.id as product_id,
    'v2.0'::text as version,
    jsonb_build_object(
      'schema', 'greanlean.public-dpp',
      'schemaVersion', '2.0',
      'source', 'database-publication',
      'verificationState', 'company_statement_evidence_pending',
      'publicDpp', public.greanlean_build_unified_public_snapshot(
        p.id,
        case p.dpp_id
          when 'DPP-LMT-BAT-48V15AH' then '{
            "modelIdentifier":"GL-LMT-BAT-48V15AH",
            "serialNumber":"GLBAT48V15AH0001",
            "chemistry":"Lithium-ion NMC",
            "nominalVoltageV":48,
            "ratedCapacityAh":15,
            "ratedEnergyKWh":0.72,
            "massKg":4.2,
            "maximumPowerW":750,
            "initialEfficiencyPercent":94,
            "expectedCycles":800,
            "expectedCalendarYears":5,
            "idleTemperatureMinC":-20,
            "idleTemperatureMaxC":45,
            "carbonFootprintKgCO2e":62
          }'::jsonb
          when 'DPP-GV-ESS-14K3-000001' then '{
            "modelIdentifier":"GV-ESS-14K3-2026",
            "serialNumber":"GVESS14K3000001",
            "chemistry":"Lithium iron phosphate (LFP)",
            "nominalVoltageV":51.2,
            "ratedCapacityAh":280,
            "ratedEnergyKWh":14.336,
            "massKg":115,
            "maximumPowerW":10000,
            "initialEfficiencyPercent":95,
            "expectedCycles":6000,
            "expectedCalendarYears":15,
            "idleTemperatureMinC":-20,
            "idleTemperatureMaxC":50,
            "carbonFootprintKgCO2e":1032
          }'::jsonb
          else '{}'::jsonb
        end
      )
    ) as snapshot
  from public.products p
  where p.dpp_id in (
    'DPP-LMT-BAT-48V15AH',
    'DPP-GV-ESS-14K3-000001',
    'DPP-TEX-TSHIRT-001',
    'DPP-CE-EARBUDS-001'
  )
)
insert into public.product_versions (
  product_id, version, lifecycle_status, change_type, change_summary,
  changed_by, snapshot, data_hash, hash_algorithm
)
select
  product_id,
  version,
  'published',
  'unified_publication',
  'Unified public DPP publication sourced from database records.',
  'greanlean migration 0012',
  snapshot,
  encode(extensions.digest(snapshot::text, 'sha256'), 'hex'),
  'SHA-256'
from publications
on conflict (product_id, version) do update set
  lifecycle_status = excluded.lifecycle_status,
  change_type = excluded.change_type,
  change_summary = excluded.change_summary,
  changed_by = excluded.changed_by,
  snapshot = excluded.snapshot,
  data_hash = excluded.data_hash,
  hash_algorithm = excluded.hash_algorithm;

drop function public.greanlean_build_unified_public_snapshot(uuid, jsonb);

insert into public.dpp_identifier_alias (alias, product_id, alias_type)
select x.alias, p.id, x.alias_type
from (values
  ('DPP-DEMO-001', 'DPP-TEX-TSHIRT-001', 'dpp_id'),
  ('demo-organic-cotton-tshirt', 'DPP-TEX-TSHIRT-001', 'public_slug'),
  ('DPP-AUDIO-DEMO-001', 'DPP-CE-EARBUDS-001', 'dpp_id'),
  ('demo-wireless-earbuds', 'DPP-CE-EARBUDS-001', 'public_slug'),
  ('green-vault-ess-14-3-demo-000001', 'DPP-GV-ESS-14K3-000001', 'public_slug'),
  ('DPP-BAT-IND-ESS-14336-001', 'DPP-GV-ESS-14K3-000001', 'dpp_id')
) as x(alias, current_dpp_id, alias_type)
join public.products p on p.dpp_id = x.current_dpp_id
on conflict (alias) do update set
  product_id = excluded.product_id,
  alias_type = excluded.alias_type,
  is_active = true;

commit;
