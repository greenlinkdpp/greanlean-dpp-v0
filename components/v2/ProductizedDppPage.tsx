import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { SYNTHETIC_DEMO_NOTICES } from "@/lib/v2/audienceProjection";
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
    demo: "Synthetic demonstration",
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
    demoDocument: "Demo document",
    snapshot: "Latest available snapshot — not a live data stream",
    demoProcedure: "Synthetic Demo Procedure — not a real service instruction",
    preview: "PREPROD AUDIENCE PREVIEW",
    previewWarning: "QA projection selected on the server. This control is unavailable in Production.",
    public: "Public",
    repairer: "Repairer",
    recycler: "Recycler",
    manufacturer: "Manufacturer",
    authority: "Authority",
    language: "中文",
    home: "GreanLean Home",
    login: "Platform Login",
    skip: "Skip to passport content",
  },
  zh: {
    passport: "数字产品护照",
    demo: "合成演示数据",
    verified: "数据验证",
    unverified: "未经验证",
    status: "护照状态",
    updated: "最后更新",
    scan: "扫码打开稳定护照地址",
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
    demoDocument: "演示文档",
    snapshot: "最新可用快照，并非实时数据流",
    demoProcedure: "合成演示流程，并非真实维修指引",
    preview: "预生产环境受众预览",
    previewWarning: "服务端已选择 QA 数据投影。Production 不提供此控件。",
    public: "公众",
    repairer: "维修方",
    recycler: "回收方",
    manufacturer: "制造商",
    authority: "监管机构",
    language: "English",
    home: "GreanLean 首页",
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

function unitForKey(key: string): string | null {
  const suffixes: Array<[RegExp, string]> = [
    [/_pct$/, "%"], [/_kg_co2e.*$/, "kg CO₂e"], [/_kg$/, "kg"], [/_mohm$/, "mΩ"],
    [/_wh$/, "Wh"], [/_ah$/, "Ah"], [/_v$/, "V"], [/_a$/, "A"], [/_w.*$/, "W"], [/_c$/, "°C"],
    [/_months$/, "months"], [/_years$/, "years"], [/_seconds$/, "s"],
  ];
  return suffixes.find(([pattern]) => pattern.test(key))?.[1] || null;
}

function labelForKey(key: string, locale: PassportLocale) {
  const labels: Record<string, [string, string]> = {
    productName: ["Product name", "产品名称"], modelCode: ["Model", "型号"], familyName: ["Product family", "产品系列"],
    serialNumber: ["Serial number", "序列号"], dppId: ["DPP ID", "DPP 标识"], customer_confirmed: ["Customer confirmed", "客户确认"],
    verification_status: ["Verification status", "验证状态"], source_name: ["Source", "来源"], source_type: ["Source type", "来源类型"],
    evidence_status: ["Evidence status", "证据状态"], third_party_verified: ["Third-party verified", "第三方验证"],
    charge_status: ["Charge status", "充放电状态"], fault_code: ["Fault code", "故障代码"], timestamp: ["Snapshot time", "快照时间"],
  };
  const translated = labels[key];
  return translated ? translated[locale === "zh" ? 1 : 0] : humanizeFieldKey(key);
}

function ValueGrid({ value, locale, omit = [] }: { value: unknown; locale: PassportLocale; omit?: string[] }) {
  const entries = Object.entries(asRecord(value)).filter(([key]) => !omit.includes(key));
  if (!entries.length) return <p className="text-sm text-slate-500">{formatValue(value, locale)}</p>;
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {entries.map(([key, item]) => (
        <div key={key} className="min-w-0 border-b border-slate-100 pb-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labelForKey(key, locale)}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-900">
            {Array.isArray(item) ? item.map((part) => formatValue(part, locale)).join(" · ") : typeof item === "object" && item !== null ? <CompactObject value={item} locale={locale} /> : formatValue(item, locale, unitForKey(key))}
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
        <span key={key}><span className="text-slate-500">{labelForKey(key, locale)}:</span> {formatValue(item, locale, unitForKey(key))}</span>
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

function BmsPanel({ value, locale, snapshot }: { value: unknown; locale: PassportLocale; snapshot: string }) {
  const data = asRecord(value);
  return (
    <div>
      <p className="mb-5 flex items-center gap-2 text-sm text-slate-600"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky-500" />{snapshot}</p>
      <div className="grid gap-4 sm:grid-cols-2"><Gauge label="SOC" value={data.soc_pct} /><Gauge label="SOH" value={data.soh_pct} /></div>
      <div className="mt-5"><ValueGrid value={data} locale={locale} omit={["soc_pct", "soh_pct"]} /></div>
    </div>
  );
}

function CarbonPanel({ value, locale }: { value: unknown; locale: PassportLocale }) {
  const data = asRecord(value);
  const breakdown = asRecord(data.lifecycle_breakdown_kg_co2e);
  const total = Number(data.total_kg_co2e_per_battery) || Object.values(breakdown).reduce<number>((sum, item) => sum + Number(item || 0), 0);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-4xl font-bold tracking-tight text-slate-950">{formatValue(total, locale, "kg CO₂e")}</p><p className="mt-1 text-sm text-slate-500">{formatValue(data.functional_unit, locale)}</p></div><StatusBadge tone="amber">{data.third_party_verified ? "Verified" : (locale === "zh" ? "未经第三方验证" : "Not third-party verified")}</StatusBadge></div>
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

function DocumentsPanel({ value, locale, metadataOnly, demoDocument }: { value: unknown; locale: PassportLocale; metadataOnly: string; demoDocument: string }) {
  const documents = Array.isArray(value) ? value.map(asRecord) : [];
  return <div className="grid gap-4 md:grid-cols-2">{documents.map((document, index) => {
    const url = safeExternalUrl(document.url || document.document_url);
    return <article key={String(document.document_id || index)} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{formatValue(document.document_type, locale)}</p><h4 className="mt-2 font-semibold text-slate-950">{formatValue(document.title, locale)}</h4></div><span aria-hidden="true" className="text-xl">↗</span></div><p className="mt-3 break-all font-mono text-xs text-slate-500">{formatValue(document.document_id, locale)}</p><div className="mt-4 flex flex-wrap gap-2"><StatusBadge>{metadataOnly}</StatusBadge><StatusBadge tone="amber">{demoDocument}</StatusBadge>{document.version ? <StatusBadge>v{String(document.version)}</StatusBadge> : null}</div>{url ? <a href={url} rel="noreferrer noopener" className="mt-4 inline-flex min-h-11 items-center font-semibold text-emerald-700 underline decoration-2 underline-offset-4">{locale === "zh" ? "打开文档" : "Open document"}</a> : null}</article>;
  })}</div>;
}

function TimelinePanel({ value, locale }: { value: unknown; locale: PassportLocale }) {
  const events = Array.isArray(value) ? value.map(asRecord) : [];
  return <ol className="relative ml-2 border-l-2 border-emerald-200">{events.map((event, index) => <li key={`${String(event.event_type)}-${index}`} className="relative pb-8 pl-7 last:pb-0"><span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-white bg-emerald-600" /><p className="font-semibold text-slate-950">{humanizeFieldKey(String(event.event_type || "Lifecycle event"))}</p><p className="mt-1 text-sm text-slate-600">{dateValue(event.timestamp, locale)} · {formatValue(event.actor, locale)}</p>{event.evidence_id ? <p className="mt-1 font-mono text-xs text-slate-500">{String(event.evidence_id)}</p> : null}</li>)}</ol>;
}

function FieldRenderer({ field, locale, m }: { field: PresentedField; locale: PassportLocale; m: typeof messages.en | typeof messages.zh }) {
  switch (field.metadata.renderType) {
    case "bms": return <BmsPanel value={field.value} locale={locale} snapshot={m.snapshot} />;
    case "carbon": return <CarbonPanel value={field.value} locale={locale} />;
    case "composition": return <CompositionPanel value={field.value} locale={locale} />;
    case "documents": return <DocumentsPanel value={field.value} locale={locale} metadataOnly={m.metadataOnly} demoDocument={m.demoDocument} />;
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
  const view = normalizeDppProjection(projection, locale);
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><BrandLogo href={`/?lang=${locale}`} size="md" variant="light" wordmarkClassName="drop-shadow-sm" /><span className="hidden text-sm font-semibold text-emerald-100 sm:inline">{m.home}</span></div><nav aria-label={locale === "zh" ? "账户与语言" : "Account and language"} className="flex items-center gap-2"><Link href={`/login?lang=${locale}`} className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-4 text-sm font-semibold hover:bg-white/10 focus:ring-2 focus:ring-white">{m.login}</Link><Link href={`${basePath}?lang=${otherLocale}${previewQuery}`} className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-4 text-sm font-semibold hover:bg-white/10 focus:ring-2 focus:ring-white">{m.language}</Link></nav></div>
      </header>
      {audiencePreviewEnabled ? <div className="border-b border-sky-200 bg-sky-50"><div className="mx-auto max-w-7xl px-5 py-4 sm:px-8"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold tracking-[.16em] text-sky-900">{m.preview}</p><p className="mt-1 text-sm text-sky-800">{m.previewWarning}</p></div><nav aria-label={m.preview} className="flex gap-2 overflow-x-auto pb-1">{(["PUBLIC", "REPAIRER", "RECYCLER", "MANUFACTURER", "AUTHORITY"] as PreviewRole[]).map((role) => { const grant = previewGrants?.[role]; return <Link key={role} href={`${basePath}?lang=${locale}&audience=${role}${grant ? `&audienceGrant=${encodeURIComponent(grant)}` : ""}`} className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-inset ${previewRole === role ? "bg-sky-900 text-white ring-sky-900" : "bg-white text-sky-900 ring-sky-200"}`}>{m[role.toLowerCase() as keyof typeof m]}</Link>; })}</nav></div></div></div> : null}
      <section className="relative overflow-hidden bg-emerald-950 text-white"><div className="absolute inset-0 opacity-30 dpp-grid" /><div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_300px] lg:py-16"><div><div className="flex flex-wrap gap-2"><StatusBadge tone="green">{view.brand}</StatusBadge><StatusBadge tone="blue">{view.category ? humanizeFieldKey(view.category) : m.passport}</StatusBadge><StatusBadge tone="amber">{m.unverified}</StatusBadge></div><p className="mt-7 text-sm font-semibold uppercase tracking-[.2em] text-emerald-300">{m.passport}</p><h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{view.productName}</h1><p className="mt-5 text-lg text-emerald-100">{view.modelCode} · {projection.passportIdentifier}</p><div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-emerald-100"><span><strong className="text-white">{m.status}:</strong> {projection.status}</span><span><strong className="text-white">{m.updated}:</strong> {dateValue(projection.publishedAt, locale)}</span></div></div><div className="flex items-center justify-center"><div className="rounded-2xl bg-white p-4 text-center text-slate-900 shadow-2xl"><img src={qrUrl} width={220} height={220} alt={`${m.scan}: ${projection.passportIdentifier}`} className="h-auto w-[220px] max-w-full" /><p className="mt-3 max-w-[220px] text-xs font-semibold text-slate-600">{m.scan}</p></div></div></div></section>
      {view.synthetic ? <aside role="alert" className="border-y border-amber-300 bg-amber-50"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 sm:px-8 lg:flex-row lg:items-center"><span className="inline-flex w-fit rounded-full bg-amber-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">{m.demo}</span><div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-amber-950">{SYNTHETIC_DEMO_NOTICES.map((notice) => <span key={notice}>✓ {notice}</span>)}</div></div></aside> : null}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur"><nav aria-label={locale === "zh" ? "护照章节" : "Passport sections"} className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 py-2 sm:px-8">{view.sections.filter((section) => section.id !== "technical").map((section) => <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:ring-2 focus:ring-emerald-600">{sectionTitle(section.id, m)}</a>)}</nav></div>
      <div id="passport-content" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        {view.metrics.length ? <section aria-labelledby="key-metrics"><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">{m.overview}</p><h2 id="key-metrics" className="mt-1 text-2xl font-bold tracking-tight">{m.metrics}</h2></div></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">{view.metrics.map((metric) => <article key={metric.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{metric.label}</p><p className="mt-2 break-words text-xl font-bold tracking-tight">{formatValue(metric.value, locale, metric.unit)}</p></article>)}</div></section> : null}
        <div className="mt-12 space-y-12">{view.sections.filter((section) => section.id !== "technical").map((section) => <section id={section.id} key={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-20"><div className="mb-5"><h2 id={`${section.id}-title`} className="text-2xl font-bold tracking-tight sm:text-3xl">{sectionTitle(section.id, m)}</h2><div className="mt-2 h-1 w-12 rounded-full bg-emerald-600" /></div><div className="grid gap-5">{section.fields.filter((field) => field.fieldCode !== "demo.warning").map((field) => <article key={field.fieldCode} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><h3 className="font-semibold text-slate-950">{field.metadata.label[locale]}</h3><div className="flex flex-wrap gap-2"><StatusBadge tone="amber">{field.verificationStatus || m.unverified}</StatusBadge></div></div><div className="p-5 sm:p-6"><FieldRenderer field={field} locale={locale} m={m} /></div></article>)}</div></section>)}</div>
        <section id="passport" aria-labelledby="passport-title" className="mt-12 scroll-mt-20"><h2 id="passport-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{m.passportSection}</h2><div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><ValueGrid locale={locale} value={{ dppId: projection.passportIdentifier, status: projection.status, version: projection.version, publishedAt: projection.publishedAt, audience: projection.audience }} /></div></section>
        <details id="technical" className="mt-8 scroll-mt-20 rounded-2xl border border-slate-300 bg-white"><summary className="min-h-14 cursor-pointer px-5 py-4 font-semibold focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:px-6">{m.technical}</summary><div className="border-t border-slate-200 p-5 sm:p-6"><p className="mb-5 text-sm text-slate-600">{m.technicalHint}</p><ValueGrid locale={locale} value={{ internalPassportUuid: projection.passportId, schemaVersionUuid: projection.schemaVersion, payloadHash: projection.payloadHash }} />{view.sections.find((section) => section.id === "technical")?.fields.map((field) => <div key={field.fieldCode} className="mt-6 border-t border-slate-200 pt-5"><h3 className="mb-4 font-semibold">{field.metadata.label[locale]}</h3><FieldRenderer field={field} locale={locale} m={m} /></div>)}</div></details>
      </div>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-slate-500 sm:px-8 md:flex-row md:justify-between"><span>GREANLEAN · {m.passport}</span><span>{projection.passportIdentifier} · v{projection.version}</span></div></footer>
    </main>
  );
}
