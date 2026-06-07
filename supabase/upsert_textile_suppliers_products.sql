-- Adds two textile suppliers and three linked textile products per supplier.
-- Safe to run multiple times. Existing records are updated by supplier name / public_slug.

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.product_suppliers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_role text,
  relationship_status text default 'active',
  notes text,
  notes_zh text,
  created_at timestamptz default now(),
  unique (supplier_id, product_id)
);

alter table public.supplier_products enable row level security;

drop policy if exists "Authenticated can manage supplier products" on public.supplier_products;
create policy "Authenticated can manage supplier products"
on public.supplier_products for all to authenticated using (true) with check (true);

drop policy if exists "Public can read published supplier products" on public.supplier_products;
create policy "Public can read published supplier products"
on public.supplier_products for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);

update public.product_suppliers set
  supplier_type = 'Textile material supplier',
  country = 'China',
  city = 'Shaoxing',
  contact_person = 'Demo Sales Team',
  email = 'materials-demo@greanlean.com',
  certifications = 'GOTS, GRS, OEKO-TEX Standard 100, REACH SVHC declaration',
  esg_score = 82,
  facility_name = 'Shaoxing GreenWeave Dyeing and Finishing Facility',
  facility_name_zh = '绍兴 GreenWeave 染整与面料工厂',
  latitude = 30.0037,
  longitude = 120.5821
where supplier_name = 'Shaoxing GreenWeave Textile Materials Co., Ltd.';

insert into public.product_suppliers (
  supplier_name, supplier_type, country, city, contact_person, email, certifications,
  esg_score, facility_name, facility_name_zh, latitude, longitude
)
select
  'Shaoxing GreenWeave Textile Materials Co., Ltd.',
  'Textile material supplier',
  'China',
  'Shaoxing',
  'Demo Sales Team',
  'materials-demo@greanlean.com',
  'GOTS, GRS, OEKO-TEX Standard 100, REACH SVHC declaration',
  82,
  'Shaoxing GreenWeave Dyeing and Finishing Facility',
  '绍兴 GreenWeave 染整与面料工厂',
  30.0037,
  120.5821
where not exists (
  select 1 from public.product_suppliers where supplier_name = 'Shaoxing GreenWeave Textile Materials Co., Ltd.'
);

update public.product_suppliers set
  supplier_type = 'Garment manufacturing supplier',
  country = 'China',
  city = 'Ningbo',
  contact_person = 'Demo Operations Team',
  email = 'factory-demo@greanlean.com',
  certifications = 'ISO9001, BSCI, OEKO-TEX Standard 100, Higg FEM demo profile',
  esg_score = 79,
  facility_name = 'Ningbo EcoStitch Cut-Sew-Pack Factory',
  facility_name_zh = '宁波 EcoStitch 裁剪缝制包装工厂',
  latitude = 29.8683,
  longitude = 121.5440
where supplier_name = 'Ningbo EcoStitch Garment Manufacturing Co., Ltd.';

insert into public.product_suppliers (
  supplier_name, supplier_type, country, city, contact_person, email, certifications,
  esg_score, facility_name, facility_name_zh, latitude, longitude
)
select
  'Ningbo EcoStitch Garment Manufacturing Co., Ltd.',
  'Garment manufacturing supplier',
  'China',
  'Ningbo',
  'Demo Operations Team',
  'factory-demo@greanlean.com',
  'ISO9001, BSCI, OEKO-TEX Standard 100, Higg FEM demo profile',
  79,
  'Ningbo EcoStitch Cut-Sew-Pack Factory',
  '宁波 EcoStitch 裁剪缝制包装工厂',
  29.8683,
  121.5440
where not exists (
  select 1 from public.product_suppliers where supplier_name = 'Ningbo EcoStitch Garment Manufacturing Co., Ltd.'
);

