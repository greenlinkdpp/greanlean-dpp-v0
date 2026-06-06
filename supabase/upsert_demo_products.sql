-- Non-destructive demo sync.
-- Upserts the wireless earbuds and WPC flooring demos without clearing other business data.

begin;

insert into public.products (
  name, name_zh, sku, brand, category, subcategory, season, description, description_zh,
  status, dpp_id, public_slug, main_image, care_instructions, care_instructions_zh,
  repair_instructions, repair_instructions_zh, end_of_life_instructions, end_of_life_instructions_zh
)
values
(
  'Wireless Bluetooth Earbuds',
  '无线蓝牙耳机',
  'GL-EARBUDS-001',
  'greanlean',
  'Consumer Electronics',
  'Wireless Earbuds',
  '2026 Audio Export Series',
  'A consumer electronics digital product passport demo for EU exports, covering GS1 identifiers, RoHS and REACH evidence, battery and WEEE end-of-life information.',
  '面向出口欧盟消费电子产品的数字产品护照示例，覆盖 GS1 标识、RoHS 与 REACH 证据、电池信息和 WEEE 生命周期结束指引。',
  'published',
  'DPP-AUDIO-DEMO-001',
  'demo-wireless-earbuds',
  '/images/demo-wireless-earbuds.png',
  'Keep dry, clean ear tips regularly and avoid prolonged exposure to heat. Use the original charging case and cable where possible.',
  '保持干燥，定期清洁耳塞，避免长时间高温暴露。建议使用原配充电盒和线缆。',
  'Replace ear tips when worn. Battery and charging case repair should be handled by an authorized service provider.',
  '耳塞磨损后可更换；电池和充电盒维修建议由授权服务商处理。',
  'Do not dispose with household waste. Send earbuds, charging case and battery-containing parts to authorized WEEE collection points.',
  '请勿作为生活垃圾丢弃。耳机、充电盒和含电池部件应交至授权 WEEE 回收点。'
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
  earbuds_id uuid;
  flooring_id uuid;
begin
  select id into earbuds_id from public.products where public_slug = 'demo-wireless-earbuds';
  select id into flooring_id from public.products where sku = 'MS140K25B' limit 1;
  if flooring_id is null then
    select id into flooring_id from public.products where public_slug = 'demo-wpc-flooring';
  end if;
  if flooring_id is null then
    insert into public.products (
      name, name_zh, sku, brand, category, subcategory, season, description, description_zh,
      status, dpp_id, public_slug, main_image, care_instructions, care_instructions_zh,
      repair_instructions, repair_instructions_zh, end_of_life_instructions, end_of_life_instructions_zh
    )
    values (
      'WPC Composite Flooring Plank',
      'WPC 地板',
      'MS140K25B',
      'HUANGSHAN MEISEN',
      'Building Materials',
      'WPC Composite Flooring',
      '2026 EU Building Materials Demo',
      'A WPC composite flooring digital product passport demo for EU exports, covering material composition, recycled content, VOC and formaldehyde evidence, production traceability, ESG data and end-of-life recovery.',
      '面向出口欧盟 WPC 木塑复合地板的数字产品护照示例，覆盖材料组成、再生成分、VOC/甲醛证据、生产追溯、ESG 数据和生命周期结束回收路径。',
      'published',
      'DPP-WPC-MS140K25B',
      'demo-wpc-flooring',
      '/images/demo-wpc-flooring.svg',
      'Clean with neutral detergent and damp mop. Avoid long-term standing water, strong solvents and direct high-temperature exposure.',
      '建议使用中性清洁剂和微湿拖布清洁。避免长期积水、强溶剂和高温直晒。',
      'Replace damaged planks through click-lock disassembly where possible. Keep spare planks from the same batch for colour matching.',
      '局部损坏可通过锁扣拆装更换单片地板。建议保留同批次备用板以保证颜色一致。',
      'Prioritize reuse of intact planks. Separate underlayment and trims before recycling; send WPC boards to composite-material or construction-waste recovery where available.',
      '完好板材优先再使用。回收前分离地垫和辅料；WPC 板材建议进入复合材料或建筑废弃物回收渠道。'
    )
    returning id into flooring_id;
  else
    update public.products
    set
      name = 'WPC Composite Flooring Plank',
      name_zh = 'WPC 地板',
      sku = 'MS140K25B',
      brand = 'HUANGSHAN MEISEN',
      category = 'Building Materials',
      subcategory = 'WPC Composite Flooring',
      season = '2026 EU Building Materials Demo',
      description = 'A WPC composite flooring digital product passport demo for EU exports, covering material composition, recycled content, VOC and formaldehyde evidence, production traceability, ESG data and end-of-life recovery.',
      description_zh = '面向出口欧盟 WPC 木塑复合地板的数字产品护照示例，覆盖材料组成、再生成分、VOC/甲醛证据、生产追溯、ESG 数据和生命周期结束回收路径。',
      status = 'published',
      dpp_id = 'DPP-WPC-MS140K25B',
      public_slug = coalesce(nullif(public_slug, ''), 'demo-wpc-flooring'),
      main_image = '/images/demo-wpc-flooring.svg',
      care_instructions = 'Clean with neutral detergent and damp mop. Avoid long-term standing water, strong solvents and direct high-temperature exposure.',
      care_instructions_zh = '建议使用中性清洁剂和微湿拖布清洁。避免长期积水、强溶剂和高温直晒。',
      repair_instructions = 'Replace damaged planks through click-lock disassembly where possible. Keep spare planks from the same batch for colour matching.',
      repair_instructions_zh = '局部损坏可通过锁扣拆装更换单片地板。建议保留同批次备用板以保证颜色一致。',
      end_of_life_instructions = 'Prioritize reuse of intact planks. Separate underlayment and trims before recycling; send WPC boards to composite-material or construction-waste recovery where available.',
      end_of_life_instructions_zh = '完好板材优先再使用。回收前分离地垫和辅料；WPC 板材建议进入复合材料或建筑废弃物回收渠道。',
      updated_at = now()
    where id = flooring_id;
  end if;

  delete from public.product_materials where product_id in (earbuds_id, flooring_id);
  delete from public.product_bom where product_id in (earbuds_id, flooring_id);
  delete from public.product_esg_metrics where product_id in (earbuds_id, flooring_id);
  delete from public.product_certificates where product_id in (earbuds_id, flooring_id);
  delete from public.product_traceability where product_id in (earbuds_id, flooring_id);
  delete from public.product_circularity where product_id in (earbuds_id, flooring_id);
  delete from public.product_consumer_transparency where product_id in (earbuds_id, flooring_id);
  delete from public.product_digital_identity where product_id in (earbuds_id, flooring_id);
  delete from public.product_documents where product_id in (earbuds_id, flooring_id);
  delete from public.product_data_governance where product_id in (earbuds_id, flooring_id);

  insert into public.product_materials (
    product_id, material_name, material_name_zh, material_type, material_type_zh,
    percentage, recycled_content, origin_country, chemical_info, chemical_info_zh,
    recyclability, recyclability_zh, certification
  )
  values
    (earbuds_id, 'Recycled ABS / PC plastic', '再生 ABS / PC 塑料', 'Polymer', '聚合物', 45, 25, 'China',
      'RoHS restricted substances screened; REACH SVHC below 0.1% w/w.',
      '已筛查 RoHS 受限物质；REACH SVHC 低于 0.1% w/w。',
      'WEEE plastics stream after disassembly', '拆解后进入 WEEE 塑料回收流', 'RoHS / REACH supplier declaration'),
    (earbuds_id, 'Lithium-ion battery', '锂离子电池', 'Battery', '电池', 18, 0, 'China',
      'Battery MSDS and UN38.3 transport test available.',
      '提供电池 MSDS 和 UN38.3 运输测试文件。',
      'Battery recycling stream', '进入电池回收流', 'UN38.3 / IEC 62133'),
    (earbuds_id, 'PCB and electronic components', 'PCB 与电子元件', 'Electronics', '电子元件', 22, 0, 'China',
      'RoHS compliant solder and components.',
      '使用符合 RoHS 要求的焊料和元件。',
      'WEEE electronics stream', '进入 WEEE 电子元件回收流', 'RoHS'),
    (earbuds_id, 'Silicone ear tips, copper and magnets', '硅胶耳塞、铜和磁件', 'Accessories', '配件', 15, 0, 'China',
      'Skin-contact materials screened for restricted substances.',
      '接触皮肤材料已进行受限物质筛查。',
      'Manual separation recommended', '建议人工拆解分离', 'REACH'),
    (flooring_id, 'Recycled wood fibre', '再生木纤维', 'Bio-based filler', '生物基填料', 55, 80, 'China',
      'Recovered wood fibre screened for heavy metals and restricted preservatives.',
      '再生木纤维已筛查重金属和受限防腐剂。',
      'Recoverable in WPC composite stream where infrastructure exists', '具备条件时可进入 WPC 复合材料回收流', 'FSC Recycled declaration (Demo)'),
    (flooring_id, 'Recycled HDPE / PP polymer', '再生 HDPE / PP 聚合物', 'Polymer matrix', '聚合物基体', 35, 60, 'China',
      'REACH SVHC below 0.1% w/w; phthalates screened.',
      'REACH SVHC 低于 0.1% w/w；已筛查邻苯二甲酸酯。',
      'Mechanical recycling after sorting and size reduction', '分选和破碎后可机械回收', 'GRS supplier declaration (Demo)'),
    (flooring_id, 'Mineral filler and additives', '矿物填料与助剂', 'Additives', '助剂', 10, 0, 'China',
      'Low-VOC stabilizers; no intentionally added lead, cadmium or hexavalent chromium.',
      '采用低 VOC 稳定剂；未有意添加铅、镉或六价铬。',
      'Remain in composite recycling stream', '随复合材料整体进入回收流', 'REACH / VOC declaration');

  insert into public.product_bom (
    product_id, component_name, component_name_zh, component_type, component_type_zh,
    quantity, unit, position
  )
  values
    (earbuds_id, 'Wireless earbud main unit', '无线耳机主体', 'Electronic assembly', '电子组件', 2, 'pcs', 'Left / Right earbuds'),
    (earbuds_id, 'Charging case', '充电盒', 'Battery-containing accessory', '含电池配件', 1, 'pc', 'Packaging set'),
    (earbuds_id, 'USB-C charging cable', 'USB-C 充电线', 'Accessory', '配件', 1, 'pc', 'Packaging set'),
    (flooring_id, 'WPC plank core', 'WPC 地板芯层', 'Composite board', '复合板材', 1, 'plank', 'Main body'),
    (flooring_id, 'Wear-resistant surface layer', '耐磨表层', 'Surface treatment', '表面处理', 1, 'layer', 'Top surface'),
    (flooring_id, 'Click-lock profile', '锁扣结构', 'Installation interface', '安装接口', 2, 'edges', 'Long edges');

  insert into public.product_traceability (
    product_id, event_type, event_name, event_name_zh, event_date, country, city,
    facility_name, facility_name_zh, transport_method, verification_status, notes, notes_zh
  )
  values
    (earbuds_id, 'component sourcing', 'Battery and PCB components sourced', '采购电池与 PCB 元件', '2026-04-16'::timestamp, 'China', 'Shenzhen',
      'Demo Electronics Component Supplier', '示例电子元件供应商', 'Truck', 'verified',
      'Supplier declarations, RoHS statement and battery MSDS linked.', '已关联供应商声明、RoHS 声明和电池 MSDS。'),
    (earbuds_id, 'manufacturing', 'Final assembly and acoustic QA', '总装与声学质检', '2026-05-30'::timestamp, 'China', 'Dongguan',
      'Demo Electronics Assembly Plant', '示例电子装配工厂', 'Internal transfer', 'verified',
      'Batch QA and acoustic test records uploaded.', '已上传批次质检和声学测试记录。'),
    (earbuds_id, 'transport', 'Export shipment to EU importer', '出口运输至欧盟进口商', '2026-06-02'::timestamp, 'Germany', 'Hamburg',
      'Demo EU Importer Warehouse', '示例欧盟进口商仓库', 'Air freight + truck', 'pending',
      'Carrier API connection reserved for future logistics updates.', '预留承运商 API 用于后续物流更新。'),
    (flooring_id, 'material sourcing', 'Recovered wood fibre and recycled polymer sourced', '采购再生木纤维与再生聚合物', '2026-04-08'::timestamp, 'China', 'Huzhou',
      'Demo Recycled Materials Supplier', '示例再生材料供应商', 'Truck', 'verified',
      'Supplier recycled-content declarations and REACH screening linked.', '已关联供应商再生成分声明和 REACH 筛查。'),
    (flooring_id, 'manufacturing', 'Extrusion, profiling and surface finishing', '挤出、开槽与表面处理', '2026-05-18'::timestamp, 'China', 'Changzhou',
      'Demo WPC Flooring Factory', '示例 WPC 地板工厂', 'Internal transfer', 'verified',
      'Batch production, dimension and wear-layer records uploaded.', '已上传批次生产、尺寸和耐磨层记录。'),
    (flooring_id, 'transport', 'Export shipment to EU distributor', '出口运输至欧盟经销商', '2026-06-01'::timestamp, 'Netherlands', 'Rotterdam',
      'Demo EU Building Materials Distributor', '示例欧盟建材经销仓', 'Sea freight + truck', 'pending',
      'Carrier data reserved for future API connection.', '运输数据预留给后续承运商 API 对接。');

  insert into public.product_esg_metrics (
    product_id, carbon_footprint, water_usage, energy_consumption, waste_generation,
    recycled_content, chemical_management, lca_report_url, methodology, verified_by
  )
  values
    (earbuds_id, 6.8, 42, 15.5, 0.22, 18,
      'RoHS, REACH SVHC, battery MSDS and supplier declarations reviewed.',
      '/api/dpp-export?format=pdf&product=demo-wireless-earbuds',
      'Screening LCA based on component BOM, battery data, assembly energy and export logistics assumptions.',
      'SGS-CSTC Standards Technical Services Co., Ltd. (Demo)'),
    (flooring_id, 12.4, 18, 24.6, 0.85, 65,
      'REACH SVHC, VOC emission, formaldehyde and heavy-metal screening reviewed.',
      '/api/dpp-export?format=pdf&product=demo-wpc-flooring',
      'Screening LCA based on wood-fibre recovery, recycled polymer share, extrusion energy and sea freight to the EU.',
      'Demo Building Materials Testing Institute');

  insert into public.product_circularity (
    product_id, repairability_score, recyclability_score, take_back_program,
    resale_supported, remanufacturing_supported, disassembly_guide,
    recycling_instructions, end_of_life_info
  )
  values
    (earbuds_id, 64, 58, 'WEEE take-back through authorized electronics collection points.', true, false,
      'Remove silicone ear tips and separate charging case before recycling where possible.',
      'Send electronics and battery-containing parts to WEEE and battery collection streams.',
      'Do not dispose with household waste; use WEEE collection.'),
    (flooring_id, 70, 74, 'Eligible for installer take-back and construction-waste recovery pilots.', true, true,
      'Disassemble click-lock planks without adhesive where possible; separate underlayment, trims and packaging.',
      'Sort as WPC/composite construction material; avoid mixing with PVC flooring waste.',
      'Reuse intact planks first, then send to composite-material recycling or authorized construction-waste recovery.');

  insert into public.product_certificates (
    product_id, certificate_name, certificate_name_zh, certificate_type, certificate_type_zh,
    certificate_number, issuer, issue_date, expiry_date, certificate_url, verification_status
  )
  values
    (earbuds_id, 'EU Declaration of Conformity', '欧盟符合性声明', 'DoC / CE', '符合性声明 / CE',
      'CE-DOC-AUDIO-2026-001', 'Greanlean Electronics Demo Manufacturer', '2026-06-04'::date, '2027-06-03'::date,
      '/api/declaration?product=demo-wireless-earbuds', 'verified'),
    (earbuds_id, 'RoHS Restricted Substance Test Report', 'RoHS 受限物质检测报告', 'Chemical compliance', '化学合规',
      'ROHS-AUDIO-2026-018', 'SGS-CSTC Standards Technical Services Co., Ltd. (Demo)', '2026-05-18'::date, '2027-05-17'::date,
      '/api/chemical-document?type=heavy-metals&product=demo-wireless-earbuds', 'verified'),
    (earbuds_id, 'REACH SVHC Screening', 'REACH SVHC 筛查', 'Chemical compliance', '化学合规',
      'REACH-AUDIO-2026-026', 'Demo Chemical Testing Institute', '2026-05-20'::date, '2027-05-19'::date,
      '/api/chemical-document?type=svhc&product=demo-wireless-earbuds', 'verified'),
    (flooring_id, 'EU Declaration of Performance', '欧盟性能声明 DoP', 'Construction products', '建筑产品',
      'DOP-WPC-MS140K25B', 'HUANGSHAN MEISEN New Material Co., Ltd.', '2026-06-04'::date, '2027-06-03'::date,
      '/api/declaration?product=demo-wpc-flooring', 'verified'),
    (flooring_id, 'VOC Emission Test Report', 'VOC 排放检测报告', 'Indoor air quality', '室内空气质量',
      'VOC-WPC-2026-018', 'Demo Building Materials Testing Institute', '2026-05-12'::date, '2027-05-11'::date,
      '/api/chemical-document?type=heavy-metals&product=demo-wpc-flooring', 'verified'),
    (flooring_id, 'REACH SVHC Screening', 'REACH SVHC 筛查', 'Chemical compliance', '化学合规',
      'REACH-WPC-2026-026', 'Demo Chemical Testing Institute', '2026-05-15'::date, '2027-05-14'::date,
      '/api/chemical-document?type=svhc&product=demo-wpc-flooring', 'verified');

  insert into public.product_consumer_transparency (
    product_id, brand_story, brand_story_zh, sustainability_story, sustainability_story_zh,
    consumer_notice, consumer_notice_zh, packaging_info
  )
  values
    (earbuds_id,
      'This demo shows how consumer electronics export data can become a public digital product passport.',
      '该示例展示如何将消费电子出口数据转化为公开数字产品护照。',
      'Recycled plastic content, RoHS-screened components and WEEE instructions are disclosed for buyers and consumers.',
      '披露再生塑料成分、RoHS 筛查组件和 WEEE 指引，面向采购商和消费者透明展示。',
      'Battery performance varies by use. Scan again before repair, resale or recycling for the latest product information.',
      '电池表现会随使用方式变化。维修、转售或回收前可再次扫码查看最新产品信息。',
      'FSC paper box with reduced plastic insert.'),
    (flooring_id,
      'This demo shows how building-material product data can be structured into a digital product passport for EU buyers and installers.',
      '该示例展示如何将建材产品数据结构化为面向欧盟买家和安装商的数字产品护照。',
      'Recycled wood fibre, recycled polymer content, VOC evidence and end-of-life guidance are disclosed in this DPP.',
      '本 DPP 披露再生木纤维、再生聚合物成分、VOC 证据和生命周期结束指引。',
      'Colour and texture may vary by batch. Keep spare planks for repair and scan before reuse or recycling.',
      '不同批次颜色和纹理可能略有差异。建议保留备用板，维修、再使用或回收前扫码查看最新信息。',
      'Recyclable cardboard carton with pallet wrapping reduction plan.');

  insert into public.product_digital_identity (
    product_id, product_uuid, gtin, style_id, batch_id, serial_id,
    digital_link_url, qr_code_id, nfc_id, rfid_epc
  )
  values
    (earbuds_id, '8a61f0d2-4f6a-4cf2-b11c-demoaudio01', '06900000000128', 'STYLE-AUDIO-001',
      'BATCH-AUDIO-2026-001', 'EARBUDS-DEMO-0001', 'https://www.greanlean.com/p/demo-wireless-earbuds',
      'QR-DPP-EARBUDS-001', 'NFC-EARBUDS-001', 'RFID-RESERVED'),
    (flooring_id, '51e0f9f3-3c7b-45c0-9b8f-demofloor01', '06900000000203', 'STYLE-WPC-MS140K25B',
      'BATCH-WPC-2026-001', 'WPC-DEMO-0001', 'https://www.greanlean.com/p/demo-wpc-flooring',
      'QR-DPP-WPC-001', 'NFC-RESERVED', 'RFID-PALLET-RESERVED');

  insert into public.product_documents (
    product_id, document_name, document_type, file_url, file_size, language, uploaded_by, version
  )
  values
    (earbuds_id, 'EU Declaration of Conformity', 'DoC', '/api/declaration?product=demo-wireless-earbuds', '360 KB', 'EN / ZH', 'greanlean admin', 'v1.0'),
    (earbuds_id, 'Battery MSDS', 'MSDS', '/api/chemical-document?type=msds&product=demo-wireless-earbuds', '480 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'EU Declaration of Performance', 'DoP', '/api/declaration?product=demo-wpc-flooring', '390 KB', 'EN / ZH', 'greanlean admin', 'v1.0'),
    (flooring_id, 'VOC Emission Test Report', 'VOC', '/api/chemical-document?type=heavy-metals&product=demo-wpc-flooring', '520 KB', 'EN', 'greanlean admin', 'v1.0');

  insert into public.product_data_governance (
    product_id, data_source, data_owner, audit_status, data_quality_score
  )
  values
    (earbuds_id,
      'Supplier declarations, RoHS/REACH reports, battery specification, QA records and logistics documents.',
      'greanlean admin',
      'Third-party review completed
Verifier: SGS-CSTC Standards Technical Services Co., Ltd. (Demo)
Certificate: SGS-DPP-AUDIO-2026-018
Valid until: 2027-06-03
Last updated: 2026-06-04',
      88),
    (flooring_id,
      'Supplier recycled-content declarations, extrusion batch records, VOC/REACH reports, packaging data and logistics documents.',
      'greanlean admin',
      'Demo review completed
Verifier: Demo Building Materials Testing Institute
Certificate: DPP-WPC-MS140K25B
Valid until: 2027-06-03
Last updated: 2026-06-05',
      87);
end $$;

commit;
