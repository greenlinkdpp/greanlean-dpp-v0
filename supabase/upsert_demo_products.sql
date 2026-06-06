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
      public_slug = coalesce(nullif(public_slug, ''), 'demo-wpc-flooring'),
      main_image = '/images/demo-wpc-flooring.svg',
      care_instructions = 'Outdoor decking use. Clean with neutral detergent and water; avoid strong solvents and prolonged high-temperature exposure.',
      care_instructions_zh = '用于户外 decking。建议使用中性清洁剂和清水清洁，避免强溶剂和长期高温暴晒。',
      repair_instructions = 'Replaceable decking panels. Use screw-and-clip disassembly and keep batch W2605-05 spare planks for colour matching.',
      repair_instructions_zh = '可更换单片 decking 板。建议采用螺钉与卡扣拆装方式，并保留 W2605-05 批次备用板以保证颜色一致。',
      end_of_life_instructions = 'Mechanical recycling is preferred. Avoid landfill, remove metal fasteners before recycling, and reprocess usable WPC material into composite products where facilities exist.',
      end_of_life_instructions_zh = '优先机械回收。避免填埋，回收前移除金属紧固件，具备条件时将可用 WPC 材料再加工为复合材料产品。',
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
      'Reusable/recyclable packaging component.',
      '可重复使用/可回收包装部件。',
      'Yes', '是', 'Supplier: 泾县兴林木业有限公司'),
    (flooring_id, 'Stainless Steel Clip And Screw with Narrow Gap (304)', '304 不锈钢窄缝卡扣和螺丝', 'Accessory', '配件', null, null, 'China',
      'Metal fasteners should be removed before WPC recycling.',
      '金属紧固件应在 WPC 回收前移除。',
      'Yes; separate stainless-steel recycling stream', '是；单独进入不锈钢回收流', 'Supplier: 南皮县珺成科技有限公司');

  insert into public.product_bom (
    product_id, component_name, component_name_zh, component_type, component_type_zh,
    quantity, unit, position
  )
  values
    (earbuds_id, 'Wireless earbud main unit', '无线耳机主体', 'Electronic assembly', '电子组件', 2, 'pcs', 'Left / Right earbuds'),
    (earbuds_id, 'Charging case', '充电盒', 'Battery-containing accessory', '含电池配件', 1, 'pc', 'Packaging set'),
    (earbuds_id, 'USB-C charging cable', 'USB-C 充电线', 'Accessory', '配件', 1, 'pc', 'Packaging set'),
    (flooring_id, 'WPC PLANK MS140K25B', 'WPC PLANK MS140K25B', 'Outdoor composite decking board', '户外木塑复合 decking 板', 1, '2.55kg/m', '140x25mm; SANDING; WOOD / COFFEE / DARK GREY / LIGHT GREY'),
    (flooring_id, 'Pallet', '托盘', 'Packaging', '包装', 1, 'set', 'Supplier: 泾县兴林木业有限公司'),
    (flooring_id, 'Stainless Steel Clip And Screw with Narrow Gap (304)', '304 不锈钢窄缝卡扣和螺丝', 'Installation accessory', '安装配件', 1, 'set', 'Supplier: 南皮县珺成科技有限公司');

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
      'Demo EU Building Materials Distributor', '示例欧盟建材经销仓', 'Sea freight + truck', 'pending',
      'Carrier data reserved for future API connection; export route is demo assumption.', '运输数据预留给后续承运商 API 对接；出口路径为 demo 假设。');

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
    (flooring_id, 12, 120, 15, 0.7, 30,
      'No SVHC declared. REACH, VOC and ISO9001 evidence are represented from the Excel document list; carbon, electricity, water, VOC and ISO14001 fields are estimated demo assumptions.',
      '/api/dpp-export?format=pdf&product=demo-wpc-flooring',
      'Estimated screening profile: 12 kg CO2e/m2, 15 kWh electricity, 120 L water, 30% renewable-energy ratio and 70% waste recycling rate; based on WPC decking industry assumptions and supplied product data.',
      'Greanlean demo data review');

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
    (flooring_id, 76, 82, 'Mechanical recycling route: remove metal fasteners and reprocess usable WPC material into composite products.', true, true,
      'Mechanical / screw-and-clip disassembly. Remove stainless-steel clips and screws before WPC recycling.',
      'Avoid landfill. Send WPC plank material to composite-material recycling where local facilities exist; recycle 304 stainless fasteners separately.',
      'Reusable intact panels should be reused first; damaged panels can be mechanically recycled into composite material.');

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
      'DOP-MS140K25B-W2605-05', 'HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD', '2026-05-20'::date, '2027-05-19'::date,
      '/api/declaration?product=demo-wpc-flooring', 'verified'),
    (flooring_id, 'FSC Certificate', 'FSC 证书', 'Chain of custody', '产销监管链',
      'BV-COC-154663', 'Bureau Veritas Certification (Demo)', '2026-05-20'::date, '2027-05-19'::date,
      '/api/dpp-export?format=pdf&product=demo-wpc-flooring', 'verified'),
    (flooring_id, 'VOC Test Report', 'VOC 检测报告', 'Emission test', '排放检测',
      'VOC-WPC-2026-018', 'Demo Building Materials Testing Institute', '2026-05-20'::date, '2027-05-19'::date,
      '/api/chemical-document?type=heavy-metals&product=demo-wpc-flooring', 'verified'),
    (flooring_id, 'REACH Declaration', 'REACH 声明', 'Chemical compliance', '化学合规',
      'REACH-WPC-2026-026', 'Demo Chemical Testing Institute', '2026-05-20'::date, '2027-05-19'::date,
      '/api/chemical-document?type=svhc&product=demo-wpc-flooring', 'verified'),
    (flooring_id, 'ISO9001 Certificate', 'ISO9001 证书', 'Quality management', '质量管理',
      'ISO9001-MS140K25B-DEMO', 'Demo QMS Certification Body', '2026-05-20'::date, '2027-05-19'::date,
      '/api/dpp-export?format=pdf&product=demo-wpc-flooring', 'verified');

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
      'WPC PLANK MS140K25B is an outdoor composite decking board made in China by HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD.',
      'WPC PLANK MS140K25B 是由 HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD 在中国制造的户外木塑 composite decking 板材。',
      'Material composition is 60% wood fiber, 30% recycled HDPE, 7% stabilizer additives and 3% brown masterbatch, with mechanical recycling and FSC/REACH/VOC/ISO9001 evidence reserved.',
      '材料组成为 60% 木纤维、30% 再生 HDPE、7% 稳定剂助剂和 3% 棕色母粒，并预留机械回收及 FSC/REACH/VOC/ISO9001 证据。',
      'Available colours: WOOD / COFFEE / DARK GREY / LIGHT GREY. Batch W2605-05 was produced on 2026-05-20.',
      '可选颜色：WOOD / COFFEE / DARK GREY / LIGHT GREY。W2605-05 批次生产日期为 2026-05-20。',
      'Recyclable pallet supplied by 泾县兴林木业有限公司; remove pallet and metal accessories before WPC recycling.');

  insert into public.product_digital_identity (
    product_id, product_uuid, gtin, style_id, batch_id, serial_id,
    digital_link_url, qr_code_id, nfc_id, rfid_epc
  )
  values
    (earbuds_id, '8a61f0d2-4f6a-4cf2-b11c-demoaudio01', '06900000000128', 'STYLE-AUDIO-001',
      'BATCH-AUDIO-2026-001', 'EARBUDS-DEMO-0001', 'https://www.greanlean.com/p/demo-wireless-earbuds',
      'QR-DPP-EARBUDS-001', 'NFC-EARBUDS-001', 'RFID-RESERVED'),
    (flooring_id, '51e0f9f3-3c7b-45c0-9b8f-demofloor01', '06900000000203', 'STYLE-WPC-MS140K25B',
      'W2605-05', 'TRACE-W2605-05', 'https://www.greanlean.com/p/demo-wpc-flooring',
      'QR-DPP-WPC-001', 'NFC-RESERVED', 'RFID-PALLET-RESERVED');

  insert into public.product_documents (
    product_id, document_name, document_type, file_url, file_size, language, uploaded_by, version
  )
  values
    (earbuds_id, 'EU Declaration of Conformity', 'DoC', '/api/declaration?product=demo-wireless-earbuds', '360 KB', 'EN / ZH', 'greanlean admin', 'v1.0'),
    (earbuds_id, 'Battery MSDS', 'MSDS', '/api/chemical-document?type=msds&product=demo-wireless-earbuds', '480 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'EU Declaration of Performance', 'DoP', '/api/declaration?product=demo-wpc-flooring', '390 KB', 'EN / ZH', 'greanlean admin', 'v1.0'),
    (flooring_id, 'FSC Certificate', 'FSC', '/api/dpp-export?format=pdf&product=demo-wpc-flooring', '460 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'REACH Declaration', 'REACH', '/api/chemical-document?type=svhc&product=demo-wpc-flooring', '410 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'VOC Test Report', 'VOC', '/api/chemical-document?type=heavy-metals&product=demo-wpc-flooring', '520 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'ISO9001 Certificate', 'ISO9001', '/api/dpp-export?format=pdf&product=demo-wpc-flooring', '440 KB', 'EN', 'greanlean admin', 'v1.0'),
    (flooring_id, 'Installation Guide', 'Installation', '/api/dpp-export?format=pdf&product=demo-wpc-flooring', '680 KB', 'EN / ZH', 'greanlean admin', 'v1.0'),
    (flooring_id, 'Warranty Document', 'Warranty', '/api/dpp-export?format=pdf&product=demo-wpc-flooring', '360 KB', 'EN / ZH', 'greanlean admin', 'v1.0');

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
      '地板DPP.xlsx plus demo assumptions for blank environmental and traceability fields. Primary filled fields: product model MS140K25B, material formula, supplier names, batch W2605-05, FSC BV-COC-154663, REACH, VOC, ISO9001, installation guide and warranty document.',
      'greanlean admin',
      'Demo review completed
Verifier: Greanlean demo data review
Certificate: DPP-WPC-MS140K25B
Batch/Lot: W2605-05
Estimated fields: carbon footprint, electricity, water, renewable energy ratio, waste recycling rate and ISO14001 readiness
Last updated: 2026-06-07',
      90);
end $$;

commit;
