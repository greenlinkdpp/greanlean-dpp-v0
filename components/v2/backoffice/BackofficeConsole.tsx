"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";
import { localizedPath, PRIMARY_V2_DEMO_PATH } from "@/lib/navigation";
import {
  backofficeCopy,
  backofficeNavigation,
  dashboardMetrics,
  isBackofficeSection,
  mappingStatus,
  modelRelationships,
  readinessForPassport,
  type BackofficeContext,
  type BackofficeRow,
  type BackofficeSection,
  type BackofficeSnapshot,
} from "@/lib/v2/backoffice";

type Props = { section?: string; modelId?: string };
type ActionState = { kind: "idle" | "working" | "success" | "error"; message: string };

const sectionData: Partial<Record<BackofficeSection, keyof BackofficeSnapshot>> = {
  organisations: "organisations", families: "families", models: "models", skus: "skus", batches: "batches",
  items: "items", sources: "dataSources", mappings: "mappingProfiles", claims: "claims", validation: "validationRules",
  candidates: "reviews", reviews: "reviews", publications: "versions", passports: "passports", identifiers: "identifiers",
  documents: "sourceRecords", lifecycle: "sourceRecords", bms: "bmsSnapshots", integrations: "connectors",
  registry: "registrySubmissions", audit: "publicationAudit",
};

const columns: Partial<Record<BackofficeSection, string[]>> = {
  organisations: ["legal_name", "organisation_type", "country", "status"], families: ["code", "name", "status"],
  models: ["model_code", "name", "product_category", "status"], skus: ["sku_code", "name", "market", "status"],
  batches: ["batch_number", "production_date", "status"], items: ["serial_number", "upi", "status"],
  sources: ["name", "source_type", "trust_level", "status"], mappings: ["name", "status", "data_source_id"],
  claims: ["subject_type", "resolution_state", "canonical_unit", "verification_status"],
  validation: ["rule_code", "rule_type", "severity", "message_en"], candidates: ["subject_type", "status", "generated_at"],
  reviews: ["subject_type", "status", "submitted_at", "reviewed_at"], publications: ["version_number", "publication_state", "registry_state", "published_at"],
  passports: ["passport_identifier", "subject_type", "status", "updated_at"], identifiers: ["identifier_type", "value", "subject_type", "status"],
  bms: ["device_external_id", "sample_count", "window_end", "algorithm_version"], integrations: ["name", "environment", "status", "last_successful_sync_at"],
  registry: ["operation", "state", "registry_profile", "completed_at"], audit: ["event_type", "result", "created_at", "correlation_id"],
};

function stringValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function statusTone(value: unknown) {
  const status = String(value || "").toUpperCase();
  if (["ACTIVE", "APPROVED", "PUBLISHED", "COMPLETED", "VALID", "PASS"].some((item) => status.includes(item))) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (["FAILED", "REJECTED", "BLOCKED", "WITHDRAWN", "ERROR"].some((item) => status.includes(item))) return "bg-red-50 text-red-800 ring-red-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function Status({ value }: { value: unknown }) {
  return <span className={`inline-flex px-2 py-1 text-[11px] font-black uppercase ring-1 ${statusTone(value)}`}>{stringValue(value)}</span>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4"><h2 className="text-lg font-black text-slate-950">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
    {children}
  </section>;
}

function DataTable({ rows, keys, query, empty }: { rows: BackofficeRow[]; keys: string[]; query: string; empty: string }) {
  const filtered = rows.filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  if (!filtered.length) return <div className="border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-semibold text-slate-500">{empty}</div>;
  return <div className="overflow-x-auto border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-left text-sm">
    <thead className="bg-slate-50"><tr>{keys.map((key) => <th key={key} className="whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">{key.replaceAll("_", " ")}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100">{filtered.map((row, index) => <tr key={String(row.id || index)} className="hover:bg-emerald-50/30">{keys.map((key) => <td key={key} className="max-w-xs truncate px-4 py-3 font-medium text-slate-700">{key.includes("status") || key === "state" || key === "result" ? <Status value={row[key]} /> : stringValue(row[key])}</td>)}</tr>)}</tbody>
  </table></div>;
}

function Dashboard({ snapshot, locale }: { snapshot: BackofficeSnapshot; locale: "en" | "zh" }) {
  const metrics = dashboardMetrics(snapshot);
  const labels = locale === "zh"
    ? { models: "型号", items: "单件", passports: "护照", published: "已发布", review: "待审核", issues: "质量问题", activity: "近期活动", readiness: "发布准备度" }
    : { models: "Models", items: "Items", passports: "Passports", published: "Published", review: "In review", issues: "Quality issues", activity: "Recent activity", readiness: "Publication readiness" };
  const cards = [[labels.models, metrics.models], [labels.items, metrics.items], [labels.passports, metrics.passports], [labels.published, metrics.published], [labels.review, metrics.review], [labels.issues, metrics.validationIssues]];
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label, value]) => <div key={String(label)} className="border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title={labels.readiness}><div className="space-y-3">{snapshot.passports.map((passport) => <div key={String(passport.id)} className="flex items-center justify-between border-b border-slate-100 pb-3"><div><p className="font-bold">{stringValue(passport.passport_identifier)}</p><p className="text-xs text-slate-500">{stringValue(passport.subject_type)}</p></div><Status value={readinessForPassport(snapshot, passport)} /></div>)}</div></Panel>
      <Panel title={labels.activity}><DataTable rows={[...snapshot.publicationAudit, ...snapshot.connectorAudit].slice(0, 8)} keys={["event_type", "result", "created_at"]} query="" empty="No recent activity" /></Panel>
    </div>
  </div>;
}

