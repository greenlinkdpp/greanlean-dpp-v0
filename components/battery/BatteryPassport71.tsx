"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BATTERY_71_CHAPTERS, buildBattery71Rows, type Battery71Category, type Battery71Source, type Battery71State, type Battery71Row } from "@/lib/battery/passport71";

type Props = { source: Battery71Source; locale: "zh" | "en"; category?: Battery71Category; anchorPrefix?: string; renderValue?: (row: Battery71Row) => ReactNode };

const copy = {
  zh: {
    title: "电池护照 · 71 项数据", subtitle: "按 DP-01 至 DP-71 完整展示，保留各电池类别的适用性与访问权限。",
    total: "目录字段", provided: "已提供", missing: "待补充", restricted: "需授权", other: "其他目录状态",
    all: "全部字段", search: "搜索字段名称或编号", chapters: "字段章节", shown: "当前显示", fields: "项",
    access: { public: "公开", professional: "专业授权", regulator: "监管授权" },
    state: { provided: "已提供", missing: "待补充", restricted: "需授权后查看", not_applicable: "不适用", future: "目录暂缓项", duplicate: "目录重复项" },
    description: { provided: "", missing: "当前发布版本尚未提供此项数据。", restricted: "保留字段目录；数据仅向已获授权的身份开放。", not_applicable: "当前电池类别或已声明的适用条件不适用。", future: "已保留目录位置，按当前目录设置暂不展示数据值。", duplicate: "已保留原目录编号，避免重复计入数据完整度。" },
    static: "静态数据", dynamic: "动态数据", unverified: "未核验", verified: "已核验", observed: "观测时间", empty: "没有匹配的字段。", basis: "字段目录 v2.0 · 71 项为目录总数，包含暂缓、重复及按条件适用项目。",
  },
  en: {
    title: "Battery passport · 71 data points", subtitle: "The full DP-01 to DP-71 catalog, with battery-category applicability and access controls.",
    total: "Catalog fields", provided: "Provided", missing: "Pending", restricted: "Restricted", other: "Other catalog states",
    all: "All fields", search: "Search field name or number", chapters: "Field chapters", shown: "Showing", fields: "fields",
    access: { public: "Public", professional: "Professional access", regulator: "Authority access" },
    state: { provided: "Provided", missing: "Not provided", restricted: "Authorization required", not_applicable: "Not applicable", future: "Deferred in catalog", duplicate: "Duplicate in catalog" },
    description: { provided: "", missing: "The current publication does not supply this data point.", restricted: "The catalog entry is visible; its value requires approved access.", not_applicable: "Not applicable to this battery category or declared condition.", future: "Catalog position retained; values are deferred under the current catalog configuration.", duplicate: "Original numbering retained without counting the data point twice for completeness." },
    static: "Static", dynamic: "Dynamic", unverified: "Unverified", verified: "Verified", observed: "Observed at", empty: "No matching fields.", basis: "Catalog v2.0 · The 71 catalog entries include deferred, duplicate and conditional data points.",
  },
};

const valueLabels: Record<string, [string, string]> = {
  model: ["Model", "型号"], batch: ["Batch", "批次号"], serial: ["Serial number", "序列号"], gtin: ["GTIN", "GTIN"],
  website: ["Website", "网站"], contact: ["Contact", "联系点"], months: ["Months", "个月"], cathode: ["Cathode", "正极"],
  anode: ["Anode", "负极"], electrolyte: ["Electrolyte", "电解质"], title: ["Document", "文件"],
};