insert into public.products (
  name, name_zh, sku, brand, category, subcategory, season, description, description_zh,
  status, dpp_id, public_slug, main_image, care_instructions, care_instructions_zh,
  repair_instructions, repair_instructions_zh, end_of_life_instructions, end_of_life_instructions_zh
)
values
  (
    'Organic Cotton Jersey Fabric',
    '有机棉针织面料',
    'GW-JERSEY-180',
    'GreenWeave',
    'Textile & Apparel',
    'Fabric',
    '2026 Textile Demo',
    'Organic cotton single jersey fabric for T-shirts and light apparel.',
    '用于 T 恤和轻薄服装的有机棉单面针织面料。',
    'published',
    'DPP-TEX-GW-JERSEY-180',
    'demo-organic-cotton-jersey-fabric',
    '/images/demo-organic-cotton-tshirt.png',
    'Wash cold before cutting where shrinkage validation is required.',
    '如需验证缩水率，建议裁剪前冷水预洗。',
    'Fabric repair depends on finished garment construction.',
    '面料维修方式取决于最终成衣结构。',
    'Reuse offcuts where possible; sort cotton-rich waste for textile recycling.',
    '优先再利用边角料；棉含量较高废料进入纺织品回收。'
  ),
  (
    'Recycled Polyester Rib Trim',
    '再生涤纶罗纹辅料',
    'GW-RIB-RPET-032',
    'GreenWeave',
    'Textile & Apparel',
    'Trim',
    '2026 Textile Demo',
    'Recycled polyester rib trim used for collar and cuff applications.',
    '用于领口和袖口的再生涤纶罗纹辅料。',
    'published',
    'DPP-TEX-GW-RIB-RPET-032',
    'demo-recycled-polyester-rib-trim',
    '/images/demo-organic-cotton-tshirt.png',
    'Avoid high-temperature ironing directly on rib trim.',
    '避免高温熨烫直接接触罗纹辅料。',
    'Replace trim during garment repair when elasticity is lost.',
    '弹性下降时可在成衣维修中更换辅料。',
    'Separate trim where recycler requires mono-material sorting.',
    '如回收方要求单一材质分拣，需分离辅料。'
  ),
  (
    'Low-Impact Dyed Cotton Poplin',
    '低影响染色棉府绸',
    'GW-POPLIN-120',
    'GreenWeave',
    'Textile & Apparel',
    'Fabric',
    '2026 Textile Demo',
    'Cotton poplin fabric processed with low-impact dyeing for shirts.',
    '采用低影响染色工艺的衬衫用棉府绸面料。',
    'published',
    'DPP-TEX-GW-POPLIN-120',
    'demo-low-impact-cotton-poplin',
    '/images/demo-organic-cotton-tshirt.png',
    'Machine wash cold; avoid chlorine bleach.',
    '冷水机洗，避免含氯漂白。',
    'Patch repair is suitable for small tears.',
    '小面积破损可进行补片维修。',
    'Collect as cotton textile waste after removing non-textile trims.',
    '移除非纺织辅料后按棉纺织废料回收。'
  ),
  (
    'Organic Cotton T-Shirt OEM Batch',
    '有机棉 T 恤 OEM 批次',
    'ES-TEE-OEM-001',
    'EcoStitch',
    'Textile & Apparel',
    'T-Shirt',
    '2026 Textile Demo',
    'OEM cut-sew-pack batch for organic cotton T-shirts exported to the EU.',
    '出口欧盟有机棉 T 恤 OEM 裁剪缝制包装批次。',
    'published',
    'DPP-TEX-ES-TEE-OEM-001',
    'demo-organic-cotton-tshirt-oem-batch',
    '/images/demo-organic-cotton-tshirt.png',
    'Machine wash cold with similar colors.',
    '建议冷水机洗并与相近颜色同洗。',
    'Repair minor seam damage with cotton or polyester thread.',
    '轻微线缝破损可用棉线或涤纶线修补。',
    'Reuse first, then sort through textile take-back channels.',
    '优先再使用，再通过纺织品回收渠道分类回收。'
  ),
  (
    'Cotton Workwear Shirt OEM Batch',
    '棉质工装衬衫 OEM 批次',
    'ES-SHIRT-OEM-002',
    'EcoStitch',
    'Textile & Apparel',
    'Shirt',
    '2026 Textile Demo',
    'Durable cotton workwear shirt batch with button and label BOM records.',
    '含纽扣和标签 BOM 记录的耐用棉质工装衬衫批次。',
    'published',
    'DPP-TEX-ES-SHIRT-OEM-002',
    'demo-cotton-workwear-shirt-oem-batch',
    '/images/demo-organic-cotton-tshirt.png',
    'Wash inside out to protect color and surface.',
    '建议反面洗涤以保护颜色和表面。',
    'Buttons and seams are replaceable through standard garment repair.',
    '纽扣和线缝可通过常规服装修补更换。',
    'Remove buttons if local recycler requires trim separation.',
    '如当地回收方要求辅料分离，回收前移除纽扣。'
  ),
  (
    'Recycled Polyester Hoodie OEM Batch',
    '再生涤纶连帽衫 OEM 批次',
    'ES-HOODIE-OEM-003',
    'EcoStitch',
    'Textile & Apparel',
    'Hoodie',
    '2026 Textile Demo',
    'Cut-sew-pack hoodie batch using recycled polyester fleece and drawcord trims.',
    '使用再生涤纶抓绒和抽绳辅料的连帽衫裁剪缝制包装批次。',
    'published',
    'DPP-TEX-ES-HOODIE-OEM-003',
    'demo-recycled-polyester-hoodie-oem-batch',
    '/images/demo-organic-cotton-tshirt.png',
    'Wash cold; use microfiber filter bag where available.',
    '冷水洗涤；如有条件建议使用微纤维过滤洗衣袋。',
    'Replace drawcords and zipper pulls before disposal where possible.',
    '报废前优先更换抽绳和拉链头等辅料。',
    'Sort as polyester-rich textile waste where recycling facilities exist.',
    '具备回收设施时按涤纶含量较高纺织废料分类。'
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
  material_supplier_id uuid;
  garment_supplier_id uuid;
  product_record record;
begin
  select id into material_supplier_id
  from public.product_suppliers
  where supplier_name = 'Shaoxing GreenWeave Textile Materials Co., Ltd.';

  select id into garment_supplier_id
  from public.product_suppliers
  where supplier_name = 'Ningbo EcoStitch Garment Manufacturing Co., Ltd.';

  for product_record in
    select id, sku from public.products
    where sku in ('GW-JERSEY-180', 'GW-RIB-RPET-032', 'GW-POPLIN-120')
  loop
    insert into public.supplier_products (
      supplier_id, product_id, supplier_role, relationship_status, notes, notes_zh
    )
    values (
      material_supplier_id,
      product_record.id,
      'Material supplier',
      'active',
      'Demo textile material supplier linked for DPP supplier-product relationship testing.',
      '用于 DPP 供应商-产品关系测试的示例纺织材料供应商。'
    )
    on conflict (supplier_id, product_id) do update set
      supplier_role = excluded.supplier_role,
      relationship_status = excluded.relationship_status,
      notes = excluded.notes,
      notes_zh = excluded.notes_zh;
  end loop;

  for product_record in
    select id, sku from public.products
    where sku in ('ES-TEE-OEM-001', 'ES-SHIRT-OEM-002', 'ES-HOODIE-OEM-003')
  loop
    insert into public.supplier_products (
      supplier_id, product_id, supplier_role, relationship_status, notes, notes_zh
    )
    values (
      garment_supplier_id,
      product_record.id,
      'Cut-sew-pack manufacturer',
      'active',
      'Demo garment manufacturing supplier linked for DPP supplier-product relationship testing.',
      '用于 DPP 供应商-产品关系测试的示例成衣制造供应商。'
    )
    on conflict (supplier_id, product_id) do update set
      supplier_role = excluded.supplier_role,
      relationship_status = excluded.relationship_status,
      notes = excluded.notes,
      notes_zh = excluded.notes_zh;
  end loop;
end $$;
