create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  contact text not null,
  industry text,
  message text,
  status text default 'new',
  source text default 'greanlean.com',
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  brand text,
  category text,
  subcategory text,
  description text,
  status text default 'draft',
  dpp_id text unique,
  public_slug text unique,
  main_image text,
  name_zh text,
  description_zh text,
  season text,
  care_instructions text,
  care_instructions_zh text,
  repair_instructions text,
  repair_instructions_zh text,
  end_of_life_instructions text,
  end_of_life_instructions_zh text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  supplier_type text,
  country text,
  city text,
  contact_person text,
  email text,
  certifications text,
  esg_score numeric,
  facility_name text,
  facility_name_zh text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz default now()
);

create table if not exists public.product_materials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  supplier_id uuid references public.product_suppliers(id) on delete set null,
  material_name text not null,
  material_name_zh text,
  material_type text,
  material_type_zh text,
  percentage numeric,
  recycled_content numeric,
  origin_country text,
  chemical_info text,
  chemical_info_zh text,
  recyclability text,
  recyclability_zh text,
  certification text,
  created_at timestamptz default now()
);

create table if not exists public.product_bom (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  component_name text not null,
  component_name_zh text,
  component_type text,
  component_type_zh text,
  quantity numeric,
  unit text,
  position text,
  created_at timestamptz default now()
);

create table if not exists public.product_esg_metrics (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  carbon_footprint numeric,
  water_usage numeric,
  energy_consumption numeric,
  waste_generation numeric,
  recycled_content numeric,
  chemical_management text,
  lca_report_url text,
  methodology text,
  verified_by text,
  created_at timestamptz default now()
);

create table if not exists public.product_certificates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  supplier_id uuid references public.product_suppliers(id) on delete set null,
  certificate_name text not null,
  certificate_name_zh text,
  certificate_type text,
  certificate_type_zh text,
  certificate_number text,
  issuer text,
  issue_date date,
  expiry_date date,
  certificate_url text,
  verification_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.product_traceability (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  event_type text,
  event_name text not null,
  event_name_zh text,
  event_date timestamptz,
  country text,
  city text,
  facility_name text,
  facility_name_zh text,
  supplier_name text,
  transport_method text,
  verification_status text default 'pending',
  notes text,
  notes_zh text,
  created_at timestamptz default now()
);

create table if not exists public.product_circularity (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  repairability_score numeric,
  recyclability_score numeric,
  take_back_program text,
  resale_supported boolean default false,
  remanufacturing_supported boolean default false,
  disassembly_guide text,
  recycling_instructions text,
  end_of_life_info text,
  created_at timestamptz default now()
);

create table if not exists public.product_consumer_transparency (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  brand_story text,
  brand_story_zh text,
  sustainability_story text,
  sustainability_story_zh text,
  consumer_notice text,
  consumer_notice_zh text,
  marketing_content text,
  marketing_content_zh text,
  packaging_info text,
  created_at timestamptz default now()
);

create table if not exists public.product_digital_identity (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  product_uuid text,
  gtin text,
  style_id text,
  batch_id text,
  serial_id text,
  digital_link_url text,
  qr_code_id text,
  nfc_id text,
  rfid_epc text,
  created_at timestamptz default now()
);

create table if not exists public.product_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  document_name text not null,
  document_type text,
  file_url text,
  file_size text,
  language text,
  uploaded_by text,
  version text,
  created_at timestamptz default now()
);

create table if not exists public.product_data_governance (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  data_source text,
  data_owner text,
  audit_status text,
  data_quality_score numeric,
  created_at timestamptz default now()
);

alter table public.leads enable row level security;
alter table public.products enable row level security;
alter table public.product_suppliers enable row level security;
alter table public.product_materials enable row level security;
alter table public.product_bom enable row level security;
alter table public.product_esg_metrics enable row level security;
alter table public.product_certificates enable row level security;
alter table public.product_traceability enable row level security;
alter table public.product_circularity enable row level security;
alter table public.product_consumer_transparency enable row level security;
alter table public.product_digital_identity enable row level security;
alter table public.product_documents enable row level security;
alter table public.product_data_governance enable row level security;

drop policy if exists "Anyone can create leads" on public.leads;
create policy "Anyone can create leads" on public.leads for insert to anon with check (true);

drop policy if exists "Authenticated can manage products" on public.products;
create policy "Authenticated can manage products" on public.products for all to authenticated using (true) with check (true);
drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products" on public.products for select to anon using (status = 'published');

