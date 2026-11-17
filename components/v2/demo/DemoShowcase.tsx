"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicDemoShowcaseEntry } from "@/lib/server/v2/demoShowcase";
import { productPassportHref } from "@/lib/dppNavigation";
import { demoText, formatDemoLocale, sourceLocale, type DemoLanguage } from "@/lib/demo/language";
import { DemoLanguageSelect } from "./DemoLanguageSelect";
import { QrCodeDemoCard } from "./QrCodeDemoCard";

const categories = [
  ["ALL", "全部", "All"],
  ["QR_CODE", "QR Code 信息页", "QR Code Information"],
  ["LMT_BATTERY", "LMT 电池", "LMT Batteries"],
  ["INDUSTRIAL_BATTERY", "工业储能电池", "Industrial Batteries"],
  ["TEXTILE", "纺织品", "Textiles"],
  ["CONSUMER_ELECTRONICS", "消费电子产品", "Consumer Electronics"],
  ["BUILDING_MATERIAL", "建筑材料", "Building Materials"],
  ["HARDWARE", "五金产品", "Hardware"],
] as const;

function coverClass(style: string) {
  const choices: Record<string, string> = {
    "gradient-green": "from-[#0b453c] via-[#16816d] to-[#a1e3b7]",
    "gradient-blue": "from-[#103f66] via-[#2778a5] to-[#a9d6e5]",
    "gradient-amber": "from-[#713f12] via-[#c26b1d] to-[#fde68a]",
    "gradient-violet": "from-[#45215c] via-[#8753aa] to-[#dfc7f2]",
    "gradient-slate": "from-slate-800 via-slate-600 to-slate-300",
  };
  return choices[style] || choices["gradient-green"];
}

function parameterLabel(key: string, language: DemoLanguage) {
  const labels: Record<string, [string, string]> = {
    chemistry: ["Chemistry", "电池化学体系"], nominal_voltage_v: ["Nominal voltage", "标称电压"], rated_capacity_ah: ["Rated capacity", "额定容量"],
    energy_kwh: ["Energy", "储能容量"], material: ["Material", "材料"], weight_gsm: ["Fabric weight", "面料克重"], connectivity: ["Connectivity", "连接方式"],
    enclosure_material: ["Enclosure material", "外壳材料"], dimensions_mm: ["Dimensions", "尺寸"], recycled_content_pct: ["Recycled content", "再生材料含量"],
    repairability: ["Repairability", "可维修性"], product_category: ["Product category", "产品类别"],
  };
  const [en, zh] = labels[key] || [key.replaceAll("_", " ")];
  return demoText(language, en, zh);
}

function parameterValue(key: string, value: unknown, language: DemoLanguage) {
  const translated: Record<string, string> = {
    "Wood-plastic flooring": "木塑地板", "Consumer electronics": "消费电子", "Recycled ABS": "再生 ABS",
    "Alloy steel": "合金钢", "Replaceable bits": "可更换批头", "Hand tool": "手动工具",
    "Industrial energy storage": "工业储能", "Lithium-ion": "锂离子", "E-bike battery pack": "电动自行车电池包",
    "Textile garment": "纺织品", "Organic cotton": "有机棉",
  Bluetooth: "蓝牙",
  };
  const raw = typeof value === "number"
    ? new Intl.NumberFormat(formatDemoLocale(language.locale), { maximumFractionDigits: 8 }).format(value)
    : demoText(language, String(value), translated[String(value)]);
  const units: Record<string, string> = {
    nominal_voltage_v: "V", rated_capacity_ah: "Ah", rated_energy_wh: "Wh", energy_kwh: "kWh",
    weight_kg: "kg", weight_gsm: "g/m²", thickness_mm: "mm", dimensions_mm: "mm",
    recycled_content_pct: "%", temperature_c: "°C", total_kg_co2e_per_battery: "kg CO₂e",
  };
  const unit = units[key];
  return unit && !raw.endsWith(unit) ? `${raw}${unit === "%" ? "" : " "}${unit}` : raw;
}

