"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicDemoShowcaseEntry } from "@/lib/server/v2/demoShowcase";

const categories = [
  ["ALL", "全部", "All"],
  ["LMT_BATTERY", "轻型交通电池", "LMT battery"],
  ["INDUSTRIAL_BATTERY", "工业储能电池", "Industrial battery"],
  ["TEXTILE", "纺织品", "Textile"],
  ["CONSUMER_ELECTRONICS", "消费电子产品", "Consumer electronics"],
  ["BUILDING_MATERIAL", "建筑材料", "Building material"],
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

function parameterLabel(key: string, zh: boolean) {
  const labels: Record<string, [string, string]> = {
    chemistry: ["Chemistry", "电池化学体系"], nominal_voltage_v: ["Nominal voltage", "标称电压"], rated_capacity_ah: ["Rated capacity", "额定容量"],
    energy_kwh: ["Energy", "储能容量"], material: ["Material", "材料"], weight_gsm: ["Fabric weight", "面料克重"], connectivity: ["Connectivity", "连接方式"],
    enclosure_material: ["Enclosure material", "外壳材料"], dimensions_mm: ["Dimensions", "尺寸"], recycled_content_pct: ["Recycled content", "再生材料含量"],
    repairability: ["Repairability", "可维修性"], product_category: ["Product category", "产品类别"],
  };
  return labels[key]?.[zh ? 1 : 0] || key.replaceAll("_", " ");
}

export function DemoShowcase({ entries, locale }: { entries: PublicDemoShowcaseEntry[]; locale: "zh" | "en" }) {
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const zh = locale === "zh";
  const filtered = useMemo(() => entries.filter((entry) => {
    const haystack = `${entry.titleEn} ${entry.titleZh} ${entry.brand} ${entry.summaryEn} ${entry.summaryZh}`.toLowerCase();
    return (category === "ALL" || entry.categoryCode === category) && haystack.includes(query.trim().toLowerCase());
  }), [entries, category, query]);
  return <main className="min-h-screen bg-[#f5f8f6] text-slate-950">
    <header className="border-b border-emerald-950/10 bg-[#103f38] text-white"><div className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><p className="text-xs font-black uppercase tracking-[.22em] text-emerald-200">GreanLean · {zh ? "DPP 演示展厅" : "Demo Showcase"}</p><div className="mt-4 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">{zh ? "数字产品护照演示展厅" : "Digital Product Passport Showcase"}</h1><p className="mt-4 max-w-3xl text-base font-medium leading-7 text-emerald-50">{zh ? "浏览跨行业的合成示例数据，了解公开 DPP 的信息呈现方式。" : "Explore synthetic, cross-sector examples of how public DPP information can be presented."}</p></div><Link href={`/?lang=${locale}`} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-bold hover:bg-white/10">{zh ? "返回首页" : "Home"}</Link></div></div></header>
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{categories.map(([code, zhLabel, enLabel]) => <button key={code} onClick={() => setCategory(code)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${category === code ? "bg-[#134d44] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-500"}`}>{zh ? zhLabel : enLabel}</button>)}</div><label className="relative block"><span className="sr-only">{zh ? "搜索演示" : "Search demos"}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={zh ? "搜索产品或品牌" : "Search product or brand"} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold lg:w-72" /></label></div>
      <p className="mt-5 text-sm font-semibold text-slate-500">{zh ? `共 ${filtered.length} 个公开演示` : `${filtered.length} public demos`}</p>
      {filtered.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((entry) => <article key={entry.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className={`h-36 bg-gradient-to-br ${coverClass(entry.coverStyle)} p-5 text-white`}><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-black backdrop-blur">{zh ? "演示数据" : "Demo"}</span>{entry.featured ? <span className="text-xs font-black">★ {zh ? "精选" : "Featured"}</span> : null}</div><p className="mt-9 text-sm font-black uppercase tracking-[.16em] text-white/85">{entry.brand}</p></div><div className="p-5"><h2 className="text-xl font-black text-[#133f38]">{zh ? entry.titleZh : entry.titleEn}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{zh ? entry.summaryZh : entry.summaryEn}</p><dl className="mt-4 grid grid-cols-2 gap-2 border-y border-slate-100 py-4">{Object.entries(entry.keyParameters).slice(0, 4).map(([key, value]) => <div key={key}><dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">{parameterLabel(key, zh)}</dt><dd className="mt-1 text-sm font-bold text-slate-700">{String(value)}</dd></div>)}</dl><Link href={`/p/${encodeURIComponent(entry.passportIdentifier)}?lang=${locale}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#134d44] px-4 text-sm font-black text-white hover:bg-[#0b3832]">{zh ? "查看数字产品护照" : "View Digital Product Passport"}</Link></div></article>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">{zh ? "没有匹配的公开演示。" : "No public demos match your filters."}</div>}</section>
  </main>;
}
