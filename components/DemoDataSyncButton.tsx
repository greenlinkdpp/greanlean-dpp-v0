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
  main_image: "/images/demo-wireless-earbuds.png",
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

const furnitureProduct: ProductPayload = {
  name: "Disassemblable Ergonomic Office Chair",
  name_zh: "可拆解人体工学办公椅",
  sku: "GL-CHAIR-001",
  brand: "greanlean",
  category: "Furniture",
  subcategory: "Office Chair",
  season: "2026 EU Furniture Demo",
  description:
    "A furniture digital product passport demo for EU exports, covering material composition, recycled content, durability testing, repairability, disassembly and end-of-life recovery.",
  description_zh: "面向出口欧盟家具产品的数字产品护照示例，覆盖材料组成、再生成分、耐久性测试、可维修性、拆解和生命周期结束回收路径。",
  status: "published",
  dpp_id: "DPP-FURN-DEMO-001",
  public_slug: "demo-office-chair",
  main_image: "/images/demo-office-chair.svg",
  care_instructions: "Wipe frame with a damp cloth. Vacuum mesh regularly. Avoid direct sunlight, corrosive cleaners and overload beyond rated capacity.",
  care_instructions_zh: "金属框架可用微湿布清洁，网布建议定期吸尘。避免长期日晒、腐蚀性清洁剂和超额承重。",
  repair_instructions: "Seat cushion, armrest pads, castors and gas lift are replaceable modules. Use compatible spare parts and keep fasteners sorted during repair.",
  repair_instructions_zh: "坐垫、扶手垫、脚轮和气压杆为可更换模块。维修时使用兼容备件，并分类保存紧固件。",
  end_of_life_instructions:
    "Disassemble metal frame, plastic parts, textile mesh and foam before recycling where possible. Reuse intact components through furniture refurbishment channels first.",
  end_of_life_instructions_zh: "回收前尽量拆分金属框架、塑料件、网布和海绵。完好部件优先进入家具翻新或再使用渠道。",
};

