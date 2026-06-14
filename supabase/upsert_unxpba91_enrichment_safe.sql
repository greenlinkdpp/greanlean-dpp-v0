-- Safe SQL version for Supabase SQL Editor.
-- No DO $$ block is used, so partial dollar-quote copy errors are avoided.
-- Scope: only DPP-UNXPBA91 / TEXTILE-VEST-002.

begin;

drop table if exists _dpp_unxpba91_target;

create temp table if not exists _dpp_unxpba91_target as
select id as product_id
from public.products
where dpp_id = 'DPP-UNXPBA91' or sku = 'TEXTILE-VEST-002'
limit 1;

-- Stop with no changes if the target product does not exist.
-- You should see one row here before continuing.
select product_id as target_product_id from _dpp_unxpba91_target;

update public.products p
set
  season = coalesce(p.season, '2026 Outdoor & Active Layering'),
  care_instructions = coalesce(
    p.care_instructions,
    'Machine wash cold at 30C with similar colors. Close zippers before washing. Do not bleach. Tumble dry low or line dry. Do not iron trims directly.'
  ),
  care_instructions_zh = coalesce(
    p.care_instructions_zh,
    '建议 30C 冷水机洗并与相近颜色衣物同洗。洗涤前拉好拉链。不可漂白，低温烘干或自然晾干，避免直接熨烫辅料。'
  ),
  repair_instructions = coalesce(
    p.repair_instructions,
    'Repair open seams with polyester thread. Replace damaged zipper, zipper puller, elastic cord or eyelets where possible before disposal.'
  ),
  repair_instructions_zh = coalesce(
    p.repair_instructions_zh,
    '开线处可使用涤纶线修补。拉链、拉绊、橡筋绳或汽眼损坏时，建议优先更换后继续使用。'
  ),
  end_of_life_instructions = coalesce(
    p.end_of_life_instructions,
    'Reuse or donate if wearable. For recycling, remove detachable metal/plastic trims where required and send textile parts to polyester textile recycling or brand take-back channels.'
  ),
  end_of_life_instructions_zh = coalesce(
    p.end_of_life_instructions_zh,
    '仍可穿着时优先再使用或捐赠。进入回收前按要求移除可拆卸金属/塑料辅料，纺织部分进入涤纶纺织品回收或品牌回收渠道。'
  ),
  current_version = 'v1.2',
  updated_at = now()
from _dpp_unxpba91_target t
where p.id = t.product_id;

update public.product_digital_identity di
set
  product_uuid = coalesce(di.product_uuid, 'DPP-UNXPBA91'),
  gtin = case
    when di.gtin is null or btrim(di.gtin) in ('', '-', '123') then '06900000000427'
    else di.gtin
  end,
  style_id = coalesce(di.style_id, 'TEXTILE-VEST-002'),
  batch_id = coalesce(di.batch_id, 'TEXTILE-BATCH-2026-002'),
  serial_id = coalesce(di.serial_id, 'UNXPBA91'),
  digital_link_url = coalesce(di.digital_link_url, 'https://www.greanlean.com/p/DPP-UNXPBA91'),
  qr_code_id = coalesce(di.qr_code_id, 'QR-DPP-UNXPBA91')
from _dpp_unxpba91_target t
where di.product_id = t.product_id;

insert into public.product_digital_identity (
  product_id, product_uuid, gtin, style_id, batch_id, serial_id, digital_link_url, qr_code_id
)
select
  t.product_id,
  'DPP-UNXPBA91',
  '06900000000427',
  'TEXTILE-VEST-002',
  'TEXTILE-BATCH-2026-002',
  'UNXPBA91',
  'https://www.greanlean.com/p/DPP-UNXPBA91',
  'QR-DPP-UNXPBA91'
from _dpp_unxpba91_target t
where not exists (
  select 1 from public.product_digital_identity di where di.product_id = t.product_id
);

update public.product_materials m
set
  material_name = case
    when m.material_name = 'Recyled polyester' then 'Recycled polyester'
    when m.material_name = 'PLSTIC' then 'PLASTIC'
    else m.material_name
  end,
  material_type_zh = case
    when m.material_type = 'Textile' then '面料'
    when m.material_type = 'Trim' then '辅料'
    when m.material_type = 'Textile trim' then '纺织辅料'
    else m.material_type_zh
  end,
  chemical_info_zh = coalesce(m.chemical_info_zh, '未有意添加受限物质；待客户提供正式 RSL / REACH 测试报告后更新。'),
  recyclability_zh = coalesce(
    m.recyclability_zh,
    case when m.recyclability is not null then '可回收，具体路径待客户确认' else null end
  )
from _dpp_unxpba91_target t
where m.product_id = t.product_id;

