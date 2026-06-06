-- Non-destructive sync for the furniture demo.
-- Upserts one disassemblable office chair DPP demo without clearing other products.

begin;

insert into public.products (
  name, name_zh, sku, brand, category, subcategory, season, description, description_zh,
  status, dpp_id, public_slug, main_image, care_instructions, care_instructions_zh,
  repair_instructions, repair_instructions_zh, end_of_life_instructions, end_of_life_instructions_zh
)
values (
  'Disassemblable Ergonomic Office Chair',
  '可拆解人体工学办公椅',
  'GL-CHAIR-001',
  'greanlean',
  'Furniture',
  'Office Chair',
  '2026 EU Furniture Demo',
  'A furniture digital product passport demo for EU exports, covering material composition, recycled content, durability testing, repairability, disassembly and end-of-life recovery.',
  '面向出口欧盟家具产品的数字产品护照示例，覆盖材料组成、再生成分、耐久性测试、可维修性、拆解和生命周期结束回收路径。',
  'published',
  'DPP-FURN-DEMO-001',
  'demo-office-chair',
  '/images/demo-office-chair.svg',
  'Wipe frame with a damp cloth. Vacuum mesh regularly. Avoid direct sunlight, corrosive cleaners and overload beyond rated capacity.',
  '金属框架可用微湿布清洁，网布建议定期吸尘。避免长期日晒、腐蚀性清洁剂和超额承重。',
  'Seat cushion, armrest pads, castors and gas lift are replaceable modules. Use compatible spare parts and keep fasteners sorted during repair.',
  '坐垫、扶手垫、脚轮和气压杆为可更换模块。维修时使用兼容备件，并分类保存紧固件。',
  'Disassemble metal frame, plastic parts, textile mesh and foam before recycling where possible. Reuse intact components through furniture refurbishment channels first.',
  '回收前尽量拆分金属框架、塑料件、网布和海绵。完好部件优先进入家具翻新或再使用渠道。'
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
  chair_id uuid;
begin
  select id into chair_id from public.products where public_slug = 'demo-office-chair';

  delete from public.product_materials where product_id = chair_id;
  delete from public.product_bom where product_id = chair_id;
  delete from public.product_esg_metrics where product_id = chair_id;
  delete from public.product_certificates where product_id = chair_id;
  delete from public.product_traceability where product_id = chair_id;
  delete from public.product_circularity where product_id = chair_id;
  delete from public.product_consumer_transparency where product_id = chair_id;
  delete from public.product_digital_identity where product_id = chair_id;
  delete from public.product_documents where product_id = chair_id;
  delete from public.product_data_governance where product_id = chair_id;

  insert into public.product_materials (
    product_id, material_name, material_name_zh, material_type, material_type_zh,
    percentage, recycled_content, origin_country, chemical_info, chemical_info_zh,
    recyclability, recyclability_zh, certification
  )
  values
    (chair_id, 'Powder-coated steel frame', '粉末喷涂钢制框架', 'Metal', '金属', 42, 35, 'China',
      'REACH SVHC screened; coating tested for lead, cadmium and hexavalent chromium.',
      '已筛查 REACH SVHC；涂层检测铅、镉和六价铬。',
      'Separable steel recycling stream', '可拆解进入钢材回收流', 'REACH / heavy metal screening'),
    (chair_id, 'Recycled PP / PA plastic parts', '再生 PP / PA 塑料件', 'Polymer', '聚合物', 28, 45, 'China',
      'Phthalates and flame-retardant screening completed.',
      '已完成邻苯二甲酸酯和阻燃剂筛查。',
      'Mechanical recycling after sorting by polymer type', '按聚合物类型分选后可机械回收', 'GRS supplier declaration (Demo)'),
    (chair_id, 'Polyester mesh and PU foam', '涤纶网布与 PU 海绵', 'Textile / foam', '纺织 / 海绵', 30, 18, 'China',
      'Skin-contact textile screened against REACH and OEKO-TEX substance requirements.',
      '接触皮肤纺织材料按 REACH 和 OEKO-TEX 物质要求筛查。',
      'Reuse or textile/foam recovery where local facilities exist', '具备设施时可再使用或进入纺织/海绵回收', 'OEKO-TEX supplier declaration (Demo)');

  insert into public.product_bom (
    product_id, component_name, component_name_zh, component_type, component_type_zh,
    quantity, unit, position
  )
  values
    (chair_id, 'Steel base and frame', '钢制底座与框架', 'Structural part', '结构件', 1, 'set', 'Base / back frame'),
    (chair_id, 'Seat cushion module', '坐垫模块', 'Replaceable module', '可更换模块', 1, 'pc', 'Seat'),
    (chair_id, 'Armrest and castor kit', '扶手与脚轮套件', 'Spare-part kit', '备件套件', 1, 'set', 'Side / base');

  insert into public.product_traceability (
    product_id, event_type, event_name, event_name_zh, event_date, country, city,
    facility_name, facility_name_zh, transport_method, verification_status, notes, notes_zh
  )
  values
    (chair_id, 'material sourcing', 'Steel tube, recycled plastic and mesh sourced', '采购钢管、再生塑料与网布', '2026-04-12'::timestamp, 'China', 'Foshan',
      'Demo Furniture Materials Supplier', '示例家具材料供应商', 'Truck', 'verified',
      'Supplier declarations, recycled-content statement and REACH screening linked.', '已关联供应商声明、再生成分声明和 REACH 筛查。'),
    (chair_id, 'manufacturing', 'Frame welding, upholstery and final assembly', '框架焊接、软包与总装', '2026-05-22'::timestamp, 'China', 'Anji',
      'Demo Office Furniture Factory', '示例办公家具工厂', 'Internal transfer', 'verified',
      'Batch production, torque check and durability sample test uploaded.', '已上传批次生产、扭矩检查和耐久性抽检记录。'),
    (chair_id, 'transport', 'Export shipment to EU furniture distributor', '出口运输至欧盟家具经销商', '2026-06-03'::timestamp, 'Netherlands', 'Rotterdam',
      'Demo EU Furniture Distributor', '示例欧盟家具经销仓', 'Sea freight + truck', 'pending',
      'Shipment and warehouse data reserved for future logistics API connection.', '运输和仓储数据预留给后续物流 API 对接。');

  insert into public.product_esg_metrics (
    product_id, carbon_footprint, water_usage, energy_consumption, waste_generation,
    recycled_content, chemical_management, lca_report_url, methodology, verified_by
  )
  values (
    chair_id, 28.6, 76, 58, 1.4, 34,
    'REACH SVHC, coating heavy metals, textile contact materials and foam additives reviewed.',
    '/api/dpp-export?format=pdf&product=demo-office-chair',
    'Screening LCA based on steel frame, polymer content, upholstery, assembly energy and sea freight to the EU.',
    'Demo Furniture Testing Institute'
  );

  insert into public.product_circularity (
    product_id, repairability_score, recyclability_score, take_back_program,
    resale_supported, remanufacturing_supported, disassembly_guide,
    recycling_instructions, end_of_life_info
  )
  values (
    chair_id, 82, 78, 'Eligible for office furniture refurbishment and parts harvesting pilot.', true, true,
    'Remove castors, armrests, gas lift, seat cushion and back mesh before separating metal and plastic streams.',
    'Prioritize reuse and refurbishment; recycle steel frame, sorted plastics and textile/foam through authorized channels.',
    'Do not dispose as mixed waste where bulky-waste or furniture recovery services are available.'
  );

  insert into public.product_certificates (
    product_id, certificate_name, certificate_name_zh, certificate_type, certificate_type_zh,
    certificate_number, issuer, issue_date, expiry_date, certificate_url, verification_status
  )
  values
    (chair_id, 'Furniture Durability Test Report', '家具耐久性测试报告', 'Performance', '性能测试',
      'EN1335-CHAIR-2026-011', 'Demo Furniture Testing Institute', '2026-05-16'::date, '2027-05-15'::date,
      '/api/dpp-export?format=pdf&product=demo-office-chair', 'verified'),
    (chair_id, 'REACH SVHC and Heavy Metal Screening', 'REACH SVHC 与重金属筛查', 'Chemical compliance', '化学合规',
      'REACH-FURN-2026-024', 'Demo Chemical Testing Institute', '2026-05-20'::date, '2027-05-19'::date,
      '/api/chemical-document?type=svhc&product=demo-office-chair', 'verified');

  insert into public.product_consumer_transparency (
    product_id, brand_story, brand_story_zh, sustainability_story, sustainability_story_zh,
    consumer_notice, consumer_notice_zh, packaging_info
  )
  values (
    chair_id,
    'This demo shows how furniture data can be organized into a repairable and reusable product passport.',
    '该示例展示如何将家具数据组织成支持维修和再使用的数字产品护照。',
    'Recycled metal and plastic content, replaceable modules and disassembly instructions are disclosed.',
    '披露再生金属和塑料含量、可更换模块和拆解说明。',
    'Check fasteners periodically. Scan before resale, repair or bulky-waste collection for the latest product information.',
    '建议定期检查紧固件。转售、维修或大件回收前可扫码查看最新产品信息。',
    'Flat-pack cardboard carton with reduced EPS foam and reusable parts bag.'
  );

  insert into public.product_digital_identity (
    product_id, product_uuid, gtin, style_id, batch_id, serial_id,
    digital_link_url, qr_code_id, nfc_id, rfid_epc
  )
  values (
    chair_id, 'e01b59d5-0f1f-4a7d-a25d-demochair01', '06900000000302', 'STYLE-FURN-CHAIR-001',
    'BATCH-FURN-2026-001', 'CHAIR-DEMO-0001', 'https://www.greanlean.com/p/demo-office-chair',
    'QR-DPP-CHAIR-001', 'NFC-CHAIR-RESERVED', 'RFID-CARTON-RESERVED'
  );

  insert into public.product_documents (
    product_id, document_name, document_type, file_url, file_size, language, uploaded_by, version
  )
  values
    (chair_id, 'Furniture Durability Test Report', 'Performance', '/api/dpp-export?format=pdf&product=demo-office-chair', '510 KB', 'EN / ZH', 'greanlean admin', 'v1.0'),
    (chair_id, 'REACH SVHC Screening Report', 'Chemical', '/api/chemical-document?type=svhc&product=demo-office-chair', '460 KB', 'EN', 'greanlean admin', 'v1.0');

  insert into public.product_data_governance (
    product_id, data_source, data_owner, audit_status, data_quality_score
  )
  values (
    chair_id,
    'Supplier declarations, recycled-content statements, durability reports, production batch records, packaging data and logistics documents.',
    'greanlean admin',
    'Demo review completed
Verifier: Demo Furniture Testing Institute
Certificate: DPP-FURN-2026-021
Valid until: 2027-06-03
Last updated: 2026-06-06',
    89
  );
end $$;

commit;
