"use client";

import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type ProductPayload = {
  id?: string;
  name: string;
  name_zh: string;
  sku: string;
  brand: string;
  category: string;
  subcategory: string;
  season: string;
  description: string;
  description_zh: string;
  status: string;
  dpp_id: string;
  public_slug: string;
  main_image: string;
  care_instructions: string;
  care_instructions_zh: string;
  repair_instructions: string;
  repair_instructions_zh: string;
  end_of_life_instructions: string;
  end_of_life_instructions_zh: string;
};

const earbudsProduct: ProductPayload = {
  name: "Wireless Bluetooth Earbuds",
  name_zh: "无线蓝牙耳机",
  sku: "GL-EARBUDS-001",
  brand: "greanlean",
  category: "Consumer Electronics",
  subcategory: "Wireless Earbuds",
  season: "2026 Audio Export Series",
  description:
    "A consumer electronics digital product passport demo for EU exports, covering GS1 identifiers, RoHS and REACH evidence, battery and WEEE end-of-life information.",
  description_zh: "面向出口欧盟消费电子产品的数字产品护照示例，覆盖 GS1 标识、RoHS 与 REACH 证据、电池信息和 WEEE 生命周期结束指引。",
  status: "published",
  dpp_id: "DPP-AUDIO-DEMO-001",
  public_slug: "demo-wireless-earbuds",
  main_image: "/images/demo-wireless-earbuds.svg",
  care_instructions: "Keep dry, clean ear tips regularly and avoid prolonged exposure to heat. Use the original charging case and cable where possible.",
  care_instructions_zh: "保持干燥，定期清洁耳塞，避免长时间高温暴露。建议使用原配充电盒和线缆。",
  repair_instructions: "Replace ear tips when worn. Battery and charging case repair should be handled by an authorized service provider.",
  repair_instructions_zh: "耳塞磨损后可更换；电池和充电盒维修建议由授权服务商处理。",
  end_of_life_instructions:
    "Do not dispose with household waste. Send earbuds, charging case and battery-containing parts to authorized WEEE collection points.",
  end_of_life_instructions_zh: "请勿作为生活垃圾丢弃。耳机、充电盒和含电池部件应交至授权 WEEE 回收点。",
};

const flooringProduct: ProductPayload = {
  name: "WPC Composite Flooring Plank",
  name_zh: "WPC 地板",
  sku: "MS140K25B",
  brand: "HUANGSHAN MEISEN",
  category: "Building Materials",
  subcategory: "WPC Composite Flooring",
  season: "2026 EU Building Materials Demo",
  description:
    "A WPC composite flooring digital product passport demo for EU exports, covering material composition, recycled content, VOC and formaldehyde evidence, production traceability, ESG data and end-of-life recovery.",
  description_zh: "面向出口欧盟 WPC 木塑复合地板的数字产品护照示例，覆盖材料组成、再生成分、VOC/甲醛证据、生产追溯、ESG 数据和生命周期结束回收路径。",
  status: "published",
  dpp_id: "DPP-WPC-MS140K25B",
  public_slug: "demo-wpc-flooring",
  main_image: "/images/demo-wpc-flooring.svg",
  care_instructions: "Clean with neutral detergent and damp mop. Avoid long-term standing water, strong solvents and direct high-temperature exposure.",
  care_instructions_zh: "建议使用中性清洁剂和微湿拖布清洁。避免长期积水、强溶剂和高温直晒。",
  repair_instructions: "Replace damaged planks through click-lock disassembly where possible. Keep spare planks from the same batch for colour matching.",
  repair_instructions_zh: "局部损坏可通过锁扣拆装更换单片地板。建议保留同批次备用板以保证颜色一致。",
  end_of_life_instructions:
    "Prioritize reuse of intact planks. Separate underlayment and trims before recycling; send WPC boards to composite-material or construction-waste recovery where available.",
  end_of_life_instructions_zh: "完好板材优先再使用。回收前分离地垫和辅料；WPC 板材建议进入复合材料或建筑废弃物回收渠道。",
};