update public.product_bom b
set
  component_type = case
    when b.component_name_zh in ('主身面料1', '主身面料2') then 'Fabric'
    when b.component_name_zh = '口袋布' then 'Lining'
    when b.component_name_zh in ('洗唛', '尺码唛') then 'Label'
    else 'Trim'
  end,
  component_type_zh = case
    when b.component_name_zh in ('主身面料1', '主身面料2') then '主面料'
    when b.component_name_zh = '口袋布' then '衬里'
    when b.component_name_zh in ('洗唛', '尺码唛') then '标签'
    else '辅料'
  end,
  component_name = case
    when b.component_name = 'Eeylets' then 'Eyelets'
    when b.component_name = 'LOGO EMBRO Thread' then 'Logo embroidery thread'
    else b.component_name
  end,
  position = case
    when b.position = 'CF /Armhole' then 'CF / Armhole'
    when b.position = 'Left check /cb neck' then 'Left chest / CB neck'
    when b.position = 'Cb neck seam' then 'CB neck seam'
    else b.position
  end
from _dpp_unxpba91_target t
where b.product_id = t.product_id;

insert into public.product_esg_metrics (
  product_id, carbon_footprint, water_usage, energy_consumption, waste_generation,
  recycled_content, chemical_management, methodology, verified_by
)
select
  t.product_id,
  5.8,
  95,
  12.4,
  0.45,
  coalesce((
    select round(coalesce(sum(coalesce(m.percentage, 0) * coalesce(m.recycled_content, 0)) / nullif(sum(coalesce(m.percentage, 0)), 0), 0))
    from public.product_materials m
    where m.product_id = t.product_id
  ), 59),
  'Estimated RSL / REACH screening status based on material declarations. Formal lab reports pending customer upload.',
  'Estimated screening LCA for a sleeveless recycled-polyester fleece vest, based on material composition, BOM weight, generic textile processing energy and export logistics assumptions. Pending customer confirmation.',
  'greanlean provisional review'
from _dpp_unxpba91_target t
where not exists (
  select 1 from public.product_esg_metrics e where e.product_id = t.product_id
);

insert into public.product_circularity (
  product_id, repairability_score, recyclability_score, take_back_program,
  resale_supported, remanufacturing_supported, disassembly_guide, recycling_instructions, end_of_life_info
)
select
  t.product_id,
  68,
  76,
  'Pending customer confirmation: reuse, donation, textile collection or brand take-back channel.',
  true,
  false,
  'Before recycling, remove or separate zipper, pullers, eyelets, elastic cord, labels and other trims where required by the recycler.',
  'Prioritize reuse. If no longer wearable, route polyester textile parts to textile recycling and sort metal/plastic trims separately.',
  'Do not dispose as mixed waste where textile collection is available. Keep garment dry and clean before collection.'
from _dpp_unxpba91_target t
where not exists (
  select 1 from public.product_circularity c where c.product_id = t.product_id
);

insert into public.product_certificates (
  product_id, certificate_name, certificate_name_zh, certificate_type, certificate_type_zh,
  certificate_number, issuer, issue_date, expiry_date, verification_status
)
select t.product_id, x.certificate_name, x.certificate_name_zh, x.certificate_type, x.certificate_type_zh,
       x.certificate_number, x.issuer, current_date, (current_date + interval '12 months')::date, 'pending'
from _dpp_unxpba91_target t
cross join (
  values
    ('GRS material certificate - pending upload', 'GRS 材料证书 - 待上传', 'Material', '材料认证', 'PENDING-GRS-UNXPBA91', 'Customer / supplier to provide'),
    ('OEKO-TEX Standard 100 - pending upload', 'OEKO-TEX Standard 100 - 待上传', 'Chemical safety', '化学安全', 'PENDING-OEKO-UNXPBA91', 'Customer / supplier to provide'),
    ('REACH / RSL supplier declaration - pending upload', 'REACH / RSL 供应商声明 - 待上传', 'Restricted substances', '受限物质', 'PENDING-RSL-UNXPBA91', 'Customer / supplier to provide')
) as x(certificate_name, certificate_name_zh, certificate_type, certificate_type_zh, certificate_number, issuer)
where not exists (
  select 1 from public.product_certificates c where c.product_id = t.product_id
);

insert into public.product_traceability (
  product_id, event_type, event_name, event_name_zh, event_date, country, city,
  facility_name, facility_name_zh, transport_method, verification_status, notes, notes_zh
)
select t.product_id, x.event_type, x.event_name, x.event_name_zh, x.event_date::timestamptz, x.country, x.city,
       x.facility_name, x.facility_name_zh, x.transport_method, 'pending', x.notes, x.notes_zh