async function upsertProduct(supabase: ReturnType<typeof createSupabaseClient>, payload: ProductPayload, preferSku = false) {
  const { data: bySkuRows } = preferSku
    ? await supabase.from("products").select("id, public_slug").eq("sku", payload.sku).limit(1)
    : { data: [] };
  const { data: bySlugRows } = await supabase.from("products").select("id, sku").eq("public_slug", payload.public_slug).limit(1);
  const bySku = bySkuRows?.[0] || null;
  const bySlug = bySlugRows?.[0] || null;
  const target = bySku || bySlug;

  const updatePayload = {
    ...payload,
    public_slug: bySku && bySlug && bySku.id !== bySlug.id ? bySku.public_slug || payload.public_slug : payload.public_slug,
    updated_at: new Date().toISOString(),
  };

  if (target?.id) {
    const { data, error } = await supabase.from("products").update(updatePayload).eq("id", target.id).select("id").limit(1);
    if (error) throw error;
    return (data?.[0]?.id || target.id) as string;
  }

  const { data, error } = await supabase.from("products").insert(updatePayload).select("id").limit(1);
  if (error) throw error;
  if (!data?.[0]?.id) throw new Error(`Product insert returned no id for ${payload.public_slug}`);
  return data[0].id as string;
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
      const furnitureId = await upsertProduct(supabase, furnitureProduct);
      await resetRelated(supabase, [earbudsId, flooringId, furnitureId]);

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
        {
          product_id: furnitureId,
          material_name: "Powder-coated steel frame",
          material_name_zh: "粉末喷涂钢制框架",
          material_type: "Metal",
          material_type_zh: "金属",
          percentage: 42,
          recycled_content: 35,
          origin_country: "China",
          chemical_info: "REACH SVHC screened; coating tested for lead, cadmium and hexavalent chromium.",
          chemical_info_zh: "已筛查 REACH SVHC；涂层检测铅、镉和六价铬。",
          recyclability: "Separable steel recycling stream",
          recyclability_zh: "可拆解进入钢材回收流",
          certification: "REACH / heavy metal screening",
        },
        {
          product_id: furnitureId,
          material_name: "Recycled PP / PA plastic parts",
          material_name_zh: "再生 PP / PA 塑料件",
          material_type: "Polymer",
          material_type_zh: "聚合物",
          percentage: 28,
          recycled_content: 45,
          origin_country: "China",
          chemical_info: "Phthalates and flame-retardant screening completed.",
          chemical_info_zh: "已完成邻苯二甲酸酯和阻燃剂筛查。",
          recyclability: "Mechanical recycling after sorting by polymer type",
          recyclability_zh: "按聚合物类型分选后可机械回收",
          certification: "GRS supplier declaration (Demo)",
        },
        {
          product_id: furnitureId,
          material_name: "Polyester mesh and PU foam",
          material_name_zh: "涤纶网布与 PU 海绵",
          material_type: "Textile / foam",
          material_type_zh: "纺织 / 海绵",
          percentage: 30,
          recycled_content: 18,
          origin_country: "China",
          chemical_info: "Skin-contact textile screened against REACH and OEKO-TEX substance requirements.",
          chemical_info_zh: "接触皮肤纺织材料按 REACH 和 OEKO-TEX 物质要求筛查。",
          recyclability: "Reuse or textile/foam recovery where local facilities exist",
          recyclability_zh: "具备设施时可再使用或进入纺织/海绵回收",
          certification: "OEKO-TEX supplier declaration (Demo)",
        },
      ]);

      await insertRows(supabase, "product_bom", [
        { product_id: earbudsId, component_name: "Wireless earbud main unit", component_name_zh: "无线耳机主体", component_type: "Electronic assembly", component_type_zh: "电子组件", quantity: 2, unit: "pcs", position: "Left / Right earbuds" },
        { product_id: earbudsId, component_name: "Charging case", component_name_zh: "充电盒", component_type: "Battery-containing accessory", component_type_zh: "含电池配件", quantity: 1, unit: "pc", position: "Packaging set" },
        { product_id: earbudsId, component_name: "USB-C charging cable", component_name_zh: "USB-C 充电线", component_type: "Accessory", component_type_zh: "配件", quantity: 1, unit: "pc", position: "Packaging set" },
        { product_id: flooringId, component_name: "WPC plank core", component_name_zh: "WPC 地板芯层", component_type: "Composite board", component_type_zh: "复合板材", quantity: 1, unit: "plank", position: "Main body" },
        { product_id: flooringId, component_name: "Wear-resistant surface layer", component_name_zh: "耐磨表层", component_type: "Surface treatment", component_type_zh: "表面处理", quantity: 1, unit: "layer", position: "Top surface" },
        { product_id: flooringId, component_name: "Click-lock profile", component_name_zh: "锁扣结构", component_type: "Installation interface", component_type_zh: "安装接口", quantity: 2, unit: "edges", position: "Long edges" },
        { product_id: furnitureId, component_name: "Steel base and frame", component_name_zh: "钢制底座与框架", component_type: "Structural part", component_type_zh: "结构件", quantity: 1, unit: "set", position: "Base / back frame" },
        { product_id: furnitureId, component_name: "Seat cushion module", component_name_zh: "坐垫模块", component_type: "Replaceable module", component_type_zh: "可更换模块", quantity: 1, unit: "pc", position: "Seat" },
        { product_id: furnitureId, component_name: "Armrest and castor kit", component_name_zh: "扶手与脚轮套件", component_type: "Spare-part kit", component_type_zh: "备件套件", quantity: 1, unit: "set", position: "Side / base" },
      ]);

      await insertRows(supabase, "product_traceability", [
        { product_id: earbudsId, event_type: "component sourcing", event_name: "Battery and PCB components sourced", event_name_zh: "采购电池与 PCB 元件", event_date: "2026-04-16", country: "China", city: "Shenzhen", facility_name: "Demo Electronics Component Supplier", facility_name_zh: "示例电子元件供应商", transport_method: "Truck", verification_status: "verified", notes: "Supplier declarations, RoHS statement and battery MSDS linked.", notes_zh: "已关联供应商声明、RoHS 声明和电池 MSDS。" },
        { product_id: earbudsId, event_type: "manufacturing", event_name: "Final assembly and acoustic QA", event_name_zh: "总装与声学质检", event_date: "2026-05-30", country: "China", city: "Dongguan", facility_name: "Demo Electronics Assembly Plant", facility_name_zh: "示例电子装配工厂", transport_method: "Internal transfer", verification_status: "verified", notes: "Batch QA and acoustic test records uploaded.", notes_zh: "已上传批次质检和声学测试记录。" },
        { product_id: earbudsId, event_type: "transport", event_name: "Export shipment to EU importer", event_name_zh: "出口运输至欧盟进口商", event_date: "2026-06-02", country: "Germany", city: "Hamburg", facility_name: "Demo EU Importer Warehouse", facility_name_zh: "示例欧盟进口商仓库", transport_method: "Air freight + truck", verification_status: "pending", notes: "Carrier API connection reserved for future logistics updates.", notes_zh: "预留承运商 API 用于后续物流更新。" },
        { product_id: flooringId, event_type: "material sourcing", event_name: "Recovered wood fibre and recycled polymer sourced", event_name_zh: "采购再生木纤维与再生聚合物", event_date: "2026-04-08", country: "China", city: "Huzhou", facility_name: "Demo Recycled Materials Supplier", facility_name_zh: "示例再生材料供应商", transport_method: "Truck", verification_status: "verified", notes: "Supplier recycled-content declarations and REACH screening linked.", notes_zh: "已关联供应商再生成分声明和 REACH 筛查。" },
        { product_id: flooringId, event_type: "manufacturing", event_name: "Extrusion, profiling and surface finishing", event_name_zh: "挤出、开槽与表面处理", event_date: "2026-05-18", country: "China", city: "Changzhou", facility_name: "Demo WPC Flooring Factory", facility_name_zh: "示例 WPC 地板工厂", transport_method: "Internal transfer", verification_status: "verified", notes: "Batch production, dimension and wear-layer records uploaded.", notes_zh: "已上传批次生产、尺寸和耐磨层记录。" },
        { product_id: flooringId, event_type: "transport", event_name: "Export shipment to EU distributor", event_name_zh: "出口运输至欧盟经销商", event_date: "2026-06-01", country: "Netherlands", city: "Rotterdam", facility_name: "Demo EU Building Materials Distributor", facility_name_zh: "示例欧盟建材经销仓", transport_method: "Sea freight + truck", verification_status: "pending", notes: "Carrier data reserved for future API connection.", notes_zh: "运输数据预留给后续承运商 API 对接。" },
        { product_id: furnitureId, event_type: "material sourcing", event_name: "Steel tube, recycled plastic and mesh sourced", event_name_zh: "采购钢管、再生塑料与网布", event_date: "2026-04-12", country: "China", city: "Foshan", facility_name: "Demo Furniture Materials Supplier", facility_name_zh: "示例家具材料供应商", transport_method: "Truck", verification_status: "verified", notes: "Supplier declarations, recycled-content statement and REACH screening linked.", notes_zh: "已关联供应商声明、再生成分声明和 REACH 筛查。" },
        { product_id: furnitureId, event_type: "manufacturing", event_name: "Frame welding, upholstery and final assembly", event_name_zh: "框架焊接、软包与总装", event_date: "2026-05-22", country: "China", city: "Anji", facility_name: "Demo Office Furniture Factory", facility_name_zh: "示例办公家具工厂", transport_method: "Internal transfer", verification_status: "verified", notes: "Batch production, torque check and durability sample test uploaded.", notes_zh: "已上传批次生产、扭矩检查和耐久性抽检记录。" },
        { product_id: furnitureId, event_type: "transport", event_name: "Export shipment to EU furniture distributor", event_name_zh: "出口运输至欧盟家具经销商", event_date: "2026-06-03", country: "Netherlands", city: "Rotterdam", facility_name: "Demo EU Furniture Distributor", facility_name_zh: "示例欧盟家具经销仓", transport_method: "Sea freight + truck", verification_status: "pending", notes: "Shipment and warehouse data reserved for future logistics API connection.", notes_zh: "运输和仓储数据预留给后续物流 API 对接。" },
      ]);

      await insertRows(supabase, "product_esg_metrics", [
        { product_id: earbudsId, carbon_footprint: 6.8, water_usage: 42, energy_consumption: 15.5, waste_generation: 0.22, recycled_content: 18, chemical_management: "RoHS, REACH SVHC, battery MSDS and supplier declarations reviewed.", lca_report_url: "https://example.com/earbuds-lca-summary.pdf", methodology: "Screening LCA based on component BOM, battery data, assembly energy and export logistics assumptions.", verified_by: "SGS-CSTC Standards Technical Services Co., Ltd. (Demo)" },
        { product_id: flooringId, carbon_footprint: 12.4, water_usage: 18, energy_consumption: 24.6, waste_generation: 0.85, recycled_content: 65, chemical_management: "REACH SVHC, VOC emission, formaldehyde and heavy-metal screening reviewed.", lca_report_url: "https://example.com/wpc-flooring-lca-summary.pdf", methodology: "Screening LCA based on wood-fibre recovery, recycled polymer share, extrusion energy and sea freight to the EU.", verified_by: "Demo Building Materials Testing Institute" },
        { product_id: furnitureId, carbon_footprint: 28.6, water_usage: 76, energy_consumption: 58, waste_generation: 1.4, recycled_content: 34, chemical_management: "REACH SVHC, coating heavy metals, textile contact materials and foam additives reviewed.", lca_report_url: "https://example.com/office-chair-lca-summary.pdf", methodology: "Screening LCA based on steel frame, polymer content, upholstery, assembly energy and sea freight to the EU.", verified_by: "Demo Furniture Testing Institute" },
      ]);

      await insertRows(supabase, "product_circularity", [
        { product_id: earbudsId, repairability_score: 64, recyclability_score: 58, take_back_program: "WEEE take-back through authorized electronics collection points.", resale_supported: true, remanufacturing_supported: false, disassembly_guide: "Remove silicone ear tips and separate charging case before recycling where possible.", recycling_instructions: "Send electronics and battery-containing parts to WEEE and battery collection streams.", end_of_life_info: "Do not dispose with household waste; use WEEE collection." },
        { product_id: flooringId, repairability_score: 70, recyclability_score: 74, take_back_program: "Eligible for installer take-back and construction-waste recovery pilots.", resale_supported: true, remanufacturing_supported: true, disassembly_guide: "Disassemble click-lock planks without adhesive where possible; separate underlayment, trims and packaging.", recycling_instructions: "Sort as WPC/composite construction material; avoid mixing with PVC flooring waste.", end_of_life_info: "Reuse intact planks first, then send to composite-material recycling or authorized construction-waste recovery." },
        { product_id: furnitureId, repairability_score: 82, recyclability_score: 78, take_back_program: "Eligible for office furniture refurbishment and parts harvesting pilot.", resale_supported: true, remanufacturing_supported: true, disassembly_guide: "Remove castors, armrests, gas lift, seat cushion and back mesh before separating metal and plastic streams.", recycling_instructions: "Prioritize reuse and refurbishment; recycle steel frame, sorted plastics and textile/foam through authorized channels.", end_of_life_info: "Do not dispose as mixed waste where bulky-waste or furniture recovery services are available." },
      ]);

      await insertRows(supabase, "product_certificates", [
        { product_id: earbudsId, certificate_name: "EU Declaration of Conformity", certificate_name_zh: "欧盟符合性声明", certificate_type: "DoC / CE", certificate_type_zh: "符合性声明 / CE", certificate_number: "CE-DOC-AUDIO-2026-001", issuer: "Greanlean Electronics Demo Manufacturer", issue_date: "2026-06-04", expiry_date: "2027-06-03", certificate_url: "https://example.com/earbuds-eu-doc.pdf", verification_status: "verified" },
        { product_id: earbudsId, certificate_name: "RoHS Restricted Substance Test Report", certificate_name_zh: "RoHS 受限物质检测报告", certificate_type: "Chemical compliance", certificate_type_zh: "化学合规", certificate_number: "ROHS-AUDIO-2026-018", issuer: "SGS-CSTC Standards Technical Services Co., Ltd. (Demo)", issue_date: "2026-05-18", expiry_date: "2027-05-17", certificate_url: "https://example.com/earbuds-rohs-report.pdf", verification_status: "verified" },
        { product_id: flooringId, certificate_name: "EU Declaration of Performance", certificate_name_zh: "欧盟性能声明 DoP", certificate_type: "Construction products", certificate_type_zh: "建筑产品", certificate_number: "DOP-WPC-MS140K25B", issuer: "HUANGSHAN MEISEN New Material Co., Ltd.", issue_date: "2026-06-04", expiry_date: "2027-06-03", certificate_url: "https://example.com/wpc-flooring-dop.pdf", verification_status: "verified" },
        { product_id: flooringId, certificate_name: "VOC Emission Test Report", certificate_name_zh: "VOC 排放检测报告", certificate_type: "Indoor air quality", certificate_type_zh: "室内空气质量", certificate_number: "VOC-WPC-2026-018", issuer: "Demo Building Materials Testing Institute", issue_date: "2026-05-12", expiry_date: "2027-05-11", certificate_url: "https://example.com/wpc-voc-report.pdf", verification_status: "verified" },
        { product_id: furnitureId, certificate_name: "Furniture Durability Test Report", certificate_name_zh: "家具耐久性测试报告", certificate_type: "Performance", certificate_type_zh: "性能测试", certificate_number: "EN1335-CHAIR-2026-011", issuer: "Demo Furniture Testing Institute", issue_date: "2026-05-16", expiry_date: "2027-05-15", certificate_url: "https://example.com/office-chair-en1335-test.pdf", verification_status: "verified" },
        { product_id: furnitureId, certificate_name: "REACH SVHC and Heavy Metal Screening", certificate_name_zh: "REACH SVHC 与重金属筛查", certificate_type: "Chemical compliance", certificate_type_zh: "化学合规", certificate_number: "REACH-FURN-2026-024", issuer: "Demo Chemical Testing Institute", issue_date: "2026-05-20", expiry_date: "2027-05-19", certificate_url: "https://example.com/office-chair-reach-report.pdf", verification_status: "verified" },
      ]);

      await insertRows(supabase, "product_consumer_transparency", [
        { product_id: earbudsId, brand_story: "This demo shows how consumer electronics export data can become a public digital product passport.", brand_story_zh: "该示例展示如何将消费电子出口数据转化为公开数字产品护照。", sustainability_story: "Recycled plastic content, RoHS-screened components and WEEE instructions are disclosed for buyers and consumers.", sustainability_story_zh: "披露再生塑料成分、RoHS 筛查组件和 WEEE 指引，面向采购商和消费者透明展示。", consumer_notice: "Battery performance varies by use. Scan again before repair, resale or recycling for the latest product information.", consumer_notice_zh: "电池表现会随使用方式变化。维修、转售或回收前可再次扫码查看最新产品信息。", packaging_info: "FSC paper box with reduced plastic insert." },
        { product_id: flooringId, brand_story: "This demo shows how WPC flooring data can be structured into a digital product passport for EU buyers and installers.", brand_story_zh: "该示例展示如何将 WPC 地板数据结构化为面向欧盟买家和安装商的数字产品护照。", sustainability_story: "Recycled wood fibre, recycled polymer content, VOC evidence and end-of-life guidance are disclosed in this DPP.", sustainability_story_zh: "本 DPP 披露再生木纤维、再生聚合物成分、VOC 证据和生命周期结束指引。", consumer_notice: "Colour and texture may vary by batch. Keep spare planks for repair and scan before reuse or recycling.", consumer_notice_zh: "不同批次颜色和纹理可能略有差异。建议保留备用板，维修、再使用或回收前扫码查看最新信息。", packaging_info: "Recyclable cardboard carton with pallet wrapping reduction plan." },
        { product_id: furnitureId, brand_story: "This demo shows how furniture data can be organized into a repairable and reusable product passport.", brand_story_zh: "该示例展示如何将家具数据组织成支持维修和再使用的数字产品护照。", sustainability_story: "Recycled metal and plastic content, replaceable modules and disassembly instructions are disclosed.", sustainability_story_zh: "披露再生金属和塑料含量、可更换模块和拆解说明。", consumer_notice: "Check fasteners periodically. Scan before resale, repair or bulky-waste collection for the latest product information.", consumer_notice_zh: "建议定期检查紧固件。转售、维修或大件回收前可扫码查看最新产品信息。", packaging_info: "Flat-pack cardboard carton with reduced EPS foam and reusable parts bag." },
      ]);

      await insertRows(supabase, "product_digital_identity", [
        { product_id: earbudsId, product_uuid: "8a61f0d2-4f6a-4cf2-b11c-demoaudio01", gtin: "06900000000128", style_id: "STYLE-AUDIO-001", batch_id: "BATCH-AUDIO-2026-001", serial_id: "EARBUDS-DEMO-0001", digital_link_url: "https://www.greanlean.com/p/demo-wireless-earbuds", qr_code_id: "QR-DPP-EARBUDS-001", nfc_id: "NFC-EARBUDS-001", rfid_epc: "RFID-RESERVED" },
        { product_id: flooringId, product_uuid: "51e0f9f3-3c7b-45c0-9b8f-demofloor01", gtin: "06900000000203", style_id: "STYLE-WPC-MS140K25B", batch_id: "BATCH-WPC-2026-001", serial_id: "WPC-DEMO-0001", digital_link_url: "https://www.greanlean.com/p/demo-wpc-flooring", qr_code_id: "QR-DPP-WPC-001", nfc_id: "NFC-RESERVED", rfid_epc: "RFID-PALLET-RESERVED" },
        { product_id: furnitureId, product_uuid: "e01b59d5-0f1f-4a7d-a25d-demochair01", gtin: "06900000000302", style_id: "STYLE-FURN-CHAIR-001", batch_id: "BATCH-FURN-2026-001", serial_id: "CHAIR-DEMO-0001", digital_link_url: "https://www.greanlean.com/p/demo-office-chair", qr_code_id: "QR-DPP-CHAIR-001", nfc_id: "NFC-CHAIR-RESERVED", rfid_epc: "RFID-CARTON-RESERVED" },
      ]);

      await insertRows(supabase, "product_documents", [
        { product_id: earbudsId, document_name: "EU Declaration of Conformity", document_type: "DoC", file_url: "https://example.com/earbuds-eu-doc.pdf", file_size: "360 KB", language: "EN / ZH", uploaded_by: "greanlean admin", version: "v1.0" },
        { product_id: earbudsId, document_name: "Battery MSDS", document_type: "MSDS", file_url: "https://example.com/earbuds-battery-msds.pdf", file_size: "480 KB", language: "EN", uploaded_by: "greanlean admin", version: "v1.0" },
        { product_id: flooringId, document_name: "EU Declaration of Performance", document_type: "DoP", file_url: "https://example.com/wpc-flooring-dop.pdf", file_size: "390 KB", language: "EN / ZH", uploaded_by: "greanlean admin", version: "v1.0" },
        { product_id: flooringId, document_name: "VOC Emission Test Report", document_type: "VOC", file_url: "https://example.com/wpc-voc-report.pdf", file_size: "520 KB", language: "EN", uploaded_by: "greanlean admin", version: "v1.0" },
        { product_id: furnitureId, document_name: "Furniture Durability Test Report", document_type: "Performance", file_url: "https://example.com/office-chair-en1335-test.pdf", file_size: "510 KB", language: "EN / ZH", uploaded_by: "greanlean admin", version: "v1.0" },
        { product_id: furnitureId, document_name: "REACH SVHC Screening Report", document_type: "Chemical", file_url: "https://example.com/office-chair-reach-report.pdf", file_size: "460 KB", language: "EN", uploaded_by: "greanlean admin", version: "v1.0" },
      ]);

      await insertRows(supabase, "product_data_governance", [
        { product_id: earbudsId, data_source: "Supplier declarations, RoHS/REACH reports, battery specification, QA records and logistics documents.", data_owner: "greanlean admin", audit_status: "Third-party review completed\nVerifier: SGS-CSTC Standards Technical Services Co., Ltd. (Demo)\nCertificate: SGS-DPP-AUDIO-2026-018\nValid until: 2027-06-03\nLast updated: 2026-06-05", data_quality_score: 88 },
        { product_id: flooringId, data_source: "Supplier recycled-content declarations, extrusion batch records, VOC/REACH reports, packaging data and logistics documents.", data_owner: "greanlean admin", audit_status: "Demo review completed\nVerifier: Demo Building Materials Testing Institute\nCertificate: DPP-WPC-MS140K25B\nValid until: 2027-06-03\nLast updated: 2026-06-05", data_quality_score: 87 },
        { product_id: furnitureId, data_source: "Supplier declarations, recycled-content statements, durability reports, production batch records, packaging data and logistics documents.", data_owner: "greanlean admin", audit_status: "Demo review completed\nVerifier: Demo Furniture Testing Institute\nCertificate: DPP-FURN-2026-021\nValid until: 2027-06-03\nLast updated: 2026-06-06", data_quality_score: 89 },
      ]);

      setMessage(isZh ? "Demo 数据已同步。请刷新产品列表查看耳机、WPC 地板和办公椅。" : "Demo data synced. Refresh the product list to view earbuds, WPC flooring and office chair.");
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : String(error);
      setMessage(
        rawMessage.includes("row-level security")
          ? isZh
            ? "当前登录态没有数据库写入权限。请在 Supabase SQL Editor 运行 supabase/upsert_office_chair_demo.sql，或使用有写权限的账号重新同步。"
            : "The current session has no database write permission. Run supabase/upsert_office_chair_demo.sql in Supabase SQL Editor, or sync again with a write-enabled account."
          : rawMessage
      );
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
              ? "补齐 MS140K25B WPC 地板，并把无线耳机和办公椅写入产品中心。"
              : "Complete MS140K25B WPC flooring and add wireless earbuds plus office chair to Product Hub."}
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