function Value({ value, locale, unit }: { value: unknown; locale: "zh" | "en"; unit?: string | null }) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return <ul className="space-y-2">{value.map((item, index) => <li key={index}><Value value={item} locale={locale} /></li>)}</ul>;
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object[locale] === "string" || typeof object.en === "string" || typeof object.zh === "string") return <>{String(object[locale] || object.en || object.zh)}</>;
    const link = typeof object.url === "string" && (object.url.startsWith("/api/demo-document?") || /^https:\/\//.test(object.url)) ? object.url : null;
    if (link) return <a href={link.startsWith("/api/demo-document?") ? `${link}&lang=${locale}` : link} target="_blank" rel="noreferrer noopener" className="text-emerald-800 underline underline-offset-4"><Value value={object.title || link} locale={locale} /></a>;
    return <dl className="space-y-2">{Object.entries(object).filter(([, item]) => item !== null && item !== undefined && item !== "").map(([key, item]) => <div key={key}><dt className="text-xs font-medium text-slate-500">{valueLabels[key]?.[locale === "zh" ? 1 : 0] || key}</dt><dd className="mt-0.5"><Value value={item} locale={locale} /></dd></div>)}</dl>;
  }
  if (typeof value === "boolean") return <>{locale === "zh" ? (value ? "是" : "否") : (value ? "Yes" : "No")}</>;
  if (typeof value === "number") return <>{new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-GB", { maximumFractionDigits: 4 }).format(value)}{unit ? ` ${unit}` : ""}</>;
  if (typeof value === "string" && /^https:\/\//.test(value)) return <a href={value} target="_blank" rel="noreferrer noopener" className="text-emerald-800 underline underline-offset-4">{value}</a>;
  return <>{String(value)}</>;
}

export function BatteryPassport71({ source, locale, category, anchorPrefix = "battery-dp", renderValue }: Props) {
  const t = copy[locale];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Battery71State>("all");
  const rows = useMemo(() => buildBattery71Rows(source, category), [source, category]);
  const counts = rows.reduce((result, row) => ({ ...result, [row.state]: result[row.state] + 1 }), { provided: 0, missing: 0, restricted: 0, not_applicable: 0, future: 0, duplicate: 0 });
  const search = query.trim().toLowerCase();
  const visible = rows.filter((row) => (filter === "all" || row.state === filter) && (!search || `${row.id} ${row.labelZh} ${row.labelEn}`.toLowerCase().includes(search)));
  const summary = [[t.total, rows.length], [t.provided, counts.provided], [t.missing, counts.missing], [t.restricted, counts.restricted], [t.other, counts.not_applicable + counts.future + counts.duplicate]] as const;
  return <section aria-label={t.title} data-battery-catalog="71" className="space-y-7">
    <header className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">BATTERY PASSPORT</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{t.subtitle}</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{summary.map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-2 text-2xl font-bold tabular-nums text-emerald-950">{count}</dd></div>)}</dl>
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"><input aria-label={t.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="min-h-11 min-w-0 rounded-lg border border-slate-300 px-3 text-sm text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" /><select aria-label={locale === "zh" ? "筛选字段状态" : "Filter field status"} value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950"><option value="all">{t.all}</option>{Object.entries(t.state).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <p aria-live="polite" className="mt-3 text-xs text-slate-500">{t.shown} {visible.length} / 71 {t.fields}</p>
    </header>
    <div className="grid items-start gap-7 lg:grid-cols-[210px_minmax(0,1fr)]">
      <nav aria-label={t.chapters} className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 lg:sticky lg:top-20 lg:block lg:space-y-1">{BATTERY_71_CHAPTERS.map((chapter) => <a key={chapter.code} href={`#${anchorPrefix}-${chapter.code}`} className="flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"><span className="text-xs font-bold tabular-nums text-emerald-700">{String(chapter.number).padStart(2, "0")}</span>{chapter.code === "sustainability" ? (locale === "zh" ? "可持续性与循环材料" : "Sustainability and circular materials") : (locale === "zh" ? chapter.labelZh : chapter.labelEn)}</a>)}</nav>
      <div className="min-w-0 space-y-8">{BATTERY_71_CHAPTERS.map((chapter) => {
        const fields = visible.filter((row) => row.chapter === chapter.code);
        if (!fields.length) return null;
        return <section id={`${anchorPrefix}-${chapter.code}`} aria-labelledby={`${anchorPrefix}-${chapter.code}-title`} key={chapter.code} className="scroll-mt-24">
          <div className="mb-4 flex items-center gap-3"><span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-900">{String(chapter.number).padStart(2, "0")}</span><h3 id={`${anchorPrefix}-${chapter.code}-title`} className="text-xl font-bold text-slate-950">{chapter.code === "sustainability" ? (locale === "zh" ? "可持续性与循环材料" : "Sustainability and circular materials") : (locale === "zh" ? chapter.labelZh : chapter.labelEn)}</h3><span className="ml-auto text-xs tabular-nums text-slate-500">{fields.length} {t.fields}</span></div>
          <div className="grid gap-3 xl:grid-cols-2">{fields.map((row) => <article key={row.id} data-battery-field={row.id} data-field-state={row.state} className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><span className="font-mono text-xs font-semibold text-emerald-700">{row.id}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{t.access[row.access as keyof typeof t.access]}</span></div>
            <h4 className="mt-3 text-sm font-semibold leading-6 text-slate-950">{locale === "zh" ? row.labelZh : row.labelEn}</h4>
            <div className="mt-3 break-words text-sm leading-6 text-slate-800 [overflow-wrap:anywhere]">{row.state === "provided" ? (renderValue?.(row) ?? <Value value={row.value} unit={row.unit} locale={locale} />) : <><p className={row.state === "restricted" ? "font-semibold text-amber-800" : "font-semibold text-slate-500"}>{t.state[row.state]}</p><p className="mt-1 text-xs leading-5 text-slate-500">{t.description[row.state]}</p></>}</div>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-[10px] font-medium text-slate-500"><span>{row.dynamic ? t.dynamic : t.static}</span>{row.state === "provided" ? <span>{row.verificationStatus?.toUpperCase() === "VERIFIED" ? t.verified : t.unverified}</span> : null}{row.observedAt ? <span>{t.observed}: {row.observedAt}</span> : null}</div>
          </article>)}</div>
        </section>;
      })}{!visible.length ? <p role="status" className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{t.empty}</p> : null}</div>
    </div>
    <p className="text-xs leading-5 text-slate-500">{t.basis}</p>
  </section>;
}