from _dpp_unxpba91_target t
cross join (
  values
    ('material sourcing', 'Recycled polyester fleece and trim materials sourced', '再生涤纶摇粒绒及辅料采购', '2026-05-10', 'China', null, 'Textile material supplier facility', '纺织材料供应商工厂', 'Customer-provided supplier list', 'Road', 'Estimated event based on material/BOM records; supplier evidence pending.', '基于材料和 BOM 记录生成的临时追溯节点，供应商证据待客户补充。'),
    ('cutting', 'Fabric cutting and component preparation', '面料裁剪与部件准备', '2026-05-18', 'China', null, 'Garment preparation workshop', '服装裁剪车间', 'Customer manufacturer', 'Internal transfer', 'Estimated production event pending factory production record.', '临时生产节点，待客户补充工厂生产记录。'),
    ('manufacturing', 'Sewing, zipper installation and finishing', '缝制、拉链安装与整烫后整理', '2026-05-25', 'China', null, 'Garment assembly workshop', '服装组装车间', 'Customer manufacturer', 'Internal transfer', 'Estimated garment assembly step based on BOM.', '基于 BOM 生成的临时成衣组装节点。'),
    ('quality control', 'Quality inspection and packing', '质量检查与包装', '2026-06-02', 'China', null, 'Final inspection area', '成品检验区', 'Customer manufacturer', 'Road', 'Inspection report pending customer upload.', '质检报告待客户上传。'),
    ('dpp publication', 'Digital product passport record published', '数字产品护照记录发布', '2026-06-09', 'China', null, 'greanlean DPP workspace', 'greanlean DPP 工作台', 'greanlean', 'Digital', 'Provisional DPP record generated from current product data.', '根据当前产品资料生成的临时 DPP 记录。')
) as x(event_type, event_name, event_name_zh, event_date, country, city, facility_name, facility_name_zh, supplier_name, transport_method, notes, notes_zh)
where not exists (
  select 1 from public.product_traceability tr where tr.product_id = t.product_id
);

insert into public.product_consumer_transparency (
  product_id, brand_story, brand_story_zh, sustainability_story, sustainability_story_zh,
  consumer_notice, consumer_notice_zh, packaging_info
)
select
  t.product_id,
  'A recycled-polyester fleece vest designed for outdoor layering and lower-impact material sourcing.',
  '一款面向户外叠穿场景的再生涤纶摇粒绒背心，重点披露材料来源、辅料构成和后续可维护信息。',
  'The current DPP uses customer-provided material/BOM data and provisional environmental assumptions. Formal supplier certificates, lab reports and LCA documents are pending customer upload.',
  '当前 DPP 基于客户已提供的材料和 BOM 数据，并补充临时环境估算。正式供应商证书、检测报告和 LCA 文件待客户后续上传。',
  'Wash and repair before disposal. If recycling, separate trims where required and use textile collection channels.',
  '报废前建议优先清洗、维修和再使用。进入回收时按要求分离辅料，并使用纺织品回收渠道。',
  'Packaging details pending customer confirmation; default assumption: recyclable polybag and carton.'
from _dpp_unxpba91_target t
where not exists (
  select 1 from public.product_consumer_transparency ct where ct.product_id = t.product_id
);

insert into public.product_documents (
  product_id, document_name, document_type, file_size, language, uploaded_by, version
)
select t.product_id, x.document_name, x.document_type, 'pending', 'EN/ZH', 'greanlean admin', 'v1.2'
from _dpp_unxpba91_target t
cross join (
  values
    ('Material composition and BOM worksheet - pending official file', 'data worksheet'),
    ('Estimated LCA screening note - pending customer confirmation', 'LCA note'),
    ('Care, repair and end-of-life guidance - provisional', 'consumer guidance')
) as x(document_name, document_type)
where not exists (
  select 1 from public.product_documents d where d.product_id = t.product_id
);

insert into public.product_data_governance (
  product_id, data_source, data_owner, audit_status, data_quality_score
)
select
  t.product_id,
  'Customer-provided product, material and BOM data; ESG, traceability, certificates and circularity fields are provisional estimates pending customer confirmation.',
  'greanlean admin / customer to confirm',
  'Provisional enrichment. Customer-provided fields retained; missing DPP modules filled with estimated or pending values for workflow continuity. Third-party verification not completed.',
  62
from _dpp_unxpba91_target t
where not exists (
  select 1 from public.product_data_governance g where g.product_id = t.product_id
);

insert into public.product_versions (
  product_id, version, lifecycle_status, change_type, change_summary, changed_by, snapshot
)
select
  t.product_id,
  'v1.2',
  'updated',
  'provisional_enrichment',
  '补全 DPP-UNXPBA91 临时 ESG、追溯、证书、循环、消费者说明和数据治理字段；修正 BOM 分类显示。',
  'greanlean admin',
  jsonb_build_object(
    'product_id', t.product_id,
    'dpp_id', 'DPP-UNXPBA91',
    'source', 'customer product/material/BOM data + provisional assumptions',
    'saved_at', now()
  )
from _dpp_unxpba91_target t
on conflict (product_id, version) do update set
  lifecycle_status = excluded.lifecycle_status,
  change_type = excluded.change_type,
  change_summary = excluded.change_summary,
  changed_by = excluded.changed_by,
  snapshot = excluded.snapshot;

drop table if exists _dpp_unxpba91_target;

commit;
