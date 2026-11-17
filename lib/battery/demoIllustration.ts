import { demoDigitalLinkIdentity, demoDigitalLinkPath } from "../demoDigitalLinks.ts";

const products: Record<string, { model: string; voltage: number; capacity: number; energy: number; chemistry: string }> = {
  "DPP-GLR-LMT-000001": { model: "GLR-P25A", voltage: 25.2, capacity: 13.2, energy: 332.6, chemistry: "Lithium-ion" },
  "DPP-GLR-LMT-000002": { model: "GLR-S36B", voltage: 36, capacity: 18, energy: 648, chemistry: "NMC" },
  "DPP-GLR-LMT-000003": { model: "GLR-X48C", voltage: 48, capacity: 20, energy: 960, chemistry: "LFP" },
  "DPP-DEMO-ESS-000001": { model: "GV-ESS-14K3", voltage: 51.2, capacity: 279.3, energy: 14300, chemistry: "LFP" },
};

export type BatteryIllustrationKind = "serial" | "materials" | "label";
export function batteryIllustrationIdentity(identifier: string, kind: string) {
  const product = products[identifier];
  const identity = demoDigitalLinkIdentity(identifier);
  const path = demoDigitalLinkPath(identifier);
  if (!product || !identity || !path || !["serial", "materials", "label"].includes(kind)) return null;
  return { ...product, ...identity, url: `https://www.greanlean.com${path}` };
}

const escape = (value: string | number) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Drawn demonstration attachments, never a certificate or a product photograph. */
export function batteryIllustrationSvg(identifier: string, kind: BatteryIllustrationKind, zh: boolean, qrSvg: string) {
  const data = batteryIllustrationIdentity(identifier, kind);
  if (!data) return null;
  const heading = zh ? { serial: "单体标识示意图", materials: "电池材料结构示意图", label: "产品铭牌示意图" }[kind] : { serial: "Individual identity illustration", materials: "Battery material illustration", label: "Illustrative product label" }[kind];
  const t = (cn: string, en: string) => zh ? cn : en;
  const text = (x: number, y: number, value: string | number, size = 20, color = "#255b46", weight = 500) => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${escape(value)}</text>`;
  const qr = qrSvg.replace(/<\?xml[^>]*>/g, "").replace("<svg ", '<svg x="600" y="142" width="166" height="166" ').replace(/ width="[^"]+" height="[^"]+"(?= viewBox)/, "");
  const details = kind === "materials"
    ? `<rect x="63" y="144" width="320" height="220" rx="16" fill="#d9eadd" stroke="#7fa991" stroke-width="2"/><rect x="87" y="170" width="272" height="168" rx="8" fill="#fff"/>${[0, 1, 2, 3].map((n) => `<rect x="${105 + n * 59}" y="192" width="42" height="120" rx="8" fill="${["#b4d8c1", "#5e977c", "#d4e8dc", "#8db69d"][n]}"/>`).join("")}${text(425, 175, data.chemistry, 28, "#164d3d", 700)}${text(425, 220, t("正极 / 负极 / 电解液 / 壳体", "Cathode / anode / electrolyte / case"), 18)}${text(425, 264, data.chemistry === "LFP" ? "LiFePO₄ · C · LiPF₆ · Al" : "Li(NiCoMn)O₂ · C · LiPF₆ · Al", 18)}${text(425, 310, t("材料配方仅供界面演示", "Formulation for demonstration only"), 17, "#80928a")}`
    : `<rect x="45" y="122" width="740" height="270" rx="12" fill="#fff" stroke="#dbe8de"/>${text(73, 166, data.model, 28, "#164d3d", 750)}${text(73, 209, `S/N  ${data.serialNumber}`, 20)}${text(73, 245, `GTIN  ${data.gtin}`, 20)}${text(73, 285, `${data.voltage} V  ·  ${data.capacity} Ah  ·  ${data.energy} Wh`, 22)}${text(73, 326, `${data.chemistry}  ·  DEMO`, 19)}${text(73, 367, t("分类回收 · 勿投入生活垃圾", "Separate collection · no household waste"), 16, "#80928a")}${qr}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="470" viewBox="0 0 840 470" role="img" aria-label="${escape(heading)}"><rect width="840" height="470" rx="18" fill="#f5f8f6"/><g font-family="Arial, PingFang SC, Microsoft Yahei, sans-serif">${text(45, 55, "GreanLean", 28, "#0c6049", 800)}${text(45, 91, heading, 19)}<rect x="661" y="28" width="134" height="34" rx="7" fill="#fff5df"/>${text(685, 51, "DEMO ONLY", 16, "#99723b", 750)}${details}${text(45, 437, t("合成演示附件 · 非实物照片、检测报告或合规证明", "Synthetic illustration · not a photograph, test report or certificate"), 17, "#83988a")}</g></svg>`;
}