function ModelPage({ snapshot, modelId, locale }: { snapshot: BackofficeSnapshot; modelId: string; locale: "en" | "zh" }) {
  const model = snapshot.models.find((row) => row.id === modelId);
  const related = modelRelationships(snapshot, modelId);
  if (!model) return <Panel title={locale === "zh" ? "未找到型号" : "Model not found"}><p className="text-sm text-slate-500">{modelId}</p></Panel>;
  const subjectIds = new Set([modelId, ...related.skus.map((row) => String(row.id)), ...related.batches.map((row) => String(row.id)), ...related.items.map((row) => String(row.id))]);
  const identifiers = snapshot.identifiers.filter((row) => subjectIds.has(String(row.subject_id)));
  const claims = snapshot.claims.filter((row) => subjectIds.has(String(row.subject_id)));
  const passports = snapshot.passports.filter((row) => subjectIds.has(String(row.subject_id)));
  const sourceRecords = snapshot.sourceRecords.filter((row) => subjectIds.has(String(row.subject_id)));
  const sourceIds = new Set(sourceRecords.map((row) => String(row.data_source_id)));
  const dataSources = snapshot.dataSources.filter((row) => sourceIds.has(String(row.id)));
  return <div className="space-y-6">
    <Panel title={stringValue(model.name)} subtitle={`${stringValue(model.model_code)} · ${stringValue(model.product_category)}`}>
      <div className="grid gap-4 sm:grid-cols-4">{[["Status", model.status], ["SKUs", related.skus.length], ["Batches", related.batches.length], ["Items", related.items.length]].map(([label, value]) => <div key={String(label)} className="bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">{String(label)}</p><p className="mt-2 font-black">{stringValue(value)}</p></div>)}</div>
    </Panel>
    <div className="grid gap-6 xl:grid-cols-2"><Panel title="SKUs"><DataTable rows={related.skus} keys={["sku_code", "name", "market", "status"]} query="" empty="No SKUs" /></Panel><Panel title={locale === "zh" ? "批次" : "Batches"}><DataTable rows={related.batches} keys={["batch_number", "production_date", "status"]} query="" empty="No batches" /></Panel></div>
    <Panel title={locale === "zh" ? "单件与护照关联" : "Items and passport coverage"}><DataTable rows={related.items} keys={["serial_number", "upi", "sku_id", "batch_id", "status"]} query="" empty="No items" /></Panel>
    <div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "标识符" : "Identifiers"}><DataTable rows={identifiers} keys={["identifier_type", "value", "subject_type", "status"]} query="" empty="No identifiers" /></Panel><Panel title={locale === "zh" ? "数据源" : "Data sources"}><DataTable rows={dataSources} keys={["name", "source_type", "trust_level", "status"]} query="" empty="No data sources" /></Panel></div>
    <div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "声明与验证" : "Claims and validation"}><DataTable rows={claims} keys={["subject_type", "resolution_state", "verification_status", "canonical_unit"]} query="" empty="No claims" /></Panel><Panel title={locale === "zh" ? "护照状态" : "Passport status"}><DataTable rows={passports} keys={["passport_identifier", "subject_type", "status", "updated_at"]} query="" empty="No passports" /></Panel></div>
    <Panel title={locale === "zh" ? "来源与审计历史" : "Source and audit history"}><DataTable rows={[...sourceRecords, ...snapshot.publicationAudit.filter((row) => passports.some((passport) => passport.id === row.passport_id))]} keys={["subject_type", "status", "event_type", "received_at", "created_at"]} query="" empty="No history" /></Panel>
  </div>;
}

