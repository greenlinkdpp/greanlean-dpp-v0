"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicDemoShowcaseEntry } from "@/lib/server/v2/demoShowcase";

const selected = ["DPP-GLR-LMT-000002", "DPP-DEMO-ESS-000001", "DPP-DEMO-TEX-000001", "DPP-DEMO-CE-000001"];

function label(key: string, zh: boolean) {
  const labels: Record<string, [string, string]> = {
    nominal_voltage_v: ["Nominal voltage", "标称电压"], rated_capacity_ah: ["Rated capacity", "额定容量"], energy_kwh: ["Energy", "储能容量"],
    chemistry: ["Chemistry", "化学体系"], material: ["Material", "材料"], weight_gsm: ["Fabric weight", "面料克重"], connectivity: ["Connectivity", "连接方式"],
    enclosure_material: ["Enclosure material", "外壳材料"], product_category: ["Product category", "产品类别"],
  };
  return labels[key]?.[zh ? 1 : 0] || key.replaceAll("_", " ");
}

function value(key: string, raw: unknown, zh: boolean) {
  const text = zh && key === "connectivity" && raw === "Bluetooth" ? "蓝牙" : String(raw);
  const units: Record<string, string> = { nominal_voltage_v: "V", rated_capacity_ah: "Ah", energy_kwh: "kWh", weight_gsm: "g/m²" };
  return units[key] && !text.endsWith(units[key]) ? `${text} ${units[key]}` : text;
}

export function HomepageDemoMix({ locale }: { locale: "zh" | "en" }) {
  const [entries, setEntries] = useState<PublicDemoShowcaseEntry[]>([]);
  const zh = locale === "zh";
  useEffect(() => {
    fetch("/api/public/demo-showcase").then((response) => response.ok ? response.json() : { entries: [] })
      .then((payload) => setEntries(Array.isArray(payload.entries) ? payload.entries : [])).catch(() => setEntries([]));
  }, []);
  const cards = selected.map((identifier) => entries.find((entry) => entry.passportIdentifier === identifier)).filter(Boolean) as PublicDemoShowcaseEntry[];
  return <div>
    <div className="flex flex-col"><div className="order-2 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((entry) => <article key={entry.id} className="flex min-h-[350px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-700">{entry.categoryCode.replaceAll("_", " ")}</p><h3 className="mt-2 text-xl font-black text-slate-950">{zh ? entry.titleZh : entry.titleEn}</h3></div><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800">Demo</span></div>
        {(entry.categoryCode === "LMT_BATTERY" || entry.categoryCode === "INDUSTRIAL_BATTERY") ? <p className="mt-3 text-xs font-black text-emerald-700">{zh ? "重点：Battery Passport" : "Featured: Battery Passport"}</p> : null}
        <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4">{Object.entries(entry.keyParameters).slice(0, 3).map(([key, raw]) => <div key={key}><dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label(key, zh)}</dt><dd className="mt-1 text-sm font-bold text-slate-700">{value(key, raw, zh)}</dd></div>)}</dl>
        <Link href={`/p/${encodeURIComponent(entry.passportIdentifier)}?lang=${locale}`} className="btn-primary mt-auto w-full">{zh ? "查看护照" : "View Passport"}</Link>
      </article>)}
    </div><div className="order-1 mb-4 flex justify-end"><Link href={`/demo?lang=${locale}`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:border-emerald-600 hover:text-emerald-800">{zh ? "查看全部 Demo →" : "View All Demos →"}</Link></div></div>
  </div>;
}
