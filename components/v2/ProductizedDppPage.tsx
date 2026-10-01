import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  formatValue,
  humanizeFieldKey,
  normalizeDppProjection,
  safeExternalUrl,
  type PassportLocale,
  type PreviewRole,
  type ProjectedDpp,
  type PresentedField,
} from "@/lib/v2/presentation";

type Props = {
  projection: ProjectedDpp;
  locale: PassportLocale;
  previewRole: PreviewRole;
  audiencePreviewEnabled: boolean;
  previewGrants?: Partial<Record<PreviewRole, string>>;
};

const messages = {
  en: {
    passport: "Digital Product Passport",
    verified: "Data verification",
    unverified: "Unverified",
    status: "Passport status",
    updated: "Last updated",
    scan: "Scan to open the stable passport",
    metrics: "Key metrics",
    overview: "Overview",
    specifications: "Technical specifications",
    sustainability: "Sustainability",
    performance: "Performance & health",
    compliance: "Compliance & safety",
    repair: "Repair & service",
    circularity: "End-of-life & circularity",
    documents: "Documents",
    lifecycle: "Lifecycle",
    passportSection: "Passport information",
    provenance: "Data provenance",
    technical: "Technical details",
    technicalHint: "Identifiers and diagnostics for technical review.",
    metadataOnly: "Metadata only",
    snapshot: "Latest available snapshot — not a live data stream",
    demoProcedure: "Follow the product-specific service guidance.",
    preview: "PREPROD AUDIENCE PREVIEW",
    previewWarning: "QA projection selected on the server. This control is unavailable in Production.",
    public: "Public",
    repairer: "Repairer",
    recycler: "Recycler",
    manufacturer: "Manufacturer",
    authority: "Authority",
    language: "中文",
    disclaimer: "The content shown on this page illustrates GreanLean's data organization, presentation and management capabilities. It does not represent a real customer product or a formal regulatory submission.",
    login: "Platform Login",
    skip: "Skip to passport content",
  },
  zh: {
    passport: "数字产品护照",
    verified: "数据验证",
    unverified: "未验证",
    status: "护照状态",
    updated: "最后更新",
    scan: "扫码查看数字产品护照",
    metrics: "关键指标",
    overview: "概览",
    specifications: "技术规格",
    sustainability: "可持续性",
    performance: "性能与健康状态",
    compliance: "合规与安全",
    repair: "维修与服务",
    circularity: "报废与循环利用",
    documents: "文档",
    lifecycle: "生命周期",
    passportSection: "护照信息",
    provenance: "数据来源",
    technical: "技术详情",
    technicalHint: "供技术审查使用的标识符和诊断信息。",
    metadataOnly: "仅元数据",
    snapshot: "最新可用快照，并非实时数据流",
    demoProcedure: "请遵循产品专属的维修与服务指引。",
    preview: "预生产环境受众预览",
    previewWarning: "服务端已选择 QA 数据投影。Production 不提供此控件。",
    public: "公众",
    repairer: "维修方",
    recycler: "回收方",
    manufacturer: "制造商",
    authority: "监管机构",
    language: "English",
    disclaimer: "本页展示内容用于说明 GreanLean 平台的数据组织、展示与管理能力，不代表真实客户产品或正式监管申报结果。",
    login: "平台登录",
    skip: "跳转到护照内容",
  },
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function dateValue(value: unknown, locale: PassportLocale) {
  if (typeof value !== "string") return formatValue(value, locale);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatValue(value, locale);
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(date);
}

function unitForKey(key: string, locale: PassportLocale): string | null {
  const suffixes: Array<[RegExp, [string, string]]> = [
    [/_pct$/, ["%", "%"]], [/_kg_co2e.*$/, ["kg CO₂e", "kg CO₂e"]], [/_kg$/, ["kg", "kg"]], [/_mohm$/, ["mΩ", "mΩ"]],
    [/_wh$/, ["Wh", "Wh"]], [/_ah$/, ["Ah", "Ah"]], [/_v$/, ["V", "V"]], [/_a$/, ["A", "A"]], [/_w.*$/, ["W", "W"]], [/_c$/, ["°C", "°C"]],
    [/_gsm$/, ["g/m²", "g/m²"]], [/_mm$/, ["mm", "mm"]], [/_kwh$/, ["kWh", "kWh"]], [/_l$/, ["L", "L"]],
    [/_months$/, ["months", "个月"]], [/_years$/, ["years", "年"]], [/_seconds$/, ["s", "秒"]],
  ];
  const unit = suffixes.find(([pattern]) => pattern.test(key))?.[1];
  return unit ? unit[locale === "zh" ? 1 : 0] : null;
}

function labelForKey(key: string, locale: PassportLocale) {
  const labels: Record<string, [string, string]> = {
    productName: ["Product name", "产品名称"], modelCode: ["Model", "型号"], familyName: ["Product family", "产品系列"], brand: ["Brand", "品牌"],
    serialNumber: ["Serial number", "序列号"], dppId: ["DPP ID", "DPP 标识"], customer_confirmed: ["Customer confirmed", "客户确认"],
    verification_status: ["Verification status", "验证状态"], source_name: ["Source", "来源"], source_type: ["Source type", "来源类型"],
    evidence_status: ["Evidence status", "证据状态"], third_party_verified: ["Third-party verified", "第三方验证"],
    charge_status: ["Charge status", "充放电状态"], fault_code: ["Fault code", "故障代码"], timestamp: ["Snapshot time", "快照时间"],
    manufacturer: ["Manufacturer", "制造商"], supplier: ["Supplier", "供应商"], brand_owner: ["Brand owner", "品牌方"],
    current_version: ["Current version", "当前版本"], last_sync: ["Last sync", "最近同步"], operating_state: ["Operating state", "运行状态"],
    pack_voltage_v: ["Pack voltage", "电池包电压"], current_a: ["Current", "电流"], temperature_c: ["Temperature", "温度"], cycle_count: ["Cycle count", "循环次数"],
    product_category: ["Product category", "产品类别"], productNameZh: ["Chinese product name", "中文产品名称"], sku: ["SKU", "SKU"], batch_number: ["Batch number", "批次号"],
    serial_number: ["Serial number", "单件序列号"], gtin_or_demo_identifier: ["GTIN / identifier", "GTIN / 标识"], manufacturing_date: ["Manufacturing date", "生产日期"], market_placement_date: ["Market placement date", "投放市场日期"],
    pack_assembler: ["Pack assembler", "电池包组装方"], cell_supplier: ["Cell supplier", "电芯供应商"], bms_supplier: ["BMS supplier", "BMS 供应商"], importer: ["Importer", "进口商"], recycler: ["Recycler", "回收商"],
    country_region: ["Country / region", "国家/地区"], address: ["Address", "地址"], contact: ["Contact", "联系方式"], website: ["Website", "官网"],
    nominal_voltage_v: ["Nominal voltage", "额定电压"], rated_capacity_ah: ["Rated capacity", "额定容量"], rated_energy_wh: ["Rated energy", "额定能量"], energy_kwh: ["Rated energy", "额定能量"],
    cell_specification: ["Cell specification", "电芯规格"], cell_format: ["Cell format", "电芯形式"], series_parallel_configuration: ["Series / parallel configuration", "串并联配置"], weight_kg: ["Weight", "重量"], dimensions_mm: ["Dimensions", "尺寸"],
    ingress_protection: ["Ingress protection", "防护等级"], charge_cutoff_voltage_v: ["Charge cutoff voltage", "充电截止电压"], max_charge_current_a: ["Maximum charge current", "最大充电电流"], max_continuous_discharge_current_a: ["Maximum continuous discharge current", "最大持续放电电流"],
    operating_temperature_range: ["Operating temperature range", "工作温度范围"], storage_temperature_range: ["Storage temperature range", "储存温度范围"], cycle_life: ["Cycle life", "循环寿命"], design_life_years: ["Design life", "设计寿命"], application: ["Application", "应用场景"], removable: ["Removable", "可拆卸"], replaceable: ["Replaceable", "可更换"],
    total_kg_co2e_per_battery: ["Total carbon footprint", "碳足迹总值"], functional_unit: ["Functional unit", "功能单位"], calculation_boundary: ["Calculation boundary", "计算边界"], reference_year: ["Reference year", "参考年份"], calculation_method: ["Calculation method", "计算方法"], renewable_energy_pct: ["Renewable energy use", "可再生能源使用比例"],
    cathode_material: ["Cathode material", "正极材料"], anode_material: ["Anode material", "负极材料"], electrolyte_type: ["Electrolyte", "电解液类别"], copper_pct: ["Copper", "铜"], aluminium_pct: ["Aluminium", "铝"], steel_pct: ["Steel", "钢"], plastic_pct: ["Plastic", "塑料"], electronics_pct: ["Electronic components", "电子元件"],
    recycled_cobalt_pct: ["Recycled cobalt", "再生钴比例"], recycled_nickel_pct: ["Recycled nickel", "再生镍比例"], recycled_lithium_pct: ["Recycled lithium", "再生锂比例"], recycled_lead_pct: ["Recycled lead", "再生铅比例"], packaging_recyclability: ["Packaging recyclability", "包装可回收性"],
    un38_3: ["UN38.3", "UN38.3"], iec_reference: ["IEC reference", "IEC 参考"], ce: ["CE", "CE"], rohs: ["RoHS", "RoHS"], reach: ["REACH", "REACH"], sds: ["SDS / MSDS", "SDS / MSDS"], transport_classification: ["Transport classification", "运输分类"], safety_warning: ["Safety warning", "安全警告"],
    warranty_months: ["Warranty", "保修期"], inspection_interval: ["Recommended inspection interval", "建议检查周期"], serviceability: ["Serviceability", "可维修性"], replaceable_parts: ["Replaceable parts", "可更换零部件"], service_contact: ["Service contact", "售后联系方式"],
    end_of_life_decision: ["End-of-life decision", "报废判定"], collection_route: ["Collection route", "回收方式"], household_waste: ["Household waste", "生活垃圾处理"], transport_notes: ["Transport notes", "运输注意事项"], disassembly_notes: ["Disassembly notes", "拆解注意事项"], second_life: ["Second life", "二次利用说明"],
    source: ["Source", "数据来源"], source_system: ["Source system", "来源系统"], responsible_party: ["Responsible party", "责任主体"], updated_at: ["Last updated", "最近更新"], resolver: ["Resolver", "解析地址"], qr: ["QR", "QR"],
    rated_power_kw: ["Rated power", "额定功率"], voltage_platform: ["Voltage platform", "电压平台"], architecture: ["Architecture", "模块/簇/电池包架构"], thermal_management: ["Thermal management", "热管理"], fire_safety: ["Fire safety", "消防与安全"],
    fibre_composition: ["Fibre composition", "纤维组成"], material_pct: ["Material composition", "材料百分比"], dye_chemicals: ["Dyes / chemicals", "染料/化学品"], care_instruction: ["Care instruction", "洗涤与保养"], water_footprint_l: ["Water footprint", "水足迹"],
    connectivity: ["Connectivity", "连接方式"], enclosure_material: ["Enclosure material", "外壳材料"], key_components: ["Key components", "关键零部件"], energy_efficiency: ["Energy efficiency", "能效信息"], firmware: ["Software / firmware", "软件/固件"], weee: ["WEEE / recycling", "WEEE / 回收信息"],
    wood_fibre_pct: ["Wood fibre", "木纤维比例"], additive_pct: ["Other additives", "其他添加剂"], wear_resistance: ["Wear resistance", "耐磨性能"], slip_resistance: ["Slip resistance", "防滑性能"], water_absorption_pct: ["Water absorption", "吸水率"], weather_resistance: ["Weather resistance", "耐候性"], flame_rating: ["Fire rating", "阻燃等级"], voc: ["VOC", "VOC"], installation_method: ["Installation method", "安装方法"],
    steel_type: ["Steel type", "钢材类型"], surface_treatment: ["Surface treatment", "表面处理"], hardness: ["Hardness", "硬度"], corrosion_resistance: ["Corrosion resistance", "耐腐蚀性"], applicable_standard: ["Applicable standard", "适用标准"], production_origin: ["Production origin", "生产地"],
    chemistry: ["Chemistry", "化学体系"], classification: ["Classification", "分类"], colour: ["Colour", "颜色"], durability: ["Durability", "耐久性"], maintenance_interval: ["Maintenance interval", "维护周期"],
    material_summary: ["Material summary", "材料概述"], packaging_material: ["Packaging material", "包装材料"], hazardous_substances: ["Hazardous substances", "有害物质"], other_recycled_material: ["Other recycled material", "其他再生材料"],
    material_recovery: ["Material recovery", "材料回收"], repair_warning: ["Repair warning", "维修警告"], repairability: ["Repairability", "可维修性"], regulatory_evidence: ["Regulatory evidence", "监管证据"], customer_verified: ["Customer verified", "客户验证"],
    materials: ["Materials", "材料"], manufacturing: ["Manufacturing", "制造"], transport: ["Transport", "运输"], packaging: ["Packaging", "包装"], other: ["Other", "其他"],
    name: ["Name", "名称"], status: ["Status", "状态"], version: ["Version", "版本"], publishedAt: ["Published at", "发布时间"], audience: ["Audience", "可见对象"],
    captured_at: ["Captured at", "采集时间"], verified: ["Verified", "已验证"], state_of_charge_pct: ["State of charge", "SOC"], state_of_health_pct: ["State of health", "SOH"], lifecycle_reference: ["Lifecycle reference", "生命周期引用"],
    material: ["Material", "材料"], weight_gsm: ["Fabric weight", "面料克重"], thickness_mm: ["Thickness", "厚度"], recycled_content_pct: ["Recycled content", "再生材料含量"],
    internalPassportUuid: ["Internal passport UUID", "内部护照 UUID"], schemaVersionUuid: ["Schema version UUID", "Schema 版本 UUID"], payloadHash: ["Payload hash", "载荷哈希"], public_excludes: ["Public exclusions", "公开范围排除项"],
  };
  const translated = labels[key];
  return translated ? translated[locale === "zh" ? 1 : 0] : humanizeFieldKey(key);
}

function localizedValue(value: unknown, locale: PassportLocale, unit?: string | null) {
  const localized = asRecord(value);
  if (typeof localized.en === "string" && typeof localized.zh === "string") return publicCopy(String(localized[locale]), locale);
  if (locale === "zh" && typeof value === "string") {
    const states: Record<string, string> = {
      Charging: "充电中", Discharging: "放电中", Published: "已发布", PUBLISHED: "已发布",
      "Lithium-ion": "锂离子", "E-bike battery pack": "电动自行车电池包",
      "10°C to 25°C": "10°C 至 25°C", "-10°C to 45°C": "-10°C 至 45°C", "0°C to 45°C": "0°C 至 45°C", "Bluetooth": "蓝牙",
      "Organic cotton": "有机棉", "Textile garment": "纺织品", "Consumer electronics": "消费电子",
      "Recycled ABS": "再生 ABS", "Wood-plastic flooring": "木塑地板", "Alloy steel": "合金钢",
      "Replaceable bits": "可更换批头", "Hand tool": "手动工具", "Industrial energy storage": "工业储能",
      SYNTHETIC_DEMO: "GreanLean", INTERNAL_SYNTHETIC_REFERENCE: "GreanLean", SYNTHETIC_FIXTURE: "GreanLean", VERIFIED: "已验证", UNVERIFIED: "未验证", PUBLIC: "公开", NOT_APPLICABLE: "不适用",
      TEST_REPORT: "测试报告", CERTIFICATE: "证书", DECLARATION: "声明", SAFETY: "安全文件",
      SPECIFICATION: "规格文件", WARRANTY: "质保文件", RECYCLING: "回收文件", ENVIRONMENT: "环境/可持续性文件", SERVICE: "服务/维护文件",
    };
    if (states[value]) return states[value];
  }
  return typeof value === "string" ? publicCopy(value, locale) : formatValue(value, locale, unit);
}

/** Public pages render neutral product language while preserving the source
 * provenance enums in storage for audit and internal workflow purposes. */
function publicCopy(value: string, locale: PassportLocale) {
  const replacements: Array<[string, string]> = locale === "zh"
    ? [["合成演示数据", "产品数据"], ["合成演示事件。", "记录事件。"], ["合成演示事件", "记录事件"], ["已记录演示事件", "已记录"], ["合成演示流程", "服务流程"], ["合成演示", ""], ["合成数据集", "数据集"], ["演示数据集", "数据集"], ["仅限演示运输分类", "运输分类信息"], ["演示运输指引", "运输指引"], ["演示安全步骤", "安全步骤"], ["演示安全与储存指引", "产品安全与储存指引"], ["演示声明", "声明"], ["提供演示 SDS / MSDS", "提供 SDS / MSDS"], ["演示出具方", "出具方"], ["演示产地", "产地"], ["演示参考", "参考信息"], ["演示固件", "固件"], ["演示 / 未验证", "未验证"], ["仅用于演示", "参考信息"], ["演示程序", "文件化程序"], ["授权回收渠道 — 演示", "授权回收渠道"], ["确定性演示公式", "确定性计算方法"], [" — 演示", ""], ["— 演示", ""], ["SYNTHETIC_REFERENCE", "GreanLean"], ["SYNTHETIC_DEMO", "GreanLean"]]
    : [["Synthetic demonstration data", "Product data"], ["Synthetic demo event.", "Recorded event."], ["Synthetic demonstration event.", "Recorded event."], ["Recorded demo event", "Recorded"], ["Deterministic demo formula", "Deterministic calculation method"], ["Deterministic demo", "Documented"], ["deterministic demo", "documented"], ["Reference Demo", "GreanLean"], ["synthetic data set", "data set"], ["Synthetic reference", "Reference information"], ["Demo declaration", "Declaration"], ["Demo SDS / MSDS", "SDS / MSDS"], ["Demo issuer", "Issuer"], ["Demo / unverified", "Unverified"], ["Demonstration only", "Reference information"], ["demo origin", "origin"], ["demo reference", "reference information"], ["demo firmware", "firmware"], ["Demonstration transport classification only", "Transport classification"], ["demo transport guidance", "transport guidance"], ["demo safety steps", "safety steps"], ["demonstrated safety steps", "documented safety steps"], ["product-specific demo safety and storage guidance", "product-specific safety and storage guidance"], ["demo procedure", "documented procedure"], [" — demo", ""], ["— demo", ""], ["SYNTHETIC_REFERENCE", "GreanLean"], ["SYNTHETIC_DEMO", "GreanLean"]];
  return replacements.reduce((result, [from, to]) => result.replaceAll(from, to), value);
}

function isPlaceholderIdentifier(key: string, value: unknown) {
  if (key !== "gtin_or_demo_identifier") return false;
  const text = JSON.stringify(value).toLowerCase();
  return text.includes("internal demonstration identifier") || text.includes("内部演示标识") || text.includes("placeholder");
}

const applicationByPassport: Record<string, { en: string; zh: string }> = {
  "DPP-GLR-LMT-000001": { en: "Urban commuting", zh: "城市通勤" },
  "DPP-GLR-LMT-000002": { en: "Extended urban riding", zh: "城市长续航骑行" },
  "DPP-GLR-LMT-000003": { en: "Fleet and cargo operations", zh: "车队与货运运营" },
  "DPP-DEMO-ESS-000001": { en: "Commercial and industrial energy storage", zh: "工商业储能" },
  "DPP-DEMO-TEX-000001": { en: "Everyday apparel", zh: "日常服装" },
  "DPP-DEMO-CE-000001": { en: "Personal wireless audio", zh: "个人无线音频" },
  "DPP-DEMO-BLD-000001": { en: "Outdoor and building decking", zh: "户外与建筑铺装" },
  "DPP-DEMO-HW-000001": { en: "Precision assembly and maintenance", zh: "精密装配与维护" },
};

function withPublicDisplayOverrides(projection: ProjectedDpp): ProjectedDpp {
  const application = applicationByPassport[projection.passportIdentifier];
  if (!application) return projection;
  return {
    ...projection,
    fields: projection.fields.map((field) => field.fieldCode === "technical.specification"
      ? { ...field, value: { ...asRecord(field.value), application } }
      : field),
  };
}

function ValueGrid({ value, locale, omit = [] }: { value: unknown; locale: PassportLocale; omit?: string[] }) {
  const entries = Object.entries(asRecord(value)).filter(([key, item]) => !omit.includes(key) && !isPlaceholderIdentifier(key, item));
  if (!entries.length) return <p className="text-sm text-slate-500">{formatValue(value, locale)}</p>;
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {entries.map(([key, item]) => (
        <div key={key} className="min-w-0 border-b border-slate-100 pb-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labelForKey(key, locale)}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-900">
            {Array.isArray(item) ? item.map((part) => localizedValue(part, locale)).join(" · ") : typeof item === "object" && item !== null && !(typeof asRecord(item).en === "string" && typeof asRecord(item).zh === "string") ? <CompactObject value={item} locale={locale} /> : localizedValue(item, locale, unitForKey(key, locale))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CompactObject({ value, locale }: { value: unknown; locale: PassportLocale }) {
  return (
    <span className="grid gap-1">
      {Object.entries(asRecord(value)).map(([key, item]) => (
        <span key={key}><span className="text-slate-500">{labelForKey(key, locale)}:</span> {typeof item === "object" && item !== null && !(typeof asRecord(item).en === "string" && typeof asRecord(item).zh === "string") ? <CompactObject value={item} locale={locale} /> : localizedValue(item, locale, unitForKey(key, locale))}</span>
      ))}
    </span>
  );
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "green" | "amber" | "blue" | "neutral" }) {
  const tones = { green: "bg-emerald-50 text-emerald-800 ring-emerald-200", amber: "bg-amber-50 text-amber-900 ring-amber-200", blue: "bg-sky-50 text-sky-800 ring-sky-200", neutral: "bg-slate-100 text-slate-700 ring-slate-200" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

function Gauge({ label, value }: { label: string; value: unknown }) {
  const number = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between"><span className="text-sm font-semibold text-slate-700">{label}</span><span className="text-2xl font-bold text-slate-950">{number}%</span></div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={number}>
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${number}%` }} />
      </div>
    </div>
  );
}

function TrendLine({ label, values, unit }: { label: string; values: unknown; unit: string }) {
  const points = Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
  if (points.length < 2) return null;
  const min = Math.min(...points); const max = Math.max(...points); const span = Math.max(0.001, max - min);
  const polyline = points.map((point, index) => `${(index / (points.length - 1)) * 100},${100 - ((point - min) / span) * 82 - 9}`).join(" ");
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex justify-between gap-3 text-xs font-semibold text-slate-600"><span>{label}</span><span>{points.at(-1)} {unit}</span></div><svg className="mt-2 h-16 w-full" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label}><polyline points={polyline} fill="none" stroke="#0f766e" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg></div>;
}

function BmsPanel({ value, locale, snapshot }: { value: unknown; locale: PassportLocale; snapshot: string }) {
  const data = asRecord(value);
  const trends = asRecord(data.trends);
  return (
    <div>
      <p className="mb-5 flex items-center gap-2 text-sm text-slate-600"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky-500" />{snapshot}</p>
      <div className="grid gap-4 sm:grid-cols-2"><Gauge label="SOC" value={data.soc_pct} /><Gauge label="SOH" value={data.soh_pct} /></div>
      <div className="mt-5"><ValueGrid value={data} locale={locale} omit={["soc_pct", "soh_pct", "trends"]} /></div>
      {Object.keys(trends).length ? <section className="mt-6" aria-label={locale === "zh" ? "BMS 趋势" : "BMS trends"}><h4 className="text-sm font-bold text-slate-900">{locale === "zh" ? "运行趋势" : "Documented operating trends"}</h4><div className="mt-3 grid gap-3 md:grid-cols-3"><TrendLine label={locale === "zh" ? "24 小时 SOC 趋势" : "24h SOC trend"} values={trends.soc_24h} unit="%" /><TrendLine label={locale === "zh" ? "24 小时温度趋势" : "24h temperature trend"} values={trends.temperature_24h} unit="°C" /><TrendLine label={locale === "zh" ? "30 天 SOH 趋势" : "30d SOH trend"} values={trends.soh_30d} unit="%" /></div></section> : null}
    </div>
  );
}

function CarbonPanel({ value, locale }: { value: unknown; locale: PassportLocale }) {
  const data = asRecord(value);
  const breakdown = asRecord(data.lifecycle_breakdown_kg_co2e);
  const total = Number(data.total_kg_co2e_per_battery) || Object.values(breakdown).reduce<number>((sum, item) => sum + Number(item || 0), 0);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-4xl font-bold tracking-tight text-slate-950">{formatValue(total, locale, "kg CO₂e")}</p><p className="mt-1 text-sm text-slate-500">{formatValue(data.functional_unit, locale)}</p></div><StatusBadge tone="amber">{data.third_party_verified ? (locale === "zh" ? "已验证" : "Verified") : (locale === "zh" ? "未经第三方验证" : "Not third-party verified")}</StatusBadge></div>
      <div className="mt-6 space-y-3" role="img" aria-label={locale === "zh" ? "生命周期阶段碳足迹占比" : "Carbon footprint proportions by lifecycle stage"}>
        {Object.entries(breakdown).sort((a, b) => Number(b[1]) - Number(a[1])).map(([key, item]) => {
          const amount = Number(item) || 0;
          return <div key={key}><div className="mb-1 flex justify-between gap-4 text-sm"><span>{labelForKey(key, locale)}</span><span className="font-semibold">{formatValue(amount, locale, "kg CO₂e")}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${total ? Math.max(2, amount / total * 100) : 0}%` }} /></div></div>;
        })}
      </div>
      <div className="mt-6"><ValueGrid value={data} locale={locale} omit={["lifecycle_breakdown_kg_co2e", "total_kg_co2e_per_battery", "functional_unit", "third_party_verified"]} /></div>
    </div>
  );
}

function CompositionPanel({ value, locale }: { value: unknown; locale: PassportLocale }) {
  const data = asRecord(value);
  const percentages = Object.entries(data).filter(([key, item]) => key.endsWith("_pct") && typeof item === "number");
  return (
    <div>
      {percentages.length ? <div className="grid gap-3 sm:grid-cols-2">{percentages.map(([key, item]) => <div key={key} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between text-sm"><span>{labelForKey(key, locale)}</span><strong>{formatValue(item, locale, "%")}</strong></div><div className="mt-2 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-teal-600" style={{ width: `${Math.min(100, Number(item))}%` }} /></div></div>)}</div> : null}
      <div className={percentages.length ? "mt-5" : ""}><ValueGrid value={data} locale={locale} omit={percentages.map(([key]) => key)} /></div>
    </div>
  );
}

function DocumentsPanel({ value, locale, metadataOnly }: { value: unknown; locale: PassportLocale; metadataOnly: string }) {
  const documents = Array.isArray(value) ? value.map(asRecord) : [];
  return <div className="grid gap-4 md:grid-cols-2">{documents.map((document, index) => {
    const externalUrl = safeExternalUrl(document.url || document.document_url);
    const demoUrl = typeof document.file === "string" ? `/api/demo-document?file=${encodeURIComponent(document.file)}&lang=${locale}` : null;
    const url = demoUrl || externalUrl;
    return <article key={String(document.document_id || index)} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{localizedValue(document.document_type, locale)}</p><h4 className="mt-2 font-semibold text-slate-950">{formatValue(document.title, locale)}</h4></div><span aria-hidden="true" className="text-xl">↗</span></div><p className="mt-3 break-all font-mono text-xs text-slate-500">{formatValue(document.document_id, locale)}</p><div className="mt-4 flex flex-wrap gap-2"><StatusBadge>{metadataOnly}</StatusBadge>{document.issuer ? <StatusBadge>{formatValue(document.issuer, locale)}</StatusBadge> : null}{document.version ? <StatusBadge>v{String(document.version)}</StatusBadge> : null}</div>{url ? <a href={url} target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex min-h-11 items-center font-semibold text-emerald-700 underline decoration-2 underline-offset-4">{locale === "zh" ? "查看附件" : "View document"}</a> : null}</article>;
  })}</div>;
}

function TimelinePanel({ value, locale }: { value: unknown; locale: PassportLocale }) {
  const events = Array.isArray(value) ? value.map(asRecord) : [];
  return <ol className="relative ml-2 border-l-2 border-emerald-200">{events.map((event, index) => <li key={`${formatValue(event.event_type || event.type, locale)}-${index}`} className="relative pb-8 pl-7 last:pb-0"><span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-white bg-emerald-600" /><p className="font-semibold text-slate-950">{localizedValue(event.event_type || event.type || "Lifecycle event", locale)}</p><p className="mt-1 text-sm text-slate-600">{dateValue(event.timestamp || event.at, locale)}{event.actor ? ` · ${formatValue(event.actor, locale)}` : ""}{event.status ? ` · ${formatValue(event.status, locale)}` : ""}</p>{event.detail ? <p className="mt-1 text-sm text-slate-600">{formatValue(event.detail, locale)}</p> : null}</li>)}</ol>;
}

function FieldRenderer({ field, locale, m }: { field: PresentedField; locale: PassportLocale; m: typeof messages.en | typeof messages.zh }) {
  switch (field.metadata.renderType) {
    case "bms": return <BmsPanel value={field.value} locale={locale} snapshot={m.snapshot} />;
    case "carbon": return <CarbonPanel value={field.value} locale={locale} />;
    case "composition": return <CompositionPanel value={field.value} locale={locale} />;
    case "documents": return <DocumentsPanel value={field.value} locale={locale} metadataOnly={m.metadataOnly} />;
    case "timeline": return <TimelinePanel value={field.value} locale={locale} />;
    case "disassembly": return <div><div role="alert" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950">{m.demoProcedure}</div><ValueGrid value={field.value} locale={locale} /></div>;
    default: return <ValueGrid value={field.value} locale={locale} />;
  }
}

function sectionTitle(id: string, m: typeof messages.en | typeof messages.zh) {
  const titles: Record<string, string> = { overview: m.overview, specifications: m.specifications, sustainability: m.sustainability, performance: m.performance, compliance: m.compliance, repair: m.repair, circularity: m.circularity, documents: m.documents, lifecycle: m.lifecycle, passport: m.passportSection, provenance: m.provenance, technical: m.technical };
  return titles[id] || humanizeFieldKey(id);
}

export function ProductizedDppPage({ projection, locale, previewRole, audiencePreviewEnabled, previewGrants }: Props) {
  const view = normalizeDppProjection(withPublicDisplayOverrides(projection), locale);
  const m = messages[locale];
  const otherLocale = locale === "en" ? "zh" : "en";
  const basePath = `/p/${encodeURIComponent(projection.passportIdentifier)}`;
  const currentGrant = previewGrants?.[previewRole];
  const previewQuery = audiencePreviewEnabled ? `&audience=${previewRole}${currentGrant ? `&audienceGrant=${encodeURIComponent(currentGrant)}` : ""}` : "";
  const qrUrl = `/api/v2/resolver/${encodeURIComponent(projection.passportIdentifier)}?format=qr`;
  return (
    <main className="min-h-screen bg-[#f4f7f5] text-slate-950">
      <a href="#passport-content" className="sr-only z-50 rounded bg-white p-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">{m.skip}</a>
      <header className="border-b border-emerald-950/10 bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8"><BrandLogo href={`/?lang=${locale}`} size="md" variant="light" wordmarkClassName="drop-shadow-sm" /><nav aria-label={locale === "zh" ? "账户与语言" : "Account and language"} className="flex items-center gap-2"><Link href={`/login?lang=${locale}`} className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-4 text-sm font-semibold hover:bg-white/10 focus:ring-2 focus:ring-white">{m.login}</Link><Link href={`${basePath}?lang=${otherLocale}${previewQuery}`} className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-4 text-sm font-semibold hover:bg-white/10 focus:ring-2 focus:ring-white">{m.language}</Link></nav></div>
      </header>
      {audiencePreviewEnabled ? <div className="border-b border-sky-200 bg-sky-50"><div className="mx-auto max-w-7xl px-5 py-4 sm:px-8"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold tracking-[.16em] text-sky-900">{m.preview}</p><p className="mt-1 text-sm text-sky-800">{m.previewWarning}</p></div><nav aria-label={m.preview} className="flex gap-2 overflow-x-auto pb-1">{(["PUBLIC", "REPAIRER", "RECYCLER", "MANUFACTURER", "AUTHORITY"] as PreviewRole[]).map((role) => { const grant = previewGrants?.[role]; return <Link key={role} href={`${basePath}?lang=${locale}&audience=${role}${grant ? `&audienceGrant=${encodeURIComponent(grant)}` : ""}`} className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-inset ${previewRole === role ? "bg-sky-900 text-white ring-sky-900" : "bg-white text-sky-900 ring-sky-200"}`}>{m[role.toLowerCase() as keyof typeof m]}</Link>; })}</nav></div></div></div> : null}
      <section className="relative overflow-hidden bg-emerald-950 text-white"><div className="absolute inset-0 opacity-30 dpp-grid" /><div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_300px] lg:py-16"><div><div className="flex flex-wrap gap-2"><StatusBadge tone="green">{view.brand}</StatusBadge><StatusBadge tone="blue">{view.category ? (locale === "zh" ? ({ "E-bike battery pack": "LMT 电池", "Industrial energy storage": "工业储能电池", "Textile garment": "纺织品", "Consumer electronics": "消费电子产品", "Wood-plastic flooring": "建筑材料", "Hand tool": "五金产品" }[view.category] || view.category) : view.category) : m.passport}</StatusBadge><StatusBadge tone="amber">{m.unverified}</StatusBadge></div><p className="mt-7 text-sm font-semibold uppercase tracking-[.2em] text-emerald-300">{m.passport}</p><h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{view.productName}</h1><p className="mt-5 text-lg text-emerald-100">{view.modelCode} · {projection.passportIdentifier}</p><div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-emerald-100"><span><strong className="text-white">{m.status}:</strong> {localizedValue(projection.status, locale)}</span><span><strong className="text-white">{m.updated}:</strong> {dateValue(projection.publishedAt, locale)}</span></div></div><div className="flex items-center justify-center"><div className="rounded-2xl bg-white p-4 text-center text-slate-900 shadow-2xl"><img src={qrUrl} width={220} height={220} alt={`${m.scan}: ${projection.passportIdentifier}`} className="h-auto w-[220px] max-w-full" /><p className="mt-3 max-w-[220px] text-xs font-semibold text-slate-600">{m.scan}</p></div></div></div></section>
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur"><nav aria-label={locale === "zh" ? "护照章节" : "Passport sections"} className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 py-2 sm:px-8">{view.sections.filter((section) => section.id !== "technical").map((section) => <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:ring-2 focus:ring-emerald-600">{sectionTitle(section.id, m)}</a>)}</nav></div>
      <div id="passport-content" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        {view.metrics.length ? <section aria-labelledby="key-metrics"><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">{m.overview}</p><h2 id="key-metrics" className="mt-1 text-2xl font-bold tracking-tight">{m.metrics}</h2></div></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">{view.metrics.map((metric) => <article key={metric.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{metric.label}</p><p className="mt-2 break-words text-xl font-bold tracking-tight">{localizedValue(metric.value, locale, metric.unit)}</p></article>)}</div></section> : null}
        <div className="mt-12 space-y-12">{view.sections.filter((section) => section.id !== "technical").map((section) => <section id={section.id} key={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-20"><div className="mb-5"><h2 id={`${section.id}-title`} className="text-2xl font-bold tracking-tight sm:text-3xl">{sectionTitle(section.id, m)}</h2><div className="mt-2 h-1 w-12 rounded-full bg-emerald-600" /></div><div className="grid gap-5">{section.fields.filter((field) => field.fieldCode !== "demo.warning" && field.fieldCode !== "provenance.synthetic").map((field) => <article key={field.fieldCode} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><h3 className="font-semibold text-slate-950">{field.metadata.label[locale]}</h3><div className="flex flex-wrap gap-2"><StatusBadge tone="amber">{localizedValue(field.verificationStatus || m.unverified, locale)}</StatusBadge></div></div><div className="p-5 sm:p-6"><FieldRenderer field={field} locale={locale} m={m} /></div></article>)}</div></section>)}</div>
        <section id="passport" aria-labelledby="passport-title" className="mt-12 scroll-mt-20"><h2 id="passport-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{m.passportSection}</h2><div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><ValueGrid locale={locale} value={{ dppId: projection.passportIdentifier, status: projection.status, version: projection.version, publishedAt: projection.publishedAt, audience: projection.audience }} /></div></section>
        <details id="technical" className="mt-8 scroll-mt-20 rounded-2xl border border-slate-300 bg-white"><summary className="min-h-14 cursor-pointer px-5 py-4 font-semibold focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:px-6">{m.technical}</summary><div className="border-t border-slate-200 p-5 sm:p-6"><p className="mb-5 text-sm text-slate-600">{m.technicalHint}</p><ValueGrid locale={locale} value={{ internalPassportUuid: projection.passportId, schemaVersionUuid: projection.schemaVersion, payloadHash: projection.payloadHash }} />{view.sections.find((section) => section.id === "technical")?.fields.map((field) => <div key={field.fieldCode} className="mt-6 border-t border-slate-200 pt-5"><h3 className="mb-4 font-semibold">{field.metadata.label[locale]}</h3><FieldRenderer field={field} locale={locale} m={m} /></div>)}</div></details>
      </div>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:px-8"><p className="max-w-4xl leading-6">{view.synthetic ? m.disclaimer : null}</p><div className="flex flex-col gap-2 md:flex-row md:justify-between"><span>GREANLEAN · {m.passport}</span><span>{projection.passportIdentifier} · v{projection.version}</span></div></div></footer>
    </main>
  );
}