async function upsertProduct(supabase: ReturnType<typeof createSupabaseClient>, payload: ProductPayload, preferSku = false) {
  const { data: bySku } = preferSku
    ? await supabase.from("products").select("id, public_slug").eq("sku", payload.sku).limit(1).maybeSingle()
    : { data: null };
  const { data: bySlug } = await supabase.from("products").select("id, sku").eq("public_slug", payload.public_slug).limit(1).maybeSingle();
  const target = bySku || bySlug;

  const updatePayload = {
    ...payload,
    public_slug: bySku && bySlug && bySku.id !== bySlug.id ? bySku.public_slug || payload.public_slug : payload.public_slug,
    updated_at: new Date().toISOString(),
  };

  if (target?.id) {
    const { data, error } = await supabase.from("products").update(updatePayload).eq("id", target.id).select("id").single();
    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await supabase.from("products").insert(updatePayload).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function resetRelated(supabase: ReturnType<typeof createSupabaseClient>, productIds: string[]) {
  const tables = [
    "product_materials",
    "product_bom",
    "product_esg_metrics",
    "product_certificates",
    "product_traceability",
    "product_circularity",
    "product_consumer_transparency",
    "product_digital_identity",
    "product_documents",
    "product_data_governance",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().in("product_id", productIds);
    if (error) throw error;
  }
}

async function insertRows(supabase: ReturnType<typeof createSupabaseClient>, table: string, rows: Record<string, any>[]) {
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw error;
}

export function DemoDataSyncButton() {
  const { locale } = useLanguage();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createSupabaseClient();
  const isZh = locale === "zh";

  async function syncDemoData() {
    setSyncing(true);
    setMessage("");

    try {
      const earbudsId = await upsertProduct(supabase, earbudsProduct);
      const flooringId = await upsertProduct(supabase, flooringProduct, true);
      await resetRelated(supabase, [earbudsId, flooringId]);

      await insertRows(supabase, "product_materials", [
        {
          product_id: earbudsId,
          material_name: "Recycled ABS / PC plastic",
          material_name_zh: "再生 ABS / PC 塑料",
          material_type: "Polymer",
          material_type_zh: "聚合物",
          percentage: 45,
          recycled_content: 25,
          origin_country: "China",
          chemical_info: "RoHS restricted substances screened; REACH SVHC below 0.1% w/w.",
          chemical_info_zh: "已筛查 RoHS 受限物质；REACH SVHC 低于 0.1% w/w。",
          recyclability: "WEEE plastics stream after disassembly",
          recyclability_zh: "拆解后进入 WEEE 塑料回收流",
          certification: "RoHS / REACH supplier declaration",
        },
        {
          product_id: earbudsId,
          material_name: "Lithium-ion battery",
          material_name_zh: "锂离子电池",
          material_type: "Battery",
          material_type_zh: "电池",
          percentage: 18,
          recycled_content: 0,
          origin_country: "China",
          chemical_info: "Battery MSDS and UN38.3 transport test available.",
          chemical_info_zh: "提供电池 MSDS 和 UN38.3 运输测试文件。",
          recyclability: "Battery recycling stream",
          recyclability_zh: "进入电池回收流",
          certification: "UN38.3 / IEC 62133",
        },
        {
          product_id: earbudsId,
          material_name: "PCB and electronic components",
          material_name_zh: "PCB 与电子元件",
          material_type: "Electronics",
          material_type_zh: "电子元件",
          percentage: 22,
          recycled_content: 0,
          origin_country: "China",
          chemical_info: "RoHS compliant solder and components.",
          chemical_info_zh: "使用符合 RoHS 要求的焊料和元件。",
          recyclability: "WEEE electronics stream",
          recyclability_zh: "进入 WEEE 电子元件回收流",
          certification: "RoHS",
        },
        {
          product_id: earbudsId,
          material_name: "Silicone ear tips, copper and magnets",
          material_name_zh: "硅胶耳塞、铜和磁件",
          material_type: "Accessories",
          material_type_zh: "配件",
          percentage: 15,
          recycled_content: 0,
          origin_country: "China",
          chemical_info: "Skin-contact materials screened for restricted substances.",
          chemical_info_zh: "接触皮肤材料已进行受限物质筛查。",
          recyclability: "Manual separation recommended",
          recyclability_zh: "建议人工拆解分离",
          certification: "REACH",
        },
        {
          product_id: flooringId,
          material_name: "Recycled wood fibre",
          material_name_zh: "再生木纤维",
          material_type: "Bio-based filler",
          material_type_zh: "生物基填料",
          percentage: 55,
          recycled_content: 80,
          origin_country: "China",
          chemical_info: "Recovered wood fibre screened for heavy metals and restricted preservatives.",
          chemical_info_zh: "再生木纤维已筛查重金属和受限防腐剂。",
          recyclability: "Recoverable in WPC composite stream where infrastructure exists",
          recyclability_zh: "具备条件时可进入 WPC 复合材料回收流",
          certification: "FSC Recycled declaration (Demo)",
        },
        {
          product_id: flooringId,
          material_name: "Recycled HDPE / PP polymer",
          material_name_zh: "再生 HDPE / PP 聚合物",
          material_type: "Polymer matrix",
          material_type_zh: "聚合物基体",
          percentage: 35,
          recycled_content: 60,
          origin_country: "China",
          chemical_info: "REACH SVHC below 0.1% w/w; phthalates screened.",
          chemical_info_zh: "REACH SVHC 低于 0.1% w/w；已筛查邻苯二甲酸酯。",
          recyclability: "Mechanical recycling after sorting and size reduction",
          recyclability_zh: "分选和破碎后可机械回收",
          certification: "GRS supplier declaration (Demo)",
        },
        {
          product_id: flooringId,
          material_name: "Mineral filler and additives",
          material_name_zh: "矿物填料与助剂",
          material_type: "Additives",
          material_type_zh: "助剂",
          percentage: 10,
          recycled_content: 0,
          origin_country: "China",
          chemical_info: "Low-VOC stabilizers; no intentionally added lead, cadmium or hexavalent chromium.",
          chemical_info_zh: "采用低 VOC 稳定剂；未有意添加铅、镉或六价铬。",
          recyclability: "Remain in composite recycling stream",
          recyclability_zh: "随复合材料整体进入回收流",
          certification: "REACH / VOC declaration",
        },
      ]);

      await insertRows(supabase, "product_bom", [
        { product_id: earbudsId, component_name: "Wireless earbud main unit", component_name_zh: "无线耳机主体", component_type: "Electronic assembly", component_type_zh: "电子组件", quantity: 2, unit: "pcs", position: "Left / Right earbuds" },
        { product_id: earbudsId, component_name: "Charging case", component_name_zh: "充电盒", component_type: "Battery-containing accessory", component_type_zh: "含电池配件", quantity: 1, unit: "pc", position: "Packaging set" },
        { product_id: earbudsId, component_name: "USB-C charging cable", component_name_zh: "USB-C 充电线", component_type: "Accessory", component_type_zh: "配件", quantity: 1, unit: "pc", position: "Packaging set" },
        { product_id: flooringId, component_name: "WPC plank core", component_name_zh: "WPC 地板芯层", component_type: "Composite board", component_type_zh: "复合板材", quantity: 1, unit: "plank", position: "Main body" },
        { product_id: flooringId, component_name: "Wear-resistant surface layer", component_name_zh: "耐磨表层", component_type: "Surface treatment", component_type_zh: "表面处理", quantity: 1, unit: "layer", position: "Top surface" },
        { product_id: flooringId, component_name: "Click-lock profile", component_name_zh: "锁扣结构", component_type: "Installation interface", component_type_zh: "安装接口", quantity: 2, unit: "edges", position: "Long edges" },
      ]);

      await insertRows(supabase, "product_traceability", [
        { product_id: earbudsId, event_type: "component sourcing", event_name: "Battery and PCB components sourced", event_name_zh: "采购电池与 PCB 元件", event_date: "2026-04-16", country: "China", city: "Shenzhen", facility_name: "Demo Electronics Component Supplier", facility_name_zh: "示例电子元件供应商", transport_method: "Truck", verification_status: "verified", notes: "Supplier declarations, RoHS statement and battery MSDS linked.", notes_zh: "已关联供应商声明、RoHS 声明和电池 MSDS。" },
        { product_id: earbudsId, event_type: "manufacturing", event_name: "Final assembly and acoustic QA", event_name_zh: "总装与声学质检", event_date: "2026-05-30", country: "China", city: "Dongguan", facility_name: "Demo Electronics Assembly Plant", facility_name_zh: "示例电子装配工厂", transport_method: "Internal transfer", verification_status: "verified", notes: "Batch QA and acoustic test records uploaded.", notes_zh: "已上传批次质检和声学测试记录。" },
        { product_id: earbudsId, event_type: "transport", event_name: "Export shipment to EU importer", event_name_zh: "出口运输至欧盟进口商", event_date: "2026-06-02", country: "Germany", city: "Hamburg", facility_name: "Demo EU Importer Warehouse", facility_name_zh: "示例欧盟进口商仓库", transport_method: "Air freight + truck", verification_status: "pending", notes: "Carrier API connection reserved for future logistics updates.", notes_zh: "预留承运商 API 用于后续物流更新。" },
        { product_id: flooringId, event_type: "material sourcing", event_name: "Recovered wood fibre and recycled polymer sourced", event_name_zh: "采购再生木纤维与再生聚合物", event_date: "2026-04-08", country: "China", city: "Huzhou", facility_name: "Demo Recycled Materials Supplier", facility_name_zh: "示例再生材料供应商", transport_method: "Truck", verification_status: "verified", notes: "Supplier recycled-content declarations and REACH screening linked.", notes_zh: "已关联供应商再生成分声明和 REACH 筛查。" },
        { product_id: flooringId, event_type: "manufacturing", event_name: "Extrusion, profiling and surface finishing", event_name_zh: "挤出、开槽与表面处理", event_date: "2026-05-18", country: "China", city: "Changzhou", facility_name: "Demo WPC Flooring Factory", facility_name_zh: "示例 WPC 地板工厂", transport_method: "Internal transfer", verification_status: "verified", notes: "Batch production, dimension and wear-layer records uploaded.", notes_zh: "已上传批次生产、尺寸和耐磨层记录。" },
        { product_id: flooringId, event_type: "transport", event_name: "Export shipment to EU distributor", event_name_zh: "出口运输至欧盟经销商", event_date: "2026-06-01", country: "Netherlands", city: "Rotterdam", facility_name: "Demo EU Building Materials Distributor", facility_name_zh: "示例欧盟建材经销仓", transport_method: "Sea freight + truck", verification_status: "pending", notes: "Carrier data reserved for future API connection.", notes_zh: "运输数据预留给后续承运商 API 对接。" },
      ]);

      await insertRows(supabase, "product_esg_metrics", [
        { product_id: earbudsId, carbon_footprint: 6.8, water_usage: 42, energy_consumption: 15.5, waste_generation: 0.22, recycled_content: 18, chemical_management: "RoHS, REACH SVHC, battery MSDS and supplier declarations reviewed.", lca_report_url: "https://example.com/earbuds-lca-summary.pdf", methodology: "Screening LCA based on component BOM, battery data, assembly energy and export logistics assumptions.", verified_by: "SGS-CSTC Standards Technical Services Co., Ltd. (Demo)" },
        { product_id: flooringId, carbon_footprint: 12.4, water_usage: 18, energy_consumption: 24.6, waste_generation: 0.85, recycled_content: 65, chemical_management: "REACH SVHC, VOC emission, formaldehyde and heavy-metal screening reviewed.", lca_report_url: "https://example.com/wpc-flooring-lca-summary.pdf", methodology: "Screening LCA based on wood-fibre recovery, recycled polymer share, extrusion energy and sea freight to the EU.", verified_by: "Demo Building Materials Testing Institute" },
      ]);

      await insertRows(supabase, "product_circularity", [
        { product_id: earbudsId, repairability_score: 64, recyclability_score: 58, take_back_program: "WEEE take-back through authorized electronics collection points.", resale_supported: true, remanufacturing_supported: false, disassembly_guide: "Remove silicone ear tips and separate charging case before recycling where possible.", recycling_instructions: "Send electronics and battery-containing parts to WEEE and battery collection streams.", end_of_life_info: "Do not dispose with household waste; use WEEE collection." },
        { product_id: flooringId, repairability_score: 70, recyclability_score: 74, take_back_program: "Eligible for installer take-back and construction-waste recovery pilots.", resale_supported: true, remanufacturing_supported: true, disassembly_guide: "Disassemble click-lock planks without adhesive where possible; separate underlayment, trims and packaging.", recycling_instructions: "Sort as WPC/composite construction material; avoid mixing with PVC flooring waste.", end_of_life_info: "Reuse intact planks first, then send to composite-material recycling or authorized construction-waste recovery." },
      ]);

      await insertRows(supabase, "product_certificates", [
        { product_id: earbudsId, certificate_name: "EU Declaration of Conformity", certificate_name_zh: "欧盟符合性声明", certificate_type: "DoC / CE", certificate_type_zh: "符合性声明 / CE", certificate_number: "CE-DOC-AUDIO-2026-001", issuer: "Greanlean Electronics Demo Manufacturer", issue_date: "2026-06-04", expiry_date: "2027-06-03", certificate_url: "https://example.com/earbuds-eu-doc.pdf", verification_status: "verified" },
        { product_id: earbudsId, certificate_name: "RoHS Restricted Substance Test Report", certificate_name_zh: "RoHS 受限物质检测报告", certificate_type: "Chemical compliance", certificate_type_zh: "化学合规", certificate_number: "ROHS-AUDIO-2026-018", issuer: "SGS-CSTC Standards Technical Services Co., Ltd. (Demo)", issue_date: "2026-05-18", expiry_date: "2027-05-17", certificate_url: "https://example.com/earbuds-rohs-report.pdf", verification_status: "verified" },
        { product_id: flooringId, certificate_name: "EU Declaration of Performance", certificate_name_zh: "欧盟性能声明 DoP", certificate_type: "Construction products", certificate_type_zh: "建筑产品", certificate_number: "DOP-WPC-MS140K25B", issuer: "HUANGSHAN MEISEN New Material Co., Ltd.", issue_date: "2026-06-04", expiry_date: "2027-06-03", certificate_url: "https://example.com/wpc-flooring-dop.pdf", verification_status: "verified" },
        { product_id: flooringId, certificate_name: "VOC Emission Test Report", certificate_name_zh: "VOC 排放检测报告", certificate_type: "Indoor air quality", certificate_type_zh: "室内空气质量", certificate_number: "VOC-WPC-2026-018", issuer: "Demo Building Materials Testing Institute", issue_date: "2026-05-12", expiry_date: "2027-05-11", certificate_url: "https://example.com/wpc-voc-report.pdf", verification_status: "verified" },
      ]);

      await insertRows(supabase, "product_consumer_transparency", [
        { product_id: earbudsId, brand_story: "This demo shows how consumer electronics export data can become a public digital product passport.", brand_story_zh: "该示例展示如何将消费电子出口数据转化为公开数字产品护照。", sustainability_story: "Recycled plastic content, RoHS-screened components and WEEE instructions are disclosed for buyers and consumers.", sustainability_story_zh: "披露再生塑料成分、RoHS 筛查组件和 WEEE 指引，面向采购商和消费者透明展示。", consumer_notice: "Battery performance varies by use. Scan again before repair, resale or recycling for the latest product information.", consumer_notice_zh: "电池表现会随使用方式变化。维修、转售或回收前可再次扫码查看最新产品信息。", packaging_info: "FSC paper box with reduced plastic insert." },
        { product_id: flooringId, brand_story: "This demo shows how WPC flooring data can be structured into a digital product passport for EU buyers and installers.", brand_story_zh: "该示例展示如何将 WPC 地板数据结构化为面向欧盟买家和安装商的数字产品护照。", sustainability_story: "Recycled wood fibre, recycled polymer content, VOC evidence and end-of-life guidance are disclosed in this DPP.", sustainability_story_zh: "本 DPP 披露再生木纤维、再生聚合物成分、VOC 证据和生命周期结束指引。", consumer_notice: "Colour and texture may vary by batch. Keep spare planks for repair and scan before reuse or recycling.", consumer_notice_zh: "不同批次颜色和纹理可能略有差异。建议保留备用板，维修、再使用或回收前扫码查看最新信息。", packaging_info: "Recyclable cardboard carton with pallet wrapping reduction plan." },
      ]);

      await insertRows(supabase, "product_digital_identity", [
        { product_id: earbudsId, product_uuid: "8a61f0d2-4f6a-4cf2-b11c-demoaudio01", gtin: "06900000000128", style_id: "STYLE-AUDIO-001", batch_id: "BATCH-AUDIO-2026-001", serial_id: "EARBUDS-DEMO-0001", digital_link_url: "https://www.greanlean.com/p/demo-wireless-earbuds", qr_code_id: "QR-DPP-EARBUDS-001", nfc_id: "NFC-EARBUDS-001", rfid_epc: "RFID-RESERVED" },
        { product_id: flooringId, product_uuid: "51e0f9f3-3c7b-45c0-9b8f-demofloor01", gtin: "06900000000203", style_id: "STYLE-WPC-MS140K25B", batch_id: "BATCH-WPC-2026-001", serial_id: "WPC-DEMO-0001", digital_link_url: "https://www.greanlean.com/p/demo-wpc-flooring", qr_code_id: "QR-DPP-WPC-001", nfc_id: "NFC-RESERVED", rfid_epc: "RFID-PALLET-RESERVED" },
      ]);

      await insertRows(supabase, "product_documents", [
        { product_id: earbudsId, document_name: "EU Declaration of Conformity", document_type: "DoC", file_url: "https://example.com/earbuds-eu-doc.pdf", file_size: "360 KB", language: "EN / ZH", uploaded_by: "greanlean admin", version: "v1.0" },
        { product_id: earbudsId, document_name: "Battery MSDS", document_type: "MSDS", file_url: "https://example.com/earbuds-battery-msds.pdf", file_size: "480 KB", language: "EN", uploaded_by: "greanlean admin", version: "v1.0" },
        { product_id: flooringId, document_name: "EU Declaration of Performance", document_type: "DoP", file_url: "https://example.com/wpc-flooring-dop.pdf", file_size: "390 KB", language: "EN / ZH", uploaded_by: "greanlean admin", version: "v1.0" },
        { product_id: flooringId, document_name: "VOC Emission Test Report", document_type: "VOC", file_url: "https://example.com/wpc-voc-report.pdf", file_size: "520 KB", language: "EN", uploaded_by: "greanlean admin", version: "v1.0" },
      ]);

      await insertRows(supabase, "product_data_governance", [
        { product_id: earbudsId, data_source: "Supplier declarations, RoHS/REACH reports, battery specification, QA records and logistics documents.", data_owner: "greanlean admin", audit_status: "Third-party review completed\nVerifier: SGS-CSTC Standards Technical Services Co., Ltd. (Demo)\nCertificate: SGS-DPP-AUDIO-2026-018\nValid until: 2027-06-03\nLast updated: 2026-06-05", data_quality_score: 88 },
        { product_id: flooringId, data_source: "Supplier recycled-content declarations, extrusion batch records, VOC/REACH reports, packaging data and logistics documents.", data_owner: "greanlean admin", audit_status: "Demo review completed\nVerifier: Demo Building Materials Testing Institute\nCertificate: DPP-WPC-MS140K25B\nValid until: 2027-06-03\nLast updated: 2026-06-05", data_quality_score: 87 },
      ]);

      setMessage(isZh ? "Demo 数据已同步。请刷新产品列表查看耳机和已补齐的 WPC 地板。" : "Demo data synced. Refresh the product list to view earbuds and the completed WPC flooring demo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{isZh ? "Demo 数据同步" : "Demo data sync"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {isZh
              ? "补齐 MS140K25B WPC 地板，并把无线耳机写入产品中心。"
              : "Complete MS140K25B WPC flooring and add wireless earbuds to Product Hub."}
          </p>
        </div>
        <button className="btn-primary" disabled={syncing} onClick={syncDemoData} type="button">
          {syncing ? (isZh ? "同步中..." : "Syncing...") : isZh ? "同步 Demo 数据" : "Sync Demo Data"}
        </button>
      </div>
      {message && <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
    </div>
  );
}