drop policy if exists "Authenticated can manage suppliers" on public.product_suppliers;
create policy "Authenticated can manage suppliers" on public.product_suppliers for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage materials" on public.product_materials;
create policy "Authenticated can manage materials" on public.product_materials for all to authenticated using (true) with check (true);
drop policy if exists "Public can read materials" on public.product_materials;
create policy "Public can read materials" on public.product_materials for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage bom" on public.product_bom;
create policy "Authenticated can manage bom" on public.product_bom for all to authenticated using (true) with check (true);
drop policy if exists "Public can read bom" on public.product_bom;
create policy "Public can read bom" on public.product_bom for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage esg" on public.product_esg_metrics;
create policy "Authenticated can manage esg" on public.product_esg_metrics for all to authenticated using (true) with check (true);
drop policy if exists "Public can read esg" on public.product_esg_metrics;
create policy "Public can read esg" on public.product_esg_metrics for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage certificates" on public.product_certificates;
create policy "Authenticated can manage certificates" on public.product_certificates for all to authenticated using (true) with check (true);
drop policy if exists "Public can read certificates" on public.product_certificates;
create policy "Public can read certificates" on public.product_certificates for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage traceability" on public.product_traceability;
create policy "Authenticated can manage traceability" on public.product_traceability for all to authenticated using (true) with check (true);
drop policy if exists "Public can read traceability" on public.product_traceability;
create policy "Public can read traceability" on public.product_traceability for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage circularity" on public.product_circularity;
create policy "Authenticated can manage circularity" on public.product_circularity for all to authenticated using (true) with check (true);
drop policy if exists "Public can read circularity" on public.product_circularity;
create policy "Public can read circularity" on public.product_circularity for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage consumer transparency" on public.product_consumer_transparency;
create policy "Authenticated can manage consumer transparency" on public.product_consumer_transparency for all to authenticated using (true) with check (true);
drop policy if exists "Public can read consumer transparency" on public.product_consumer_transparency;
create policy "Public can read consumer transparency" on public.product_consumer_transparency for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage digital identity" on public.product_digital_identity;
create policy "Authenticated can manage digital identity" on public.product_digital_identity for all to authenticated using (true) with check (true);
drop policy if exists "Public can read digital identity" on public.product_digital_identity;
create policy "Public can read digital identity" on public.product_digital_identity for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage documents" on public.product_documents;
create policy "Authenticated can manage documents" on public.product_documents for all to authenticated using (true) with check (true);
drop policy if exists "Public can read documents" on public.product_documents;
create policy "Public can read documents" on public.product_documents for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage governance" on public.product_data_governance;
create policy "Authenticated can manage governance" on public.product_data_governance for all to authenticated using (true) with check (true);
drop policy if exists "Public can read governance" on public.product_data_governance;
create policy "Public can read governance" on public.product_data_governance for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

insert into public.products (
  name, name_zh, sku, brand, category, subcategory, season, description, description_zh,
  status, dpp_id, public_slug, main_image, care_instructions, care_instructions_zh,
  repair_instructions, repair_instructions_zh, end_of_life_instructions, end_of_life_instructions_zh
)
values (
  'Organic Cotton T-Shirt',
  '有机棉基础 T 恤',
  'GL-TSHIRT-001',
  'greanlean',
  'Textile & Apparel',
  'T-Shirt',
  '2026 Core Collection',
  'A demo digital product passport for sustainable apparel, covering identity, materials, production traceability, ESG metrics, certificates and consumer transparency.',
  '用于展示欧盟 DPP 数据结构的可持续服装样品，覆盖产品身份、材料来源、生产追溯、ESG、证书和消费者透明化信息。',
  'published',
  'DPP-DEMO-001',
  'demo-organic-cotton-tshirt',
  '/images/demo-organic-cotton-tshirt.png',
  'Machine wash cold with similar colors. Do not bleach. Line dry where possible to reduce energy use.',
  '建议冷水机洗并与相近颜色衣物同洗。不可漂白，优先自然晾干以减少能源消耗。',
  'Minor seam damage can be repaired with standard cotton thread. Keep spare buttons and repair before disposal.',
  '轻微线缝破损可使用普通棉线修补。建议保留备用纽扣，报废前优先维修。',
  'Reuse, donate or return through textile take-back channels. Remove non-textile trims before recycling where required.',
  '建议优先再使用、捐赠或通过纺织品回收渠道回收。必要时在回收前移除非纺织辅料。'
)
on conflict (public_slug) do update set
  name = excluded.name,
  name_zh = excluded.name_zh,
  sku = excluded.sku,
  brand = excluded.brand,
  category = excluded.category,
  subcategory = excluded.subcategory,
  season = excluded.season,
  description = excluded.description,
  description_zh = excluded.description_zh,
  status = excluded.status,
  dpp_id = excluded.dpp_id,
  main_image = excluded.main_image,
  care_instructions = excluded.care_instructions,
  care_instructions_zh = excluded.care_instructions_zh,
  repair_instructions = excluded.repair_instructions,
  repair_instructions_zh = excluded.repair_instructions_zh,
  end_of_life_instructions = excluded.end_of_life_instructions,
  end_of_life_instructions_zh = excluded.end_of_life_instructions_zh,
  updated_at = now();

