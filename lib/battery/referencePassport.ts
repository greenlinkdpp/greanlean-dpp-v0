import layout from "../../config/battery/reference-layout.json" with { type: "json" };
import { demoDigitalLinkIdentity, demoDigitalLinkPath } from "../demoDigitalLinks.ts";
import { battery71Category, buildBattery71Rows, type Battery71Source, type Battery71Row } from "./passport71.ts";

import golfCartShowcase from "../../config/battery/golf-cart-showcase.json" with { type: "json" };

export const BATTERY_REFERENCE_SECTIONS = layout.sections;
export type ReferenceCell = { zh: string; en: string; value: unknown; unit?: string };
export type ReferenceField = Battery71Row & { section: string; cells: ReferenceCell[]; generated: boolean };
const DEMOS = new Set(["DPP-GLR-LMT-000001", "DPP-GLR-LMT-000002", "DPP-GLR-LMT-000003", "DPP-DEMO-ESS-000001"]);
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const round = (value: number, places = 2) => Number(value.toFixed(places));
const number = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const local = (zh: string, en: string) => ({ zh, en });
const cell = (zh: string, en: string, value: unknown, unit?: string): ReferenceCell => ({ zh, en, value, ...(unit ? { unit } : {}) });

/** Synthetic additions belong to this public demo view only. No claims,
 * publication, access classification, or customer data are modified. */
