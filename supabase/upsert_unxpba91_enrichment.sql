-- Enrich DPP-UNXPBA91 with provisional DPP data.
-- Scope: only product DPP-UNXPBA91 / TEXTILE-VEST-002.
-- Principle: keep customer-provided product/material/BOM data, fix obvious
-- component categorization issues, and add estimated fields marked as pending
-- customer confirmation.

do $$
declare
  target_product_id uuid;
  material_recycled numeric;
begin
  select id into target_product_id
  from public.products
  where dpp_id = 'DPP-UNXPBA91' or sku = 'TEXTILE-VEST-002'
  limit 1;

  if target_product_id is null then
    raise exception 'Product DPP-UNXPBA91 / TEXTILE-VEST-002 not found';
  end if;

  select round(coalesce(sum(coalesce(percentage, 0) * coalesce(recycled_content, 0)) / nullif(sum(coalesce(percentage, 0)), 0), 0))
    into material_recycled
  from public.product_materials
  where product_id = target_product_id;

  update public.products
  set
    season = coalesce(season, '2026 Outdoor & Active Layering'),
    care_instructions = coalesce(
      care_instructions,
      'Machine wash cold at 30C with similar colors. Close zippers before washing. Do not bleach. Tumble dry low or line dry. Do not iron trims directly.'
    ),
    care_instructions_zh = coalesce(
      care_instructions_zh,
      '建议 30C 冷水机洗并与相近颜色衣物同洗。洗涤前拉好拉链。不可漂白，低温烘干或自然晾干，避免直接熨烫辅料。'
    ),
    repair_instructions = coalesce(
      repair_instructions,
      'Repair open seams with polyester thread. Replace damaged zipper, zipper puller, elastic cord or eyelets where possible before disposal.'
    ),
    repair_instructions_zh = coalesce(
      repair_instructions_zh,
      '开线处可使用涤纶线修补。拉链、拉绊、橡筋绳或汽眼损坏时，建议优先更换后继续使用。'
    ),
    end_of_life_instructions = coalesce(
      end_of_life_instructions,
      'Reuse or donate if wearable. For recycling, remove detachable metal/plastic trims where required and send textile parts to polyester textile recycling or brand take-back channels.'
    ),
    end_of_life_instructions_zh = coalesce(
      end_of_life_instructions_zh,
      '仍可穿着时优先再使用或捐赠。进入回收前按要求移除可拆卸金属/塑料辅料，纺织部分进入涤纶纺织品回收或品牌回收渠道。'
    ),
    current_version = 'v1.2',
    updated_at = now()
  where id = target_product_id;

  update public.product_digital_identity
  set
    product_uuid = coalesce(product_uuid, 'DPP-UNXPBA91'),
    style_id = coalesce(style_id, 'TEXTILE-VEST-002'),
    batch_id = coalesce(batch_id, 'TEXTILE-BATCH-2026-002'),
    serial_id = coalesce(serial_id, 'UNXPBA91'),
    digital_link_url = coalesce(digital_link_url, 'https://www.greanlean.com/p/DPP-UNXPBA91'),
    qr_code_id = coalesce(qr_code_id, 'QR-DPP-UNXPBA91')
  where product_id = target_product_id;

  if not exists (select 1 from public.product_digital_identity where product_id = target_product_id) then
    insert into public.product_digital_identity (
      product_id, product_uuid, gtin, style_id, batch_id, serial_id, digital_link_url, qr_code_id
    ) values (
      target_product_id, 'DPP-UNXPBA91', null, 'TEXTILE-VEST-002', 'TEXTILE-BATCH-2026-002', 'UNXPBA91',
      'https://www.greanlean.com/p/DPP-UNXPBA91', 'QR-DPP-UNXPBA91'
    );
  end if;

  update public.product_materials
  set
    material_name = case
      when material_name = 'Recyled polyester' then 'Recycled polyester'
      when material_name = 'PLSTIC' then 'PLASTIC'
      else material_name
    end,
    material_type_zh = case
      when material_type = 'Textile' then '面料'
      when material_type = 'Trim' then '辅料'
      when material_type = 'Textile trim' then '纺织辅料'
      else material_type_zh
    end,
    chemical_info_zh = coalesce(chemical_info_zh, '未有意添加受限物质；待客户提供正式 RSL / REACH 测试报告后更新。'),
    recyclability_zh = coalesce(recyclability_zh, case
      when recyclability is not null then '可回收，具体路径待客户确认'
      else null
    end)
  where product_id = target_product_id;

  update public.product_bom
  set
    component_type = case
      when component_name_zh in ('主身面料1', '主身面料2') then 'Fabric'
      when component_name_zh = '口袋布' then 'Lining'
      when component_name_zh in ('洗唛', '尺码唛') then 'Label'
      else 'Trim'
    end,
    component_type_zh = case
      when component_name_zh in ('主身面料1', '主身面料2') then '主面料'
      when component_name_zh = '口袋布' then '衬里'
      when component_name_zh in ('洗唛', '尺码唛') then '标签'
      else '辅料'
    end,
    component_name = case
      when component_name = 'Eeylets' then 'Eyelets'
      when component_name = 'LOGO EMBRO Thread' then 'Logo embroidery thread'
      else component_name
    end,
    position = case
      when position = 'CF /Armhole' then 'CF / Armhole'
      when position = 'Left check /cb neck' then 'Left chest / CB neck'
      when position = 'Cb neck seam' then 'CB neck seam'
      else position
    end
  where product_id = target_product_id;

  if not exists (select 1 from public.product_esg_metrics where product_id = target_product_id) then
    insert into public.product_esg_metrics (
      product_id, carbon_footprint, water_usage, energy_consumption, waste_generation,
      recycled_content, chemical_management, methodology, verified_by
    ) values (
      target_product_id,
      5.8,
      95,
      12.4,
      0.45,
      coalesce(material_recycled, 59),
      'Estimated RSL / REACH screening status based on material declarations. Formal lab reports pending customer upload.',
      'Estimated screening LCA for a sleeveless recycled-polyester fleece vest, based on material composition, BOM weight, generic textile processing energy and export logistics assumptions. Pending customer confirmation.',
      'greanlean provisional review'
    );
  end if;

  if not exists (select 1 from public.product_circularity where product_id = target_product_id) then
    insert into public.product_circularity (
      product_id, repairability_score, recyclability_score, take_back_program,
      resale_supported, remanufacturing_supported, disassembly_guide, recycling_instructions, end_of_life_info
    ) values (
      target_product_id,
      68,
      76,
      'Pending customer confirmation: reuse, donation, textile collection or brand take-back channel.',
      true,
      false,
      'Before recycling, remove or separate zipper, pullers, eyelets, elastic cord, labels and other trims where required by the recycler.',
      'Prioritize reuse. If no longer wearable, route polyester textile parts to textile recycling and sort metal/plastic trims separately.',
      'Do not dispose as mixed waste where textile collection is available. Keep garment dry and clean before collection.'
    );
  end if;

  if not exists (select 1 from public.product_certificates where product_id = target_product_id) then
    insert into public.product_certificates (
      product_id, certificate_name, certificate_name_zh, certificate_type, certificate_type_zh,
      certificate_number, issuer, issue_date, expiry_date, verification_status
    ) values
      (target_product_id, 'GRS material certificate - pending upload', 'GRS 材料证书 - 待上传', 'Material', '材料认证', 'PENDING-GRS-UNXPBA91', 'Customer / supplier to provide', current_date, (current_date + interval '12 months')::date, 'pending'),
      (target_product_id, 'OEKO-TEX Standard 100 - pending upload', 'OEKO-TEX Standard 100 - 待上传', 'Chemical safety', '化学安全', 'PENDING-OEKO-UNXPBA91', 'Customer / supplier to provide', current_date, (current_date + interval '12 months')::date, 'pending'),
      (target_product_id, 'REACH / RSL supplier declaration - pending upload', 'REACH / RSL 供应商声明 - 待上传', 'Restricted substances', '受限物质', 'PENDING-RSL-UNXPBA91', 'Customer / supplier to provide', current_date, (current_date + interval '12 months')::date, 'pending');
  end if;

  if not exists (select 1 from public.product_traceability where product_id = target_product_id) then
    insert into public.product_traceability (
      product_id, event_type, event_name, event_name_zh, event_date, country, city,
      facility_name, facility_name_zh, supplier_name, transport_method, verification_status, notes, notes_zh
    ) values
      (target_product_id, 'material sourcing', 'Recycled polyester fleece and trim materials sourced', '再生涤纶摇粒绒及辅料采购', '2026-05-10'::timestamptz, 'China', null, 'Textile material supplier facility', '纺织材料供应商工厂', 'Customer-provided supplier list', 'Road', 'pending', 'Estimated event based on material/BOM records; supplier evidence pending.', '基于材料和 BOM 记录生成的临时追溯节点，供应商证据待客户补充。'),
      (target_product_id, 'cutting', 'Fabric cutting and component preparation', '面料裁剪与部件准备', '2026-05-18'::timestamptz, 'China', null, 'Garment preparation workshop', '服装裁剪车间', 'Customer manufacturer', 'Internal transfer', 'pending', 'Estimated production event pending factory production record.', '临时生产节点，待客户补充工厂生产记录。'),
      (target_product_id, 'manufacturing', 'Sewing, zipper installation and finishing', '缝制、拉链安装与整烫后整理', '2026-05-25'::timestamptz, 'China', null, 'Garment assembly workshop', '服装组装车间', 'Customer manufacturer', 'Internal transfer', 'pending', 'Estimated garment assembly step based on BOM.', '基于 BOM 生成的临时成衣组装节点。'),
      (target_product_id, 'quality control', 'Quality inspection and packing', '质量检查与包装', '2026-06-02'::timestamptz, 'China', null, 'Final inspection area', '成品检验区', 'Customer manufacturer', 'Road', 'pending', 'Inspection report pending customer upload.', '质检报告待客户上传。'),
      (target_product_id, 'dpp publication', 'Digital product passport record published', '数字产品护照记录发布', '2026-06-09'::timestamptz, 'China', null, 'greanlean DPP workspace', 'greanlean DPP 工作台', 'greanlean', 'Digital', 'pending', 'Provisional DPP record generated from current product data.', '根据当前产品资料生成的临时 DPP 记录。');
  end if;

  if not exists (select 1 from public.product_consumer_transparency where product_id = target_product_id) then
    insert into public.product_consumer_transparency (
      product_id, brand_story, brand_story_zh, sustainability_story, sustainability_story_zh,
      consumer_notice, consumer_notice_zh, packaging_info
    ) values (
      target_product_id,
      'A recycled-polyester fleece vest designed for outdoor layering and lower-impact material sourcing.',
      '一款面向户外叠穿场景的再生涤纶摇粒绒背心，重点披露材料来源、辅料构成和后续可维护信息。',
      'The current DPP uses customer-provided material/BOM data and provisional environmental assumptions. Formal supplier certificates, lab reports and LCA documents are pending customer upload.',
      '当前 DPP 基于客户已提供的材料和 BOM 数据，并补充临时环境估算。正式供应商证书、检测报告和 LCA 文件待客户后续上传。',
      'Wash and repair before disposal. If recycling, separate trims where required and use textile collection channels.',
      '报废前建议优先清洗、维修和再使用。进入回收时按要求分离辅料，并使用纺织品回收渠道。',
      'Packaging details pending customer confirmation; default assumption: recyclable polybag and carton.'
    );
  end if;

  if not exists (select 1 from public.product_documents where product_id = target_product_id) then
    insert into public.product_documents (
      product_id, document_name, document_type, file_size, language, uploaded_by, version
    ) values
      (target_product_id, 'Material composition and BOM worksheet - pending official file', 'data worksheet', 'pending', 'EN/ZH', 'greanlean admin', 'v1.2'),
      (target_product_id, 'Estimated LCA screening note - pending customer confirmation', 'LCA note', 'pending', 'EN/ZH', 'greanlean admin', 'v1.2'),
      (target_product_id, 'Care, repair and end-of-life guidance - provisional', 'consumer guidance', 'pending', 'EN/ZH', 'greanlean admin', 'v1.2');
  end if;

  if not exists (select 1 from public.product_data_governance where product_id = target_product_id) then
    insert into public.product_data_governance (
      product_id, data_source, data_owner, audit_status, data_quality_score
    ) values (
      target_product_id,
      'Customer-provided product, material and BOM data; ESG, traceability, certificates and circularity fields are provisional estimates pending customer confirmation.',
      'greanlean admin / customer to confirm',
      'Provisional enrichment. Customer-provided fields retained; missing DPP modules filled with estimated or pending values for workflow continuity. Third-party verification not completed.',
      62
    );
  end if;

  insert into public.product_versions (
    product_id, version, lifecycle_status, change_type, change_summary, changed_by, snapshot
  ) values (
    target_product_id,
    'v1.2',
    'updated',
    'provisional_enrichment',
    '补全 DPP-UNXPBA91 临时 ESG、追溯、证书、循环、消费者说明和数据治理字段；修正 BOM 分类显示。',
    'greanlean admin',
    jsonb_build_object(
      'product_id', target_product_id,
      'dpp_id', 'DPP-UNXPBA91',
      'source', 'customer product/material/BOM data + provisional assumptions',
      'saved_at', now()
    )
  )
  on conflict (product_id, version) do update set
    lifecycle_status = excluded.lifecycle_status,
    change_type = excluded.change_type,
    change_summary = excluded.change_summary,
    changed_by = excluded.changed_by,
    snapshot = excluded.snapshot;
end $$;