do $$
declare
  demo_product_id uuid;
begin
  select id into demo_product_id
  from public.products
  where public_slug = 'demo-organic-cotton-tshirt';

  delete from public.product_materials where product_id = demo_product_id;
  delete from public.product_bom where product_id = demo_product_id;
  delete from public.product_esg_metrics where product_id = demo_product_id;
  delete from public.product_certificates where product_id = demo_product_id;
  delete from public.product_traceability where product_id = demo_product_id;
  delete from public.product_circularity where product_id = demo_product_id;
  delete from public.product_consumer_transparency where product_id = demo_product_id;
  delete from public.product_digital_identity where product_id = demo_product_id;
  delete from public.product_documents where product_id = demo_product_id;
  delete from public.product_data_governance where product_id = demo_product_id;

  insert into public.product_materials (
    product_id, material_name, material_name_zh, material_type, material_type_zh,
    percentage, recycled_content, origin_country, chemical_info, chemical_info_zh,
    recyclability, recyclability_zh, certification
  )
  values
    (
      demo_product_id,
      'Organic cotton',
      '有机棉',
      'Fiber',
      '纤维',
      95,
      0,
      'China',
      'Low-impact reactive dyeing; restricted substances screened against OEKO-TEX requirements.',
      '采用低影响活性染色，并按 OEKO-TEX 要求筛查受限物质。',
      'Recyclable through cotton textile recycling streams',
      '可进入棉纺织品回收体系',
      'GOTS / OEKO-TEX'
    ),
    (
      demo_product_id,
      'Recycled polyester sewing thread',
      '再生涤纶缝纫线',
      'Trim',
      '辅料',
      5,
      80,
      'China',
      'Dope-dyed thread to reduce dyeing water use.',
      '原液着色缝纫线，减少染色用水。',
      'Separable during textile recycling when required',
      '必要时可在纺织品回收过程中分离',
      'GRS'
    );

  insert into public.product_bom (
    product_id, component_name, component_name_zh, component_type, component_type_zh,
    quantity, unit, position
  )
  values
    (demo_product_id, 'Main body fabric', '主身面料', 'Fabric', '面料', 180, 'g', 'Body'),
    (demo_product_id, 'Neck label', '领标', 'Label', '标签', 1, 'pc', 'Inside neck');

  insert into public.product_traceability (
    product_id, event_type, event_name, event_name_zh, event_date, country, city,
    facility_name, facility_name_zh, transport_method, verification_status, notes, notes_zh
  )
  values
    (
      demo_product_id,
      'material sourcing',
      'Organic cotton yarn sourced',
      '采购有机棉纱线',
      '2026-03-18'::timestamp,
      'China',
      'Aksu',
      'Demo Organic Cotton Cooperative',
      '示例有机棉合作社',
      'Truck',
      'verified',
      'Supplier declaration and scope certificate checked.',
      '已核查供应商声明和范围证书。'
    ),
    (
      demo_product_id,
      'manufacturing',
      'Knitting, cutting and sewing',
      '织造、裁剪与缝制',
      '2026-04-22'::timestamp,
      'China',
      'Ningbo',
      'Demo Garment Factory',
      '示例服装工厂',
      'Internal transfer',
      'verified',
      'Production batch record linked to SKU GL-TSHIRT-001.',
      '生产批次记录已关联 SKU GL-TSHIRT-001。'
    ),
    (
      demo_product_id,
      'transport',
      'Export shipment to EU warehouse',
      '出口运输至欧盟仓库',
      '2026-05-06'::timestamp,
      'Germany',
      'Hamburg',
      'Demo EU Distribution Warehouse',
      '示例欧盟分拨仓',
      'Sea freight + rail',
      'pending',
      'Shipment data reserved for carrier API connection.',
      '运输数据预留给后续承运商 API 对接。'
    );

  insert into public.product_esg_metrics (
    product_id, carbon_footprint, water_usage, energy_consumption, waste_generation,
    recycled_content, chemical_management, lca_report_url, methodology, verified_by
  )
  values (
    demo_product_id,
    3.2,
    118,
    8.4,
    0.38,
    4,
    'Restricted substance list and supplier declarations reviewed.',
    '/api/dpp-export?format=pdf&product=demo-organic-cotton-tshirt',
    'Internal screening LCA based on factory energy, material composition and logistics assumptions.',
    'greanlean review'
  );

  insert into public.product_circularity (
    product_id, repairability_score, recyclability_score, take_back_program,
    resale_supported, remanufacturing_supported, disassembly_guide,
    recycling_instructions, end_of_life_info
  )
  values (
    demo_product_id,
    72,
    81,
    'Eligible for brand textile take-back and resale screening.',
    true,
    false,
    'Remove neck label and trims if required by recycler.',
    'Sort as cotton-rich textile waste.',
    'Designed for reuse first, then textile recycling.'
  );

  insert into public.product_certificates (
    product_id, certificate_name, certificate_name_zh, certificate_type, certificate_type_zh,
    certificate_number, issuer, issue_date, expiry_date, certificate_url, verification_status
  )
  values
    (
      demo_product_id,
      'GOTS Scope Certificate',
      'GOTS 范围证书',
      'Material',
      '材料认证',
      'GOTS-DEMO-2026-001',
      'Demo Certification Body',
      '2026-01-15'::date,
      '2027-01-14'::date,
      '/api/chemical-document?type=svhc&product=demo-organic-cotton-tshirt',
      'verified'
    ),
    (
      demo_product_id,
      'OEKO-TEX Standard 100',
      'OEKO-TEX Standard 100',
      'Chemical safety',
      '化学安全',
      'OEKO-DEMO-2026-018',
      'Demo Textile Testing Institute',
      '2026-02-01'::date,
      '2027-01-31'::date,
      '/api/chemical-document?type=heavy-metals&product=demo-organic-cotton-tshirt',
      'verified'
    );

  insert into public.product_consumer_transparency (
    product_id, brand_story, brand_story_zh, sustainability_story, sustainability_story_zh,
    consumer_notice, consumer_notice_zh, packaging_info
  )
  values (
    demo_product_id,
    'This product demonstrates how apparel data can be turned into a consumer-readable digital passport.',
    '该产品用于展示如何把服装数据转化为消费者可读的数字产品护照。',
    'Organic cotton, lower-impact dyeing and documented supplier traceability are recorded in this DPP.',
    '本 DPP 记录有机棉、低影响染色和供应商追溯信息。',
    'Color may vary slightly by batch. Scan this page again before resale or recycling for updated product information.',
    '不同批次颜色可能略有差异。转售或回收前可再次扫码查看更新后的产品信息。',
    'Recycled paper hangtag and recyclable polybag where local infrastructure accepts it.'
  );

  insert into public.product_digital_identity (
    product_id, product_uuid, gtin, style_id, batch_id, serial_id,
    digital_link_url, qr_code_id, nfc_id, rfid_epc
  )
  values (
    demo_product_id,
    '7b78c8c6-8f0d-4e0e-a9f6-demo000001',
    '06900000000012',
    'STYLE-TEE-ORG-001',
    'BATCH-2026-001',
    'DEMO-TEE-0001',
    'https://www.greanlean.com/p/demo-organic-cotton-tshirt',
    'QR-DPP-DEMO-001',
    'NFC-RESERVED',
    'RFID-RESERVED'
  );

  insert into public.product_documents (
    product_id, document_name, document_type, file_url, file_size, language, uploaded_by, version
  )
  values (
    demo_product_id,
    'Demo LCA Summary',
    'LCA',
    '/api/dpp-export?format=pdf&product=demo-organic-cotton-tshirt',
    '420 KB',
    'EN / ZH',
    'greanlean admin',
    'v1.0'
  );

  insert into public.product_data_governance (
    product_id, data_source, data_owner, audit_status, data_quality_score
  )
  values (
    demo_product_id,
    'Supplier declarations, certificates, factory batch records and logistics documents.',
    'greanlean admin',
    'Internal review completed',
    86
  );
end $$;
