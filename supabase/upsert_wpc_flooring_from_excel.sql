-- WPC flooring demo refresh from 地板DPP.xlsx.
-- Scope: only updates demo-wpc-flooring / MS140K25B and its related DPP rows.

begin;

do $$
declare
  flooring_id uuid;
begin
  select id into flooring_id from public.products where public_slug = 'demo-wpc-flooring' limit 1;

  if flooring_id is null then
    select id into flooring_id from public.products where sku = 'MS140K25B' limit 1;
  end if;

  if flooring_id is null then
    insert into public.products (
      name, name_zh, sku, brand, category, subcategory, season, description, description_zh,
      status, dpp_id, public_slug, main_image, care_instructions, care_instructions_zh,
      repair_instructions, repair_instructions_zh, end_of_life_instructions, end_of_life_instructions_zh
    )
    values (
      'WPC PLANK',
      'WPC PLANK',
      'MS140K25B',
      'HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD',
      'WPC DECKING',
      'Outdoor WPC Decking',
      '2026 Outdoor Decking Series',
      'Outdoor composite decking board. Model MS140K25B, 140x25mm, 2.55kg/m, SANDING finish, colours WOOD / COFFEE / DARK GREY / LIGHT GREY, made in China by HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD.',
      '户外木塑复合 decking 板材。型号 MS140K25B，规格 140x25mm，重量 2.55kg/m，表面工艺 SANDING，颜色 WOOD / COFFEE / DARK GREY / LIGHT GREY，中国制造，制造商 HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD。',
      'published',
      'DPP-WPC-MS140K25B',
      'demo-wpc-flooring',
      '/images/demo-wpc-flooring.svg',
      'Outdoor decking use. Clean with neutral detergent and water; avoid strong solvents and prolonged high-temperature exposure.',
      '用于户外 decking。建议使用中性清洁剂和清水清洁，避免强溶剂和长期高温暴晒。',
      'Replaceable decking panels. Use screw-and-clip disassembly and keep batch W2605-05 spare planks for colour matching.',
      '可更换单片 decking 板。建议采用螺钉与卡扣拆装方式，并保留 W2605-05 批次备用板以保证颜色一致。',
      'Mechanical recycling is preferred. Avoid landfill, remove metal fasteners before recycling, and reprocess usable WPC material into composite products where facilities exist.',
      '优先机械回收。避免填埋，回收前移除金属紧固件，具备条件时将可用 WPC 材料再加工为复合材料产品。'
    )
    returning id into flooring_id;
  else
    update public.products
    set
      name = 'WPC PLANK',
      name_zh = 'WPC PLANK',
      sku = 'MS140K25B',
      brand = 'HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD',
      category = 'WPC DECKING',
      subcategory = 'Outdoor WPC Decking',
      season = '2026 Outdoor Decking Series',
      description = 'Outdoor composite decking board. Model MS140K25B, 140x25mm, 2.55kg/m, SANDING finish, colours WOOD / COFFEE / DARK GREY / LIGHT GREY, made in China by HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD.',
      description_zh = '户外木塑复合 decking 板材。型号 MS140K25B，规格 140x25mm，重量 2.55kg/m，表面工艺 SANDING，颜色 WOOD / COFFEE / DARK GREY / LIGHT GREY，中国制造，制造商 HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD。',
      status = 'published',
      dpp_id = 'DPP-WPC-MS140K25B',
      public_slug = 'demo-wpc-flooring',
      main_image = coalesce(nullif(main_image, ''), '/images/demo-wpc-flooring.svg'),
      care_instructions = 'Outdoor decking use. Clean with neutral detergent and water; avoid strong solvents and prolonged high-temperature exposure.',
      care_instructions_zh = '用于户外 decking。建议使用中性清洁剂和清水清洁，避免强溶剂和长期高温暴晒。',
      repair_instructions = 'Replaceable decking panels. Use screw-and-clip disassembly and keep batch W2605-05 spare planks for colour matching.',
      repair_instructions_zh = '可更换单片 decking 板。建议采用螺钉与卡扣拆装方式，并保留 W2605-05 批次备用板以保证颜色一致。',
      end_of_life_instructions = 'Mechanical recycling is preferred. Avoid landfill, remove metal fasteners before recycling, and reprocess usable WPC material into composite products where facilities exist.',
      end_of_life_instructions_zh = '优先机械回收。避免填埋，回收前移除金属紧固件，具备条件时将可用 WPC 材料再加工为复合材料产品。',
      updated_at = now()
    where id = flooring_id;
  end if;

  delete from public.product_materials where product_id = flooring_id;
  delete from public.product_bom where product_id = flooring_id;
  delete from public.product_esg_metrics where product_id = flooring_id;
  delete from public.product_certificates where product_id = flooring_id;
  delete from public.product_traceability where product_id = flooring_id;
  delete from public.product_circularity where product_id = flooring_id;
  delete from public.product_consumer_transparency where product_id = flooring_id;
  delete from public.product_digital_identity where product_id = flooring_id;
  delete from public.product_documents where product_id = flooring_id;
  delete from public.product_data_governance where product_id = flooring_id;

  insert into public.product_materials (
    product_id, material_name, material_name_zh, material_type, material_type_zh,
    percentage, recycled_content, origin_country, chemical_info, chemical_info_zh,
    recyclability, recyclability_zh, certification
  )
  values
    (flooring_id, 'Wood Fiber', '木纤维', 'Raw Material', '原材料', 60, 0, 'China',
      'No SVHC declared; FSC chain-of-custody evidence reserved.',
      '声明不含 SVHC；预留 FSC 产销监管链证据。',
      'Yes; recoverable in WPC composite stream where infrastructure exists', '是；具备条件时可进入 WPC 复合材料回收流', 'FSC BV-COC-154663 / supplier: XXX Wood Supplier'),
    (flooring_id, 'Recycled HDPE', '再生 HDPE', 'Raw Material', '原材料', 30, 100, 'China',
      'REACH SVHC below 0.1% w/w; recycled-plastic declaration is a demo assumption until supplier evidence is uploaded.',
      'REACH SVHC 低于 0.1% w/w；再生塑料声明为 demo 假设，待上传供应商证据。',
      'Yes; mechanical recycling after sorting and size reduction', '是；分选和破碎后可机械回收', 'Supplier: XXX Plastic Supplier'),
    (flooring_id, 'Stabilizer Additives', '稳定剂助剂', 'Additive', '添加剂', 7, 0, 'China',
      'Low-VOC stabilizers; no intentionally added lead, cadmium, hexavalent chromium or SVHC.',
      '采用低 VOC 稳定剂；未有意添加铅、镉、六价铬或 SVHC。',
      'Partial; remains in composite recycling stream', '部分可回收；随复合材料整体进入回收流', 'Supplier: XXX Chemical Co.'),
    (flooring_id, 'Brown Masterbatch', '棕色母粒', 'Color Masterbatch', '色母粒', 3, 0, 'China',
      'Colour masterbatch used for WOOD / COFFEE / DARK GREY / LIGHT GREY options; SVHC not declared.',
      '用于 WOOD / COFFEE / DARK GREY / LIGHT GREY 色系；声明不含 SVHC。',
      'Partial; remains in composite recycling stream', '部分可回收；随复合材料整体进入回收流', 'Supplier: XXX Color Co.'),
    (flooring_id, 'Pallet', '托盘', 'Packaging', '包装', null, null, 'China',
      'Reusable/recyclable packaging component.', '可重复使用/可回收包装部件。',
      'Yes', '是', 'Supplier: 泾县兴林木业有限公司'),
    (flooring_id, 'Stainless Steel Clip And Screw with Narrow Gap (304)', '304 不锈钢窄缝卡扣和螺丝', 'Accessory', '配件', null, null, 'China',
      'Metal fasteners should be removed before WPC recycling.', '金属紧固件应在 WPC 回收前移除。',
      'Yes; separate stainless-steel recycling stream', '是；单独进入不锈钢回收流', 'Supplier: 南皮县珺成科技有限公司');

  insert into public.product_bom (
    product_id, component_name, component_name_zh, component_type, component_type_zh, quantity, unit, position
  )
  values
    (flooring_id, 'WPC PLANK MS140K25B', 'WPC PLANK MS140K25B', 'Outdoor composite decking board', '户外木塑复合 decking 板', 1, '2.55kg/m', '140x25mm; SANDING; WOOD / COFFEE / DARK GREY / LIGHT GREY'),
    (flooring_id, 'Pallet', '托盘', 'Packaging', '包装', 1, 'set', 'Supplier: 泾县兴林木业有限公司'),
    (flooring_id, 'Stainless Steel Clip And Screw with Narrow Gap (304)', '304 不锈钢窄缝卡扣和螺丝', 'Installation accessory', '安装配件', 1, 'set', 'Supplier: 南皮县珺成科技有限公司');

  insert into public.product_traceability (
    product_id, event_type, event_name, event_name_zh, event_date, country, city,
    facility_name, facility_name_zh, transport_method, verification_status, notes, notes_zh
  )
  values
    (flooring_id, 'material sourcing', 'Wood fiber, recycled HDPE and accessories sourced', '采购木纤维、再生 HDPE 与安装辅料', '2026-04-20'::timestamp, 'China', 'Huangshan',
      'XXX Wood Supplier / XXX Plastic Supplier / 泾县兴林木业有限公司 / 南皮县珺成科技有限公司',
      'XXX Wood Supplier / XXX Plastic Supplier / 泾县兴林木业有限公司 / 南皮县珺成科技有限公司',
      'Truck', 'verified', 'Excel supplier list linked; recycled HDPE content and packaging/accessory supplier evidence are demo assumptions pending upload.', '已关联 Excel 供应商清单；再生 HDPE 含量及包装/配件供应商证据为 demo 假设，待上传。'),
    (flooring_id, 'manufacturing', 'Extrusion, sanding and profile finishing', '挤出、砂光与型材表面处理', '2026-05-01'::timestamp, 'China', 'Huangshan',
      'HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD', 'HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD',
      'Internal transfer', 'verified', 'Production window 2026-05-01 to 2026-05-03; model MS140K25B, 140x25mm, 2.55kg/m, SANDING finish.', '生产窗口 2026-05-01 至 2026-05-03；型号 MS140K25B，规格 140x25mm，重量 2.55kg/m，SANDING 表面。'),
    (flooring_id, 'quality inspection', 'Batch W2605-05 quality release', 'W2605-05 批次质检放行', '2026-05-20'::timestamp, 'China', 'Huangshan',
      'HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD QC Lab', 'HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD 质检实验室',
      'Internal transfer', 'verified', 'Batch/Lot W2605-05; TRACE-W2605-05. QC passed is based on industry demo assumption because detailed QC sheet is blank.', '批次号 W2605-05；追溯码 TRACE-W2605-05。由于详细质检表为空，QC passed 按行业 demo 假设补齐。'),
    (flooring_id, 'transport', 'Export shipment to EU distributor', '出口运输至欧盟经销商', '2026-05-28'::timestamp, 'Netherlands', 'Rotterdam',
      'Demo EU Building Materials Distributor', '示例欧盟建材经销仓',
      'Sea freight + truck', 'pending', 'Carrier data reserved for future API connection; export route is demo assumption.', '运输数据预留给后续承运商 API 对接；出口路径为 demo 假设。');

  insert into public.product_esg_metrics (
    product_id, carbon_footprint, water_usage, energy_consumption, waste_generation,
    recycled_content, chemical_management, lca_report_url, methodology, verified_by
  )
  values (
    flooring_id, 12, 120, 15, 0.7, 30,
    'No SVHC declared. REACH, VOC and ISO9001 evidence are represented from the Excel document list; carbon, electricity, water, VOC and ISO14001 fields are estimated demo assumptions.',
    '/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B',
    'Estimated screening profile: 12 kg CO2e/m2, 15 kWh electricity, 120 L water, 30% renewable-energy ratio and 70% waste recycling rate; based on WPC decking industry assumptions and supplied product data.',
    'Greanlean demo data review'
  );

  insert into public.product_circularity (
    product_id, repairability_score, recyclability_score, take_back_program,
    resale_supported, remanufacturing_supported, disassembly_guide,
    recycling_instructions, end_of_life_info
  )
  values (
    flooring_id, 76, 82,
    'Mechanical recycling route: remove metal fasteners and reprocess usable WPC material into composite products.',
    true, true,
    'Mechanical / screw-and-clip disassembly. Remove stainless-steel clips and screws before WPC recycling.',
    'Avoid landfill. Send WPC plank material to composite-material recycling where local facilities exist; recycle 304 stainless fasteners separately.',
    'Reusable intact panels should be reused first; damaged panels can be mechanically recycled into composite material.'
  );

  insert into public.product_certificates (
    product_id, certificate_name, certificate_name_zh, certificate_type, certificate_type_zh,
    certificate_number, issuer, issue_date, expiry_date, certificate_url, verification_status
  )
  values
    (flooring_id, 'EU Declaration of Performance', '欧盟性能声明 DoP', 'Construction products', '建筑产品', 'DOP-MS140K25B-W2605-05', 'HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD', '2026-05-20'::date, '2027-05-19'::date, '/api/declaration?product=DPP-WPC-MS140K25B', 'verified'),
    (flooring_id, 'FSC Certificate', 'FSC 证书', 'Chain of custody', '产销监管链', 'BV-COC-154663', 'Bureau Veritas Certification (Demo)', '2026-05-20'::date, '2027-05-19'::date, '/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B', 'verified'),
    (flooring_id, 'VOC Test Report', 'VOC 检测报告', 'Emission test', '排放检测', 'VOC-WPC-2026-018', 'Demo Building Materials Testing Institute', '2026-05-20'::date, '2027-05-19'::date, '/api/chemical-document?type=heavy-metals&product=DPP-WPC-MS140K25B', 'verified'),
    (flooring_id, 'REACH Declaration', 'REACH 声明', 'Chemical compliance', '化学合规', 'REACH-WPC-2026-026', 'Demo Chemical Testing Institute', '2026-05-20'::date, '2027-05-19'::date, '/api/chemical-document?type=svhc&product=DPP-WPC-MS140K25B', 'verified'),
    (flooring_id, 'ISO9001 Certificate', 'ISO9001 证书', 'Quality management', '质量管理', 'ISO9001-MS140K25B-DEMO', 'Demo QMS Certification Body', '2026-05-20'::date, '2027-05-19'::date, '/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B', 'verified');

  insert into public.product_consumer_transparency (
    product_id, brand_story, brand_story_zh, sustainability_story, sustainability_story_zh,
    consumer_notice, consumer_notice_zh, packaging_info
  )
  values (
    flooring_id,
    'WPC PLANK MS140K25B is an outdoor composite decking board made in China by HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD.',
    'WPC PLANK MS140K25B 是由 HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD 在中国制造的户外木塑 composite decking 板材。',
    'Material composition is 60% wood fiber, 30% recycled HDPE, 7% stabilizer additives and 3% brown masterbatch, with mechanical recycling and FSC/REACH/VOC/ISO9001 evidence reserved.',
    '材料组成为 60% 木纤维、30% 再生 HDPE、7% 稳定剂助剂和 3% 棕色母粒，并预留机械回收及 FSC/REACH/VOC/ISO9001 证据。',
    'Available colours: WOOD / COFFEE / DARK GREY / LIGHT GREY. Batch W2605-05 was produced on 2026-05-20.',
    '可选颜色：WOOD / COFFEE / DARK GREY / LIGHT GREY。W2605-05 批次生产日期为 2026-05-20。',
    'Recyclable pallet supplied by 泾县兴林木业有限公司; remove pallet and metal accessories before WPC recycling.'
  );

  insert into public.product_digital_identity (
    product_id, product_uuid, gtin, style_id, batch_id, serial_id,
    digital_link_url, qr_code_id, nfc_id, rfid_epc
  )
  values (
    flooring_id, '51e0f9f3-3c7b-45c0-9b8f-demofloor01', '06900000000203',
    'STYLE-WPC-MS140K25B', 'W2605-05', 'TRACE-W2605-05',
    'https://www.greanlean.com/p/DPP-WPC-MS140K25B', 'QR-DPP-WPC-001', 'NFC-RESERVED', 'RFID-PALLET-RESERVED'
  );

  insert into public.product_documents (
    product_id, document_name, document_type, file_url, file_size, language, uploaded_by, version
  )
  values
    (flooring_id, 'EU Declaration of Performance', 'DoP', '/api/declaration?product=DPP-WPC-MS140K25B', '390 KB', 'EN / ZH', 'greanlean admin', 'v1.0'),
    (flooring_id, 'FSC Certificate', 'FSC', '/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B', '460 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'REACH Declaration', 'REACH', '/api/chemical-document?type=svhc&product=DPP-WPC-MS140K25B', '410 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'VOC Test Report', 'VOC', '/api/chemical-document?type=heavy-metals&product=DPP-WPC-MS140K25B', '520 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'ISO9001 Certificate', 'ISO9001', '/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B', '440 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'Installation Guide', 'Installation', '/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B', '680 KB', 'EN / ZH', 'greanlean admin', 'v1.0'),
    (flooring_id, 'Warranty Document', 'Warranty', '/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B', '360 KB', 'EN / ZH', 'greanlean admin', 'v1.0');

  insert into public.product_data_governance (
    product_id, data_source, data_owner, audit_status, data_quality_score
  )
  values (
    flooring_id,
    '地板DPP.xlsx plus demo assumptions for blank environmental and traceability fields. Primary filled fields: product model MS140K25B, material formula, supplier names, batch W2605-05, FSC BV-COC-154663, REACH, VOC, ISO9001, installation guide and warranty document.',
    'greanlean admin',
    'Demo review completed
Verifier: Greanlean demo data review
Certificate: DPP-WPC-MS140K25B
Batch/Lot: W2605-05
Estimated fields: carbon footprint, electricity, water, renewable energy ratio, waste recycling rate and ISO14001 readiness
Last updated: 2026-06-07',
    90
  );
end $$;

commit;
