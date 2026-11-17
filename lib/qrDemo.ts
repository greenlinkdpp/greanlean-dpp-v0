export const QR_DEMO_PATH = "/demo/qr-code";
export const QR_DEMO_URL = `https://www.greanlean.com${QR_DEMO_PATH}`;
export const QR_DEMO_ASSETS = "/demo/qr-code/assets";

export type DemoCopy = { zh: string; en: string };
const copy = (zh: string, en: string): DemoCopy => ({ zh, en });
export const qrDemo = {
  model: "GL24/12-DEMO",
  batch: "DEMO-B2412-202611",
  manufacturer: "GreanLean Reference Energy Ltd.",
  title: copy("可充电锂离子电池组", "Rechargeable lithium-ion battery pack"),
  metrics: [
    { label: copy("标称电压", "Nominal voltage"), value: "24 V" },
    { label: copy("额定容量", "Rated capacity"), value: "12 Ah" },
    { label: copy("标称能量", "Nominal energy"), value: "288 Wh" },
    { label: copy("电池重量", "Battery weight"), value: "2.21 kg" },
  ],
  sections: [
    { id: "manufacturer", title: copy("制造商与产品", "Manufacturer & product"), subtitle: copy("产品标识、批次与联系方式", "Product identity, batch and contact information"), rows: [
      { label: copy("制造商", "Manufacturer"), value: copy("GreanLean Reference Energy Ltd.（演示企业）", "GreanLean Reference Energy Ltd. (demo company)") },
      { label: copy("制造地点", "Manufacturing location"), value: copy("中国江苏省苏州市（演示地点）", "Suzhou, Jiangsu, China (demo location)") },
      { label: copy("预期用途", "Intended application"), value: copy("电动轮椅内置电池", "Built-in battery for an electric wheelchair") },
      { label: copy("电池类别", "Battery category"), value: copy("便携式电池（示例分类，实际类别需确认）", "Portable battery (example classification; actual category requires confirmation)") },
      { label: copy("批次识别", "Batch identification"), value: copy("DEMO-B2412-202611 · 本页为批次信息示例，单颗电池序列号见产品标签", "DEMO-B2412-202611 · This page illustrates batch information; see the product label for an individual serial number") },
      { label: copy("联系邮箱", "Contact email"), value: copy("support@example.invalid（演示邮箱）", "support@example.invalid (demo address)") },
    ] },
    { id: "materials", title: copy("化学体系与材料", "Chemistry & materials"), subtitle: copy("材料组成与信息提供状态", "Material composition and information availability"), rows: [
      { label: copy("化学体系", "Battery chemistry"), value: copy("NMC（三元锂）", "NMC (lithium nickel manganese cobalt oxide)") },
      { label: copy("主要材料", "Main materials"), value: copy("三元正极材料、石墨、电解液、铜、铝及绝缘材料；材料图为结构示意", "NMC cathode, graphite, electrolyte, copper, aluminium and insulation; material image is illustrative") },
      { label: copy("危险物质信息", "Hazardous substances"), value: copy("演示未提供检测报告，实际产品需以制造商资料为准", "No test report is supplied in this demo; actual product information must come from the manufacturer"), pending: true },
      { label: copy("关键原材料声明", "Critical raw material declaration"), value: copy("待提供制造商声明与质量占比数据", "Manufacturer declaration and mass-fraction data pending"), pending: true },
    ] },
    { id: "labels", title: copy("产品与标签", "Product & labels"), subtitle: copy("点击示意图可放大查看", "Select an illustration to enlarge"), rows: [] },
    { id: "documents", title: copy("产品文件", "Product documents"), subtitle: copy("在线预览与下载示例资料", "Preview and download sample documents"), rows: [] },
    { id: "collection", title: copy("使用、安全与回收", "Use, safety & collection"), subtitle: copy("使用维护与废弃处置的信息示例", "Example information for care and end-of-life handling"), rows: [
      { label: copy("正确使用", "Correct use"), value: copy("使用匹配充电器，避免高温；存放和维护应遵循实际产品说明书", "Use a compatible charger and avoid high temperatures; follow the actual product manual for storage and maintenance") },
      { label: copy("安全操作", "Safe handling"), value: copy("避免短路、刺穿、挤压或焚烧；出现异常发热或损坏时停止使用，并遵循制造商指引", "Avoid short circuits, piercing, crushing or burning; stop use if abnormal heat or damage occurs and follow manufacturer guidance") },
      { label: copy("分类收集", "Separate collection"), value: copy("废电池不得混入生活垃圾，应分类收集并交由适用的回收渠道处理", "Collect waste batteries separately from household waste and use an appropriate collection channel") },
      { label: copy("回收渠道", "Collection channels"), value: copy("本 demo 未配置真实回收网点；实际产品应提供当地回收渠道与责任主体信息", "No real collection points are configured in this demo; actual products should provide local collection channels and responsible operator information"), pending: true },
    ] },
  ],
  images: [
    { file: "battery-pack.svg", title: copy("电池外观示意", "Battery pack illustration") },
    { file: "product-label.svg", title: copy("产品标签与二维码", "Product label & QR code") },
    { file: "materials.svg", title: copy("材料结构示意", "Material structure illustration") },
    { file: "collection.svg", title: copy("分类收集标识示意", "Separate collection illustration") },
  ],
  documents: [
    { id: "datasheet", title: copy("产品信息表", "Product information sheet"), description: copy("24 V · 12 Ah · 288 Wh · 批次示例", "24 V · 12 Ah · 288 Wh · example batch"), paragraphs: [copy("产品型号：GL24/12-DEMO；批次：DEMO-B2412-202611；制造年月：2026-11；数量：500 个", "Model: GL24/12-DEMO; batch: DEMO-B2412-202611; manufactured: 2026-11; quantity: 500 units"), copy("化学体系：NMC；标称电压：24 V；额定容量：12 Ah；标称能量：288 Wh；重量：2.21 kg", "Chemistry: NMC; nominal voltage: 24 V; rated capacity: 12 Ah; nominal energy: 288 Wh; weight: 2.21 kg")] },
    { id: "care", title: copy("使用与回收信息", "Use & collection information"), description: copy("使用维护、安全与分类回收的信息示例", "Example care, safety and separate collection information"), paragraphs: [copy("使用匹配充电器，避免高温。实际产品的使用、存放和维护以制造商说明书为准", "Use a compatible charger and avoid high temperatures. Consult the manufacturer's manual for actual use, storage and maintenance"), copy("废电池应分类收集，不得混入生活垃圾。本演示未配置真实回收网点", "Collect waste batteries separately from household waste. No real collection points are configured in this demo")] },
  ],
};