export function DemoShowcase({ entries, language }: { entries: PublicDemoShowcaseEntry[]; language: DemoLanguage }) {
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const { locale } = language;
  const t = (en: string, zh?: string) => demoText(language, en, zh);
  const search = query.trim().toLocaleLowerCase(locale);
  const qrSearch = t("QR Code Battery Information Demo", "QR Code 电池信息 Demo");
  const showQrDemo = (category === "ALL" || category === "QR_CODE")
    && `${qrSearch} QR code 二维码 电池 批次 battery batch greanlean gl24/12 demo`.toLocaleLowerCase(locale).includes(search);
  const filtered = useMemo(() => entries.filter((entry) => {
    const title = demoText(language, entry.titleEn, entry.titleZh);
    const summary = demoText(language, entry.summaryEn, entry.summaryZh);
    const haystack = `${title} ${summary} ${entry.titleEn} ${entry.titleZh} ${entry.brand} ${entry.summaryEn} ${entry.summaryZh}`.toLocaleLowerCase(locale);
    return (category === "ALL" || entry.categoryCode === category) && haystack.includes(search);
  }), [entries, category, search, language, locale]);
  const count = new Intl.NumberFormat(formatDemoLocale(locale)).format(filtered.length);
  const resultCount = filtered.length === 1
    ? t("1 public DPP", "共 1 个公开 DPP")
    : t("{count} public DPPs", "共 {count} 个公开 DPP").replace("{count}", count);
  return <main lang={locale} className="min-h-screen bg-[#f5f8f6] text-slate-950">
    <header className="border-b border-emerald-950/10 bg-[#103f38] text-white"><div className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><p className="text-xs font-black uppercase tracking-[.22em] text-emerald-200">GreanLean · {t("Product Passport Showcase", "二维码与产品护照展厅")}</p><div className="mt-4 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("QR Code & Product Passport Showcase", "二维码与产品护照展厅")}</h1><p className="mt-4 max-w-3xl text-base font-medium leading-7 text-emerald-50">{t("Explore QR code information pages and cross-sector digital product passports.", "体验二维码信息页，浏览跨行业产品护照，了解产品信息的公开呈现方式。")}</p></div><div className="flex flex-wrap items-center gap-3"><DemoLanguageSelect language={language} light /><Link href={`/?lang=${sourceLocale(locale)}`} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-bold hover:bg-white/10">{t("Home", "返回首页")}</Link></div></div></div></header>
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{categories.map(([code, zhLabel, enLabel]) => <button key={code} onClick={() => setCategory(code)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${category === code ? "bg-[#134d44] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-500"}`}>{t(enLabel, zhLabel)}</button>)}</div><label className="relative block"><span className="sr-only">{t("Search product passports", "搜索产品护照")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search product or brand", "搜索产品或品牌")} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold lg:w-72" /></label></div>
      <p className="mt-5 text-sm font-semibold text-slate-500">{resultCount}{showQrDemo ? ` · ${t("1 QR Code information page", "1 个 QR Code 信息页")}` : ""}</p>
      {filtered.length || showQrDemo ? <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{showQrDemo ? <QrCodeDemoCard language={language} /> : null}{filtered.map((entry) => <article key={entry.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className={`h-36 bg-gradient-to-br ${coverClass(entry.coverStyle)} p-5 text-white`}><div className="flex items-start justify-end gap-3">{entry.featured ? <span className="text-xs font-black">★ {t("Featured", "精选")}</span> : null}</div><p className="mt-9 text-sm font-black uppercase tracking-[.16em] text-white/85">{entry.brand}</p></div><div className="p-5"><h2 className="text-xl font-black text-[#133f38]">{t(entry.titleEn, entry.titleZh)}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{t(entry.summaryEn, entry.summaryZh)}</p><dl className="mt-4 grid grid-cols-2 gap-2 border-y border-slate-100 py-4">{Object.entries(entry.keyParameters).slice(0, 3).map(([key, value]) => <div key={key}><dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">{parameterLabel(key, language)}</dt><dd className="mt-1 text-sm font-bold text-slate-700">{parameterValue(key, value, language)}</dd></div>)}</dl><Link href={productPassportHref(entry.passportIdentifier, locale, { demo: true })} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#134d44] px-4 text-sm font-black text-white hover:bg-[#0b3832]">{t("View Digital Product Passport", "查看数字产品护照")}</Link></div></article>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">{t("No demos match your filters.", "没有匹配的 Demo。")}</div>}</section>
  </main>;
}