function ImportWorkspace({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState(""); const [normalizedFormat, setNormalizedFormat] = useState("CSV"); const [action, setAction] = useState<ActionState>({ kind: "idle", message: "" });
  const canImport = context.capabilities.includes("import.create");
  async function choose(selected?: File) {
    if (!selected) return; setFile(selected);
    if (/\.json$/i.test(selected.name)) { setNormalizedFormat("JSON"); setPreview((await selected.text()).slice(0, 12000)); return; }
    if (/\.csv$/i.test(selected.name)) { setNormalizedFormat("CSV"); setPreview((await selected.text()).slice(0, 12000)); return; }
    setAction({ kind: "working", message: locale === "zh" ? "正在安全读取 Excel 第一张工作表…" : "Safely reading the first Excel worksheet…" });
    try {
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      await workbook.xlsx.load(await selected.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("Workbook contains no worksheet.");
      const csvRows: string[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const cells = Array.isArray(row.values) ? row.values.slice(1) : [];
        csvRows.push(cells.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","));
      });
      setNormalizedFormat("CSV"); setPreview(csvRows.join("\n").slice(0, 12000));
      setAction({ kind: "success", message: locale === "zh" ? `已读取工作表“${worksheet.name}”并规范化为 CSV 预检格式。` : `Worksheet “${worksheet.name}” was normalised to the CSV preflight format.` });
    } catch (reason) {
      setPreview(""); setAction({ kind: "error", message: reason instanceof Error ? reason.message : "Excel parsing failed." });
    }
  }
  async function preflight() {
    if (!file || !canImport) return;
    const fileDefinitionIds = new Set(snapshot.connectorDefinitions.filter((row) => row.connector_type === "FILE_IMPORT").map((row) => row.id));
    const connector = snapshot.connectors.find((row) => fileDefinitionIds.has(row.connector_definition_id));
    const mapping = snapshot.mappingVersions.find((row) => row.mapping_profile_id === connector?.mapping_profile_id && ["ACTIVE", "COMMITTED"].includes(String(row.status)));
    if (!connector || !mapping) { setAction({ kind: "error", message: locale === "zh" ? "需要已配置的连接器与映射版本。" : "A configured connector and mapping version are required." }); return; }
    setAction({ kind: "working", message: locale === "zh" ? "正在预检…" : "Running preflight…" });
    const response = await fetch("/api/v2/imports", { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: JSON.stringify({ connector_instance_id: connector.id, mapping_version_id: mapping.id, file_format: normalizedFormat, content: preview, action: "PREFLIGHT", allow_unmapped: true }) });
    const body = await response.json().catch(() => ({}));
    setAction({ kind: response.ok ? "success" : "error", message: response.ok ? (locale === "zh" ? "预检完成；尚未提交任何数据。" : "Preflight complete; no data was committed.") : String(body?.error?.message || body?.message || "Preflight failed") });
    if (response.ok) onRefresh();
  }
  return <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><Panel title={locale === "zh" ? "文件导入" : "File import"} subtitle={locale === "zh" ? "CSV、Excel 或 JSON；先预检，再明确提交。功能按环境开关控制，本 RC 的 Production 保持关闭。" : "CSV, Excel, or JSON; preflight first, explicit commit second. Availability is environment-gated; Production remains off for this RC."}>
    <label className="block cursor-pointer border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center"><span className="font-black">{file?.name || (locale === "zh" ? "选择导入文件" : "Choose an import file")}</span><input className="sr-only" type="file" accept=".csv,.json,.xlsx" onChange={(event) => void choose(event.target.files?.[0])} /></label>
    {preview && <pre className="mt-4 max-h-56 overflow-auto bg-slate-950 p-4 text-xs text-emerald-200">{preview}</pre>}
    <button disabled={!file || !canImport || action.kind === "working"} onClick={() => void preflight()} className="mt-4 bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{locale === "zh" ? "运行安全预检" : "Run safe preflight"}</button>
    {action.message && <p className={`mt-3 text-sm font-bold ${action.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{action.message}</p>}
  </Panel><Panel title={locale === "zh" ? "导入历史" : "Import history"}><DataTable rows={snapshot.importSessions} keys={["file_format", "status", "created_at", "committed_at"]} query="" empty="No imports" /></Panel></div>;
}

function ReviewWorkspace({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const [state, setState] = useState<ActionState>({ kind: "idle", message: "" });
  async function mutate(path: string, payload: BackofficeRow) {
    setState({ kind: "working", message: locale === "zh" ? "正在执行…" : "Working…" });
    const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({})); setState({ kind: response.ok ? "success" : "error", message: response.ok ? (locale === "zh" ? "操作完成。" : "Action completed.") : String(body?.error?.message || body?.message || "Action failed") }); if (response.ok) onRefresh();
  }
  return <div className="space-y-4">{state.message && <div className={`border p-3 text-sm font-bold ${state.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</div>}{snapshot.reviews.map((review) => <Panel key={String(review.id)} title={`${stringValue(review.subject_type)} · ${stringValue(review.status)}`} subtitle={stringValue(review.generated_at)}>
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]"><div><p className="text-xs font-black uppercase text-slate-500">Candidate hash</p><p className="mt-1 break-all font-mono text-xs">{stringValue(review.candidate_hash)}</p><details className="mt-4"><summary className="cursor-pointer text-sm font-bold text-slate-700">Validation summary</summary><pre className="mt-2 overflow-auto bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(review.validation_summary, null, 2)}</pre></details></div><div className="flex flex-wrap items-start gap-2">
      {review.status === "IN_REVIEW" && <><button disabled={!context.capabilities.includes("dpp.approve")} onClick={() => void mutate(`/api/v2/passport-reviews/${review.id}/approve`, {})} className="bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Approve</button><button disabled={!context.capabilities.includes("dpp.request_changes")} onClick={() => void mutate(`/api/v2/passport-reviews/${review.id}/request-changes`, { reason: "Operator requested corrections" })} className="bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 disabled:bg-slate-300">Request changes</button><button disabled={!context.capabilities.includes("dpp.reject")} onClick={() => void mutate(`/api/v2/passport-reviews/${review.id}/reject`, { reason: "Operator rejected candidate" })} className="bg-red-700 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Reject</button></>}
      {review.status === "APPROVED" && <button disabled={!context.capabilities.includes("dpp.publish")} onClick={() => void mutate("/api/v2/publications", { review_task_id: review.id })} className="bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Publish</button>}
    </div></div>
  </Panel>)}</div>;
}

type CreateField = { name: string; label: string; required?: boolean; options?: Array<{ value: string; label: string }> };

function CreateRecordPanel({ section, snapshot, context, token, locale, onRefresh }: { section: BackofficeSection; snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const configurations: Partial<Record<BackofficeSection, { endpoint: string; capability: string; fields: CreateField[]; defaults?: BackofficeRow }>> = {
    organisations: { endpoint: "/api/v2/organisations", capability: "organisation.edit", fields: [{ name: "legal_name", label: "Legal name", required: true }, { name: "trading_name", label: "Trading name" }, { name: "organisation_type", label: "Organisation type", required: true, options: ["MANUFACTURER","SUPPLIER","IMPORTER","DISTRIBUTOR","SERVICE_PROVIDER","RECYCLER"].map((value) => ({ value, label: value })) }, { name: "country", label: "Country" }], defaults: { status: "ACTIVE" } },
    families: { endpoint: "/api/v2/product-families", capability: "product.edit", fields: [{ name: "code", label: "Family code", required: true }, { name: "name", label: "Family name", required: true }, { name: "description", label: "Description" }], defaults: { status: "ACTIVE" } },
    models: { endpoint: "/api/v2/product-models", capability: "product.edit", fields: [{ name: "family_id", label: "Product family", required: true, options: snapshot.families.map((row) => ({ value: String(row.id), label: stringValue(row.name) })) }, { name: "model_code", label: "Model code", required: true }, { name: "name", label: "Model name", required: true }, { name: "product_category", label: "Product category" }, { name: "sector", label: "Sector" }], defaults: { status: "ACTIVE" } },
    skus: { endpoint: "/api/v2/skus", capability: "product.edit", fields: [{ name: "model_id", label: "Model", required: true, options: snapshot.models.map((row) => ({ value: String(row.id), label: stringValue(row.name) })) }, { name: "sku_code", label: "SKU code", required: true }, { name: "name", label: "SKU name", required: true }, { name: "market", label: "Market" }], defaults: { status: "ACTIVE", configuration_json: {} } },
    batches: { endpoint: "/api/v2/batches", capability: "product.edit", fields: [{ name: "model_id", label: "Model", required: true, options: snapshot.models.map((row) => ({ value: String(row.id), label: stringValue(row.name) })) }, { name: "batch_number", label: "Batch number", required: true }, { name: "production_date", label: "Production date" }], defaults: { status: "ACTIVE" } },
    items: { endpoint: "/api/v2/items", capability: "product.edit", fields: [{ name: "model_id", label: "Model", required: true, options: snapshot.models.map((row) => ({ value: String(row.id), label: stringValue(row.name) })) }, { name: "sku_id", label: "Optional SKU", options: snapshot.skus.map((row) => ({ value: String(row.id), label: stringValue(row.sku_code) })) }, { name: "batch_id", label: "Optional batch", options: snapshot.batches.map((row) => ({ value: String(row.id), label: stringValue(row.batch_number) })) }, { name: "serial_number", label: "Serial number", required: true }, { name: "upi", label: "HTTPS UPI" }], defaults: { status: "ACTIVE", enforce_batch_sku_link: false } },
    sources: { endpoint: "/api/v2/data-sources", capability: "import.create", fields: [{ name: "name", label: "Source name", required: true }, { name: "source_type", label: "Source type", required: true, options: ["MANUAL","EXCEL","CSV","JSON","ERP","MES","PLM","API","BMS","SUPPLIER","LEGACY"].map((value) => ({ value, label: value })) }, { name: "trust_level", label: "Trust level", required: true, options: ["UNVERIFIED","SELF_DECLARED","CONTRACTED","SYSTEM_CONTROLLED","THIRD_PARTY_VERIFIED"].map((value) => ({ value, label: value })) }], defaults: { status: "ACTIVE", residency_classification: "UNSPECIFIED" } },
  };
  const configuration = configurations[section];
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<ActionState>({ kind: "idle", message: "" });
  if (!configuration) return null;
  const allowed = context.capabilities.includes(configuration.capability);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!configuration || !allowed) return;
    setState({ kind: "working", message: locale === "zh" ? "正在创建…" : "Creating…" });
    const payload = Object.fromEntries(Object.entries({ ...configuration.defaults, ...values }).filter(([, value]) => value !== ""));
    const response = await fetch(configuration.endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    setState({ kind: response.ok ? "success" : "error", message: response.ok ? (locale === "zh" ? "记录已创建。" : "Record created.") : String(body?.error?.message || body?.message || "Create failed") });
    if (response.ok) { setValues({}); onRefresh(); }
  }
  return <Panel title={locale === "zh" ? "新建记录" : "Create record"} subtitle={allowed ? (locale === "zh" ? "使用现有 V2 领域 API；操作带幂等键。" : "Uses the existing V2 domain API with an idempotency key.") : (locale === "zh" ? "当前角色没有创建权限。" : "The current role cannot create this record.")}>
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">{configuration.fields.map((field) => <label key={field.name} className="text-xs font-black uppercase text-slate-600">{field.label}{field.required ? " *" : ""}{field.options ? <select required={field.required} value={values[field.name] || ""} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case"><option value="">—</option>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input required={field.required} value={values[field.name] || ""} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" />}</label>)}</form>
    <button disabled={!allowed || state.kind === "working"} onClick={(event) => void submit(event)} className="mt-4 bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300">{locale === "zh" ? "创建" : "Create"}</button>
    {state.message && <p className={`mt-3 text-sm font-bold ${state.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}
  </Panel>;
}

function ClaimWorkspace({ snapshot, query, empty }: { snapshot: BackofficeSnapshot; query: string; empty: string }) {
  const fields = new Map(snapshot.fields.map((field) => [field.id, field]));
  const provenance = new Map(snapshot.provenance.map((record) => [record.id, record]));
  const rows = snapshot.claims.map((claim) => {
    const field = fields.get(claim.field_definition_id); const source = provenance.get(claim.provenance_record_id);
    return { ...claim, field: field?.label_en || field?.field_code, resolved_value: claim.resolution_state === "OVERRIDE" ? claim.value_json : claim.resolution_state, source: source?.source_disclosure || source?.verification_method, last_updated: claim.created_at };
  });
  return <Panel title="Canonical claims" subtitle="INHERIT, OVERRIDE, CLEAR, NOT_APPLICABLE and UNKNOWN remain distinct."><DataTable rows={rows} keys={["field", "resolved_value", "canonical_unit", "resolution_state", "source", "verification_status", "last_updated"]} query={query} empty={empty} /></Panel>;
}

function ManualClaimWorkspace({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const subjects = [
    ...snapshot.families.map((row) => ({ type: "FAMILY", id: String(row.id), label: `${stringValue(row.code)} · ${stringValue(row.name)}` })),
    ...snapshot.models.map((row) => ({ type: "MODEL", id: String(row.id), label: `${stringValue(row.model_code)} · ${stringValue(row.name)}` })),
    ...snapshot.skus.map((row) => ({ type: "SKU", id: String(row.id), label: `${stringValue(row.sku_code)} · ${stringValue(row.name)}` })),
    ...snapshot.batches.map((row) => ({ type: "BATCH", id: String(row.id), label: stringValue(row.batch_number) })),
    ...snapshot.items.map((row) => ({ type: "ITEM", id: String(row.id), label: stringValue(row.serial_number) })),
  ];
  const [subject, setSubject] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [resolutionState, setResolutionState] = useState("OVERRIDE");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<ActionState>({ kind: "idle", message: "" });
  const field = snapshot.fields.find((row) => row.id === fieldId);
  const allowed = context.capabilities.includes("product.edit");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const [subject_type, subject_id] = subject.split(":");
    if (!allowed || !subject_type || !subject_id || !field) return;
    setState({ kind: "working", message: locale === "zh" ? "正在保存规范化声明…" : "Saving canonical claim…" });
    let value_json: unknown = null;
    if (resolutionState === "OVERRIDE") {
      try { value_json = JSON.parse(value); } catch { value_json = value; }
    }
    const payload = {
      subject_type, subject_id, field_definition_id: field.id, schema_version_id: field.schema_version_id,
      resolution_state: resolutionState, value_json, canonical_unit: unit || field.unit_code || null,
      applicability_reason: reason || null,
      evidence_references: evidence.split(",").map((item) => item.trim()).filter(Boolean),
      raw_value_reference: resolutionState === "OVERRIDE" ? { value: value_json, enteredThrough: "BACKOFFICE_MANUAL" } : null,
    };
    const response = await fetch("/api/v2/canonical-claims", { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    setState({ kind: response.ok ? "success" : "error", message: response.ok ? (locale === "zh" ? "声明已保存，并记录来源与审计信息。" : "Claim saved with provenance and audit context.") : String(body?.error?.message || body?.message || "Claim creation failed") });
    if (response.ok) { setValue(""); setEvidence(""); setReason(""); onRefresh(); }
  }
  return <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]"><Panel title={locale === "zh" ? "手工 DPP 数据录入" : "Manual DPP data entry"} subtitle={locale === "zh" ? "所有写入绑定当前租户，并保留规范化状态、证据与来源。" : "Every write is bound to the active Tenant and preserves canonical state, evidence, and provenance."}><form onSubmit={(event) => void submit(event)} className="grid gap-4">
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "产品对象" : "Product subject"}<select required value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case"><option value="">—</option>{subjects.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{item.type} · {item.label}</option>)}</select></label>
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "字段" : "Canonical field"}<select required value={fieldId} onChange={(event) => setFieldId(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case"><option value="">—</option>{snapshot.fields.map((item) => <option key={String(item.id)} value={String(item.id)}>{stringValue(item.field_code)} · {stringValue(locale === "zh" ? item.label_zh || item.label_en : item.label_en)}</option>)}</select></label>
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "解析状态" : "Resolution state"}<select value={resolutionState} onChange={(event) => setResolutionState(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case">{["INHERIT","OVERRIDE","CLEAR","NOT_APPLICABLE","UNKNOWN"].map((item) => <option key={item}>{item}</option>)}</select></label>
    {resolutionState === "OVERRIDE" && <><label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "值（文本或 JSON）" : "Value (text or JSON)"}<textarea required value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 min-h-24 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" /></label><label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "单位" : "Unit"}<input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder={stringValue(field?.unit_code)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" /></label></>}
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "证据引用（逗号分隔）" : "Evidence references (comma-separated)"}<input value={evidence} onChange={(event) => setEvidence(event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" /></label>
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "适用性说明" : "Applicability reason"}<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" /></label>
    <button disabled={!allowed || state.kind === "working"} className="min-h-11 bg-slate-950 px-4 text-sm font-black text-white disabled:bg-slate-300">{locale === "zh" ? "保存声明" : "Save claim"}</button>
    {state.message && <p className={`text-sm font-bold ${state.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}
  </form></Panel><ClaimWorkspace snapshot={snapshot} query="" empty={locale === "zh" ? "暂无声明" : "No claims"} /></div>;
}

export function BackofficeConsole({ section: requested = "dashboard", modelId }: Props) {
  const { locale } = useLanguage(); const copy = backofficeCopy[locale];
  const router = useRouter(); const searchParams = useSearchParams();
  const section = isBackofficeSection(requested) ? requested : "dashboard";
  const [contexts, setContexts] = useState<BackofficeContext[]>([]); const [selectedId, setSelectedId] = useState(""); const [snapshot, setSnapshot] = useState<BackofficeSnapshot | null>(null); const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [query, setQuery] = useState("");
  const selected = contexts.find((item) => item.tenantId === selectedId) || contexts[0];
  const refresh = useCallback(async (activeToken = token, tenantId = selected?.tenantId) => {
    if (!activeToken || !tenantId) return; setLoading(true); setError("");
    const response = await fetch("/api/v2/backoffice/snapshot", { headers: { Authorization: `Bearer ${activeToken}`, "x-tenant-id": tenantId }, cache: "no-store" });
    const body = await response.json().catch(() => ({})); if (!response.ok) { setError(String(body?.error?.message || copy.accessDenied)); setLoading(false); return; }
    setSnapshot(body.data); setLoading(false);
  }, [copy.accessDenied, selected?.tenantId, token]);
  useEffect(() => { let live = true; void (async () => { const { data: { session } } = await createSupabaseClient().auth.getSession(); if (!live || !session) return; setToken(session.access_token); const response = await fetch("/api/v2/backoffice/context", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" }); const body = await response.json().catch(() => ({})); if (!live) return; const next: BackofficeContext[] = (response.ok ? body.data || [] : []).filter((item: BackofficeContext) => item.authorityType === "TENANT" || item.authorityType === "PLATFORM"); setContexts(next); const requestedTenant = searchParams.get("tenant"); const preferred = next.find((item) => item.tenantCode === requestedTenant || item.tenantId === requestedTenant) || next.find((item) => item.tenantCode === "greanlean-reference-mobility") || next[0]; if (!preferred) { setError(copy.accessDenied); setLoading(false); return; } setSelectedId(preferred.tenantId); await refresh(session.access_token, preferred.tenantId); })(); return () => { live = false; }; }, [copy.accessDenied, refresh, searchParams]);
  useEffect(() => { if (token && selectedId) void refresh(token, selectedId); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  const title = backofficeNavigation.find((item) => item.section === section)?.label[locale] || copy.productName;
  const rows = useMemo(() => { if (!snapshot) return []; const key = sectionData[section]; if (!key) return []; const value = snapshot[key]; return Array.isArray(value) ? value as BackofficeRow[] : []; }, [section, snapshot]);
  if (loading && !snapshot) return <div className="grid min-h-[55vh] place-items-center"><p className="font-bold text-slate-500">{copy.loading}</p></div>;
  if (!snapshot || !selected) return <div className="border border-red-200 bg-red-50 p-6 text-red-900"><p className="font-black">{copy.accessDenied}</p><p className="mt-2 text-sm">{error}</p></div>;
  const render = () => {
    if (modelId) return <ModelPage snapshot={snapshot} modelId={modelId} locale={locale} />;
    if (section === "dashboard") return <Dashboard snapshot={snapshot} locale={locale} />;
    if (section === "imports") return <ImportWorkspace snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />;
    if (section === "manual") return <ManualClaimWorkspace snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />;
    if (section === "reviews") return <ReviewWorkspace snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />;
    if (section === "claims") return <ClaimWorkspace snapshot={snapshot} query={query} empty={copy.noData} />;
    if (section === "tenants") return <div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "租户边界" : "Tenant boundary"}><DataTable rows={[snapshot.tenant]} keys={["code", "name", "status", "residency_policy"]} query={query} empty={copy.noData} /></Panel><Panel title={locale === "zh" ? "成员与合作伙伴授权" : "Memberships and partner authority"}><DataTable rows={[...snapshot.memberships, ...snapshot.partnerAuthorizations]} keys={["role_id", "permission_profile_id", "status", "valid_until"]} query={query} empty={copy.noData} /></Panel></div>;
    if (section === "audiences") return <div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "字段访问策略" : "Field access policy"}><DataTable rows={snapshot.accessPolicies} keys={["policy_code", "access_level_code", "purpose_required", "status"]} query={query} empty={copy.noData} /></Panel><Panel title={locale === "zh" ? "受众预览边界" : "Audience preview boundary"}><p className="text-sm leading-6 text-slate-600">{locale === "zh" ? "公开、客户、合作伙伴、审计员和监管机构视图由服务端访问策略裁剪。控制台不会把隐藏字段下载到未经授权的浏览器。" : "Public, customer, partner, auditor, and regulator views are filtered by server-side access policy. Hidden fields are not downloaded to an unauthorised browser."}</p></Panel></div>;
    if (section === "settings") return <div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "当前授权" : "Current authority"}><dl className="space-y-3 text-sm">{[["Tenant", selected.tenantName], ["Role", selected.roleName], ["Authority", selected.authorityType], ["Capabilities", selected.capabilities.join(", ")]].map(([key, value]) => <div key={key}><dt className="font-black text-slate-500">{key}</dt><dd className="mt-1 break-words text-slate-900">{value}</dd></div>)}</dl></Panel><Panel title={locale === "zh" ? "操作保护" : "Operational safeguards"}><ul className="space-y-2 text-sm text-slate-600"><li>• Tenant is resolved from verified server-side authority.</li><li>• Writes require capability checks and idempotency keys.</li><li>• Credentials and secrets are never returned in this view.</li><li>• Synthetic data is labelled and isolated in PreProd.</li></ul></Panel></div>;
    if (section === "documents") { const docs = snapshot.sourceRecords.flatMap((row) => { const payload = row.payload_json as Record<string, unknown> | undefined; return Array.isArray(payload?.documents) ? payload.documents as BackofficeRow[] : []; }); return <Panel title={title}><DataTable rows={docs} keys={["type", "name", "status", "url"]} query={query} empty={copy.noData} /></Panel>; }
    if (section === "lifecycle") { const events = snapshot.sourceRecords.flatMap((row) => { const payload = row.payload_json as Record<string, unknown> | undefined; return Array.isArray(payload?.lifecycle_events) ? payload.lifecycle_events as BackofficeRow[] : []; }); return <Panel title={title}><DataTable rows={events} keys={["event_type", "occurred_at", "location", "status"]} query={query} empty={copy.noData} /></Panel>; }
    if (section === "mappings") return <div className="grid gap-6 xl:grid-cols-2"><Panel title={title}><DataTable rows={snapshot.mappingProfiles.map((row) => ({ ...row, readiness: mappingStatus(row) }))} keys={["name", "status", "readiness", "data_source_id"]} query={query} empty={copy.noData} /></Panel><Panel title={locale === "zh" ? "映射规则" : "Mapping rules"}><DataTable rows={snapshot.mappingRules} keys={["source_path", "target_field_definition_id", "confidence", "status"]} query={query} empty={copy.noData} /></Panel></div>;
    if (["organisations", "families", "models", "skus", "batches", "items", "sources"].includes(section)) return <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><Panel title={title} subtitle={`${rows.length} ${locale === "zh" ? "条记录" : "records"}`}><DataTable rows={rows} keys={columns[section] || ["id", "status", "created_at"]} query={query} empty={copy.noData} />{section === "models" && <div className="mt-4 flex flex-wrap gap-2">{snapshot.models.map((model) => <Link key={String(model.id)} href={`/dashboard/v2/models/${model.id}?lang=${locale}`} className="border border-slate-300 px-3 py-2 text-xs font-black hover:bg-slate-50">{locale === "zh" ? "打开" : "Open"} {stringValue(model.name)}</Link>)}</div>}</Panel><CreateRecordPanel section={section} snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} /></div>;
    return <Panel title={title} subtitle={`${rows.length} ${locale === "zh" ? "条记录" : "records"}`}><DataTable rows={rows} keys={columns[section] || ["id", "status", "created_at"]} query={query} empty={copy.noData} /></Panel>;
  };
  return <div className="mx-auto max-w-[1600px] space-y-5">
    <header className="border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">{copy.productName}</p><Status value={selected.authorityType === "PLATFORM" ? (locale === "zh" ? "平台管理员" : "Platform Admin") : copy.synthetic} /></div><h1 className="mt-2 text-2xl font-black">{title}</h1><p className="mt-1 text-sm font-semibold text-slate-500">{locale === "zh" ? "当前租户" : "Active Tenant"}: <span className="font-black text-slate-950">{selected.tenantName}</span> · {selected.roleName}</p><nav aria-label={locale === "zh" ? "实用链接" : "Utility links"} className="mt-3 flex flex-wrap gap-3 text-sm font-black"><Link href={`/?lang=${locale}`} className="text-emerald-700 hover:text-emerald-900">{locale === "zh" ? "返回官网" : "Back to website"}</Link>{selected.authorityType === "PLATFORM" && <Link href={`/dashboard/platform?lang=${locale}`} className="text-emerald-700 hover:text-emerald-900">{locale === "zh" ? "返回平台控制台" : "Back to Platform console"}</Link>}<Link href={localizedPath(PRIMARY_V2_DEMO_PATH, locale)} className="text-emerald-700 hover:text-emerald-900">{locale === "zh" ? "查看公开 Demo" : "View public Demo"}</Link></nav></div><div className="flex flex-wrap gap-2"><select aria-label="Tenant" value={selected.tenantId} onChange={(event) => { const next = contexts.find((item) => item.tenantId === event.target.value); if (!next) return; setSelectedId(next.tenantId); router.replace(`${window.location.pathname}?tenant=${encodeURIComponent(next.tenantCode)}&lang=${locale}`); }} className="border border-slate-300 bg-white px-3 py-2 text-sm font-bold">{contexts.map((item) => <option key={`${item.authorityType}-${item.authorityId}-${item.tenantId}`} value={item.tenantId}>{item.tenantName}</option>)}</select><input aria-label={copy.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="min-w-64 border border-slate-300 px-3 py-2 text-sm"/><button onClick={() => void refresh()} className="border border-slate-300 px-4 py-2 text-sm font-black">{copy.refresh}</button></div></div>
      <nav className="mt-5 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4">{backofficeNavigation.map((item) => <Link key={item.section} href={`/dashboard/v2/${item.section}?tenant=${encodeURIComponent(selected.tenantCode)}&lang=${locale}`} className={`whitespace-nowrap px-3 py-2 text-xs font-black ${item.section === section ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item.label[locale]}</Link>)}</nav>
    </header>
    {error && <div className="border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{error}</div>}
    {render()}
  </div>;
}
