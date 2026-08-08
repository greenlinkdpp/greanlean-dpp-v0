import { createClient } from "@supabase/supabase-js";

const PRODUCT_IDS = [
  "DPP-LMT-BAT-48V15AH",
  "DPP-GV-ESS-14K3-000001",
  "DPP-SFJK-31-1-REC",
  "DPP-CE-EARBUDS-001",
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const db = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function assertDatabaseResult(operation, result) {
  if (result.error) {
    throw new Error(`${operation}: ${result.error.code || ""} ${result.error.message}`.trim());
  }
  return result.data;
}

function gs1DigitalLink(gtin, batchId, serialId) {
  const segments = ["01", gtin];
  if (batchId) segments.push("10", encodeURIComponent(batchId));
  if (serialId) segments.push("21", encodeURIComponent(serialId));
  return `https://www.greanlean.com/${segments.join("/")}`;
}

function gs1Upi(gtin, batchId, serialId) {
  return [
    `01:${gtin}`,
    batchId ? `10:${batchId}` : null,
    serialId ? `21:${serialId}` : null,
  ].filter(Boolean).join("|");
}

async function productMap() {
  const products = assertDatabaseResult(
    "load showcase products",
    await db.from("products").select("id,dpp_id").in("dpp_id", PRODUCT_IDS),
  );
  if (products.length !== PRODUCT_IDS.length) {
    const found = new Set(products.map((product) => product.dpp_id));
    throw new Error(`Missing showcase products: ${PRODUCT_IDS.filter((id) => !found.has(id)).join(", ")}`);
  }
  return new Map(products.map((product) => [product.dpp_id, product.id]));
}

async function updateProduct(dppId, values) {
  assertDatabaseResult(
    `update ${dppId}`,
    await db.from("products").update({ ...values, updated_at: new Date().toISOString() }).eq("dpp_id", dppId),
  );
}

async function updateSingle(table, productId, values) {
  const rows = assertDatabaseResult(
    `load ${table}`,
    await db.from(table).select("id").eq("product_id", productId).order("created_at").limit(1),
  );
  if (!rows.length) {
    assertDatabaseResult(`insert ${table}`, await db.from(table).insert({ product_id: productId, ...values }));
    return;
  }
  assertDatabaseResult(
    `update ${table}`,
    await db.from(table).update(values).eq("id", rows[0].id),
  );
}

async function updateDigitalIdentity(productId, identity) {
  const { dppId, ...storedIdentity } = identity;
  const digitalLink = gs1DigitalLink(identity.gtin, identity.batch_id, identity.serial_id);
  await updateSingle("product_digital_identity", productId, {
    ...storedIdentity,
    product_uuid: gs1Upi(identity.gtin, identity.batch_id, identity.serial_id),
    digital_link_url: digitalLink,
    data_carrier_type: "qr",
    data_carrier_url: digitalLink,
    qr_code_id: `QR-${dppId}`,
  });
}

async function upsertSectorFields(productId, profileKey, fields) {
  const rows = fields.map((field) => ({
    product_id: productId,
    profile_key: profileKey,
    source_type: "database",
    visibility_level: "public",
    evidence_status: "declared",
    ...field,
  }));
  assertDatabaseResult(
    `upsert ${profileKey} fields`,
    await db.from("product_sector_field_values").upsert(rows, {
      onConflict: "product_id,field_key",
    }),
  );
}

async function completeLmt(productId) {
  await updateProduct("DPP-LMT-BAT-48V15AH", {
    commodity_code: "850760",
    season: "2026 EU Light Mobility Battery Series",
    granularity_level: "item",
  });
  await updateDigitalIdentity(productId, {
    dppId: "DPP-LMT-BAT-48V15AH",
    gtin: "06900000004807",
    style_id: "GL-LMT-BAT-48V15AH",
    batch_id: "LMT-BAT-BATCH-2026-01",
    serial_id: "GLBAT48V15AH0001",
    rfid_epc: "urn:epc:id:sgtin:6900000.000480.GLBAT48V15AH0001",
  });
  await updateSingle("product_esg_metrics", productId, {
    carbon_footprint: 62,
    water_usage: 28,
    energy_consumption: 118,
    waste_generation: 1.6,
    recycled_content: 4,
    chemical_management: "Battery substance, RoHS, REACH SVHC and safety-data evidence are maintained as operator declarations until supporting files are verified.",
    methodology: "Product-level screening estimate per 48 V 15 Ah pack, covering cell production, pack assembly and logistics.",
    verified_by: null,
  });
  await updateSingle("product_consumer_transparency", productId, {
    brand_story: "A removable 48 V e-bike battery designed for everyday light-mobility use and authorised service.",
    brand_story_zh: "一款面向日常轻型交通出行和授权维修服务的 48V 可拆卸电动自行车电池。",
    sustainability_story: "The passport records chemistry, materials, carbon footprint, durability, operating history and authorised collection routes.",
    sustainability_story_zh: "护照记录化学体系、材料、碳足迹、耐久性、运行历史和授权回收路径。",
    consumer_notice: "Use only compatible chargers. Stop using the pack if swelling, overheating, water ingress or physical damage is observed.",
    consumer_notice_zh: "仅使用兼容充电器。如发现鼓包、过热、进水或物理损坏，应立即停止使用。",
    marketing_content: "Removable 720 Wh NMC battery pack with BMS protection and item-level passport identity.",
    marketing_content_zh: "采用 NMC 化学体系、具备 BMS 保护和单体级护照身份的 720Wh 可拆卸电池包。",
    packaging_info: "Lithium-battery transport packaging is recorded in the product evidence workflow.",
  });
  await updateSingle("product_data_governance", productId, {
    data_source: "Product master data, BatteryPass field records, BMS history and operator declarations",
    data_owner: "GREANLEAN Mobility",
    verification_level: "manufacturer_declared",
    audit_status: "company_statement_evidence_pending",
    data_quality_score: 88,
  });
}

async function completeIndustrialBattery(productId) {
  await updateProduct("DPP-GV-ESS-14K3-000001", {
    commodity_code: "850760",
    season: "2026 Stationary Energy Storage Series",
    granularity_level: "item",
  });
  await updateDigitalIdentity(productId, {
    dppId: "DPP-GV-ESS-14K3-000001",
    gtin: "06900000014332",
    style_id: "GV-ESS-14K3-2026",
    batch_id: "GV-ESS-BATCH-2026-01",
    serial_id: "GVESS14K3000001",
    rfid_epc: "urn:epc:id:sgtin:6900000.001433.GVESS14K3000001",
  });
  await updateSingle("product_esg_metrics", productId, {
    carbon_footprint: 1032,
    water_usage: 680,
    energy_consumption: 420,
    waste_generation: 9.8,
    recycled_content: 6,
    chemical_management: "Battery material, hazardous-substance and supplier declarations are managed in the evidence workflow.",
    methodology: "Product-level screening estimate per 14.336 kWh module, covering active materials, module assembly and logistics.",
    verified_by: null,
  });
  await updateSingle("product_consumer_transparency", productId, {
    brand_story: "A modular LFP battery for commercial and industrial stationary energy-storage systems.",
    brand_story_zh: "一款面向工商业固定式储能系统的模块化磷酸铁锂电池。",
    sustainability_story: "The passport connects material, carbon, durability, operating, maintenance and recovery information throughout the module lifecycle.",
    sustainability_story_zh: "护照贯通模组生命周期中的材料、碳足迹、耐久性、运行、维护和回收信息。",
    consumer_notice: "Installation, operation and service are restricted to trained high-voltage personnel.",
    consumer_notice_zh: "安装、运行和检修仅限经过培训的高压系统专业人员。",
    marketing_content: "14.336 kWh LFP module with BMS monitoring, 95% initial round-trip efficiency and serviceable system architecture.",
    marketing_content_zh: "14.336kWh 磷酸铁锂模组，配备 BMS 监测，初始往返效率 95%，采用可维护系统架构。",
    packaging_info: "Reusable transport frame with separate protection for terminals and high-voltage interfaces.",
  });
  const traceability = assertDatabaseResult(
    "load industrial traceability",
    await db.from("product_traceability").select("id,event_type").eq("product_id", productId),
  );
  const transportByType = {
    "cell sourcing": "Truck",
    manufacturing: "Internal transfer",
    delivery: "Truck",
  };
  for (const event of traceability) {
    const transport = transportByType[event.event_type];
    if (transport) {
      assertDatabaseResult(
        "update industrial traceability transport",
        await db.from("product_traceability").update({ transport_method: transport }).eq("id", event.id),
      );
    }
  }
  await updateSingle("product_data_governance", productId, {
    data_source: "Product master data, BatteryPass field records, BMS/EMS history and operator declarations",
    data_owner: "GreenVault Energy Systems GmbH",
    verification_level: "manufacturer_declared",
    audit_status: "company_statement_evidence_pending",
    data_quality_score: 88,
  });
}

async function completeTextile(productId) {
  await updateProduct("DPP-SFJK-31-1-REC", {
    season: "2026 Recycled Performance Fabric Collection",
    commodity_code: "5407",
    unique_product_identifier: "https://www.greanlean.com/p/DPP-SFJK-31-1-REC",
    main_image: "/images/75d-recycled-polyester-twill.jpg",
    care_instructions: "Wash finished articles at low temperature according to the garment care label. Do not use chlorine bleach.",
    care_instructions_zh: "终端制品应按成衣护理标签低温洗涤，请勿使用含氯漂白剂。",
    repair_instructions: "Repair seam or panel damage in the finished article before replacement; retain clean production offcuts for reuse.",
    repair_instructions_zh: "终端制品出现线缝或裁片损坏时优先维修；洁净生产边角料应分类保留并再利用。",
  });
  await updateDigitalIdentity(productId, {
    dppId: "DPP-SFJK-31-1-REC",
    gtin: "06900000031117",
    style_id: "SFJK-31-1-REC",
    batch_id: "YK25080097",
    serial_id: null,
    rfid_epc: null,
  });
  await updateSingle("product_materials", productId, {
    material_name: "Polyester fabric with recycled polyester content",
    material_name_zh: "含再生涤纶的聚酯纤维面料",
    material_type: "Woven performance fabric",
    material_type_zh: "梭织功能面料",
    percentage: 100,
    recycled_content: 65,
    origin_country: "China",
    chemical_info: "PFAS and restricted-substance information is supported by the linked supplier declarations and test reports.",
    chemical_info_zh: "PFAS 与受限物质信息由已关联的供应商声明和检测报告支持。",
    recyclability: "Suitable for polyester textile recovery where collection and recycling facilities are available.",
    recyclability_zh: "在具备收集和回收设施的地区，可进入聚酯纺织品回收体系。",
    certification: "GRS scope certificate and OEKO-TEX STANDARD 100 record",
  });
  await updateSingle("product_esg_metrics", productId, {
    carbon_footprint: 3.8,
    water_usage: 42,
    energy_consumption: 9.5,
    waste_generation: 0.32,
    recycled_content: 65,
    chemical_management: "REACH/RSL and PFAS information is maintained through supplier declarations and linked test reports.",
    methodology: "Product-level screening based on material composition, weaving, finishing, factory energy and logistics records.",
    verified_by: null,
  });
  const existingTrace = assertDatabaseResult(
    "load textile traceability",
    await db.from("product_traceability").select("id,event_type").eq("product_id", productId),
  );
  const weaving = existingTrace.find((event) => event.event_type === "Weaving");
  if (weaving) {
    assertDatabaseResult(
      "update textile weaving event",
      await db.from("product_traceability").update({
        transport_method: "Truck",
        verification_status: "declared",
        notes: "Production event recorded from operator production records.",
        notes_zh: "生产事件依据经营者生产记录录入。",
      }).eq("id", weaving.id),
    );
  }
  const newEvents = [
    {
      id: "13900000-0000-4000-8000-000000000001",
      product_id: productId,
      event_type: "Dyeing and finishing",
      event_name: "Dyeing, stretch finishing and inspection",
      event_name_zh: "染色、弹性整理与检验",
      event_date: "2026-06-18T08:30:00.000Z",
      country: "China",
      city: "Suzhou",
      facility_name: "Jiangsu Sanfeng finishing facility",
      facility_name_zh: "江苏三丰后整理工厂",
      transport_method: "Internal transfer",
      verification_status: "declared",
      notes: "Batch processing and quality inspection event.",
      notes_zh: "批次加工与质量检验事件。",
    },
    {
      id: "13900000-0000-4000-8000-000000000002",
      product_id: productId,
      event_type: "Packing and release",
      event_name: "Final inspection, rolling and shipment release",
      event_name_zh: "终检、成卷与放行",
      event_date: "2026-06-22T06:00:00.000Z",
      country: "China",
      city: "Suzhou",
      facility_name: "Jiangsu Sanfeng warehouse",
      facility_name_zh: "江苏三丰成品仓库",
      transport_method: "Truck",
      verification_status: "declared",
      notes: "Batch YK25080097 released after final inspection.",
      notes_zh: "批次 YK25080097 经终检后放行。",
    },
  ];
  assertDatabaseResult(
    "upsert textile traceability",
    await db.from("product_traceability").upsert(newEvents, { onConflict: "id" }),
  );
  await updateSingle("product_consumer_transparency", productId, {
    brand_story: "A high-stretch woven polyester fabric developed for active and outdoor garments.",
    brand_story_zh: "一款面向运动与户外服装开发的高弹梭织聚酯纤维面料。",
    sustainability_story: "The product record links recycled-content, chemical-management, production and textile-recovery information.",
    sustainability_story_zh: "产品记录关联再生成分、化学品管理、生产过程和纺织品回收信息。",
    consumer_notice: "Final care and performance depend on garment construction. Follow the finished-product care label.",
    consumer_notice_zh: "最终护理方式和使用性能取决于成衣结构，请遵循终端制品护理标签。",
    marketing_content: "75D high-stretch twill pongee with 65% declared recycled polyester content.",
    marketing_content_zh: "75D 高弹斜纹春亚纺，申报再生涤纶含量为 65%。",
    packaging_info: "Fabric rolls use a paper core, identification labels and protective PE outer packaging.",
  });
  const certificates = assertDatabaseResult(
    "load textile certificates",
    await db.from("product_certificates").select("id,certificate_name,expiry_date").eq("product_id", productId),
  );
  for (const certificate of certificates) {
    const expired = certificate.expiry_date && certificate.expiry_date < "2026-07-27";
    assertDatabaseResult(
      "update textile certificate status",
      await db.from("product_certificates").update({
        verification_status: expired ? "expired" : "valid",
      }).eq("id", certificate.id),
    );
  }
  await upsertSectorFields(productId, "textile.fabric.woven.v1", [
    {
      module_key: "materials",
      field_key: "fiber_composition",
      field_label: "Fiber composition",
      field_label_zh: "纤维成分",
      field_value: "100% polyester by fibre composition; 65% recycled polyester content declared by mass.",
      evidence_status: "declared",
    },
    {
      module_key: "chemical_compliance",
      field_key: "restricted_substance_statement",
      field_label: "Restricted substance statement",
      field_label_zh: "受限物质声明",
      field_value: "REACH/RSL and PFAS information is supported by linked supplier declarations and test reports; scope follows the uploaded documents.",
      evidence_status: "declared",
    },
    {
      module_key: "performance",
      field_key: "durability_test_basis",
      field_label: "Durability test basis",
      field_label_zh: "耐久性测试依据",
      field_value: "Batch performance is controlled through fabric specification, stretch recovery, dimensional stability, colour-fastness and final-inspection records.",
      evidence_status: "declared",
    },
  ]);
  await updateSingle("product_data_governance", productId, {
    data_source: "Product specification, batch records, supplier declarations, certificates and linked test reports",
    data_owner: "Jiangsu Sanfeng",
    verification_level: "manufacturer_declared",
    audit_status: "company_statement_evidence_linked",
    data_quality_score: 90,
  });
}

async function completeEarbuds(productId) {
  await updateProduct("DPP-CE-EARBUDS-001", {
    commodity_code: "851830",
    season: "2026 Wireless Audio Series",
    brand: "GREANLEAN Audio",
  });
  await updateDigitalIdentity(productId, {
    dppId: "DPP-CE-EARBUDS-001",
    gtin: "06900000000120",
    style_id: "GL-EARBUDS-001",
    batch_id: "BATCH-AUDIO-2026-001",
    serial_id: "EARBUDS-000001",
    nfc_id: "NFC-EARBUDS-001",
    rfid_epc: null,
  });
  const materials = assertDatabaseResult(
    "load earbud materials",
    await db.from("product_materials").select("id,material_type").eq("product_id", productId),
  );
  const materialUpdates = {
    Polymer: {
      chemical_info: "RoHS and REACH substance information is maintained from supplier declarations; supporting reports remain subject to evidence review.",
      chemical_info_zh: "RoHS 与 REACH 物质信息依据供应商声明维护，支持性报告仍需完成证据核验。",
      certification: "Supplier substance declaration",
    },
    Battery: {
      chemical_info: "Lithium-ion battery specification and transport-safety records are managed in the compliance evidence module.",
      chemical_info_zh: "锂离子电池规格与运输安全记录在合规证据模块中维护。",
      certification: "Battery safety evidence pending verification",
    },
    Electronics: {
      chemical_info: "RoHS substance information is maintained from component declarations.",
      chemical_info_zh: "RoHS 物质信息依据元器件声明维护。",
      certification: "Component supplier declaration",
    },
    Accessories: {
      chemical_info: "Skin-contact material information is maintained from supplier declarations.",
      chemical_info_zh: "接触皮肤材料信息依据供应商声明维护。",
      certification: "Supplier material declaration",
    },
  };
  for (const material of materials) {
    const values = materialUpdates[material.material_type];
    if (values) {
      assertDatabaseResult(
        "update earbud material",
        await db.from("product_materials").update(values).eq("id", material.id),
      );
    }
  }
  await updateSingle("product_esg_metrics", productId, {
    carbon_footprint: 6.8,
    water_usage: 42,
    energy_consumption: 15.5,
    waste_generation: 0.22,
    recycled_content: 18,
    chemical_management: "RoHS, REACH SVHC and battery substance information is managed through supplier declarations and evidence review.",
    methodology: "Product-level screening based on component composition, assembly energy, packaging and logistics records.",
    verified_by: null,
  });
  await updateSingle("product_consumer_transparency", productId, {
    brand_story: "Compact wireless earbuds designed for daily audio, replaceable ear tips and responsible electronics collection.",
    brand_story_zh: "一款面向日常音频使用、支持更换耳塞并提供规范电子产品回收路径的无线耳机。",
    sustainability_story: "The passport connects materials, battery information, repair guidance, packaging and WEEE collection routes.",
    sustainability_story_zh: "护照关联材料、电池信息、维修指引、包装和 WEEE 回收路径。",
    consumer_notice: "Keep the product dry, use a compatible USB-C power source and stop use if the battery enclosure is damaged or overheats.",
    consumer_notice_zh: "保持产品干燥，使用兼容的 USB-C 电源；如电池外壳损坏或异常发热，应停止使用。",
    marketing_content: "Wireless stereo earbuds with charging case, replaceable ear tips and model-level product passport.",
    marketing_content_zh: "配备充电盒和可更换耳塞的无线立体声耳机，并提供型号级数字产品护照。",
    packaging_info: "FSC paper box with reduced plastic insert and separate cable compartment.",
  });
  assertDatabaseResult(
    "remove unrelated earbud sector fields",
    await db.from("product_sector_field_values").delete().eq("product_id", productId),
  );
  await upsertSectorFields(productId, "consumer_electronics.audio_device.v1", [
    {
      module_key: "software",
      field_key: "firmware_security_update_policy",
      field_label: "Firmware security update policy",
      field_label_zh: "固件安全更新政策",
      field_value: "Firmware compatibility and security updates are distributed through the supported companion application during the declared product support period.",
      evidence_status: "declared",
    },
  ]);
  await updateSingle("product_data_governance", productId, {
    data_source: "Product specification, component declarations, quality records and logistics documents",
    data_owner: "GREANLEAN Audio",
    verification_level: "manufacturer_declared",
    audit_status: "company_statement_evidence_pending",
    data_quality_score: 88,
  });
}

const products = await productMap();
await completeLmt(products.get("DPP-LMT-BAT-48V15AH"));
await completeIndustrialBattery(products.get("DPP-GV-ESS-14K3-000001"));
await completeTextile(products.get("DPP-SFJK-31-1-REC"));
await completeEarbuds(products.get("DPP-CE-EARBUDS-001"));

console.log(JSON.stringify({
  completed: PRODUCT_IDS,
  sourceStatus: "manufacturer_declared",
  evidencePolicy: "No missing evidence was marked verified.",
}, null, 2));
