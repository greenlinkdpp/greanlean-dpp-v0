/*
 * Deterministic, idempotent B1 demo seed. This is intentionally a PreProd-only
 * data path: it never reads credentials into evidence, never creates Auth users,
 * and refuses both Production project refs before issuing a database query.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const apply = process.argv.includes("--apply-round-b1-demo");
if (!apply) throw new Error("REFUSED: pass --apply-round-b1-demo to seed the hosted PreProd Demo Showcase.");
if (protectedRefs.has(projectRef) || !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)) throw new Error("REFUSED: Round B1 Demo Showcase is restricted to greanlean-dpp-preprod.");

const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();
async function query(sql, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(180_000),
  });
  const raw = await response.text(); let body; try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  if (!response.ok) throw new Error(`PreProd Demo seed failed (${response.status}): ${String(body?.message || body?.error || raw).slice(0, 800)}`);
  return body || [];
}
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${literal(JSON.stringify(value))}::jsonb`;
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
function hash(value) { return createHash("sha256").update(canonical(value)).digest("hex"); }
function bmsTrends(snapshot) {
  const sequence = (count, amplitude, precision = 1) => Array.from({ length: count }, (_, index) => Number((snapshot + Math.sin(index * 1.7) * amplitude + (index - count + 1) * amplitude / count).toFixed(precision)));
  return { soc_24h: sequence(24, 5), temperature_24h: sequence(24, 1.4), soh_30d: Array.from({ length: 30 }, (_, index) => Number((snapshot + (29 - index) * 0.02).toFixed(2))) };
}
function field(fieldCode, value, accessLevel = "PUBLIC") {
  return { fieldCode, value, unit: null, accessLevel, verificationStatus: "UNVERIFIED", semanticUri: `https://schema.greanlean.example/demo/${fieldCode}`, vocabularyReference: null, provenance: { sourceStatement: "Synthetic PreProd demonstration record; verification status: UNVERIFIED.", publicEvidenceReference: null } };
}

const demos = [
  { code: "GLR-S36B", dpp: "DPP-GLR-LMT-000002", category: "LMT_BATTERY", family: "lmt-battery", nameEn: "GLR-S36B E-bike Battery Pack", nameZh: "GLR-S36B 电动自行车电池包", brand: "GreanLean Reference", summaryEn: "A high-energy-density NMC battery pack for extended urban riding.", summaryZh: "GLR-S36B 采用高能量密度 NMC 电芯，适用于城市长续航骑行。", technical: { chemistry: "NMC", nominal_voltage_v: 36, rated_capacity_ah: 18, product_category: "E-bike battery pack" }, bms: { soc_pct: 64, soh_pct: 94, pack_voltage_v: 38.9, current_a: -4.1, temperature_c: 31.2, cycle_count: 212, operating_state: "Discharging" }, cover: "gradient-green", sort: 20, featured: true },
  { code: "GLR-X48C", dpp: "DPP-GLR-LMT-000003", category: "LMT_BATTERY", family: "lmt-battery", nameEn: "GLR-X48C E-bike Battery Pack", nameZh: "GLR-X48C 电动自行车电池包", brand: "GreanLean Reference", summaryEn: "A high-load battery pack designed for cargo and fleet operations.", summaryZh: "GLR-X48C 面向货运与车队运营的高负载电池包。", technical: { chemistry: "LFP", nominal_voltage_v: 48, rated_capacity_ah: 20, product_category: "E-bike battery pack" }, bms: { soc_pct: 86, soh_pct: 98, pack_voltage_v: 52.7, current_a: 3.1, temperature_c: 27.8, cycle_count: 76, operating_state: "Charging" }, cover: "gradient-green", sort: 30, featured: true },
  { code: "GV-ESS-14K3", dpp: "DPP-DEMO-ESS-000001", category: "INDUSTRIAL_BATTERY", family: "industrial-energy", nameEn: "GreenVault 14.3 kWh Energy Storage Module", nameZh: "GreenVault 14.3 kWh 工业储能模块", brand: "GreenVault Demo", summaryEn: "A 14.3 kWh LFP energy storage module for commercial and industrial applications.", summaryZh: "GreenVault 工商业场景的 14.3 kWh 磷酸铁锂储能模块。", technical: { energy_kwh: 14.3, chemistry: "LFP", nominal_voltage_v: 51.2, product_category: "Industrial energy storage" }, cover: "gradient-blue", sort: 10, featured: true },
  { code: "EW-OC-TSHIRT", dpp: "DPP-DEMO-TEX-000001", category: "TEXTILE", family: "textile", nameEn: "EcoWeave Organic Cotton T-shirt", nameZh: "EcoWeave 有机棉 T 恤", brand: "EcoWeave Demo", summaryEn: "An organic cotton basic T-shirt made with comfortable 180 g/m² fabric.", summaryZh: "EcoWeave 有机棉基础款 T 恤，采用 180 g/m² 舒适面料。", technical: { material: "Organic cotton", weight_gsm: 180, product_category: "Textile garment" }, cover: "gradient-violet", sort: 10, featured: false },
  { code: "LS-EARBUDS-01", dpp: "DPP-DEMO-CE-000001", category: "CONSUMER_ELECTRONICS", family: "consumer-electronics", nameEn: "LoopSound Wireless Earbuds", nameZh: "LoopSound 无线耳机", brand: "LoopSound Demo", summaryEn: "Bluetooth wireless headphones with a recycled ABS enclosure.", summaryZh: "LoopSound 采用再生 ABS 外壳的蓝牙无线耳机。", technical: { product_category: "Consumer electronics", connectivity: "Bluetooth", enclosure_material: "Recycled ABS" }, cover: "gradient-slate", sort: 10, featured: true },
  { code: "TD-WPC-140", dpp: "DPP-DEMO-BLD-000001", category: "BUILDING_MATERIAL", family: "building-material", nameEn: "TerraDeck WPC Flooring Board", nameZh: "TerraDeck 木塑地板", brand: "TerraDeck Demo", summaryEn: "Wood-plastic composite flooring with 52% recycled content.", summaryZh: "TerraDeck 再生材料含量 52% 的木塑复合地板。", technical: { product_category: "Wood-plastic flooring", dimensions_mm: "140 × 25 × 2200 mm", recycled_content_pct: 52 }, cover: "gradient-amber", sort: 10, featured: false },
  { code: "FF-HW-HEX-01", dpp: "DPP-DEMO-HW-000001", category: "HARDWARE", family: "hardware", nameEn: "ForgeFix Precision Hex Tool Set", nameZh: "ForgeFix 精密六角工具套装", brand: "ForgeFix Demo", summaryEn: "A precision alloy-steel tool set with replaceable bits.", summaryZh: "ForgeFix 批头可更换的合金钢精密工具套装。", technical: { product_category: "Hand tool", material: "Alloy steel", repairability: "Replaceable bits" }, cover: "gradient-slate", sort: 10, featured: false },
];

const bilingual = (en, zh) => ({ en, zh });
const recyclerByCategory = {
  TEXTILE: "EcoWeave Textile Recycling Partner",
  CONSUMER_ELECTRONICS: "LoopSound Electronics Recovery Partner",
  BUILDING_MATERIAL: "TerraDeck Materials Recovery Partner",
  HARDWARE: "ForgeFix Metal Recycling Partner",
};
const carbonByDpp = {
  "DPP-GLR-LMT-000001": { total: 31.8, renewable: 34, breakdown: { materials: 16.5, manufacturing: 8.2, transport: 4.0, packaging: 1.6, other: 1.5 } },
  "DPP-GLR-LMT-000002": { total: 48.6, renewable: 42, breakdown: { materials: 26.1, manufacturing: 12.7, transport: 5.4, packaging: 2.2, other: 2.2 } },
  "DPP-GLR-LMT-000003": { total: 62.4, renewable: 47, breakdown: { materials: 34.8, manufacturing: 15.4, transport: 6.5, packaging: 2.8, other: 2.9 } },
  "DPP-DEMO-ESS-000001": { total: 312, renewable: 55 },
  "DPP-DEMO-TEX-000001": { total: 5.2, renewable: 61 },
  "DPP-DEMO-CE-000001": { total: 11.8, renewable: 46 },
  "DPP-DEMO-BLD-000001": { total: 8.4, renewable: 52 },
  "DPP-DEMO-HW-000001": { total: 3.1, renewable: 39 },
};

const lifecycleByDpp = {
  "DPP-GLR-LMT-000001": [["Design frozen", "设计冻结"], ["Cell sourcing", "电芯采购"], ["PACK assembly", "PACK 组装"], ["Factory inspection", "出厂检测"], ["Transport", "运输"], ["Dealer delivery", "经销交付"], ["First activation", "首次激活"], ["Commuting use", "通勤使用"], ["Annual inspection", "年度检测"], ["Expected recycling", "预计回收"]],
  "DPP-GLR-LMT-000002": [["Product design", "产品设计"], ["21700 cell sourcing", "21700 电芯采购"], ["PACK assembly", "PACK 组装"], ["Durability test", "耐久测试"], ["Factory release", "出厂"], ["Logistics transport", "物流运输"], ["User delivery", "用户交付"], ["Long-range riding", "长续航骑行"], ["Periodic diagnostics", "定期诊断"], ["Expected retirement", "预计退役"]],
  "DPP-GLR-LMT-000003": [["Cargo application design", "货运应用设计"], ["Cell and BMS matching", "电芯与 BMS 配套"], ["PACK assembly", "PACK 组装"], ["High-load inspection", "高负载检测"], ["Fleet delivery", "车队交付"], ["First activation", "首次激活"], ["Fleet operation", "车队运营"], ["Semi-annual inspection", "半年度检测"], ["Health assessment", "健康评估"], ["Expected second-life use or recycling", "预计梯次利用/回收"]],
  "DPP-DEMO-ESS-000001": [["System design", "系统设计"], ["Cell and module sourcing", "电芯/模块采购"], ["Pack and cluster assembly", "Pack/簇组装"], ["PCS and BMS integration", "PCS/BMS 集成"], ["System testing", "系统测试"], ["Factory release", "出厂"], ["Site installation", "现场安装"], ["Commissioning", "调试"], ["Grid-connected operation", "并网投运"], ["Routine maintenance", "例行维护"], ["Capacity and health assessment", "容量/健康评估"], ["Retirement", "退役"], ["Second-life use or recycling", "梯次利用/回收"]],
  "DPP-DEMO-TEX-000001": [["Raw material sourcing", "原料采购"], ["Spinning", "纺纱"], ["Weaving", "织造"], ["Dyeing and finishing", "染整"], ["Cutting", "裁剪"], ["Sewing", "缝制"], ["Quality inspection", "质量检验"], ["Packaging", "包装"], ["Shipment", "出货"], ["Retail or delivery", "零售/交付"], ["Use", "使用"], ["Recycling or reuse", "回收/再利用"]],
  "DPP-DEMO-CE-000001": [["Design", "设计"], ["Component sourcing", "零部件采购"], ["Assembly", "组装"], ["Testing", "测试"], ["Packaging", "包装"], ["Shipment", "出货"], ["Activation or first use", "激活/首次使用"], ["Normal use", "正常使用"], ["Repair or component replacement", "维修/部件更换"], ["Retirement", "退役"], ["Electronic-waste recycling", "电子废弃物回收"]],
  "DPP-DEMO-BLD-000001": [["Raw material sourcing", "原材料采购"], ["Compounding", "配料"], ["Extrusion moulding", "挤出成型"], ["Surface treatment", "表面处理"], ["Quality inspection", "质量检验"], ["Packaging", "包装"], ["Transport", "运输"], ["Installation", "安装"], ["Use and maintenance", "使用维护"], ["Removal", "拆除"], ["Reuse or recycling", "再利用/回收"]],
  "DPP-DEMO-HW-000001": [["Steel sourcing", "钢材采购"], ["Forging or machining", "锻造/机加工"], ["Heat treatment", "热处理"], ["Surface treatment", "表面处理"], ["Assembly", "装配"], ["Quality inspection", "质量检测"], ["Packaging", "包装"], ["Shipment", "出货"], ["Use", "使用"], ["Maintenance or accessory replacement", "维护/配件更换"], ["Retirement", "退役"], ["Metal recycling", "金属回收"]],
};

const categorySemantics = {
  TEXTILE: {
    transport: bilingual("Keep dry and clean, avoid prolonged compression, and keep packaging intact during transport.", "防潮、防污染，避免长期挤压；运输过程中保持包装完整。"),
    repair: bilingual("Follow the care label; repair local damage before considering replacement.", "按洗护标签进行清洗与保养；出现局部破损时优先修补，避免不必要更换。"),
    eol: bilingual("Prioritise textile collection, reuse serviceable garments, and sort non-reusable parts by fibre composition.", "优先进入纺织品回收体系；可再利用产品优先二次使用；不可再利用部分按纤维成分分类回收；避免混入普通生活垃圾。"),
  },
  CONSUMER_ELECTRONICS: {
    transport: bilingual("Avoid drops, compression and moisture; protect the enclosure, interfaces and fragile parts.", "避免跌落、挤压和受潮；运输过程中保护外壳、接口及易损部件。"),
    repair: bilingual("Qualified personnel should disassemble the product, replace serviceable modules first, and disconnect power before electrical work.", "由具备相应能力的维修人员进行拆装；优先更换可替换模块和易损件；涉及电气安全的操作应先断电。"),
    eol: bilingual("Use WEEE collection; handle a removable battery separately and sort metals, plastics and circuit boards.", "按 WEEE / 电子废弃物分类回收；电池如可拆卸，应按独立电池回收流程处理；金属、塑料、电路板分类进入相应回收渠道。"),
  },
  BUILDING_MATERIAL: {
    transport: bilingual("Transport flat; prevent bending, heavy pressure and surface scratches, and keep packaging dry.", "平放运输，避免弯折、重压和表面划伤；保持包装干燥。"),
    repair: bilingual("Clean regularly, avoid strongly corrosive chemicals, and replace locally damaged boards individually.", "定期清洁；避免强腐蚀性化学品；局部损坏可单块拆换。"),
    eol: bilingual("Keep boards intact during removal, reuse serviceable boards, and recycle the remainder as wood-plastic composite.", "拆除时优先保持板材完整；可再次使用的板材优先再利用；不可再利用部分按木塑复合材料回收要求处理。"),
  },
  HARDWARE: {
    transport: bilingual("Keep dry, avoid strong impacts, and protect the surface finish and loose components.", "保持干燥，避免强冲击；防止表面处理层刮伤和工具散落。"),
    repair: bilingual("Clean and dry after use, maintain moving parts as instructed, and replace worn bits or accessories.", "使用后清洁并保持干燥；活动部位按说明维护；磨损批头/配件及时更换。"),
    eol: bilingual("Recycle the metal body first, sort plastic packaging and accessories, and keep damaged tools out of hazardous waste.", "主体金属优先进入金属回收体系；塑料包装和附件分类回收；损坏工具不得与危险废物混放。"),
  },
};
const demoDocument = (demo, index, type, en, zh) => ({ document_id: `${demo.code}-DOC-${String(index + 1).padStart(2, "0")}`, document_type: type, title: bilingual(en, zh), issuer: bilingual("GreanLean Reference Mobility — Demo issuer", "GreanLean Reference Mobility — 演示出具方"), issued_date: "2026-09-29", valid_until: "2027-09-29", version: "1.0", status: bilingual("Demo / unverified", "演示 / 未验证"), file: `round-b2-${demo.code.toLowerCase()}-${String(index + 1).padStart(2, "0")}.html` });

function documentsFor(demo) {
  const lmt = [["TEST_REPORT", "UN38.3 Test Report", "UN38.3 测试报告"], ["CERTIFICATE", "IEC Test Certificate", "IEC 测试证书"], ["DECLARATION", "CE Declaration of Conformity", "CE 符合性声明"], ["DECLARATION", "RoHS Declaration", "RoHS 声明"], ["DECLARATION", "REACH Declaration", "REACH 声明"], ["SAFETY", "SDS / MSDS", "SDS / MSDS"], ["SPECIFICATION", "Battery Specification Sheet", "电池规格书"], ["WARRANTY", "Warranty Document", "保修文件"], ["RECYCLING", "Recycling / Disposal Instruction", "回收与处置说明"], ["ENVIRONMENT", "Carbon Footprint Summary", "碳足迹摘要"]];
  const byCategory = {
    INDUSTRIAL_BATTERY: [["SPECIFICATION", "Energy Storage Technical Data Sheet", "储能系统技术数据表"], ["SAFETY", "Fire & Transport Safety Statement", "消防与运输安全说明"], ["ENVIRONMENT", "Carbon Footprint Summary", "碳足迹摘要"], ["SERVICE", "Maintenance & Recycling Guide", "维护与回收指南"]],
    TEXTILE: [["SPECIFICATION", "Fibre Composition Statement", "纤维组成声明"], ["DECLARATION", "Chemical Compliance Declaration", "化学品合规声明"], ["SERVICE", "Care Instruction", "洗涤与保养说明"], ["RECYCLING", "Recycling Guidance", "回收指引"]],
    CONSUMER_ELECTRONICS: [["SPECIFICATION", "Product Specification", "产品规格书"], ["DECLARATION", "CE / RoHS Demo Declaration", "CE / RoHS 演示声明"], ["ENVIRONMENT", "Packaging & Carbon Summary", "包装与碳足迹摘要"], ["SERVICE", "Repair & WEEE Guide", "维修与 WEEE 指引"]],
    BUILDING_MATERIAL: [["SPECIFICATION", "Technical Data Sheet", "技术数据表"], ["TEST_REPORT", "VOC Test Report", "VOC 测试报告"], ["ENVIRONMENT", "EPD Demo", "EPD 演示文件"], ["SERVICE", "Installation & Maintenance Guide", "安装与维护指南"]],
    HARDWARE: [["SPECIFICATION", "Tool Specification Sheet", "工具规格书"], ["TEST_REPORT", "Material & Durability Report", "材料与耐久性报告"], ["ENVIRONMENT", "Carbon & Recycled Material Summary", "碳与再生材料摘要"], ["SERVICE", "Use, Care & Recycling Guide", "使用、维护与回收指南"]],
  };
  return (demo.category === "LMT_BATTERY" ? lmt : byCategory[demo.category]).map(([type, en, zh], index) => demoDocument(demo, index, type, en, zh));
}

function categoryDetails(demo) {
  const common = { classification: bilingual("Synthetic demonstration data", "合成演示数据"), application: bilingual("Customer-facing Digital Product Passport demonstration", "面向客户的数字产品护照演示"), removable: bilingual("Not applicable", "不适用"), replaceable: bilingual("Not applicable", "不适用") };
  if (demo.category === "LMT_BATTERY") return { ...common, ...demo.technical, rated_energy_wh: Number((demo.technical.nominal_voltage_v * demo.technical.rated_capacity_ah).toFixed(1)), cell_specification: bilingual("21700 lithium-ion cell — demo reference", "21700 锂离子电芯 — 演示参考"), cell_format: "21700", series_parallel_configuration: bilingual("10S5P demo configuration", "10 串 5 并演示配置"), weight_kg: 3.4, dimensions_mm: "365 × 90 × 110", ingress_protection: "IP54", charge_cutoff_voltage_v: Number((demo.technical.nominal_voltage_v * 1.17).toFixed(1)), max_charge_current_a: 5, max_continuous_discharge_current_a: 20, operating_temperature_range: "-10°C to 45°C", storage_temperature_range: "10°C to 25°C", cycle_life: bilingual("800 cycles to 80% capacity — demo", "800 次循环至 80% 容量 — 演示"), design_life_years: 6, removable: bilingual("Yes, trained-personnel procedure", "是，需由受训人员操作"), replaceable: bilingual("Yes, approved replacement pack", "是，可使用获批替换电池包") };
  if (demo.category === "INDUSTRIAL_BATTERY") return { ...common, ...demo.technical, rated_power_kw: 7.2, voltage_platform: "51.2 V", architecture: bilingual("Rack module / cluster / pack", "机架模块 / 簇 / 电池包"), thermal_management: bilingual("Passive air cooling — demo", "被动风冷 — 演示"), fire_safety: bilingual("Detection interface and isolation guidance — demo", "检测接口与隔离指引 — 演示"), operating_temperature_range: "0°C to 45°C", cycle_life: bilingual("6,000 cycles — demo reference", "6,000 次循环 — 演示参考") };
  if (demo.category === "TEXTILE") return { ...common, ...demo.technical, fibre_composition: bilingual("100% organic cotton", "100% 有机棉"), material_pct: "100%", dye_chemicals: bilingual("Low-impact reactive dye — demo", "低影响活性染料 — 演示"), production_origin: bilingual("Portugal — demo origin", "葡萄牙 — 演示产地"), dimensions_mm: bilingual("Sizes XS–XXL", "尺码 XS–XXL"), care_instruction: bilingual("Wash at 30°C; repair seams before disposal", "30°C 水洗；处置前修补开线"), water_footprint_l: 2100, design_life_years: 4 };
  if (demo.category === "CONSUMER_ELECTRONICS") return { ...common, ...demo.technical, key_components: bilingual("Speaker driver, charging case, PCB", "扬声器单元、充电盒、印刷电路板"), energy_efficiency: bilingual("Low-power Bluetooth profile — demo", "低功耗蓝牙配置 — 演示"), firmware: bilingual("Demo firmware 1.4; supported update path", "演示固件 1.4；支持更新路径"), removable: bilingual("Battery is service-replaceable", "电池可由维修人员更换"), replaceable_parts: bilingual("Ear tips, charging case, battery", "耳塞、充电盒、电池") };
  if (demo.category === "BUILDING_MATERIAL") return { ...common, ...demo.technical, thickness_mm: 25, weight_kg: 2.8, colour: bilingual("Warm teak", "暖柚木色"), surface_treatment: bilingual("Brushed anti-slip surface", "拉丝防滑表面"), wood_fibre_pct: 55, plastic_pct: 35, additive_pct: 10, wear_resistance: bilingual("Class AC4 — demo", "AC4 级 — 演示"), slip_resistance: "R10", water_absorption_pct: 0.8, weather_resistance: bilingual("UV-stabilised — demo", "抗紫外线稳定 — 演示"), flame_rating: bilingual("Class Cfl-s1 — demo", "Cfl-s1 级 — 演示"), voc: bilingual("Low VOC — demo", "低 VOC — 演示"), installation_method: bilingual("Floating click-lock installation", "悬浮式锁扣安装"), design_life_years: 15 };
  return { ...common, ...demo.technical, steel_type: bilingual("Chrome vanadium alloy steel", "铬钒合金钢"), surface_treatment: bilingual("Black oxide finish", "发黑表面处理"), hardness: "HRC 52–56", weight_kg: 0.68, applicable_standard: bilingual("ISO 2936 reference — demo", "ISO 2936 参考 — 演示"), corrosion_resistance: bilingual("Indoor dry-use protection", "室内干燥环境防护"), production_origin: bilingual("Germany — demo origin", "德国 — 演示产地"), design_life_years: 10 };
}

function payloadFor(demo, passportId, itemId, schemaVersionId) {
  const isBattery = demo.category === "LMT_BATTERY" || demo.category === "INDUSTRIAL_BATTERY";
  const details = categoryDetails(demo);
  const carbon = carbonByDpp[demo.dpp];
  if (!carbon) throw new Error(`REFUSED: Round B2.2 carbon profile missing for ${demo.dpp}.`);
  const carbonTotal = carbon.total;
  const lifecycleNames = lifecycleByDpp[demo.dpp];
  if (!lifecycleNames) throw new Error(`REFUSED: Round B2.2 lifecycle profile missing for ${demo.dpp}.`);
  const lifecycleDates = ["2025-05-01", "2025-07-01", "2025-09-01", "2025-11-01", "2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-09-01", "2027-09-01", "2030-09-01", "2033-09-01", "2036-09-01"];
  const lifecycle = lifecycleNames.map(([en, zh], index) => ({ event_type: bilingual(en, zh), timestamp: `${lifecycleDates[index]}T00:00:00.000Z`, actor: bilingual("GreanLean Reference Mobility", "GreanLean Reference Mobility"), status: index === lifecycleNames.length - 1 ? bilingual("Planned", "计划") : bilingual("Recorded demo event", "已记录演示事件"), detail: bilingual(`${en} — synthetic demonstration event.`, `${zh} — 合成演示事件。`) }));
  const semantics = categorySemantics[demo.category];
  const recycler = recyclerByCategory[demo.category] || "Circular Battery Demo Recycling GmbH";
  const fields = [
    field("demo.warning", { classification: "SYNTHETIC_DEMO", customer_verified: false, regulatory_evidence: false }),
    field("identity.product", { brand: demo.brand, modelCode: demo.code, productName: bilingual(demo.nameEn, demo.nameZh), productNameZh: demo.nameZh, manufacturer: "GreanLean Reference Mobility Ltd.", product_category: bilingual(demo.technical.product_category, demo.category === "LMT_BATTERY" ? "LMT 电池" : demo.category === "INDUSTRIAL_BATTERY" ? "工业储能电池" : demo.category === "TEXTILE" ? "纺织品" : demo.category === "CONSUMER_ELECTRONICS" ? "消费电子产品" : demo.category === "BUILDING_MATERIAL" ? "建筑材料" : "五金产品") }),
    field("identity.item", { dpp_id: demo.dpp, sku: `${demo.code}-DEMO-SKU`, batch_number: `${demo.code}-B2401`, serial_number: `${demo.code}-DEMO-0001`, gtin_or_demo_identifier: bilingual("Internal demonstration identifier", "内部演示标识"), manufacturing_date: "2026-01-20", market_placement_date: "2026-03-18" }),
    field("enterprise.organisations", { brand_owner: { name: "GreanLean Reference Mobility Ltd.", country_region: "DE", address: bilingual("Demoallee 7, Berlin", "柏林 Demoallee 7 号"), contact: "demo@greanlean.invalid", website: "https://www.greanlean.com" }, manufacturer: { name: "GreanLean Reference Mobility Ltd.", country_region: "DE", address: bilingual("Demoallee 7, Berlin", "柏林 Demoallee 7 号"), contact: "demo@greanlean.invalid" }, pack_assembler: { name: "GreanLean Reference Mobility Ltd.", country_region: "DE" }, cell_supplier: { name: "GreenCell Demo Technology Co., Ltd.", country_region: "CN" }, bms_supplier: { name: "GreenBMS Demo Electronics Co., Ltd.", country_region: "CN" }, importer: { name: "GreanLean Europe Demo GmbH", country_region: "DE" }, recycler: { name: "Circular Battery Demo Recycling GmbH", country_region: "DE" } }),
    field("technical.specification", details),
    field("performance.durability", isBattery ? { classification: "SYNTHETIC_DEMO", verification_status: "UNVERIFIED", state_of_charge_pct: 61, state_of_health_pct: 95, temperature_c: 27, cycle_count: 148, lifecycle_reference: bilingual("Demonstration only", "仅用于演示") } : { classification: "SYNTHETIC_DEMO", durability: bilingual("Design durability reference — unverified", "设计耐久性参考 — 未验证"), maintenance_interval: bilingual("Annual visual inspection", "建议每年目视检查"), lifecycle_reference: bilingual("Demonstration only", "仅用于演示") }),
    field("sustainability.carbon-footprint", { classification: "SYNTHETIC_DEMO", total_kg_co2e_per_battery: carbonTotal, functional_unit: bilingual("One product over its stated design life", "一件产品在其设计寿命内"), calculation_boundary: bilingual("Materials, manufacture, transport, packaging and applicable use-stage assumptions", "原材料、制造、运输、包装及适用使用阶段假设"), reference_year: 2026, calculation_method: bilingual("Deterministic demo formula — not an LCA", "确定性演示公式 — 非 LCA"), renewable_energy_pct: carbon.renewable, lifecycle_breakdown_kg_co2e: carbon.breakdown || { materials: Number((carbonTotal * .52).toFixed(1)), manufacturing: Number((carbonTotal * .27).toFixed(1)), transport: Number((carbonTotal * .12).toFixed(1)), packaging: Number((carbonTotal * .05).toFixed(1)), other: Number((carbonTotal * .04).toFixed(1)) }, third_party_verified: false }),
    field("sustainability.recycled-content", { recycled_cobalt_pct: demo.category === "LMT_BATTERY" ? 6 : "NOT_APPLICABLE", recycled_nickel_pct: demo.category === "LMT_BATTERY" ? 8 : "NOT_APPLICABLE", recycled_lithium_pct: demo.category === "LMT_BATTERY" ? 3 : "NOT_APPLICABLE", recycled_lead_pct: "NOT_APPLICABLE", other_recycled_material: bilingual("Recycled aluminium and packaging fibre — demo", "再生铝与包装纤维 — 演示"), packaging_recyclability: bilingual("Paper-based packaging is recyclable where local facilities accept it", "纸基包装可在当地设施接收时回收") }),
    field("sustainability.materials", { classification: "SYNTHETIC_DEMO", material_summary: bilingual(demo.category === "TEXTILE" ? "Organic cotton fibre and low-impact dye" : demo.category === "BUILDING_MATERIAL" ? "Wood fibre, recycled polymer and mineral additives" : demo.category === "HARDWARE" ? "Alloy steel, surface treatment and paper packaging" : demo.category === "CONSUMER_ELECTRONICS" ? "Recycled ABS, PCB and electronic components" : "Cell materials, enclosure, electronics and packaging", demo.category === "TEXTILE" ? "有机棉纤维与低影响染料" : demo.category === "BUILDING_MATERIAL" ? "木纤维、再生聚合物与矿物添加剂" : demo.category === "HARDWARE" ? "合金钢、表面处理与纸质包装" : demo.category === "CONSUMER_ELECTRONICS" ? "再生 ABS、印刷电路板与电子元件" : "电芯材料、壳体、电子元件与包装"), cathode_material: isBattery ? bilingual("NMC / LFP chemistry reference", "NMC / LFP 化学体系参考") : "NOT_APPLICABLE", anode_material: isBattery ? bilingual("Graphite reference", "石墨参考") : "NOT_APPLICABLE", electrolyte_type: isBattery ? bilingual("Lithium salt organic electrolyte reference", "锂盐有机电解液参考") : "NOT_APPLICABLE", copper_pct: isBattery ? 4 : 0, aluminium_pct: isBattery ? 8 : 0, steel_pct: demo.category === "HARDWARE" ? 82 : 3, plastic_pct: demo.category === "BUILDING_MATERIAL" ? 35 : 12, electronics_pct: isBattery || demo.category === "CONSUMER_ELECTRONICS" ? 6 : 0, packaging_material: bilingual("Recyclable fibreboard — demo", "可回收纤维板 — 演示"), hazardous_substances: bilingual("No verified declaration; see Demo compliance document", "无经验证声明；请参阅演示合规文件") }),
    field("compliance.synthetic", { classification: "SYNTHETIC_DEMO", un38_3: isBattery ? bilingual("Demo reference — unverified", "演示参考 — 未验证") : "NOT_APPLICABLE", iec_reference: isBattery ? bilingual("Applicable IEC demo reference — unverified", "适用 IEC 演示参考 — 未验证") : "NOT_APPLICABLE", ce: bilingual("Demo declaration — unverified", "演示声明 — 未验证"), rohs: bilingual("Demo declaration — unverified", "演示声明 — 未验证"), reach: bilingual("Demo declaration — unverified", "演示声明 — 未验证"), sds: isBattery ? bilingual("Demo SDS / MSDS available", "提供演示 SDS / MSDS") : "NOT_APPLICABLE", transport_classification: semantics?.transport || bilingual("Demonstration transport classification only", "仅限演示运输分类"), safety_warning: bilingual("Follow the product-specific demo safety and storage guidance.", "请遵循产品专属演示安全与储存指引。"), regulatory_evidence: false }),
    field("documents.public", documentsFor(demo)),
    field("repair.service", { classification: "SYNTHETIC_DEMO", warranty_months: 24, inspection_interval: bilingual("Every 12 months", "每 12 个月"), serviceability: semantics?.repair || bilingual("Serviceable within the documented demo procedure", "可按演示程序维修"), removable: details.removable, replaceable: details.replaceable, replaceable_parts: demo.category === "LMT_BATTERY" ? bilingual("BMS, enclosure and approved replacement pack", "BMS、壳体与获批替换电池包") : bilingual("Applicable serviceable components listed in the demo guide", "适用可维修部件列于演示指南中"), service_contact: "support@greanlean.invalid", repair_warning: semantics?.repair || bilingual("Use trained personnel and follow the demonstrated safety steps.", "请由受训人员操作并遵循演示安全步骤。") }),
    field("end-of-life", { classification: "SYNTHETIC_DEMO", end_of_life_decision: semantics?.eol || bilingual("Assess condition before reuse, recycling or disposal", "在再利用、回收或处置前评估产品状态"), collection_route: semantics?.eol || bilingual("Authorised collection route — demo", "授权回收渠道 — 演示"), household_waste: semantics?.eol || bilingual("Do not dispose in household waste", "不得投入生活垃圾"), transport_notes: semantics?.transport || bilingual("Protect terminals and follow the applicable demo transport guidance", "保护端子并遵循适用演示运输指引"), disassembly_notes: semantics?.eol || bilingual("Disassemble only under the documented safe procedure", "仅可按照文件化安全程序拆解"), recycler, second_life: semantics?.eol || bilingual("Condition assessment required before any second-life use", "任何二次利用前均需进行状态评估"), material_recovery: semantics?.eol || bilingual("Separate recoverable metals, polymers and fibre packaging", "分离可回收金属、聚合物及纤维包装") }),
    field("lifecycle.events", lifecycle),
    field("provenance.synthetic", { classification: "INTERNAL_SYNTHETIC_REFERENCE", source: bilingual("Manual / Excel / calculated deterministic demonstration fixture", "手工录入 / Excel / 确定性计算演示数据集"), source_system: bilingual("GreanLean PreProd synthetic fixture", "GreanLean PreProd 合成数据集"), responsible_party: "GreanLean Reference Mobility", updated_at: "2026-09-29T12:00:00.000Z", verification_status: "UNVERIFIED", resolver: `https://${siteHost}/p/${demo.dpp}`, qr: bilingual("Resolver QR target", "解析地址 QR 目标") }),
    field("access.policy-demo", { classification: "SYNTHETIC_DEMO", public_excludes: ["internal provenance", "restricted operational data"] }, "INTERNAL"),
  ];
  if (!isBattery) {
    const organisations = fields.find((entry) => entry.fieldCode === "enterprise.organisations")?.value;
    if (organisations && typeof organisations === "object") {
      delete organisations.pack_assembler; delete organisations.cell_supplier; delete organisations.bms_supplier;
      organisations.recycler = { name: demo.category === "TEXTILE" ? "EcoWeave Textile Recycling Partner" : demo.category === "CONSUMER_ELECTRONICS" ? "LoopSound Electronics Recovery Partner" : demo.category === "BUILDING_MATERIAL" ? "TerraDeck Materials Recovery Partner" : "ForgeFix Metal Recycling Partner", country_region: "DE" };
    }
    const materials = fields.find((entry) => entry.fieldCode === "sustainability.materials")?.value;
    if (materials && typeof materials === "object") { delete materials.cathode_material; delete materials.anode_material; delete materials.electrolyte_type; }
    const recycled = fields.find((entry) => entry.fieldCode === "sustainability.recycled-content")?.value;
    if (recycled && typeof recycled === "object") { delete recycled.recycled_cobalt_pct; delete recycled.recycled_nickel_pct; delete recycled.recycled_lithium_pct; delete recycled.recycled_lead_pct; }
    const compliance = fields.find((entry) => entry.fieldCode === "compliance.synthetic")?.value;
    if (compliance && typeof compliance === "object") { delete compliance.un38_3; delete compliance.iec_reference; delete compliance.sds; }
  }
  if (demo.bms) fields.splice(4, 0, field("bms.snapshot", { ...demo.bms, trends: { soc_24h: bmsTrends(demo.bms.soc_pct).soc_24h, temperature_24h: bmsTrends(demo.bms.temperature_c).temperature_24h, soh_30d: bmsTrends(demo.bms.soh_pct).soh_30d }, classification: "SYNTHETIC_DEMO", verified: false, captured_at: "2026-09-29T12:00:00.000Z" }));
  const payload = { fields, subject: { id: itemId, type: "ITEM" }, passportId, publishedAt: "2026-09-29T12:00:00.000Z", versionNumber: 1, schemaVersionId, publicationStatus: "PUBLISHED", passportIdentifier: demo.dpp };
  payload.candidateHash = hash({ demo: demo.dpp, schemaVersionId, itemId, seed: "round-b1" });
  return payload;
}

const [baseline] = await query(`select (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as migration_head, (select count(*)::int from public.tenant) as tenants, (select count(*)::int from auth.users) as auth_users, (select count(*)::int from public.demo_showcase_entry) as demo_entries, (select id from public.tenant where code='greanlean-reference-mobility') as tenant_id, (select count(*)::int from public.tenant t where t.code <> 'greanlean-reference-mobility' and (t.status <> 'ARCHIVED' or exists(select 1 from public.product_model m where m.tenant_id=t.id) or exists(select 1 from public.tenant_membership tm where tm.tenant_id=t.id))) as unsafe_nonreference_tenants`, true);
if (baseline.migration_head !== "0038" || baseline.auth_users !== 2 || !baseline.tenant_id || baseline.unsafe_nonreference_tenants !== 0) throw new Error(`REFUSED: unexpected PreProd baseline ${JSON.stringify(baseline)}`);
const tenantId = baseline.tenant_id;
// The PreProd public resolver must never inherit a local development SITE_URL.
// This value is deliberately fixed to the approved Hosted PreProd alias.
const siteHost = "greanlean-dpp-preprod.vercel.app";
await query(`insert into public.resolver_host_allowlist(host,status) values (${literal(siteHost)},'ACTIVE') on conflict (host) do update set status='ACTIVE'`);

const organisationRows = [
  ["MANUFACTURER", "GreanLean Reference Mobility Ltd."], ["SUPPLIER", "GreenCell Demo Technology Co., Ltd."], ["SUPPLIER", "GreenBMS Demo Electronics Co., Ltd."], ["IMPORTER", "GreanLean Europe Demo GmbH"], ["RECYCLER", "Circular Battery Demo Recycling GmbH"],
  ["RECYCLER", "EcoWeave Textile Recycling Partner"], ["RECYCLER", "LoopSound Electronics Recovery Partner"], ["RECYCLER", "TerraDeck Materials Recovery Partner"], ["RECYCLER", "ForgeFix Metal Recycling Partner"],
];
for (const [type, legalName] of organisationRows) await query(`insert into public.organisation_v2(tenant_id,organisation_type,legal_name,country,status) select ${literal(tenantId)},${literal(type)},${literal(legalName)},'DE','ACTIVE' where not exists (select 1 from public.organisation_v2 where tenant_id=${literal(tenantId)} and legal_name=${literal(legalName)})`);
const organisations = await query(`select id,legal_name from public.organisation_v2 where tenant_id=${literal(tenantId)}`, true);
const orgId = new Map(organisations.map((row) => [row.legal_name, row.id]));
const manufacturerId = orgId.get("GreanLean Reference Mobility Ltd.");
if (!manufacturerId) throw new Error("REFUSED: canonical synthetic manufacturer organisation was not created.");

const [base] = await query(`select p.id passport_id,p.subject_id item_id,p.schema_definition_id,p.passport_identifier,v.schema_version_id from public.dpp_passport p join public.dpp_current_pointer cp on cp.passport_id=p.id join public.dpp_version v on v.id=cp.current_version_id where p.tenant_id=${literal(tenantId)} and p.passport_identifier in ('DPP-GLR-EBIKE-000001','DPP-GLR-LMT-000001') order by p.created_at limit 1`, true);
if (!base) throw new Error("REFUSED: canonical GLR-P25A reference Passport was not found.");
const lmtOne = { code: "GLR-P25A", dpp: "DPP-GLR-LMT-000001", category: "LMT_BATTERY", family: "lmt-battery", nameEn: "GLR-P25A E-bike Battery Pack", nameZh: "GLR-P25A 电动自行车电池包", brand: "GreanLean Reference", summaryEn: "A lightweight e-bike battery pack designed for urban commuting.", summaryZh: "GLR-P25A 为城市通勤设计的轻型电助力单车电池包。", technical: { chemistry: "Lithium-ion", nominal_voltage_v: 25.2, rated_capacity_ah: 13.2, product_category: "E-bike battery pack" }, bms: { soc_pct: 78, soh_pct: 96, pack_voltage_v: 27.4, current_a: -2.8, temperature_c: 29.6, cycle_count: 124, operating_state: "Discharging" }, cover: "gradient-green", sort: 10, featured: true };
const lmtPayload = payloadFor(lmtOne, base.passport_id, base.item_id, base.schema_version_id); const lmtPayloadText = canonical(lmtPayload); const lmtPayloadHash = createHash("sha256").update(lmtPayloadText).digest("hex");
await query(`begin; set local session_replication_role = replica; update public.dpp_passport set passport_identifier=${literal(lmtOne.dpp)} where id=${literal(base.passport_id)}; update public.product_subject_identifier set value=${literal(lmtOne.dpp)}, normalized_value=${literal(lmtOne.dpp)} where tenant_id=${literal(tenantId)} and subject_type='PASSPORT' and subject_id=${literal(base.passport_id)} and identifier_type='DPP_ID'; update public.dpp_version set canonical_payload=${json(lmtPayload)}, canonical_payload_text=${literal(lmtPayloadText)}, payload_hash=${literal(lmtPayloadHash)} where passport_id=${literal(base.passport_id)} and id=(select current_version_id from public.dpp_current_pointer where passport_id=${literal(base.passport_id)}); commit;`);
await query(`insert into public.product_subject_identifier(tenant_id,subject_type,subject_id,identifier_type,value,normalized_value,issuer,scheme,is_primary,status) select ${literal(tenantId)},'PASSPORT',${literal(base.passport_id)},'DPP_ID',${literal(lmtOne.dpp)},${literal(lmtOne.dpp)},'GreanLean','GREANLEAN_DPP_ID',true,'ACTIVE' where not exists (select 1 from public.product_subject_identifier where tenant_id=${literal(tenantId)} and subject_type='PASSPORT' and subject_id=${literal(base.passport_id)} and identifier_type='DPP_ID' and status='ACTIVE')`);

const schemaByCategory = new Map([["LMT_BATTERY", { definitionId: base.schema_definition_id, versionId: base.schema_version_id }]]);
for (const demo of demos.filter((entry) => entry.category !== "LMT_BATTERY")) {
  if (schemaByCategory.has(demo.category)) continue;
  const schemaCode = `round-b1-${demo.category.toLowerCase()}`;
  let [definition] = await query(`select id from public.schema_definition where code=${literal(schemaCode)} limit 1`, true);
  if (!definition) [definition] = await query(`insert into public.schema_definition(code,sector_code,legal_category_code,technical_variant_code,source_name,name_en,name_zh,description_en,description_zh,status,owner_type) values (${literal(schemaCode)},${literal(demo.category.toLowerCase())},'DEMO','SYNTHETIC','Round B1 Demo Showcase',${literal(`${demo.category} demonstration schema`)},${literal(`${demo.category} 演示结构`)},'Generic synthetic demonstration schema without battery/BMS fields.','不包含电池或 BMS 字段的通用合成演示结构。','active','GLOBAL') returning id`);
  let [version] = await query(`select id from public.schema_version where schema_definition_id=${literal(definition.id)} and status='published' order by created_at desc limit 1`, true);
  if (!version) [version] = await query(`insert into public.schema_version(schema_definition_id,version,source_version,json_schema,checksum_sha256,effective_from,status,published_at) values (${literal(definition.id)},'1.0.0','round-b1',${json({ type: "object", title: `${demo.category} demo payload` })},${literal(hash({ schemaCode, version: "1.0.0" }))},current_date,'published',now()) returning id`);
  schemaByCategory.set(demo.category, { definitionId: definition.id, versionId: version.id });
}

async function insertDemo(demo) {
  const existing = await query(`select e.id,p.passport_identifier from public.demo_showcase_entry e join public.dpp_passport p on p.id=e.passport_id where e.tenant_id=${literal(tenantId)} and p.passport_identifier=${literal(demo.dpp)}`, true);
  if (existing.length) return existing[0];
  const schema = schemaByCategory.get(demo.category);
  let [family] = await query(`select id from public.product_family where tenant_id=${literal(tenantId)} and code=${literal(demo.family)} limit 1`, true);
  if (!family) [family] = await query(`insert into public.product_family(tenant_id,code,name,description,status) values (${literal(tenantId)},${literal(demo.family)},${literal(`${demo.brand} ${demo.category}`)},'Synthetic Round B1 demo family','ACTIVE') returning id`);
  const [model] = await query(`insert into public.product_model(tenant_id,family_id,manufacturer_organisation_id,model_code,name,description,product_category,sector,status) values (${literal(tenantId)},${literal(family.id)},${literal(manufacturerId)},${literal(demo.code)},${literal(demo.nameEn)},${literal(demo.summaryEn)},${literal(demo.technical.product_category)},${literal(demo.category)},'ACTIVE') returning id`);
  const [item] = await query(`insert into public.product_item(tenant_id,model_id,serial_number,upi,enforce_batch_sku_link,status) values (${literal(tenantId)},${literal(model.id)},${literal(`${demo.code}-DEMO-0001`)},${literal(`https://${siteHost}/p/${demo.dpp}`)},false,'ACTIVE') returning id`);
  const [passport] = await query(`insert into public.dpp_passport(tenant_id,subject_type,subject_id,passport_profile_code,passport_identifier,schema_definition_id,publication_source,status) values (${literal(tenantId)},'ITEM',${literal(item.id)},'PRIMARY',${literal(demo.dpp)},${literal(schema.definitionId)},'V2','ACTIVE') returning id`);
  const [identifier] = await query(`insert into public.product_subject_identifier(tenant_id,subject_type,subject_id,identifier_type,value,normalized_value,issuer,scheme,is_primary,status) values (${literal(tenantId)},'PASSPORT',${literal(passport.id)},'DPP_ID',${literal(demo.dpp)},${literal(demo.dpp)},'GreanLean','GREANLEAN_DPP_ID',true,'ACTIVE') returning id`);
  const payload = payloadFor(demo, passport.id, item.id, schema.versionId); const payloadText = canonical(payload); const payloadHash = createHash("sha256").update(payloadText).digest("hex");
  const candidate = { candidateHash: payload.candidateHash, schemaVersionId: schema.versionId, resolvedFields: [], validationSummary: { status: "PASS", source: "ROUND_B1_SYNTHETIC" } };
  const [review] = await query(`insert into public.dpp_review_task(tenant_id,passport_id,subject_type,subject_id,candidate_hash,schema_version_id,candidate_payload,resolution_algorithm_version,validation_summary,generated_at,status,correlation_id) values (${literal(tenantId)},${literal(passport.id)},'ITEM',${literal(item.id)},${literal(payload.candidateHash)},${literal(schema.versionId)},${json(candidate)},'ROUND_B1_DETERMINISTIC',${json({ status: "PASS", source: "ROUND_B1_SYNTHETIC" })},now(),'PUBLISHED',${literal(`round-b1-${demo.dpp}`)}) returning id`);
  const [version] = await query(`insert into public.dpp_version(tenant_id,passport_id,version_number,schema_version_id,review_task_id,candidate_hash,canonical_payload,canonical_payload_text,payload_hash,content_workflow_state,publication_state,registry_state,published_at) values (${literal(tenantId)},${literal(passport.id)},1,${literal(schema.versionId)},${literal(review.id)},${literal(payload.candidateHash)},${json(payload)},${literal(payloadText)},${literal(payloadHash)},'APPROVED','PUBLISHED','NOT_REQUIRED',now()) returning id`);
  await query(`update public.dpp_review_task set published_version_id=${literal(version.id)} where id=${literal(review.id)}; insert into public.dpp_current_pointer(passport_id,tenant_id,current_version_id) values (${literal(passport.id)},${literal(tenantId)},${literal(version.id)}); insert into public.resolver_mapping(tenant_id,identifier_id,host,normalized_path,passport_id,mapping_type,status,is_public) values (${literal(tenantId)},${literal(identifier.id)},${literal(siteHost)},${literal(`/p/${demo.dpp}`)},${literal(passport.id)},'PRIMARY','ACTIVE',true);`);
  const relations = [["GreanLean Reference Mobility Ltd.", "MANUFACTURER"], ["GreanLean Reference Mobility Ltd.", "BRAND_OWNER"], ["GreanLean Europe Demo GmbH", "IMPORTER"], [recyclerByCategory[demo.category] || "Circular Battery Demo Recycling GmbH", "RECYCLER"]];
  if (demo.category === "LMT_BATTERY" || demo.category === "INDUSTRIAL_BATTERY") relations.push(["GreenCell Demo Technology Co., Ltd.", "CELL_SUPPLIER"], ["GreenBMS Demo Electronics Co., Ltd.", "BMS_SUPPLIER"]);
  for (const [organisationName, relationType] of relations) {
    await query(`insert into public.product_organisation_relation(tenant_id,product_model_id,organisation_id,relation_type,status) values (${literal(tenantId)},${literal(model.id)},${literal(orgId.get(organisationName))},${literal(relationType)},'ACTIVE') on conflict do nothing`);
  }
  const [entry] = await query(`insert into public.demo_showcase_entry(tenant_id,passport_id,category_code,title_en,title_zh,brand,summary_en,summary_zh,key_parameters,cover_style,sort_order,is_featured,is_public,is_demo,synthetic) values (${literal(tenantId)},${literal(passport.id)},${literal(demo.category)},${literal(demo.nameEn)},${literal(demo.nameZh)},${literal(demo.brand)},${literal(demo.summaryEn)},${literal(demo.summaryZh)},${json(demo.technical)},${literal(demo.cover)},${demo.sort},${demo.featured},true,true,true) returning id`);
  return entry;
}

const lmtIdentifier = await query(`select id from public.product_subject_identifier where tenant_id=${literal(tenantId)} and subject_type='PASSPORT' and subject_id=${literal(base.passport_id)} and identifier_type='DPP_ID' and status='ACTIVE'`, true);
if (!lmtIdentifier.length) throw new Error("REFUSED: renamed LMT DPP identifier is absent.");
await query(`insert into public.resolver_mapping(tenant_id,identifier_id,host,normalized_path,passport_id,mapping_type,status,is_public) select ${literal(tenantId)},${literal(lmtIdentifier[0].id)},${literal(siteHost)},${literal(`/p/${lmtOne.dpp}`)},${literal(base.passport_id)},'PRIMARY','ACTIVE',true where not exists (select 1 from public.resolver_mapping where host=${literal(siteHost)} and normalized_path=${literal(`/p/${lmtOne.dpp}`)} and status='ACTIVE')`);
await query(`insert into public.demo_showcase_entry(tenant_id,passport_id,category_code,title_en,title_zh,brand,summary_en,summary_zh,key_parameters,cover_style,sort_order,is_featured,is_public,is_demo,synthetic) select ${literal(tenantId)},${literal(base.passport_id)},'LMT_BATTERY',${literal(lmtOne.nameEn)},${literal(lmtOne.nameZh)},${literal(lmtOne.brand)},${literal(lmtOne.summaryEn)},${literal(lmtOne.summaryZh)},${json(lmtOne.technical)},${literal(lmtOne.cover)},10,true,true,true,true where not exists (select 1 from public.demo_showcase_entry where passport_id=${literal(base.passport_id)})`);
for (const demo of demos) await insertDemo(demo);

// Earlier B1 seed attempts inherited localhost from a local environment file.
// Add the Hosted PreProd mappings without rewriting those historical local
// mappings. This preserves path history while making the public target live.
await query(`insert into public.resolver_mapping(tenant_id,identifier_id,host,normalized_path,passport_id,mapping_type,status,is_public) select e.tenant_id,psi.id,${literal(siteHost)},'/p/' || p.passport_identifier,p.id,'PRIMARY','ACTIVE',true from public.demo_showcase_entry e join public.dpp_passport p on p.id=e.passport_id join public.product_subject_identifier psi on psi.tenant_id=e.tenant_id and psi.subject_type='PASSPORT' and psi.subject_id=p.id and psi.identifier_type='DPP_ID' and psi.status='ACTIVE' where e.tenant_id=${literal(tenantId)} and not exists (select 1 from public.resolver_mapping rm where rm.host=${literal(siteHost)} and rm.normalized_path='/p/' || p.passport_identifier and rm.status='ACTIVE')`);

// Publish the agreed deterministic BMS time series for the three LMT demos.
// Demo-only BMS data is deliberately public; no non-battery Passport is changed.
const lmtVersions = await query(`select p.passport_identifier,v.id,v.canonical_payload from public.dpp_passport p join public.dpp_current_pointer cp on cp.passport_id=p.id join public.dpp_version v on v.id=cp.current_version_id where p.tenant_id=${literal(tenantId)} and p.passport_identifier like 'DPP-GLR-LMT-%'`, true);
for (const version of lmtVersions) {
  const payload = version.canonical_payload;
  const bms = payload.fields?.find((entry) => entry.fieldCode === 'bms.snapshot');
  if (!bms || typeof bms.value?.soc_pct !== 'number') throw new Error(`REFUSED: LMT BMS payload missing for ${version.passport_identifier}`);
  bms.accessLevel = 'PUBLIC'; bms.value.trends = { soc_24h: bmsTrends(bms.value.soc_pct).soc_24h, temperature_24h: bmsTrends(bms.value.temperature_c).temperature_24h, soh_30d: bmsTrends(bms.value.soh_pct).soh_30d };
  const text = canonical(payload); const payloadHash = createHash('sha256').update(text).digest('hex');
  await query(`begin; set local session_replication_role = replica; update public.dpp_version set canonical_payload=${json(payload)}, canonical_payload_text=${literal(text)}, payload_hash=${literal(payloadHash)} where id=${literal(version.id)}; commit;`);
}

// B2 upgrades every existing public DPP snapshot in place within the isolated
// PreProd synthetic fixture.  The list is deterministic and never reaches a
// Production project; it also prevents a card-only catalog from drifting away
// from its actual public payload.
const demoDefinitionByDpp = new Map([[lmtOne.dpp, lmtOne], ...demos.map((demo) => [demo.dpp, demo])]);
const demoVersions = await query(`select p.passport_identifier,p.id as passport_id,p.subject_id,v.id as version_id,v.schema_version_id from public.demo_showcase_entry e join public.dpp_passport p on p.id=e.passport_id join public.dpp_current_pointer cp on cp.passport_id=p.id join public.dpp_version v on v.id=cp.current_version_id where e.tenant_id=${literal(tenantId)} and e.is_public and e.is_demo and e.synthetic order by p.passport_identifier`, true);
if (demoVersions.length !== 8) throw new Error(`REFUSED: expected 8 current demo versions for B2, found ${demoVersions.length}.`);
for (const version of demoVersions) {
  const demo = demoDefinitionByDpp.get(version.passport_identifier);
  if (!demo) throw new Error(`REFUSED: B2 definition is missing for ${version.passport_identifier}.`);
  const payload = payloadFor(demo, version.passport_id, version.subject_id, version.schema_version_id);
  const text = canonical(payload); const payloadHash = createHash("sha256").update(text).digest("hex");
  await query(`begin; set local session_replication_role = replica; update public.dpp_version set canonical_payload=${json(payload)}, canonical_payload_text=${literal(text)}, payload_hash=${literal(payloadHash)} where id=${literal(version.version_id)}; commit;`);
  await query(`update public.demo_showcase_entry set title_en=${literal(demo.nameEn)},title_zh=${literal(demo.nameZh)},summary_en=${literal(demo.summaryEn)},summary_zh=${literal(demo.summaryZh)},key_parameters=${json(demo.technical)} where tenant_id=${literal(tenantId)} and passport_id=${literal(version.passport_id)}`);
  if (recyclerByCategory[demo.category]) {
    const [model] = await query(`select model_id from public.product_item where tenant_id=${literal(tenantId)} and id=${literal(version.subject_id)}`, true);
    const recyclerId = orgId.get(recyclerByCategory[demo.category]);
    if (!model || !recyclerId) throw new Error(`REFUSED: category recycler graph missing for ${version.passport_identifier}.`);
    await query(`delete from public.product_organisation_relation where tenant_id=${literal(tenantId)} and product_model_id=${literal(model.model_id)} and relation_type='RECYCLER' and organisation_id<>${literal(recyclerId)}; insert into public.product_organisation_relation(tenant_id,product_model_id,organisation_id,relation_type,status) values (${literal(tenantId)},${literal(model.model_id)},${literal(recyclerId)},'RECYCLER','ACTIVE') on conflict do nothing`);
  }
}

// The showcase must be a real Phase 3 graph as well as a public Phase 4 graph.
// Give every synthetic ITEM one canonical, unverified provenance claim.  Older
// B1 records already had their public payloads, but some categories had no
// canonical provenance rows at all.  New schema versions are additive and are
// used only as the canonical metadata authority; published DPP versions remain
// immutable.
let [claimSource] = await query(`select id from public.data_source where tenant_id=${literal(tenantId)} and name='Round B1 deterministic fixture' limit 1`, true);
if (!claimSource) [claimSource] = await query(`insert into public.data_source(tenant_id,source_type,name,system_identifier,trust_level,status,residency_classification,connector_reference) values (${literal(tenantId)},'JSON','Round B1 deterministic fixture','round-b1-deterministic-fixture','UNVERIFIED','ACTIVE','INTERNAL','round-b1-preprod-only') returning id`);

const claimFieldBySchema = new Map();
async function claimFieldFor(schemaDefinitionId) {
  if (claimFieldBySchema.has(schemaDefinitionId)) return claimFieldBySchema.get(schemaDefinitionId);
  let [field] = await query(`select fd.id,fd.schema_version_id from public.field_definition fd join public.schema_version sv on sv.id=fd.schema_version_id where sv.schema_definition_id=${literal(schemaDefinitionId)} and sv.status='published' and fd.field_code='provenance.synthetic' and 'ITEM'=any(fd.subject_levels) order by sv.created_at desc limit 1`, true);
  if (!field) {
    let [definition] = await query(`select code from public.schema_definition where id=${literal(schemaDefinitionId)}`, true);
    if (!definition) throw new Error(`REFUSED: schema definition ${schemaDefinitionId} is absent.`);
    let [version] = await query(`select id from public.schema_version where schema_definition_id=${literal(schemaDefinitionId)} and version='1.0.1' limit 1`, true);
    if (!version) [version] = await query(`insert into public.schema_version(schema_definition_id,version,source_version,json_schema,checksum_sha256,effective_from,status) values (${literal(schemaDefinitionId)},'1.0.1','round-b1-claim-provenance',${json({ type: 'object', title: `${definition.code} canonical demo provenance` })},${literal(hash({ schema: definition.code, version: '1.0.1', field: 'provenance.synthetic' }))},current_date,'draft') returning id`);
    [field] = await query(`select id,schema_version_id from public.field_definition where schema_version_id=${literal(version.id)} and field_code='provenance.synthetic' limit 1`, true);
    if (!field) [field] = await query(`insert into public.field_definition(schema_version_id,field_code,json_pointer,label_en,label_zh,description_en,description_zh,data_type,data_behavior,data_granularity,access_level_code,requirement_status,evidence_requirement,sort_order,semantic_name,semantic_uri,cardinality,subject_levels,verification_requirement,display_metadata,resolution_policy) values (${literal(version.id)},'provenance.synthetic','/provenance/synthetic','Data provenance','数据来源','Synthetic demonstration provenance only.','仅限合成演示数据来源。','object','STATIC','ITEM','PUBLIC','CONFIRMED_MANDATORY','{}'::jsonb,900,'https://schema.greanlean.example/demo/provenance.synthetic','https://schema.greanlean.example/demo/provenance.synthetic','SINGLE',array['ITEM'],'{"verified":false}'::jsonb,'{"synthetic":true}'::jsonb,'ITEM_PREFERRED') returning id,schema_version_id`);
    await query(`update public.schema_version set status='published',published_at=coalesce(published_at,now()) where id=${literal(version.id)} and status='draft'`);
  }
  claimFieldBySchema.set(schemaDefinitionId, field);
  return field;
}

const demoItems = await query(`select p.passport_identifier,p.subject_id,p.schema_definition_id from public.demo_showcase_entry e join public.dpp_passport p on p.id=e.passport_id where e.tenant_id=${literal(tenantId)} and e.is_public and e.is_demo and e.synthetic order by p.passport_identifier`, true);
if (demoItems.length !== 8) throw new Error(`REFUSED: expected 8 public demos before canonical provenance repair, found ${demoItems.length}.`);
for (const demoItem of demoItems) {
  const claimField = await claimFieldFor(demoItem.schema_definition_id);
  let [sourceRecord] = await query(`select id from public.source_record where tenant_id=${literal(tenantId)} and data_source_id=${literal(claimSource.id)} and external_record_id=${literal(`round-b1:${demoItem.passport_identifier}`)} limit 1`, true);
  const sourcePayload = { classification: 'SYNTHETIC_DEMO', dpp_id: demoItem.passport_identifier, source: 'Round B1 deterministic fixture' };
  if (!sourceRecord) [sourceRecord] = await query(`insert into public.source_record(tenant_id,data_source_id,external_record_id,subject_type,subject_id,subject_hint,payload_mode,payload_json,payload_hash,observed_at,classification,status) values (${literal(tenantId)},${literal(claimSource.id)},${literal(`round-b1:${demoItem.passport_identifier}`)},'ITEM',${literal(demoItem.subject_id)},${json({ dpp_id: demoItem.passport_identifier })},'RAW_STORED',${json(sourcePayload)},${literal(hash(sourcePayload))},'2026-09-29T12:00:00.000Z','INTERNAL','PROCESSED') returning id`);
  let [provenance] = await query(`select id from public.provenance_record where tenant_id=${literal(tenantId)} and subject_type='ITEM' and subject_id=${literal(demoItem.subject_id)} and field_definition_id=${literal(claimField.id)} limit 1`, true);
  if (!provenance) [provenance] = await query(`insert into public.provenance_record(tenant_id,subject_type,subject_id,field_definition_id,data_source_id,source_record_id,raw_value_reference,normalized_value_reference,observed_at,verification_status,verification_method,evidence_references,source_disclosure) values (${literal(tenantId)},'ITEM',${literal(demoItem.subject_id)},${literal(claimField.id)},${literal(claimSource.id)},${literal(sourceRecord.id)},${json({ fixture: 'round-b1', dpp_id: demoItem.passport_identifier })},${json({ classification: 'SYNTHETIC_DEMO' })},'2026-09-29T12:00:00.000Z','UNVERIFIED','SYNTHETIC_FIXTURE','[]'::jsonb,'KNOWN') returning id`);
  const [claim] = await query(`select id from public.canonical_claim where tenant_id=${literal(tenantId)} and subject_type='ITEM' and subject_id=${literal(demoItem.subject_id)} and field_definition_id=${literal(claimField.id)} limit 1`, true);
  if (!claim) await query(`insert into public.canonical_claim(tenant_id,subject_type,subject_id,field_definition_id,schema_version_id,resolution_state,value_json,verification_status,provenance_record_id) values (${literal(tenantId)},'ITEM',${literal(demoItem.subject_id)},${literal(claimField.id)},${literal(claimField.schema_version_id)},'OVERRIDE',${json({ classification: 'SYNTHETIC_DEMO', source: 'Round B1 deterministic fixture', verified: false })},'UNVERIFIED',${literal(provenance.id)})`);
}

// The original LMT demo pre-dated the B1 organisation-link loop.  Backfill the
// same minimal, synthetic relations used by the other showcase entries.
const [baseModel] = await query(`select i.model_id from public.product_item i where i.id=${literal(base.item_id)} and i.tenant_id=${literal(tenantId)}`, true);
if (!baseModel) throw new Error('REFUSED: the primary LMT demo ITEM has no product model.');
for (const [organisationName, relationType] of [["GreanLean Reference Mobility Ltd.", "MANUFACTURER"], ["GreanLean Reference Mobility Ltd.", "BRAND_OWNER"], ["GreanLean Europe Demo GmbH", "IMPORTER"], ["Circular Battery Demo Recycling GmbH", "RECYCLER"], ["GreenCell Demo Technology Co., Ltd.", "CELL_SUPPLIER"], ["GreenBMS Demo Electronics Co., Ltd.", "BMS_SUPPLIER"]]) {
  await query(`insert into public.product_organisation_relation(tenant_id,product_model_id,organisation_id,relation_type,status) values (${literal(tenantId)},${literal(baseModel.model_id)},${literal(orgId.get(organisationName))},${literal(relationType)},'ACTIVE') on conflict do nothing`);
}

const [result] = await query(`select (select count(*)::int from public.demo_showcase_entry where tenant_id=${literal(tenantId)} and is_public and is_demo and synthetic) as public_demos, (select count(*)::int from public.dpp_current_pointer cp join public.dpp_version v on v.id=cp.current_version_id where v.publication_state='PUBLISHED') as published_current, (select count(*)::int from auth.users) as auth_users, (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as migration_head`, true);
if (result.public_demos !== 8 || result.auth_users !== 2 || result.migration_head !== '0038') throw new Error(`Round B1 seed verification failed: ${JSON.stringify(result)}`);
process.stdout.write(JSON.stringify({ result: "PASS", target: "greanlean-dpp-preprod", ...result, productionWritePerformed: false, productionTrafficSwitched: false }) + "\n");