export function buildBatteryReferenceModel(source: Battery71Source) {
  const fields = new Map(source.fields.map((field) => [field.fieldCode, field.value]));
  const product = object(fields.get("identity.product"));
  const item = object(fields.get("identity.item"));
  const technical = object(fields.get("technical.specification"));
  const bms = object(fields.get("bms.snapshot"));
  const performance = object(fields.get("performance.durability"));
  const materialsSource = object(fields.get("sustainability.materials"));
  const recycled = object(fields.get("sustainability.recycled-content"));
  const carbon = object(fields.get("sustainability.carbon-footprint"));
  const service = object(fields.get("repair.service"));
  const id = source.passportIdentifier || "";
  const identity = demoDigitalLinkIdentity(id);
  const category = battery71Category(source) || "other";
  const industrial = category === "industrial";
  const synthetic = DEMOS.has(id) && object(fields.get("demo.warning")).classification === "SYNTHETIC_DEMO";
  const completeShowcase = id === golfCartShowcase.passportIdentifier
    && product.modelCode === golfCartShowcase.modelCode
    && object(fields.get("demo.warning")).classification === golfCartShowcase.classification;
  const voltage = number(technical.nominal_voltage_v, industrial ? 51.2 : 36);
  const energy = number(technical.rated_energy_wh, number(technical.energy_kwh, 0) * 1000 || voltage * number(technical.rated_capacity_ah, 18));
  const capacity = number(technical.rated_capacity_ah, round(energy / voltage));
  const mass = number(technical.weight_kg, industrial ? 145 : 3.4);
  const chemistry = String(technical.chemistry || (industrial ? "LFP" : "NMC"));
  const lfp = chemistry === "LFP";
  const soh = number(bms.soh_pct, number(performance.state_of_health_pct, 96));
  const soc = number(bms.soc_pct, number(performance.state_of_charge_pct, 70));
  const cycles = number(bms.cycle_count, number(performance.cycle_count, 148));
  const cycleLife = industrial ? 6000 : 800;
  const originalPower = industrial ? number(technical.rated_power_kw, 7.2) * 1000 : round(voltage * number(technical.max_continuous_discharge_current_a, 20));
  const powerFade = round(100 - soh);
  const remainingPower = round(originalPower * soh / 100);
  const capacityRemaining = round(capacity * soh / 100);
  const initialResistance = industrial ? 0.012 : voltage > 40 ? 0.09 : 0.075;
  const resistance = round(initialResistance * (1 + powerFade * 0.025), 5);
  const initialEfficiency = industrial ? 96 : 95;
  const efficiency = round(initialEfficiency - powerFade * 0.2);
  const model = String(product.modelCode || (industrial ? "GV-ESS-14K3" : "Battery"));
  const serial = identity?.serialNumber || String(item.serial_number || (synthetic ? id : "—"));
  const path = demoDigitalLinkPath(id) || `/p/${encodeURIComponent(id)}`;
  const url = `https://www.greanlean.com${path}`;
  const date = typeof item.manufacturing_date === "string" ? item.manufacturing_date.slice(0, 7) : synthetic ? "2026-01" : "—";
  const observed = typeof bms.captured_at === "string" ? bms.captured_at : "2026-09-29T12:00:00Z";
  const rawRows = buildBattery71Rows(source, category);
  const defaults = new Map<number, ReferenceCell[]>();
  const put = (n: number, ...values: ReferenceCell[]) => defaults.set(n, values);
  put(1, cell("数字护照 ID", "Passport ID", id), cell("GS1 Digital Link", "GS1 Digital Link", url));
  put(2, cell("责任主体", "Responsible operator", "GreanLean Reference Mobility Ltd. — Demo"), cell("联系点", "Contact", "demo@greanlean.invalid"), cell("主体性质", "Record type", local("虚构演示主体", "Fictional demonstration operator")));
  put(3, cell("制造商", "Manufacturer", product.manufacturer || "GreanLean Reference Mobility Ltd."));
  put(4, cell("邮政地址", "Postal address", local("德国柏林 Demoallee 7 号（演示）", "Demoallee 7, Berlin, Germany — demo")));
  put(5, cell("网站", "Website", "https://www.greanlean.com"), cell("邮箱", "Email", "demo@greanlean.invalid"));
  put(6, cell("电池类别", "Battery category", local(industrial ? "工业储能电池" : "轻型交通工具电池（LMT）", industrial ? "Industrial energy-storage battery" : "Light means of transport battery (LMT)")));
  put(7, cell("产品型号", "Model", model), cell("批次号", "Batch", item.batch_number || `${model}-B2401`), cell("单品序列号", "Serial number", serial), cell("GTIN", "GTIN", identity?.gtin || "—"));
  put(8, cell("生产工厂", "Manufacturing location", local("中国广东省深圳市 · 演示工厂", "Shenzhen, Guangdong, China — demonstration factory")));
  put(9, cell("生产年月", "Manufacturing month", date));
  put(10, cell("电池净重", "Net battery mass", mass, "kg"));
  put(11, cell("额定电压", "Nominal voltage", voltage, "V"), cell("额定容量", "Rated capacity", capacity, "Ah"), cell("额定能量", "Rated energy", round(energy, 1), "Wh"));
  put(12, cell("化学体系", "Chemistry", chemistry), cell("电芯形式", "Cell format", industrial ? local("方形铝壳电芯", "Prismatic aluminium-case cells") : "21700"));
  put(13, cell("物质信息", "Substance information", local("电解液示例含 LiPF₆ 与碳酸酯溶剂；实际成分以产品 SDS 为准。", "Example electrolyte contains LiPF₆ and carbonate solvents; consult the product-specific SDS for actual composition.")));
  put(14, cell("应急处置示例", "Example fire response", local("在安全距离进行持续水冷，隔离电源，并由受训人员执行现场应急预案。", "Apply sustained water cooling from a safe distance, isolate electrical sources, and have trained personnel follow the site emergency plan.")));
  put(15, cell("关键原材料示例", "Example critical raw materials", lfp ? local("锂、天然石墨、铜、铝", "Lithium, natural graphite, copper and aluminium") : local("锂、镍、钴、锰、天然石墨、铜、铝", "Lithium, nickel, cobalt, manganese, natural graphite, copper and aluminium")));
  put(16, cell("目录说明", "Catalog note", local("与第 12、13、15 项对应；详细材料示例见下表。", "Related to data points 12, 13 and 15; see the illustrative composition table.")));
  put(17, cell("碳足迹示例", "Illustrative footprint", number(carbon.total_kg_co2e_per_battery, industrial ? 858 : round(energy * 0.075)), "kg CO₂e"), cell("核证状态", "Assurance status", local("演示核算值 · 非正式 LCA 声明", "Illustrative calculation · not a formal LCA declaration")));
  put(18, cell("标签示例", "Illustrative label", local("产品碳足迹数据标签 · 未经第三方核证", "Product footprint data label · not third-party verified")));
  put(19, cell("采购管理示例", "Example sourcing controls", local("供应商识别、原材料追溯及年度风险复核；无真实尽调报告或审计结论。", "Supplier identification, material traceability and annual risk review; no actual due-diligence report or audit opinion.")));
  put(20, cell("再生钴", "Recycled cobalt", lfp ? 0 : number(recycled.recycled_cobalt_pct, 6), "%"));
  put(21, cell("再生锂", "Recycled lithium", number(recycled.recycled_lithium_pct, 3), "%"));
  put(22, cell("再生镍", "Recycled nickel", lfp ? 0 : number(recycled.recycled_nickel_pct, 8), "%"));
  put(23, cell("再生铅", "Recycled lead", 0, "%"));
  put(24, cell("可再生来源材料", "Renewable-source material", 2, "%"), cell("边界", "Boundary", local("演示值，包含适用的包装材料", "Illustrative value, including applicable packaging material")));
  put(25, cell("额定容量（见第 11 项）", "Rated capacity (see #11)", capacity, "Ah"));
  put(26, cell("最低工作电压", "Minimum operating voltage", round(voltage * (lfp ? 0.8 : 0.78), 1), "V"), cell("参考温度", "Reference temperature", "25 ± 2 °C"));
  put(27, cell("标称电压", "Nominal voltage", voltage, "V"), cell("参考温度", "Reference temperature", "25 ± 2 °C"));
  put(28, cell("最高充电电压", "Maximum charge voltage", number(technical.charge_cutoff_voltage_v, round(voltage * (lfp ? 1.14 : 1.17), 1)), "V"));
  put(29, cell("初始功率能力", "Initial power capability", originalPower, "W"), cell("参考温度", "Reference temperature", "25 ± 2 °C"));
  put(30, cell("连续放电限制", "Continuous discharge limit", originalPower, "W"), cell("最大充电电流", "Maximum charge current", number(technical.max_charge_current_a, industrial ? 140 : 5), "A"));
  put(31, cell("预期循环寿命", "Expected cycle life", cycleLife, "cycles"));
  put(32, cell("示例参考条件", "Illustrative reference conditions", local("25 ± 2 °C，80% 容量保持率；仅用于演示，未执行真实寿命测试。", "25 ± 2 °C, 80% capacity retention; demonstration only, with no actual lifetime test performed.")));
  put(33, cell("容量衰竭阈值", "Capacity exhaustion threshold", 80, "%"));
  put(34, cell("闲置储存温度", "Idle storage temperature", technical.storage_temperature_range || "10 °C – 25 °C"));
  put(35, cell("商业质保期限", "Commercial warranty period", number(service.warranty_months, 24), "months"));
  put(36, cell("初始往返效率", "Initial round-trip efficiency", initialEfficiency, "%"));
  put(37, cell("50% 循环寿命时效率", "Efficiency at 50% cycle life", initialEfficiency - 2, "%"));
  put(38, cell("电芯初始内阻", "Initial cell resistance", industrial ? 0.0003 : 0.02, "Ω"), cell("电池包初始内阻", "Initial pack resistance", initialResistance, "Ω"));
  put(39, cell("试验充电倍率", "Test charge C-rate", industrial ? 0.5 : 0.3, "C"));
  put(40, cell("试验放电倍率", "Test discharge C-rate", 1, "C"));
  put(41, cell("分类收集", "Separate collection", local("废电池须分类回收，不与生活垃圾混合处理。", "Collect waste batteries separately; do not dispose of them with household waste.")));
  put(42, cell("标签说明", "Label note", local("示例配方不添加镉或铅；实际标识须依据材料声明及适用阈值确认。", "No cadmium or lead is intentionally added in the example formulation; actual markings require material declarations and applicable-threshold review.")));
  put(43, cell("文件状态", "Document status", local("演示符合性声明模板 · 未签署 · 无合规证明效力", "Demonstration declaration template · unsigned · not proof of conformity")));
  put(44, cell("回收渠道", "Collection route", local("交由电池回收服务商分类收集，并按适用运输要求转运。", "Arrange separate collection by a battery recovery provider and transport under applicable requirements.")));
  put(45, cell("使用说明示例", "Illustrative instructions", local("使用兼容充电器；保持干燥通风；避免挤压、短路及超温充放电。", "Use a compatible charger, keep dry and ventilated, and avoid crushing, short circuits and charging or discharging outside temperature limits.")));
  put(46, cell("正极", "Cathode", lfp ? "LiFePO₄" : "Li(NiCoMn)O₂"), cell("负极", "Anode", local("石墨", "Graphite")), cell("电解质", "Electrolyte", "LiPF₆ / EC–DMC"));
  put(47, cell("BMS 编号", "BMS part number", `${model}-BMS-01`), cell("壳体编号", "Enclosure part number", `${model}-CASE-01`), cell("端子编号", "Terminal part number", `${model}-TERM-01`), cell("备件联系邮箱", "Spare-parts contact", "support@greanlean.invalid"), cell("供应范围", "Supply scope", local("BMS、壳体及连接组件（演示）", "BMS, enclosure and connection components — demo")));
  put(48, cell("示例拆解顺序", "Illustrative disassembly order", local("断电隔离 → 核对电压 → 拆除外壳 → 隔离连接器 → 分类处理；仅供界面演示，非实际维修操作指引。", "Isolate power → verify voltage → remove enclosure → isolate connectors → sort components; interface demonstration only, not an actual service procedure.")));
  put(49, cell("安全措施示例", "Illustrative safeguards", local("由受训人员操作，使用绝缘工具及适用防护装备，并遵循产品专属维修程序。", "Use trained personnel, insulated tools and suitable protective equipment, following the product-specific service procedure.")));
  put(50, cell("示例测试项目", "Illustrative test scope", "UN 38.3 / IEC reference"), cell("报告状态", "Report status", local("未执行真实检测；页面不提供真实合格结论。", "No actual test performed; this page supplies no actual pass or certification result.")));
  put(51, cell("运行期额定容量", "In-use rated capacity", capacity, "Ah"));
  put(52, cell("容量衰减", "Capacity fade", round(100 - soh), "%"));
  put(53, cell("当前功率能力", "Current power capability", remainingPower, "W"));
  put(54, cell("功率衰减", "Power fade", powerFade, "%"));
  put(55, cell("运行期内阻", "In-use resistance", resistance, "Ω"));
  put(56, cell("内阻增幅", "Resistance increase", round((resistance / initialResistance - 1) * 100), "%"));
  put(57, cell("运行期往返效率", "In-use round-trip efficiency", efficiency, "%"));
  put(58, cell("往返效率衰减", "Round-trip efficiency fade", round((initialEfficiency - efficiency) / initialEfficiency * 100), "%"));
  put(59, cell("预计剩余循环次数", "Estimated remaining cycles", Math.max(0, cycleLife - cycles), "cycles"));
  put(60, cell("预计剩余日历寿命", "Estimated remaining calendar life", round(number(technical.design_life_years, industrial ? 15 : 6) - 0.7, 1), "years"));
  put(61, cell("SOCE", "SOCE", local("当前 LMT / 工业电池示例不适用", "Not applicable to the current LMT / industrial example")));
  put(62, cell("剩余容量", "Remaining capacity", capacityRemaining, "Ah"), cell("容量保持率", "Capacity retention", soh, "%"));
  put(63, cell("剩余功率能力", "Remaining power capability", remainingPower, "W"));
  put(64, cell("剩余往返效率", "Remaining round-trip efficiency", efficiency, "%"));
  put(65, cell("当前自放电率", "Current self-discharge rate", industrial ? 2 : 3, "% / month"), cell("相对初始值变化", "Change from initial value", 0.2, "percentage points"));
  put(66, cell("欧姆内阻", "Ohmic resistance", resistance, "Ω"));
  put(67, cell("使用状态", "Operating status", local("原始用途 · 在役（演示）", "Original application · in service — demo")));
  put(68, cell("累计充放电循环", "Charge/discharge cycles", cycles, "cycles"));
  put(69, cell("示例观察期", "Illustrative observation period", "2026-03 – 2026-09"), cell("异常事件", "Negative events", local("合成记录中无异常事件；不代表真实安全记录。", "No negative events in the synthetic record; not an actual safety history.")));
  put(70, cell("运行温度", "Operating temperature", number(bms.temperature_c, number(performance.temperature_c, 27)), "°C"), cell("记录时间", "Recorded at", observed));
  put(71, cell("当前 SOC", "Current SOC", soc, "%"), cell("记录时间", "Recorded at", observed));

  const preserve = new Set([3, 4, 5, 13, 31, 34, 43, 44, 45]);
  // The reference splits the catalog's combined charge/discharge C-rate
  // into two rows and combines parts/contact into one. Keep values, access
  // and applicability attached to their semantic source, not its old index.
  const sourceNumber: Record<number, number> = { 39: 39, 40: 39, 41: 40, 42: 41, 43: 42, 44: 43, 45: 44, 46: 45, 47: 46 };
  const rows: ReferenceField[] = layout.fields.map((labels) => {
    const original = rawRows[(sourceNumber[labels.number] || labels.number) - 1];
    const row = { ...original, id: `DP-${String(labels.number).padStart(2, "0")}`, number: labels.number };
    let cells: ReferenceCell[] = [];
    let generated = false;
    if (synthetic && row.state !== "not_applicable" && row.state !== "restricted") {
      cells = defaults.get(row.number) || [];
      generated = row.state !== "provided";
      if (row.state === "provided" && preserve.has(row.number)) cells = [cell(labels.labelZh, labels.labelEn, row.value, row.unit || undefined)];
    } else if (row.state === "provided") cells = [cell(labels.labelZh, labels.labelEn, row.value, row.unit || undefined)];
    if (!synthetic && row.number === 47) {
      const contact = rawRows[46];
      if (contact.state === "provided") cells.push(cell("备件来源联系方式", "Spare-part source contact", contact.value));
    }
    if (completeShowcase) {
      const example = golfCartShowcase.rows.find((entry) => entry.number === row.number);
      if (example) {
        cells = example.cells;
        row.state = row.state === "not_applicable" ? "not_applicable" : "provided";
      }
    }
    return { ...row, labelZh: row.number === 6 ? (industrial ? "电池类别（工业电池）" : category === "ev" ? "电池类别（EV）" : labels.labelZh) : labels.labelZh, labelEn: row.number === 6 ? "Battery category" : labels.labelEn, section: labels.section, cells, generated };
  });
  const structures: Array<[string, string, string, number]> = [
    ["铜", "Copper", "Cu", number(materialsSource.copper_pct, 4)],
    ["铝", "Aluminium", "Al", number(materialsSource.aluminium_pct, 8)],
    ["钢", "Steel", "Fe", number(materialsSource.steel_pct, 3)],
    ["塑料", "Plastics", "—", number(materialsSource.plastic_pct, 12)],
    ["电子组件", "Electronics", "—", number(materialsSource.electronics_pct, 6)],
  ];
  const remainder = Math.max(0, 100 - structures.reduce((sum, entry) => sum + entry[3], 0));
  const cathode = round(remainder * 0.52);
  const graphite = round(remainder * 0.31);
  const materials: Array<[string, string, string, number]> = [
    lfp ? ["磷酸铁锂", "Lithium iron phosphate", "LiFePO₄", cathode] : ["镍钴锰酸锂", "Lithium nickel manganese cobalt oxide", "Li(NiCoMn)O₂", cathode],
    ["石墨", "Graphite", "C", graphite],
    ["电解液", "Electrolyte", "LiPF₆ / carbonate", round(remainder - cathode - graphite)],
    ...structures,
  ];
  return { id, category, synthetic, completeShowcase, showcaseNotice: completeShowcase ? golfCartShowcase.notice : null, model, serial, gtin: identity?.gtin || "", date, path, url, productName: product.productName || local("锂离子可充电电池", "Rechargeable lithium-ion battery"), rows, materials, stats: synthetic ? { voltage, capacity, energy, mass, chemistry } : { voltage: technical.nominal_voltage_v as number || "—", capacity: technical.rated_capacity_ah as number || "—", energy: technical.rated_energy_wh as number || (typeof technical.energy_kwh === "number" ? technical.energy_kwh * 1000 : "—"), mass: technical.weight_kg as number || "—", chemistry: technical.chemistry as string || "—" }, coherence: { soh, soc, cycles, cycleLife, originalPower, remainingPower, initialResistance, resistance, capacityRemaining } };
}
