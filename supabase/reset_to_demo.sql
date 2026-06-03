-- Destructive reset: clears current DPP business data and keeps only the demo DPP.
-- Run supabase/schema.sql first if these tables do not exist yet.

begin;

truncate table
  public.leads,
  public.product_data_governance,
  public.product_documents,
  public.product_digital_identity,
  public.product_consumer_transparency,
  public.product_circularity,
  public.product_traceability,
  public.product_certificates,
  public.product_esg_metrics,
  public.product_bom,
  public.product_materials,
  public.product_suppliers,
  public.products
restart identity cascade;

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
);

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_materials (
  product_id, material_name, material_name_zh, material_type, material_type_zh,
  percentage, recycled_content, origin_country, chemical_info, chemical_info_zh,
  recyclability, recyclability_zh, certification
)
select id, 'Organic cotton', '有机棉', 'Fiber', '纤维', 95, 0, 'China',
  'Low-impact reactive dyeing; restricted substances screened against OEKO-TEX requirements.',
  '采用低影响活性染色，并按 OEKO-TEX 要求筛查受限物质。',
  'Recyclable through cotton textile recycling streams',
  '可进入棉纺织品回收体系',
  'GOTS / OEKO-TEX'
from demo
union all
select id, 'Recycled polyester sewing thread', '再生涤纶缝纫线', 'Trim', '辅料', 5, 80, 'China',
  'Dope-dyed thread to reduce dyeing water use.',
  '原液着色缝纫线，减少染色用水。',
  'Separable during textile recycling when required',
  '必要时可在纺织品回收过程中分离',
  'GRS'
from demo;

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_bom (
  product_id, component_name, component_name_zh, component_type, component_type_zh,
  quantity, unit, position
)
select id, 'Main body fabric', '主身面料', 'Fabric', '面料', 180, 'g', 'Body' from demo
union all
select id, 'Neck label', '领标', 'Label', '标签', 1, 'pc', 'Inside neck' from demo;

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_traceability (
  product_id, event_type, event_name, event_name_zh, event_date, country, city,
  facility_name, facility_name_zh, transport_method, verification_status, notes, notes_zh
)
select id, 'material sourcing', 'Organic cotton yarn sourced', '采购有机棉纱线', '2026-03-18'::timestamp, 'China', 'Aksu',
  'Demo Organic Cotton Cooperative', '示例有机棉合作社', 'Truck', 'verified',
  'Supplier declaration and scope certificate checked.', '已核查供应商声明和范围证书。'
from demo
union all
select id, 'manufacturing', 'Knitting, cutting and sewing', '织造、裁剪与缝制', '2026-04-22'::timestamp, 'China', 'Ningbo',
  'Demo Garment Factory', '示例服装工厂', 'Internal transfer', 'verified',
  'Production batch record linked to SKU GL-TSHIRT-001.', '生产批次记录已关联 SKU GL-TSHIRT-001。'
from demo
union all
select id, 'transport', 'Export shipment to EU warehouse', '出口运输至欧盟仓库', '2026-05-06'::timestamp, 'Germany', 'Hamburg',
  'Demo EU Distribution Warehouse', '示例欧盟分拨仓', 'Sea freight + rail', 'pending',
  'Shipment data reserved for carrier API connection.', '运输数据预留给后续承运商 API 对接。'
from demo;

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_esg_metrics (
  product_id, carbon_footprint, water_usage, energy_consumption, waste_generation,
  recycled_content, chemical_management, lca_report_url, methodology, verified_by
)
select id, 3.2, 118, 8.4, 0.38, 4,
  'Restricted substance list and supplier declarations reviewed.',
  'https://example.com/lca-demo-report.pdf',
  'Internal screening LCA based on factory energy, material composition and logistics assumptions.',
  'greanlean review'
from demo;

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_circularity (
  product_id, repairability_score, recyclability_score, take_back_program,
  resale_supported, remanufacturing_supported, disassembly_guide,
  recycling_instructions, end_of_life_info
)
select id, 72, 81,
  'Eligible for brand textile take-back and resale screening.',
  true,
  false,
  'Remove neck label and trims if required by recycler.',
  'Sort as cotton-rich textile waste.',
  'Designed for reuse first, then textile recycling.'
from demo;

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_certificates (
  product_id, certificate_name, certificate_name_zh, certificate_type, certificate_type_zh,
  certificate_number, issuer, issue_date, expiry_date, certificate_url, verification_status
)
select id, 'GOTS Scope Certificate', 'GOTS 范围证书', 'Material', '材料认证',
  'GOTS-DEMO-2026-001', 'Demo Certification Body', '2026-01-15'::date, '2027-01-14'::date,
  'https://example.com/gots-demo-certificate.pdf', 'verified'
from demo
union all
select id, 'OEKO-TEX Standard 100', 'OEKO-TEX Standard 100', 'Chemical safety', '化学安全',
  'OEKO-DEMO-2026-018', 'Demo Textile Testing Institute', '2026-02-01'::date, '2027-01-31'::date,
  'https://example.com/oeko-tex-demo-certificate.pdf', 'verified'
from demo;

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_consumer_transparency (
  product_id, brand_story, brand_story_zh, sustainability_story, sustainability_story_zh,
  consumer_notice, consumer_notice_zh, packaging_info
)
select id,
  'This product demonstrates how apparel data can be turned into a consumer-readable digital passport.',
  '该产品用于展示如何把服装数据转化为消费者可读的数字产品护照。',
  'Organic cotton, lower-impact dyeing and documented supplier traceability are recorded in this DPP.',
  '本 DPP 记录有机棉、低影响染色和供应商追溯信息。',
  'Color may vary slightly by batch. Scan this page again before resale or recycling for updated product information.',
  '不同批次颜色可能略有差异。转售或回收前可再次扫码查看更新后的产品信息。',
  'Recycled paper hangtag and recyclable polybag where local infrastructure accepts it.'
from demo;

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_digital_identity (
  product_id, product_uuid, gtin, style_id, batch_id, serial_id,
  digital_link_url, qr_code_id, nfc_id, rfid_epc
)
select id,
  '7b78c8c6-8f0d-4e0e-a9f6-demo000001',
  '06900000000012',
  'STYLE-TEE-ORG-001',
  'BATCH-2026-001',
  'DEMO-TEE-0001',
  'https://www.greanlean.com/p/demo-organic-cotton-tshirt',
  'QR-DPP-DEMO-001',
  'NFC-RESERVED',
  'RFID-RESERVED'
from demo;

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_documents (
  product_id, document_name, document_type, file_url, file_size, language, uploaded_by, version
)
select id, 'Demo LCA Summary', 'LCA', 'https://example.com/lca-demo-report.pdf',
  '420 KB', 'EN / ZH', 'greanlean admin', 'v1.0'
from demo;

with demo as (
  select id from public.products where public_slug = 'demo-organic-cotton-tshirt'
)
insert into public.product_data_governance (
  product_id, data_source, data_owner, audit_status, data_quality_score
)
select id,
  'Supplier declarations, certificates, factory batch records and logistics documents.',
  'greanlean admin',
  'Internal review completed',
  86
from demo;

commit;
