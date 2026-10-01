"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";
import {
  backofficeCopy,
  backofficeNavigation,
  primaryBackofficeNavigation,
  advancedBackofficeNavigation,
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

const chineseValues: Record<string, string> = {
  ACTIVE: "启用", APPROVED: "已批准", ARCHIVED: "已归档", COMPLETED: "已完成", CURRENT: "当前",
  CURRENT_PUBLICATION: "当前已发布", DRAFT: "草稿", FAILED: "失败", IN_REVIEW: "审核中", ITEM: "单件产品",
  MANUFACTURER: "制造商", BRAND_OWNER: "品牌方", SUPPLIER: "供应商", IMPORTER: "进口商", RECYCLER: "回收商",
  CERTIFIER: "认证机构", CELL_SUPPLIER: "电芯供应商", BMS_SUPPLIER: "BMS 供应商", PACK_MANUFACTURER: "电池包制造商",
  NOT_APPLICABLE: "不适用", NOT_READY: "未就绪", PASS: "通过", PRODUCTION: "生产环境", PUBLISHED: "已发布",
  READY_FOR_REVIEW: "可提交审核", READY_WITH_WARNINGS: "已就绪（有提示）", REJECTED: "已驳回", VALID: "有效",
  BLOCKING: "阻断", WARNING: "警告", INFO: "信息", MAPPED: "已映射", UNMAPPED: "未映射",
  REFERENCE_DATA: "参考数据", "Platform Operator": "平台运营人员", PLATFORM_OPERATOR: "平台运营人员",
  HARDWARE: "五金产品", TEXTILE: "纺织品", BATTERY: "电池", ELECTRONICS: "电子产品", FURNITURE: "家具",
  "E-BIKE": "电动自行车", EBIKE: "电动自行车", BICYCLE: "自行车", FOOTWEAR: "鞋类",
  "E-bike battery pack": "电动自行车电池包", "Industrial energy storage": "工业储能", "Textile garment": "纺织服装",
  "Consumer electronics": "消费电子产品", "Wood-plastic flooring": "木塑地板", "Hand tool": "手工具",
  READY_TO_PUBLISH: "可发布",
  "resolver_mapping.create": "创建解析映射", "publication.publish": "发布护照", "review.approve": "批准审核",
  "review.submit": "提交审核", "passport.create": "创建护照",
};

function displayValue(key: string, value: unknown, locale: "en" | "zh") {
  const raw = stringValue(value);
  if (locale === "zh") {
    if (chineseValues[raw]) return chineseValues[raw];
    if (raw.includes("(Synthetic)")) return raw.replace("(Synthetic)", "（参考数据）");
    if (key === "name" || key === "product_category") {
      const categoryTokens: Record<string, string> = { HARDWARE: "五金产品", TEXTILE: "纺织品", BATTERY: "电池", ELECTRONICS: "电子产品", FURNITURE: "家具", EBIKE: "电动自行车", BICYCLE: "自行车", FOOTWEAR: "鞋类" };
      const localized = Object.entries(categoryTokens).reduce((label, [token, translated]) => label.replace(new RegExp(`\\b${token}\\b`, "g"), translated), raw.replace(/\bDemo\b/g, "参考数据"));
      if (localized !== raw) return localized;
    }
  }
  if (/(?:_at|date|window_end)$/.test(key) && raw !== "—") {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
  return raw;
}

function localizedEmpty(empty: string, locale: "en" | "zh") {
  if (locale !== "zh") return empty;
  const labels: Record<string, string> = {
    "No issues": "暂无问题", "No imports": "暂无导入记录", "No candidates": "暂无候选版本", "No SKUs": "暂无 SKU", "No batches": "暂无批次",
    "No items": "暂无单件产品", "No identifiers": "暂无标识符", "No data sources": "暂无数据源", "No claims": "暂无声明",
    "No passports": "暂无护照", "No history": "暂无历史记录", "No records": "暂无记录", "No recent activity": "暂无近期活动",
  };
  return labels[empty] || empty;
}

function statusTone(value: unknown) {
  const status = String(value || "").toUpperCase();
  if (["ACTIVE", "APPROVED", "PUBLISHED", "COMPLETED", "VALID", "PASS"].some((item) => status.includes(item))) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (["FAILED", "REJECTED", "BLOCKED", "WITHDRAWN", "ERROR"].some((item) => status.includes(item))) return "bg-red-50 text-red-800 ring-red-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function Status({ value }: { value: unknown }) {
  const { locale } = useLanguage();
  return <span className={`inline-flex px-2 py-1 text-[11px] font-black uppercase ring-1 ${statusTone(value)}`}>{displayValue("status", value, locale)}</span>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4"><h2 className="text-lg font-black text-slate-950">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
    {children}
  </section>;
}

function DataTable({ rows, keys, query, empty }: { rows: BackofficeRow[]; keys: string[]; query: string; empty: string }) {
  const { locale } = useLanguage();
  const filtered = rows.filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  if (!filtered.length) return <div className="border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-semibold text-slate-500">{localizedEmpty(empty, locale)}</div>;
  return <div className="overflow-x-auto border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-left text-sm">
    <thead className="bg-slate-50"><tr>{keys.map((key) => <th key={key} className="whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">{fieldLabel(key, locale)}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100">{filtered.map((row, index) => <tr key={String(row.id || index)} className="hover:bg-emerald-50/30">{keys.map((key) => <td key={key} className="max-w-xs truncate px-4 py-3 font-medium text-slate-700">{key.includes("status") || key === "state" || key === "result" || key === "candidate_readiness" ? <Status value={row[key]} /> : displayValue(key, row[key], locale)}</td>)}</tr>)}</tbody>
  </table></div>;
}

function fieldLabel(key: string, locale: "en" | "zh") {
  const english: Record<string, string> = {
    field: "Field", resolved_value: "Current value", canonical_unit: "Unit", resolution_state: "State",
    source: "Source", verification_status: "Verification", last_updated: "Updated", tenantName: "Tenant",
    model_code: "Model", passport_identifier: "DPP ID", subject_type: "Subject", currentVersion: "Version",
    publicationState: "Publication state", updated_at: "Updated", status: "Status", name: "Name", source_type: "Type",
    trust_level: "Trust level", file_format: "File format", created_at: "Created", committed_at: "Committed",
    readiness: "Readiness", candidate_readiness: "Publication status", content_hash: "Content hash", current: "Current", relation_type: "Responsibility",
    organisation_name: "Organisation name", schema_version_id: "Schema version ID", payload_hash: "Payload hash",
  };
  const chinese: Record<string, string> = {
    field: "字段名称", resolved_value: "当前值", canonical_unit: "单位", resolution_state: "状态",
    source: "数据来源", verification_status: "验证状态", last_updated: "更新时间", tenantName: "租户",
    model_code: "型号", passport_identifier: "DPP ID", subject_type: "主体", currentVersion: "版本",
    publicationState: "发布状态", updated_at: "更新时间", status: "状态", name: "名称", source_type: "类型",
    trust_level: "信任等级", file_format: "文件格式", created_at: "创建时间", committed_at: "提交时间",
    legal_name: "法定名称", trading_name: "商号", organisation_type: "企业主体类型", country: "国家或地区",
    code: "编码", description: "说明", product_category: "产品类别", sku_code: "SKU 编码", market: "市场",
    batch_number: "批次号", production_date: "生产日期", serial_number: "序列号", upi: "唯一产品标识",
    data_source_id: "数据来源", rule_code: "规则编码", rule_type: "规则类型", severity: "严重程度", message_en: "规则说明",
    generated_at: "生成时间", submitted_at: "提交时间", reviewed_at: "审核时间", version_number: "版本号",
    publication_state: "发布状态", registry_state: "注册状态", published_at: "发布时间", identifier_type: "标识类型",
    device_external_id: "设备外部标识", sample_count: "样本数", window_end: "窗口结束时间", algorithm_version: "算法版本",
    environment: "环境", last_successful_sync_at: "最近成功同步", operation: "操作", state: "状态", completed_at: "完成时间",
    event_type: "事件类型", result: "结果", correlation_id: "关联标识", access_level_code: "访问级别", purpose_required: "是否需要用途",
    readiness: "就绪状态", candidate_readiness: "发布状态", content_hash: "内容哈希", current: "当前版本", relation_type: "责任类型",
    organisation_name: "企业主体名称", schema_version_id: "Schema 版本 ID", payload_hash: "载荷哈希",
  };
  return (locale === "zh" ? chinese : english)[key] || key.replaceAll("_", " ");
}

function resolutionLabel(value: string, locale: "en" | "zh") {
  const labels: Record<string, string> = { INHERIT: "继承", OVERRIDE: "本级覆盖", CLEAR: "清空", NOT_APPLICABLE: "不适用", UNKNOWN: "未知" };
  return locale === "zh" ? labels[value] || value : value;
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
      <Panel title={labels.readiness}><div className="space-y-3">{snapshot.passports.map((passport) => <div key={String(passport.id)} className="flex items-center justify-between border-b border-slate-100 pb-3"><div><p className="font-bold">{stringValue(passport.passport_identifier)}</p><p className="text-xs text-slate-500">{displayValue("subject_type", passport.subject_type, locale)}</p></div><Status value={readinessForPassport(snapshot, passport)} /></div>)}</div></Panel>
      <Panel title={labels.activity}><DataTable rows={[...snapshot.publicationAudit, ...snapshot.connectorAudit].slice(0, 8)} keys={["event_type", "result", "created_at"]} query="" empty={locale === "zh" ? "暂无近期活动" : "No recent activity"} /></Panel>
    </div>
  </div>;
}

function ModelPage({ snapshot, modelId, locale, tenantCode, context, token, onRefresh }: { snapshot: BackofficeSnapshot; modelId: string; locale: "en" | "zh"; tenantCode: string; context?: BackofficeContext; token?: string; onRefresh?: () => void }) {
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
  const organisation = snapshot.organisations.find((row) => row.id === model.manufacturer_organisation_id);
  const modelClaims = claims.filter((claim) => claim.subject_id === modelId);
  const currentPassport = passports.find((passport) => readinessForPassport(snapshot, passport) === "PUBLISHED") || passports[0];
  const currentPublicationState = currentPassport ? readinessForPassport(snapshot, currentPassport) : "NOT_READY";
  const passportIds = new Set(passports.map((passport) => String(passport.id)));
  const latestPublishedAt = snapshot.versions.filter((version) => passportIds.has(String(version.passport_id)) && version.publication_state === "PUBLISHED").map((version) => new Date(String(version.published_at || 0)).getTime()).reduce((latest, timestamp) => Math.max(latest, timestamp), 0);
  const candidateReview = snapshot.reviews.find((review) => passportIds.has(String(review.passport_id)) && new Date(String(review.generated_at || review.created_at || 0)).getTime() > latestPublishedAt);
  const candidateReadiness = candidateReview ? (candidateReview.status === "APPROVED" ? "READY_TO_PUBLISH" : candidateReview.status === "IN_REVIEW" ? "READY_FOR_REVIEW" : candidateReview.status) : "NOT_READY";
  const responsibilityRows = snapshot.productOrganisationRelations.filter((row) => row.product_model_id === modelId).map((row) => ({
    ...row,
    organisation_name: snapshot.organisations.find((organisation) => organisation.id === row.organisation_id)?.legal_name || "—",
  }));
  return <div className="space-y-6">
    <Panel title={stringValue(model.name)} subtitle={`${stringValue(model.model_code)} · ${displayValue("product_category", model.product_category, locale)}`}>
      <div className="mb-3 flex flex-wrap gap-2">{tenantCode === "greanlean-reference-mobility" && <Status value="REFERENCE_DATA" />}</div>
      <div className="grid gap-4 sm:grid-cols-5">{[[locale === "zh" ? "状态" : "Status", model.status], [locale === "zh" ? "制造商" : "Manufacturer", organisation?.legal_name || "—"], [locale === "zh" ? "声明" : "Claims", modelClaims.length], [locale === "zh" ? "当前发布状态" : "Current publication status", currentPublicationState], [locale === "zh" ? "候选就绪度" : "Candidate readiness", candidateReadiness]].map(([label, value]) => <div key={String(label)} className="bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">{String(label)}</p><p className="mt-2 font-black">{displayValue("status", value, locale)}</p></div>)}</div>
    </Panel>
    <Panel title={locale === "zh" ? "责任主体" : "Responsible organisations"} subtitle={locale === "zh" ? "当前租户内可复用的企业主体；删除时保留依赖和发布保护。" : "Reusable Organisations in the active Tenant; dependencies and published data stay delete-protected."}>
      <DataTable rows={responsibilityRows} keys={["relation_type", "organisation_name", "sku_id", "status"]} query="" empty={locale === "zh" ? "尚未配置额外责任主体" : "No additional responsibility relationships"} />
      {context && token && onRefresh ? <ProductOrganisationActions snapshot={snapshot} modelId={modelId} context={context} token={token} locale={locale} onRefresh={onRefresh} /> : <p className="mt-3 text-xs text-slate-500">{locale === "zh" ? "在产品中心中管理责任主体。" : "Manage responsible parties from Product Center."}</p>}
    </Panel>
    <div className="grid gap-6 xl:grid-cols-2"><Panel title="SKUs"><DataTable rows={related.skus} keys={["sku_code", "name", "market", "status"]} query="" empty="No SKUs" /></Panel><Panel title={locale === "zh" ? "批次" : "Batches"}><DataTable rows={related.batches} keys={["batch_number", "production_date", "status"]} query="" empty="No batches" /></Panel></div>
    <Panel title={locale === "zh" ? "单件与护照关联" : "Items and passport coverage"}><DataTable rows={related.items} keys={["serial_number", "upi", "sku_id", "batch_id", "status"]} query="" empty="No items" /></Panel>
    <div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "标识符" : "Identifiers"}><DataTable rows={identifiers} keys={["identifier_type", "value", "subject_type", "status"]} query="" empty="No identifiers" /></Panel><Panel title={locale === "zh" ? "数据源" : "Data sources"}><DataTable rows={dataSources} keys={["name", "source_type", "trust_level", "status"]} query="" empty="No data sources" /></Panel></div>
    <div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "声明与验证" : "Claims and validation"}><DataTable rows={claims} keys={["subject_type", "resolution_state", "verification_status", "canonical_unit"]} query="" empty="No claims" /></Panel><Panel title={locale === "zh" ? "护照状态" : "Passport status"}><DataTable rows={passports} keys={["passport_identifier", "subject_type", "status", "updated_at"]} query="" empty="No passports" /></Panel></div>
    <Panel title={locale === "zh" ? "来源与审计历史" : "Source and audit history"}><DataTable rows={[...sourceRecords, ...snapshot.publicationAudit.filter((row) => passports.some((passport) => passport.id === row.passport_id))]} keys={["subject_type", "status", "event_type", "received_at", "created_at"]} query="" empty="No history" /></Panel>
  </div>;
}

function ProductOrganisationActions({ snapshot, modelId, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; modelId: string; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const [organisationId, setOrganisationId] = useState(""); const [relationType, setRelationType] = useState("MANUFACTURER"); const [message, setMessage] = useState("");
  const relations = snapshot.productOrganisationRelations.filter((row) => row.product_model_id === modelId);
  async function write(path: string, method: string, payload?: BackofficeRow) { const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined }); const body = await response.json().catch(() => ({})); setMessage(response.ok ? (locale === "zh" ? "责任主体已保存。" : "Responsible party saved.") : String(body?.error?.message || "Relationship operation failed.")); if (response.ok) onRefresh(); }
  return <div className="mt-4 border-t border-slate-100 pt-4"><div className="grid gap-2 sm:grid-cols-3"><select value={organisationId} onChange={(event) => setOrganisationId(event.target.value)} className="border border-slate-300 px-3 py-2 text-sm"><option value="">{locale === "zh" ? "选择企业主体" : "Select Organisation"}</option>{snapshot.organisations.filter((row) => row.status === "ACTIVE").map((row) => <option key={String(row.id)} value={String(row.id)}>{stringValue(row.legal_name || row.trading_name)}</option>)}</select><select value={relationType} onChange={(event) => setRelationType(event.target.value)} className="border border-slate-300 px-3 py-2 text-sm">{["MANUFACTURER","BRAND_OWNER","SUPPLIER","IMPORTER","RECYCLER","CERTIFIER","CELL_SUPPLIER","BMS_SUPPLIER","PACK_MANUFACTURER"].map((value) => <option key={value} value={value}>{displayValue("relation_type", value, locale)}</option>)}</select><button disabled={!organisationId || !context.capabilities.includes("product.edit")} onClick={() => void write("/api/v2/product-organisation-relations", "POST", { product_model_id: modelId, organisation_id: organisationId, relation_type: relationType, status: "ACTIVE" })} className="bg-slate-950 px-3 py-2 text-sm font-black text-white disabled:bg-slate-300">{locale === "zh" ? "添加主体" : "Add party"}</button></div><div className="mt-3 space-y-1">{relations.map((relation) => <div key={String(relation.id)} className="flex items-center justify-between text-xs"><span>{displayValue("relation_type", relation.relation_type, locale)} · {stringValue(snapshot.organisations.find((row) => row.id === relation.organisation_id)?.legal_name)}</span><div className="flex gap-2"><button onClick={() => void write(`/api/v2/product-organisation-relations/${relation.id}`, "PATCH", { status: "ARCHIVED" })} className="font-black text-amber-800">{locale === "zh" ? "解除" : "Unlink"}</button><button onClick={() => void write(`/api/v2/product-organisation-relations/${relation.id}`, "DELETE")} className="font-black text-red-700">{locale === "zh" ? "删除" : "Delete"}</button></div></div>)}</div>{message && <p className="mt-2 text-xs font-bold text-slate-600">{message}</p>}</div>;
}

function ProductCenter({ snapshot, context, token, locale, tenantCode, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; tenantCode: string; onRefresh: () => void }) {
  const [selectedModelId, setSelectedModelId] = useState(String(snapshot.models[0]?.id || ""));
  const selected = snapshot.models.find((row) => String(row.id) === selectedModelId);
  const families = snapshot.families;
  return <div className="space-y-6">
    <div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">{locale === "zh" ? "产品运营" : "Product operations"}</p>{tenantCode === "greanlean-reference-mobility" && <Status value="REFERENCE_DATA" />}</div><h1 className="mt-2 text-3xl font-black text-[#133f38]">{locale === "zh" ? "产品中心" : "Product Center"}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{locale === "zh" ? "沿着产品族 → 产品型号 → SKU / 批次 → 单件产品浏览。数据库仍保持 SKU 与批次为并行的型号维度。" : "Browse Family → Model → SKU / Batch → Individual. The database keeps SKU and Batch as parallel Model-owned dimensions."}</p></div>
    <div className="grid gap-6 xl:grid-cols-2"><CreateRecordPanel section="models" snapshot={snapshot} context={context} token={token} locale={locale} onRefresh={onRefresh} /><CrudActionPanel section="models" rows={snapshot.models} context={context} token={token} locale={locale} onRefresh={onRefresh} /></div>
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label={locale === "zh" ? "产品树" : "Product tree"}><p className="text-xs font-black uppercase tracking-wide text-slate-500">{locale === "zh" ? "产品树" : "Product tree"}</p><div className="mt-3 space-y-4">{families.length ? families.map((family) => <div key={String(family.id)}><p className="text-sm font-black text-slate-900">{displayValue("name", family.name, locale)}</p><div className="mt-2 space-y-1 border-l border-slate-200 pl-3">{snapshot.models.filter((row) => row.family_id === family.id).map((model) => { const relation = modelRelationships(snapshot, String(model.id)); return <button key={String(model.id)} onClick={() => setSelectedModelId(String(model.id))} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${String(model.id) === selectedModelId ? "bg-emerald-50 font-black text-[#134d44]" : "font-semibold text-slate-600 hover:bg-slate-50"}`}><span className="block truncate">{stringValue(model.name)}</span><span className="mt-1 block text-[11px] font-semibold text-slate-400">{relation.skus.length} SKU · {relation.batches.length} {locale === "zh" ? "批次" : "batches"} · {relation.items.length} {locale === "zh" ? "单件" : "items"}</span></button>; })}</div></div>) : <p className="text-sm text-slate-500">{locale === "zh" ? "暂无产品族，直接从型号开始。" : "No families; start from a model."}</p>}{snapshot.models.filter((row) => !row.family_id).map((model) => <button key={String(model.id)} onClick={() => setSelectedModelId(String(model.id))} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${String(model.id) === selectedModelId ? "bg-emerald-50 font-black text-[#134d44]" : "font-semibold text-slate-600 hover:bg-slate-50"}`}>{stringValue(model.name)}</button>)}</div></aside>
      <div className="min-w-0">{selected ? <ModelPage snapshot={snapshot} modelId={String(selected.id)} locale={locale} tenantCode={tenantCode} context={context} token={token} onRefresh={onRefresh} /> : <Panel title={locale === "zh" ? "选择产品型号" : "Select a product model"}><p className="text-sm text-slate-500">{locale === "zh" ? "从左侧产品树选择一个型号。" : "Choose a model from the product tree."}</p></Panel>}</div>
    </div>
  </div>;
}

function BatchSkuLinkPanel({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const [values, setValues] = useState({ model_id: "", batch_id: "", sku_id: "" });
  const [state, setState] = useState<ActionState>({ kind: "idle", message: "" });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!values.model_id || !values.batch_id || !values.sku_id) return;
    setState({ kind: "working", message: locale === "zh" ? "正在建立批次-SKU 关系…" : "Creating batch-SKU relationship…" });
    const response = await fetch("/api/v2/batch-sku-links", { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: JSON.stringify({ ...values, status: "ACTIVE" }) });
    const body = await response.json().catch(() => ({}));
    setState({ kind: response.ok ? "success" : "error", message: response.ok ? (locale === "zh" ? "关系已保存。" : "Relationship saved.") : String(body?.error?.message || body?.message || "Relationship failed") });
    if (response.ok) { setValues({ model_id: "", batch_id: "", sku_id: "" }); onRefresh(); }
  }
  return <Panel title={locale === "zh" ? "批次-SKU 关系" : "Batch–SKU relationship"} subtitle={locale === "zh" ? "SKU 与批次是并行的 Model-owned 维度；服务端会再次校验同一租户与型号。" : "SKU and Batch remain parallel Model-owned dimensions; the server re-checks Tenant and Model integrity."}>
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-3">
      <select required value={values.model_id} onChange={(event) => setValues((current) => ({ ...current, model_id: event.target.value }))} className="border border-slate-300 px-3 py-2 text-sm"><option value="">Model</option>{snapshot.models.map((row) => <option key={String(row.id)} value={String(row.id)}>{stringValue(row.name)}</option>)}</select>
      <select required value={values.batch_id} onChange={(event) => setValues((current) => ({ ...current, batch_id: event.target.value }))} className="border border-slate-300 px-3 py-2 text-sm"><option value="">Batch</option>{snapshot.batches.filter((row) => !values.model_id || row.model_id === values.model_id).map((row) => <option key={String(row.id)} value={String(row.id)}>{stringValue(row.batch_number)}</option>)}</select>
      <select required value={values.sku_id} onChange={(event) => setValues((current) => ({ ...current, sku_id: event.target.value }))} className="border border-slate-300 px-3 py-2 text-sm"><option value="">SKU</option>{snapshot.skus.filter((row) => !values.model_id || row.model_id === values.model_id).map((row) => <option key={String(row.id)} value={String(row.id)}>{stringValue(row.sku_code)}</option>)}</select>
      <button disabled={!context.capabilities.includes("product.edit") || state.kind === "working"} className="bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300 sm:col-span-3">{locale === "zh" ? "保存关系" : "Save relationship"}</button>
    </form>{state.message && <p className={`mt-3 text-sm font-bold ${state.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}
    <DataTable rows={snapshot.batchSkuLinks} keys={["model_id", "batch_id", "sku_id", "status"]} query="" empty={locale === "zh" ? "暂无关系" : "No relationships"} />
  </Panel>;
}

function ImportWorkspace({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState(""); const [normalizedFormat, setNormalizedFormat] = useState("CSV"); const [action, setAction] = useState<ActionState>({ kind: "idle", message: "" });
  const canImport = context.capabilities.includes("import.create");
  async function choose(selected?: File) {
    if (!selected) return;
    if (!/\.(csv|xlsx)$/i.test(selected.name)) { setAction({ kind: "error", message: locale === "zh" ? "仅允许 CSV 或 XLSX 文件。" : "Only CSV and XLSX files are allowed." }); return; }
    if (selected.size > 10 * 1024 * 1024) { setAction({ kind: "error", message: locale === "zh" ? "文件超过 10MB 安全上限。" : "File exceeds the 10MB safety limit." }); return; }
    setFile(selected);
    if (/\.csv$/i.test(selected.name)) { setNormalizedFormat("CSV"); setPreview((await selected.text()).slice(0, 12000)); return; }
    setAction({ kind: "working", message: locale === "zh" ? "正在安全读取 Excel 第一张工作表…" : "Safely reading the first Excel worksheet…" });
    try {
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      await workbook.xlsx.load(await selected.arrayBuffer());
      if (workbook.worksheets.length > 20) throw new Error("Workbook has too many worksheets.");
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
  return <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><Panel title={locale === "zh" ? "文件导入" : "File import"} subtitle={locale === "zh" ? "仅 CSV/XLSX，最大 10MB；先预检，再明确提交。生产环境保持关闭。" : "CSV/XLSX only, max 10MB; preflight first, explicit commit second. Production remains off."}>
    <label className="block cursor-pointer border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center"><span className="font-black">{file?.name || (locale === "zh" ? "选择 CSV/XLSX 文件" : "Choose a CSV/XLSX file")}</span><input className="sr-only" type="file" accept=".csv,.json,.xlsx" onChange={(event) => void choose(event.target.files?.[0])} /></label>
    {preview && <pre className="mt-4 max-h-56 overflow-auto bg-slate-950 p-4 text-xs text-emerald-200">{preview}</pre>}
    <button disabled={!file || !canImport || action.kind === "working"} onClick={() => void preflight()} className="mt-4 bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{locale === "zh" ? "运行安全预检" : "Run safe preflight"}</button>
    {action.message && <p className={`mt-3 text-sm font-bold ${action.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{action.message}</p>}
  </Panel><Panel title={locale === "zh" ? "导入历史" : "Import history"}><DataTable rows={snapshot.importSessions} keys={["file_format", "status", "created_at", "committed_at"]} query="" empty="No imports" /></Panel></div>;
}

function ReviewWorkspace({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const [state, setState] = useState<ActionState>({ kind: "idle", message: "" });
  const [details, setDetails] = useState<Record<string, BackofficeRow>>({});
  async function loadDetails(id: string) {
    const response = await fetch(`/api/v2/passport-reviews/${id}`, { headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId }, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok) setDetails((current) => ({ ...current, [id]: body.data || body }));
  }
  async function mutate(path: string, payload: BackofficeRow) {
    setState({ kind: "working", message: locale === "zh" ? "正在执行…" : "Working…" });
    const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({})); const result = body?.data || body; const published = path === "/api/v2/publications" && response.ok; setState({ kind: response.ok ? "success" : "error", message: response.ok ? (published ? `${locale === "zh" ? "PUBLISHED · 版本" : "PUBLISHED · Version"} ${String(result?.version_number || result?.versionNumber || "—")} · ${String(result?.payload_hash || result?.payloadHash || "")}` : (locale === "zh" ? "操作完成。" : "Action completed.")) : String(body?.error?.message || body?.message || "Action failed") }); if (response.ok) onRefresh();
  }
  return <div className="space-y-4">{state.message && <div className={`border p-3 text-sm font-bold ${state.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</div>}{snapshot.reviews.map((review) => { const passport = snapshot.passports.find((row) => row.id === review.passport_id); const detail = details[String(review.id)] || {}; const candidate = detail.candidate_payload && typeof detail.candidate_payload === "object" ? detail.candidate_payload as BackofficeRow : {}; const fields = Array.isArray(candidate.resolvedFields) ? candidate.resolvedFields as BackofficeRow[] : []; return <Panel key={String(review.id)} title={`${stringValue(passport?.passport_identifier || review.subject_type)} · ${stringValue(review.status)}`} subtitle={`${locale === "zh" ? "当前租户" : "Tenant"}: ${context.tenantName} · ${stringValue(review.generated_at)}`}>
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.3fr_.8fr]"><div><p className="text-xs font-black uppercase text-slate-500">{locale === "zh" ? "候选身份" : "Candidate identity"}</p><dl className="mt-2 space-y-2 text-sm"><div><dt className="text-slate-500">{locale === "zh" ? "产品 / 对象" : "Product / subject"}</dt><dd className="font-bold">{stringValue(review.subject_type)} · {stringValue(review.subject_id)}</dd></div><div><dt className="text-slate-500">DPP ID</dt><dd className="font-bold">{stringValue(passport?.passport_identifier)}</dd></div><div><dt className="text-slate-500">Schema</dt><dd className="font-mono text-xs">{stringValue(review.schema_version_id)}</dd></div><div><dt className="text-slate-500">Candidate hash</dt><dd className="break-all font-mono text-xs">{stringValue(review.candidate_hash)}</dd></div></dl></div><div><p className="text-xs font-black uppercase text-slate-500">{locale === "zh" ? "将要发布的内容" : "What will be published"}</p>{Object.keys(detail).length === 0 && <button onClick={() => void loadDetails(String(review.id))} className="mt-2 border border-slate-300 px-3 py-2 text-xs font-black">{locale === "zh" ? "加载候选详情" : "Load candidate detail"}</button>}<div className="mt-2 max-h-64 overflow-auto border border-slate-200"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Access / verification</th></tr></thead><tbody>{fields.map((field, index) => <tr key={String(field.fieldCode || index)} className="border-t border-slate-100"><td className="px-3 py-2 font-mono">{stringValue(field.fieldCode)}</td><td className="max-w-xs px-3 py-2">{stringValue(field.value)}</td><td className="px-3 py-2">{stringValue(field.accessLevel)} · {stringValue(field.verificationStatus)}</td></tr>)}</tbody></table></div></div><div><p className="text-xs font-black uppercase text-slate-500">{locale === "zh" ? "验证与来源" : "Validation and provenance"}</p><details className="mt-2"><summary className="cursor-pointer text-sm font-bold text-slate-700">{locale === "zh" ? "查看校验摘要" : "Validation summary"}</summary><pre className="mt-2 max-h-48 overflow-auto bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(review.validation_summary, null, 2)}</pre></details><p className="mt-3 text-xs text-slate-600">{locale === "zh" ? "字段访问级别、验证状态与证据引用来自冻结候选快照。" : "Field access, verification status, and evidence references come from the frozen candidate snapshot."}</p></div></div><div className="mt-4 flex flex-wrap items-start gap-2">
      {review.status === "IN_REVIEW" && <><button disabled={!context.capabilities.includes("dpp.approve")} onClick={() => void mutate(`/api/v2/passport-reviews/${review.id}/approve`, {})} className="bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Approve</button><button disabled={!context.capabilities.includes("dpp.request_changes")} onClick={() => void mutate(`/api/v2/passport-reviews/${review.id}/request-changes`, { reason: "Operator requested corrections" })} className="bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 disabled:bg-slate-300">Request changes</button><button disabled={!context.capabilities.includes("dpp.reject")} onClick={() => void mutate(`/api/v2/passport-reviews/${review.id}/reject`, { reason: "Operator rejected candidate" })} className="bg-red-700 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Reject</button></>}
      {review.status === "APPROVED" && <button disabled={!context.capabilities.includes("dpp.publish")} onClick={() => void mutate("/api/v2/publications", { review_task_id: review.id })} className="bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Publish</button>}
    </div>
  </Panel>; })}</div>;
}

function PublicationWorkspace({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const [state, setState] = useState<ActionState>({ kind: "idle", message: "" });
  async function withdraw(versionId: string) {
    if (!window.confirm(locale === "zh" ? "确认撤回当前版本？历史版本仍会保留。" : "Withdraw the current version? Immutable history will be preserved.")) return;
    setState({ kind: "working", message: locale === "zh" ? "正在撤回…" : "Withdrawing…" });
    const response = await fetch(`/api/v2/publications/${versionId}/withdraw`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: JSON.stringify({ reason_category: "OPERATOR_REQUEST" }) });
    const body = await response.json().catch(() => ({})); setState({ kind: response.ok ? "success" : "error", message: response.ok ? (locale === "zh" ? "版本已撤回，历史已保留。" : "Version withdrawn; history preserved.") : String(body?.error?.message || body?.message || "Withdraw failed") }); if (response.ok) onRefresh();
  }
  return <div className="space-y-6">{state.message && <div className={`border p-3 text-sm font-bold ${state.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</div>}<Panel title={locale === "zh" ? "发布中心" : "Publication Center"} subtitle={locale === "zh" ? "候选、校验、审核、批准、发布和不可变版本历史。公开 URL、解析服务与 QR 位于公开展示。" : "Candidate, validation, review, approval, publication, and immutable history. Public URL, Resolver, and QR are in Public Display."}><div className="grid grid-cols-3 gap-3">{[["待处理", snapshot.reviews.length], ["待批准", snapshot.reviews.filter((row) => row.status === "IN_REVIEW").length], ["已发布", snapshot.versions.filter((row) => row.publication_state === "PUBLISHED").length]].map(([label, count]) => <div key={String(label)} className="bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">{String(label)}</p><p className="mt-2 text-2xl font-black">{String(count)}</p></div>)}</div></Panel>{snapshot.passports.map((passport) => { const versions = snapshot.versions.filter((row) => row.passport_id === passport.id); const pointer = snapshot.currentPointers.find((row) => row.passport_id === passport.id); const current = versions.find((row) => row.id === pointer?.current_version_id); return <Panel key={String(passport.id)} title={stringValue(passport.passport_identifier)} subtitle={`${locale === "zh" ? "租户" : "Tenant"}: ${context.tenantName}`}><dl className="mb-3 grid gap-2 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">{locale === "zh" ? "版本" : "Version"}</dt><dd className="font-bold">{stringValue(current?.version_number)}</dd></div><div><dt className="text-slate-500">{locale === "zh" ? "状态" : "State"}</dt><dd><Status value={current?.publication_state} /></dd></div><div><dt className="text-slate-500">{locale === "zh" ? "候选版本／流程" : "Candidate / workflow"}</dt><dd className="font-bold">{displayValue("status", passport.status, locale)}</dd></div></dl><DataTable rows={versions.map((row) => ({ ...row, current: row.id === pointer?.current_version_id ? "CURRENT" : "" }))} keys={["version_number", "publication_state", "schema_version_id", "payload_hash", "published_at", "current"]} query="" empty={locale === "zh" ? "暂无版本" : "No versions"} />{current && current.publication_state === "PUBLISHED" && <button disabled={!context.capabilities.includes("dpp.withdraw")} onClick={() => void withdraw(String(current.id))} className="mt-3 border border-red-300 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-40">{locale === "zh" ? "撤回发布" : "Withdraw publication"}</button>}</Panel>; })}</div>;
}

function PublicDisplayWorkspace({ snapshot, locale }: { snapshot: BackofficeSnapshot; locale: "en" | "zh" }) {
  return <div className="space-y-6"><Panel title={locale === "zh" ? "公开展示" : "Public Display"} subtitle={locale === "zh" ? "公开 DPP 预览、公开 URL、解析服务、QR 与受众预览。不含候选、审核、批准或发布操作。" : "Public DPP preview, public URL, Resolver, QR and audience preview. No candidate, review, approval, or publishing operations."}>{snapshot.passports.map((passport) => { const url = `/p/${encodeURIComponent(String(passport.passport_identifier))}`; const mapping = snapshot.resolverMappings.find((row) => row.passport_id === passport.id); return <article key={String(passport.id)} className="mb-4 grid gap-4 border-b border-slate-100 pb-4 last:border-0 sm:grid-cols-[1fr_auto]"><div><p className="font-black">{stringValue(passport.passport_identifier)}</p><p className="mt-1 text-xs text-slate-500">{locale === "zh" ? "解析服务" : "Resolver"}: {stringValue(mapping?.host)}{stringValue(mapping?.normalized_path)}</p><div className="mt-3 flex flex-wrap gap-2"><Link href={`${url}?lang=${locale}`} target="_blank" className="border border-slate-300 px-3 py-2 text-xs font-black">{locale === "zh" ? "公开预览" : "Public preview"}</Link><button onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}${url}`)} className="border border-slate-300 px-3 py-2 text-xs font-black">{locale === "zh" ? "复制 URL" : "Copy URL"}</button></div></div><img src={`/api/v2/resolver/${encodeURIComponent(String(passport.passport_identifier))}?format=qr`} alt={`QR ${String(passport.passport_identifier)}`} width={112} height={112} className="border border-slate-200" /></article>; })}</Panel></div>;
}

type CreateField = { name: string; label: string; required?: boolean; options?: Array<{ value: string; label: string }> };

const chineseCreateFieldLabels: Record<string, string> = {
  legal_name: "法定名称", trading_name: "商号", organisation_type: "企业主体类型", country: "国家或地区",
  code: "产品族编码", name: "名称", description: "说明", family_id: "产品族（可选）", manufacturer_organisation_id: "生产企业主体",
  model_code: "型号编码", product_category: "产品类别", sector: "行业", model_id: "产品型号", sku_code: "SKU 编码",
  market: "市场", batch_number: "批次号", production_date: "生产日期", sku_id: "SKU（可选）", batch_id: "批次（可选）",
  serial_number: "序列号", upi: "HTTPS 唯一产品标识", source_type: "数据来源类型", trust_level: "信任等级",
};

function CreateRecordPanel({ section, snapshot, context, token, locale, onRefresh }: { section: BackofficeSection; snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const configurations: Partial<Record<BackofficeSection, { endpoint: string; capability: string; fields: CreateField[]; defaults?: BackofficeRow }>> = {
    organisations: { endpoint: "/api/v2/organisations", capability: "organisation.edit", fields: [{ name: "legal_name", label: "Legal name", required: true }, { name: "trading_name", label: "Trading name" }, { name: "organisation_type", label: "Organisation type", required: true, options: ["MANUFACTURER","SUPPLIER","BRAND_OWNER","IMPORTER","DISTRIBUTOR","RECYCLER","REPAIRER","CERTIFIER","ECONOMIC_OPERATOR","FACTORY_FACILITY"].map((value) => ({ value, label: value })) }, { name: "country", label: "Country" }], defaults: { status: "ACTIVE" } },
    families: { endpoint: "/api/v2/product-families", capability: "product.edit", fields: [{ name: "code", label: "Family code", required: true }, { name: "name", label: "Family name", required: true }, { name: "description", label: "Description" }], defaults: { status: "ACTIVE" } },
    models: { endpoint: "/api/v2/product-models", capability: "product.edit", fields: [{ name: "family_id", label: "Optional product family", options: snapshot.families.map((row) => ({ value: String(row.id), label: stringValue(row.name) })) }, { name: "manufacturer_organisation_id", label: "Manufacturer organisation", required: true, options: snapshot.organisations.map((row) => ({ value: String(row.id), label: stringValue(row.legal_name || row.trading_name) })) }, { name: "model_code", label: "Model code", required: true }, { name: "name", label: "Model name", required: true }, { name: "product_category", label: "Product category" }, { name: "sector", label: "Sector" }], defaults: { status: "ACTIVE" } },
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
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">{configuration.fields.map((field) => <label key={field.name} className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? chineseCreateFieldLabels[field.name] || field.label : field.label}{field.required ? " *" : ""}{field.options ? <select required={field.required} value={values[field.name] || ""} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case"><option value="">—</option>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input required={field.required} value={values[field.name] || ""} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" />}</label>)}</form>
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
  return <Panel title="护照字段总表" subtitle="标准化字段仍保留 INHERIT、OVERRIDE、CLEAR、NOT_APPLICABLE、UNKNOWN 等技术状态。"><DataTable rows={rows} keys={["field", "resolved_value", "canonical_unit", "resolution_state", "source", "verification_status", "last_updated"]} query={query} empty={empty} /></Panel>;
}

function MappingWorkspace({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const [profileId, setProfileId] = useState(""); const [version, setVersion] = useState(""); const [sourcePath, setSourcePath] = useState(""); const [fieldId, setFieldId] = useState(""); const [transform, setTransform] = useState("IDENTITY"); const [state, setState] = useState<ActionState>({ kind: "idle", message: "" });
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!profileId || !version || !sourcePath || !fieldId) return;
    setState({ kind: "working", message: locale === "zh" ? "正在创建映射版本…" : "Creating mapping version…" });
    const response = await fetch("/api/v2/mapping-versions", { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: JSON.stringify({ mapping_profile_id: profileId, version, status: "DRAFT", rules: [{ source_path: sourcePath, target_field_definition_id: fieldId, transform_type: transform, null_policy: "PRESERVE", lossiness: "NONE", status: "REVIEW_REQUIRED" }] }) });
    const body = await response.json().catch(() => ({})); setState({ kind: response.ok ? "success" : "error", message: response.ok ? (locale === "zh" ? "映射版本已创建，等待显式确认。" : "Mapping version created; explicit confirmation is still required.") : String(body?.error?.message || body?.message || "Mapping creation failed") }); if (response.ok) { setVersion(""); setSourcePath(""); onRefresh(); }
  }
  return <div className="space-y-6"><Panel title={locale === "zh" ? "映射版本与规则" : "Mapping versions and rules"} subtitle={locale === "zh" ? "未映射字段不会静默丢弃；每条映射都必须显式确认。" : "Unmapped fields are never silently dropped; every mapping requires an explicit decision."}><form onSubmit={(event) => void submit(event)} className="grid gap-3 lg:grid-cols-5"><select required value={profileId} onChange={(event) => setProfileId(event.target.value)} className="border border-slate-300 px-3 py-2 text-sm"><option value="">Profile</option>{snapshot.mappingProfiles.map((row) => <option key={String(row.id)} value={String(row.id)}>{stringValue(row.name)}</option>)}</select><input required value={version} onChange={(event) => setVersion(event.target.value)} placeholder="Version (e.g. 1.0.0)" className="border border-slate-300 px-3 py-2 text-sm"/><input required value={sourcePath} onChange={(event) => setSourcePath(event.target.value)} placeholder="Source column/path" className="border border-slate-300 px-3 py-2 text-sm"/><select required value={fieldId} onChange={(event) => setFieldId(event.target.value)} className="border border-slate-300 px-3 py-2 text-sm"><option value="">Target field</option>{snapshot.fields.map((row) => <option key={String(row.id)} value={String(row.id)}>{stringValue(row.field_code)}</option>)}</select><select value={transform} onChange={(event) => setTransform(event.target.value)} className="border border-slate-300 px-3 py-2 text-sm">{["IDENTITY","TRIM","CASE_NORMALIZE","NUMBER_PARSE","DATE_PARSE","UNIT_CONVERT","ENUM_MAP","JOIN","SPLIT","REFERENCE_LOOKUP"].map((item) => <option key={item}>{item}</option>)}</select><button disabled={!context.capabilities.includes("import.create") || state.kind === "working"} className="bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300 lg:col-span-5">{locale === "zh" ? "创建草稿映射版本" : "Create draft mapping version"}</button></form>{state.message && <p className={`mt-3 text-sm font-bold ${state.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}</Panel><div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "映射配置" : "Mapping profiles"}><DataTable rows={snapshot.mappingProfiles.map((row) => ({ ...row, readiness: mappingStatus(row) }))} keys={["name", "status", "readiness", "data_source_id"]} query="" empty="No profiles" /></Panel><Panel title={locale === "zh" ? "版本与规则" : "Versions and rules"}><DataTable rows={snapshot.mappingVersions} keys={["version", "status", "content_hash", "created_at"]} query="" empty="No versions" /></Panel></div><Panel title={locale === "zh" ? "未映射字段与规则" : "Unmapped fields and rules"}><DataTable rows={snapshot.mappingRules} keys={["source_path", "target_field_definition_id", "transform_type", "lossiness", "status"]} query="" empty="No rules" /></Panel></div>;
}

function ImportMappingWorkspace({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const steps = locale === "zh"
    ? ["1 上传文件", "2 文件预检", "3 字段映射", "4 数据完整度", "5 导入预览", "6 确认导入", "7 导入结果"]
    : ["1 Upload", "2 Preflight", "3 Mapping", "4 Completeness", "5 Preview", "6 Confirm", "7 Result"];
  const blocking = snapshot.validationRules.filter((row) => String(row.severity || "").toUpperCase() === "BLOCKING").length;
  const warnings = snapshot.validationRules.filter((row) => String(row.severity || "").toUpperCase() === "WARNING").length;
  return <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">{locale === "zh" ? "数据工作台" : "Data Workspace"}</p><h1 className="mt-2 text-3xl font-black text-[#133f38]">{locale === "zh" ? "导入中心" : "Import Center"}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{locale === "zh" ? "上传、预检、映射、完整度检查与导入预览在同一条受控流程中完成。" : "Upload, preflight, mapping, completeness checks, and import preview stay in one controlled workflow."}</p></div><ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{steps.map((step, index) => <li key={step} className={`rounded-lg border px-3 py-3 text-xs font-black ${index === 0 ? "border-emerald-300 bg-emerald-50 text-[#134d44]" : "border-slate-200 bg-white text-slate-500"}`}>{step}</li>)}</ol><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[locale === "zh" ? "总字段数" : "Total fields", snapshot.fields.length],[locale === "zh" ? "自动匹配" : "Auto matched", snapshot.mappingRules.filter((row) => ["MAPPED", "ACTIVE", "COMMITTED"].includes(String(row.status).toUpperCase())).length],[locale === "zh" ? "阻断问题" : "Blocking errors", blocking],[locale === "zh" ? "警告" : "Warnings", warnings]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-[#133f38]">{value}</p></div>)}</div><ImportWorkspace snapshot={snapshot} context={context} token={token} locale={locale} onRefresh={onRefresh} /><details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer text-sm font-black text-[#133f38]">{locale === "zh" ? "高级：字段映射与标准化结果" : "Advanced: field mapping and standardisation results"}</summary><div className="mt-5"><MappingWorkspace snapshot={snapshot} context={context} token={token} locale={locale} onRefresh={onRefresh} /></div></details></div>;
}

function DataWorkspaceLanding({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  return <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">{locale === "zh" ? "数据工作台" : "Data Workspace"}</p><h1 className="mt-2 text-3xl font-black text-[#133f38]">{locale === "zh" ? "开始录入数据" : "Start data entry"}</h1><div className="mt-4 grid gap-3 sm:grid-cols-2"><Link href={`/dashboard/v2/manual?tenant=${encodeURIComponent(context.tenantCode)}&lang=${locale}`} className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-lg font-black text-[#134d44]">{locale === "zh" ? "手工录入" : "Manual Entry"}<span className="mt-1 block text-sm font-semibold">{locale === "zh" ? "按 Schema 和适用性逐步填写" : "Schema-driven, controlled field entry"}</span></Link><a href="#import-center" className="rounded-xl border border-slate-300 bg-white p-5 text-lg font-black text-slate-950">{locale === "zh" ? "导入中心" : "Import Center"}<span className="mt-1 block text-sm font-semibold text-slate-600">{locale === "zh" ? "上传、预检、映射、确认导入" : "Upload, preflight, mapping, confirmed import"}</span></a></div></div><div id="import-center"><ImportMappingWorkspace snapshot={snapshot} context={context} token={token} locale={locale} onRefresh={onRefresh} /></div></div>;
}

function ValidationWorkspace({ snapshot, locale }: { snapshot: BackofficeSnapshot; locale: "en" | "zh" }) {
  const issues: BackofficeRow[] = snapshot.reviews.flatMap((review) => { const summary = review.validation_summary; const record = summary && typeof summary === "object" && !Array.isArray(summary) ? summary as Record<string, unknown> : {}; const raw = Array.isArray(record.issues) ? record.issues : []; return raw.map((issue) => ({ ...(issue as BackofficeRow), subject_type: review.subject_type, subject_id: review.subject_id })); });
  const groups = ["BLOCKING", "WARNING", "INFO", "PASS"].map((severity) => ({ severity, rows: issues.filter((row) => String(row.severity || row.level || "INFO").toUpperCase() === severity) }));
  const readiness = snapshot.reviews.map((review) => ({ ...review, candidate_readiness: review.status === "IN_REVIEW" ? "READY_FOR_REVIEW" : review.status === "APPROVED" ? "READY_WITH_WARNINGS" : review.status === "PUBLISHED" ? "CURRENT_PUBLICATION" : "NOT_READY" }));
  return <div className="space-y-6"><Panel title={locale === "zh" ? "校验问题分组" : "Grouped validation issues"} subtitle={locale === "zh" ? "BLOCKING、WARNING、INFO、PASS 明确分组；未通过不代表可发布。" : "BLOCKING, WARNING, INFO, and PASS are explicit groups; validation does not publish anything."}><div className="grid gap-4 sm:grid-cols-4">{groups.map((group) => <div key={group.severity} className="border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">{displayValue("status", group.severity, locale)}</p><p className="mt-2 text-2xl font-black">{group.rows.length}</p></div>)}</div>{groups.map((group) => <div key={group.severity} className="mt-4"><h3 className="mb-2 text-sm font-black">{displayValue("status", group.severity, locale)}</h3><DataTable rows={group.rows} keys={["code", "message", "subject_type", "subject_id"]} query="" empty="No issues" /></div>)}</Panel><Panel title={locale === "zh" ? "下一候选与当前发布状态" : "Next candidate and current publication status"} subtitle={locale === "zh" ? "已发布版本显示为当前发布；仅下一候选版本显示待审核或未就绪。" : "Published versions are shown as current; review readiness applies only to the next candidate."}><DataTable rows={readiness} keys={["subject_type", "subject_id", "status", "candidate_readiness", "generated_at"]} query="" empty="No candidates" /></Panel></div>;
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
  const steps = locale === "zh"
    ? ["01 产品对象", "02 基础信息", "03 产品标识", "04 技术参数", "05 材料与组成", "06 可持续性", "07 合规与安全", "08 维修与服务", "09 报废与循环利用", "10 生命周期", "11 动态数据（适用时）", "12 数据来源与证据"]
    : ["01 Product object", "02 Basics", "03 Product identifiers", "04 Technical specifications", "05 Materials & composition", "06 Sustainability", "07 Compliance & safety", "08 Repair & service", "09 End of life", "10 Lifecycle", "11 Dynamic data (when applicable)", "12 Sources & evidence"];
  return <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]"><aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{locale === "zh" ? "录入步骤" : "Entry steps"}</p><ol className="mt-3 space-y-1">{steps.map((step, index) => <li key={step} className={`rounded-lg px-3 py-2 text-sm ${index === 0 ? "bg-emerald-50 font-black text-[#134d44]" : "font-semibold text-slate-500"}`}>{step}</li>)}</ol></aside><div className="min-w-0"><Panel title={locale === "zh" ? "手工 DPP 数据录入" : "Manual DPP data entry"} subtitle={locale === "zh" ? "按产品对象和 Schema applicability 分步填写，所有写入绑定当前租户，并保留证据。" : "Complete the applicable product steps while every write remains Tenant-scoped and evidence-backed."}><form onSubmit={(event) => void submit(event)} className="grid gap-4">
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "产品对象" : "Product subject"}<select required value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case"><option value="">—</option>{subjects.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{item.type} · {item.label}</option>)}</select></label>
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "字段（按数据粒度分组）" : "Canonical field (grouped by granularity)"}<select required value={fieldId} onChange={(event) => setFieldId(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case"><option value="">—</option>{Array.from(new Set(snapshot.fields.map((item) => String(item.data_granularity || "GENERAL")))).map((group) => <optgroup key={group} label={group}>{snapshot.fields.filter((item) => String(item.data_granularity || "GENERAL") === group).map((item) => <option key={String(item.id)} value={String(item.id)}>{stringValue(item.field_code)} · {stringValue(locale === "zh" ? item.label_zh || item.label_en : item.label_en)} · {stringValue(item.unit_code || item.data_type || item.requirement_status)}</option>)}</optgroup>)}</select></label>
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "解析状态" : "Resolution state"}<select value={resolutionState} onChange={(event) => setResolutionState(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case">{["INHERIT","OVERRIDE","CLEAR","NOT_APPLICABLE","UNKNOWN"].map((item) => <option key={item} value={item}>{resolutionLabel(item, locale)}{locale === "zh" ? ` (${item})` : ""}</option>)}</select></label>
    {field && <div className="border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><span className="font-black">{stringValue(field.field_code)}</span> · type={stringValue(field.data_type)} · unit={stringValue(field.unit_code)} · granularity={stringValue(field.data_granularity)} · requirement={stringValue(field.requirement_status)} · access={stringValue(field.access_level_code)}</div>}
    {resolutionState === "OVERRIDE" && <><label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "值（文本或 JSON）" : "Value (text or JSON)"}<textarea required value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 min-h-24 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" /></label><label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "单位" : "Unit"}<input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder={stringValue(field?.unit_code)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" /></label></>}
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "证据引用（逗号分隔）" : "Evidence references (comma-separated)"}<input value={evidence} onChange={(event) => setEvidence(event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" /></label>
    <label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "适用性说明" : "Applicability reason"}<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-semibold normal-case" /></label>
    <button disabled={!allowed || state.kind === "working"} className="min-h-11 bg-slate-950 px-4 text-sm font-black text-white disabled:bg-slate-300">{locale === "zh" ? "保存声明" : "Save claim"}</button>
    {state.message && <p className={`text-sm font-bold ${state.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}
  </form></Panel><ClaimWorkspace snapshot={snapshot} query="" empty={locale === "zh" ? "暂无声明" : "No claims"} /></div></div>;
}

function CrudActionPanel({ section, rows, context, token, locale, onRefresh }: { section: BackofficeSection; rows: BackofficeRow[]; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const config: Partial<Record<BackofficeSection, { endpoint: string; field: string; label: string; capability: string }>> = {
    organisations: { endpoint: "/api/v2/organisations", field: "legal_name", label: "Organisation", capability: "organisation.edit" },
    families: { endpoint: "/api/v2/product-families", field: "name", label: "Product family", capability: "product.edit" },
    models: { endpoint: "/api/v2/product-models", field: "name", label: "Product model", capability: "product.edit" },
    skus: { endpoint: "/api/v2/skus", field: "name", label: "SKU", capability: "product.edit" },
    batches: { endpoint: "/api/v2/batches", field: "batch_number", label: "Batch", capability: "product.edit" },
    items: { endpoint: "/api/v2/items", field: "serial_number", label: "Individual", capability: "product.edit" },
  };
  const active = config[section]; const [message, setMessage] = useState("");
  if (!active) return null;
  const activeLabel = locale === "zh" ? ({ Organisation: "企业主体", "Product family": "产品族", "Product model": "产品型号", SKU: "SKU", Batch: "批次", Individual: "单件产品" }[active.label] || active.label) : active.label;
  const allowed = context.capabilities.includes(active.capability);
  async function request(id: string, method: "PATCH" | "DELETE", body?: BackofficeRow) {
    const response = await fetch(`${active!.endpoint}/${id}`, { method, headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => ({}));
    const error = result?.error || result;
    setMessage(response.ok ? (locale === "zh" ? "操作已保存。" : "Operation saved.") : String(error?.message || "Operation failed.") + (error?.details ? ` ${JSON.stringify(error.details)}` : ""));
    if (response.ok) onRefresh();
  }
  return <Panel title={locale === "zh" ? "编辑、归档或删除" : "Edit, archive, or delete"} subtitle={locale === "zh" ? "删除前要求二次确认；若存在声明、护照或已发布历史，服务端会返回依赖并阻止硬删除。" : "Delete requires confirmation. Claims, Passports, and published history are returned as dependencies and block hard delete server-side."}><div className="space-y-2">{rows.map((row) => <div key={String(row.id)} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0"><span className="text-sm font-bold">{displayValue("name", row[active.field], locale)}</span><div className="flex gap-2"><button type="button" disabled={!allowed} onClick={() => { const next = window.prompt(locale === "zh" ? `编辑 ${activeLabel}` : `Edit ${activeLabel}`, String(row[active.field] || "")); if (next !== null && next.trim()) void request(String(row.id), "PATCH", { [active.field]: next.trim() }); }} className="border border-slate-300 px-2 py-1 text-xs font-black disabled:opacity-40">{locale === "zh" ? "编辑" : "Edit"}</button><button type="button" disabled={!allowed} onClick={() => void request(String(row.id), "PATCH", { status: "ARCHIVED" })} className="border border-amber-300 px-2 py-1 text-xs font-black text-amber-800 disabled:opacity-40">{locale === "zh" ? "归档" : "Archive"}</button><button type="button" disabled={!allowed} onClick={() => { if (window.confirm(`${locale === "zh" ? "确认删除" : "Delete"} ${stringValue(row[active!.field])}?`)) void request(String(row.id), "DELETE"); }} className="border border-red-300 px-2 py-1 text-xs font-black text-red-700 disabled:opacity-40">{locale === "zh" ? "删除" : "Delete"}</button></div></div>)}</div>{message && <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>}</Panel>;
}

function TenantProfilePanel({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const tenant = snapshot.tenant; const [name, setName] = useState(String(tenant.name || "")); const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) { event.preventDefault(); const response = await fetch("/api/v2/tenants", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "x-tenant-id": context.tenantId, "idempotency-key": crypto.randomUUID(), "content-type": "application/json" }, body: JSON.stringify({ name }) }); const body = await response.json().catch(() => ({})); setMessage(response.ok ? (locale === "zh" ? "租户资料已保存。" : "Tenant profile saved.") : String(body?.error?.message || "Save failed.")); if (response.ok) onRefresh(); }
  return <Panel title={locale === "zh" ? "租户资料" : "Tenant profile"} subtitle={locale === "zh" ? "当前租户的可编辑资料；租户 ID 与编码不会由此页面修改。" : "Editable current-Tenant profile. Tenant ID and code are not editable here."}><form onSubmit={(event) => void save(event)} className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black uppercase text-slate-600">{locale === "zh" ? "租户名称" : "Tenant name"}<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm normal-case" /></label><div className="text-xs font-black uppercase text-slate-500">{locale === "zh" ? "租户编码" : "Tenant code"}<p className="mt-1 border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold normal-case">{stringValue(tenant.code)}</p></div><div className="text-xs font-black uppercase text-slate-500">{locale === "zh" ? "状态" : "Status"}<p className="mt-1"><Status value={tenant.status} /></p></div><div className="text-xs font-black uppercase text-slate-500">{locale === "zh" ? "更新时间" : "Updated"}<p className="mt-1 text-sm font-semibold normal-case">{displayValue("updated_at", tenant.updated_at, locale)}</p></div><button disabled={!context.capabilities.includes("tenant.manage")} className="bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300 sm:col-span-2">{locale === "zh" ? "保存租户资料" : "Save tenant profile"}</button></form>{message && <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>}</Panel>;
}

function SettingsPanel({ snapshot, context, token, locale, onRefresh }: { snapshot: BackofficeSnapshot; context: BackofficeContext; token: string; locale: "en" | "zh"; onRefresh: () => void }) {
  const cards = locale === "zh"
    ? [["租户资料", "查看和编辑当前租户", "#tenant-profile"], ["企业主体", "创建、编辑、归档或删除企业主体", "#organisations"], ["用户与权限", "平台管理员与租户成员关系", "/dashboard/v2/tenants"], ["数据来源配置", "手工、Excel、API、ERP、MES、PLM、BMS", "/dashboard/v2/sources"], ["审计与高级设置", "解析服务、注册库、连接器和审计记录", "/dashboard/v2/audit"]]
    : [["Tenant profile", "View and edit the current Tenant", "#tenant-profile"], ["Organisation", "Create, edit, archive, or delete Organisations", "#organisations"], ["Users & permissions", "Platform authority and Tenant memberships", "/dashboard/v2/tenants"], ["Data source configuration", "Manual, Excel, API, ERP, MES, PLM, and BMS", "/dashboard/v2/sources"], ["Audit & advanced settings", "Resolver, Registry, integrations, and audit records", "/dashboard/v2/audit"]];
  return <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">{locale === "zh" ? "工作区设置" : "Workspace settings"}</p><h1 className="mt-2 text-3xl font-black text-[#133f38]">{locale === "zh" ? "设置" : "Settings"}</h1></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(([title, subtitle, href]) => href.startsWith("#") ? <a key={href} href={href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-slate-950">{title}</h2><p className="mt-2 text-sm text-slate-500">{subtitle}</p></a> : <Link key={href} href={`${href}?tenant=${encodeURIComponent(context.tenantCode)}&lang=${locale}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-slate-950">{title}</h2><p className="mt-2 text-sm text-slate-500">{subtitle}</p></Link>)}</div><div id="tenant-profile"><TenantProfilePanel snapshot={snapshot} context={context} token={token} locale={locale} onRefresh={onRefresh} /></div><div id="organisations" className="grid gap-6 xl:grid-cols-2"><CreateRecordPanel section="organisations" snapshot={snapshot} context={context} token={token} locale={locale} onRefresh={onRefresh} /><CrudActionPanel section="organisations" rows={snapshot.organisations} context={context} token={token} locale={locale} onRefresh={onRefresh} /></div></div>;
}

export function BackofficeConsole({ section: requested = "dashboard", modelId }: Props) {
  const { locale } = useLanguage(); const copy = backofficeCopy[locale];
  const router = useRouter(); const searchParams = useSearchParams();
  const section = isBackofficeSection(requested) ? requested : "dashboard";
  const [contexts, setContexts] = useState<BackofficeContext[]>([]); const [selectedId, setSelectedId] = useState(""); const [snapshot, setSnapshot] = useState<BackofficeSnapshot | null>(null); const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [query, setQuery] = useState("");
  const selected = contexts.find((item) => item.tenantId === selectedId);
  const refresh = useCallback(async (activeToken = token, tenantId = selected?.tenantId) => {
    if (!activeToken || !tenantId) return; setLoading(true); setError("");
    const response = await fetch("/api/v2/backoffice/snapshot", { headers: { Authorization: `Bearer ${activeToken}`, "x-tenant-id": tenantId }, cache: "no-store" });
    const body = await response.json().catch(() => ({})); if (!response.ok) { setError(String(body?.error?.message || copy.accessDenied)); setLoading(false); return; }
    setSnapshot(body.data); setLoading(false);
  }, [copy.accessDenied, selected?.tenantId, token]);
  useEffect(() => { let live = true; void (async () => { const { data: { session } } = await createSupabaseClient().auth.getSession(); if (!live || !session) return; setToken(session.access_token); const response = await fetch("/api/v2/backoffice/context", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" }); const body = await response.json().catch(() => ({})); if (!live) return; const next: BackofficeContext[] = (response.ok ? body.data || [] : []).filter((item: BackofficeContext) => item.authorityType === "TENANT" || item.authorityType === "PLATFORM"); setContexts(next); const requestedTenant = searchParams.get("tenant"); const requestedContext = requestedTenant ? next.find((item) => item.tenantCode === requestedTenant || item.tenantId === requestedTenant) : undefined; const hasPlatformAuthority = next.some((item) => item.authorityType === "PLATFORM"); const soleTenantMembership = !hasPlatformAuthority && next.length === 1 && next[0]?.authorityType === "TENANT" ? next[0] : undefined; const preferred = requestedContext || soleTenantMembership; if (!preferred) { setSelectedId(""); setSnapshot(null); setError(requestedTenant ? copy.accessDenied : ""); setLoading(false); return; } setSelectedId(preferred.tenantId); await refresh(session.access_token, preferred.tenantId); })(); return () => { live = false; }; }, [copy.accessDenied, refresh, searchParams]);
  useEffect(() => { if (token && selectedId) void refresh(token, selectedId); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  const title = [...backofficeNavigation, ...advancedBackofficeNavigation].find((item) => item.section === section)?.label[locale] || copy.productName;
  const rows = useMemo(() => { if (!snapshot) return []; const key = sectionData[section]; if (!key) return []; const value = snapshot[key]; return Array.isArray(value) ? value as BackofficeRow[] : []; }, [section, snapshot]);
  const referenceTenant = selected?.tenantCode === "greanlean-reference-mobility";
  if (loading && !snapshot) return <div className="grid min-h-[55vh] place-items-center"><p className="font-bold text-slate-500">{copy.loading}</p></div>;
  if (!snapshot || !selected) {
    const requiresExplicitTenant = contexts.some((item) => item.authorityType === "PLATFORM") && !searchParams.get("tenant");
    if (requiresExplicitTenant) return <div className="rounded-[14px] border border-emerald-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">{locale === "zh" ? "需要选择当前租户" : "Active Tenant required"}</p><h1 className="mt-2 text-2xl font-black text-[#133f38]">{locale === "zh" ? "请先从平台总览选择租户" : "Choose a Tenant from Platform Overview"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{locale === "zh" ? "平台权限不会自动建立租户业务上下文。选择后，服务端仍会验证平台能力、租户状态和请求头。" : "Platform authority never establishes a Tenant business context implicitly. After selection, the server still verifies platform capability, Tenant status, and the request header."}</p><Link href={`/dashboard/platform?lang=${locale}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#134d44] px-4 text-sm font-black text-white">{locale === "zh" ? "返回平台总览" : "Back to Platform Overview"}</Link></div>;
    return <div className="rounded-[14px] border border-red-200 bg-red-50 p-6 text-red-900"><p className="font-black">{copy.accessDenied}</p><p className="mt-2 text-sm">{error}</p></div>;
  }
  const render = () => {
    if (modelId) return <ModelPage snapshot={snapshot} modelId={modelId} locale={locale} tenantCode={selected.tenantCode} />;
    if (section === "dashboard") return <Dashboard snapshot={snapshot} locale={locale} />;
    if (section === "imports") return <DataWorkspaceLanding snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />;
    if (section === "manual") return <ManualClaimWorkspace snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />;
    if (section === "reviews" || section === "candidates") return <ReviewWorkspace snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />;
    if (section === "publications" || section === "passports") return <PublicationWorkspace snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />;
    if (section === "identifiers") return <PublicDisplayWorkspace snapshot={snapshot} locale={locale} />;
    if (section === "claims") return <ClaimWorkspace snapshot={snapshot} query={query} empty={copy.noData} />;
    if (section === "validation") return <ValidationWorkspace snapshot={snapshot} locale={locale} />;
    if (section === "tenants") return <div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "租户边界" : "Tenant boundary"}><DataTable rows={[snapshot.tenant]} keys={["code", "name", "status", "residency_policy"]} query={query} empty={copy.noData} /></Panel><Panel title={locale === "zh" ? "成员与合作伙伴授权" : "Memberships and partner authority"}><DataTable rows={[...snapshot.memberships, ...snapshot.partnerAuthorizations]} keys={["role_id", "permission_profile_id", "status", "valid_until"]} query={query} empty={copy.noData} /></Panel></div>;
    if (section === "audiences") return <div className="grid gap-6 xl:grid-cols-2"><Panel title={locale === "zh" ? "字段访问策略" : "Field access policy"}><DataTable rows={snapshot.accessPolicies} keys={["policy_code", "access_level_code", "purpose_required", "status"]} query={query} empty={copy.noData} /></Panel><Panel title={locale === "zh" ? "受众预览边界" : "Audience preview boundary"}><p className="text-sm leading-6 text-slate-600">{locale === "zh" ? "公开、客户、合作伙伴、审计员和监管机构视图由服务端访问策略裁剪。控制台不会把隐藏字段下载到未经授权的浏览器。" : "Public, customer, partner, auditor, and regulator views are filtered by server-side access policy. Hidden fields are not downloaded to an unauthorised browser."}</p></Panel></div>;
    if (section === "settings") return <SettingsPanel snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />;
    if (section === "documents") { const docs = snapshot.sourceRecords.flatMap((row) => { const payload = row.payload_json as Record<string, unknown> | undefined; return Array.isArray(payload?.documents) ? payload.documents as BackofficeRow[] : []; }); return <Panel title={title}><DataTable rows={docs} keys={["type", "name", "status", "url"]} query={query} empty={copy.noData} /></Panel>; }
    if (section === "lifecycle") { const events = snapshot.sourceRecords.flatMap((row) => { const payload = row.payload_json as Record<string, unknown> | undefined; return Array.isArray(payload?.lifecycle_events) ? payload.lifecycle_events as BackofficeRow[] : []; }); return <Panel title={title}><DataTable rows={events} keys={["event_type", "occurred_at", "location", "status"]} query={query} empty={copy.noData} /></Panel>; }
    if (section === "mappings") return <MappingWorkspace snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />;
    if (section === "models") return <ProductCenter snapshot={snapshot} context={selected} token={token} locale={locale} tenantCode={selected.tenantCode} onRefresh={() => void refresh()} />;
    if (["organisations", "families", "skus", "batches", "items", "sources"].includes(section)) return <div className="space-y-6"><div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><Panel title={title} subtitle={`${rows.length} ${locale === "zh" ? "条记录" : "records"}`}><DataTable rows={rows} keys={columns[section] || ["id", "status", "created_at"]} query={query} empty={copy.noData} /></Panel><CreateRecordPanel section={section} snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} /></div>{["organisations", "families", "skus", "batches", "items"].includes(section) && <CrudActionPanel section={section} rows={rows} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />}{section === "batches" && <BatchSkuLinkPanel snapshot={snapshot} context={selected} token={token} locale={locale} onRefresh={() => void refresh()} />}</div>;
    return <Panel title={title} subtitle={`${rows.length} ${locale === "zh" ? "条记录" : "records"}`}><DataTable rows={rows} keys={columns[section] || ["id", "status", "created_at"]} query={query} empty={copy.noData} /></Panel>;
  };
  return <div className="mx-auto max-w-[1600px] space-y-5">
    <header className="border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">{copy.productName}</p><Status value={selected.authorityType === "PLATFORM" ? (locale === "zh" ? "平台管理员" : "Platform Admin") : "ACTIVE"} />{referenceTenant && <Status value="REFERENCE_DATA" />}</div><h1 className="mt-2 text-2xl font-black">{title}</h1><p className="mt-1 text-sm font-semibold text-slate-500">{locale === "zh" ? "当前租户" : "Active Tenant"}: <span className="font-black text-slate-950">{selected.tenantName}</span> · {displayValue("role", selected.roleName, locale)}</p></div><div className="flex flex-wrap gap-2"><select aria-label={locale === "zh" ? "当前租户" : "Tenant"} value={selected.tenantId} onChange={(event) => { const next = contexts.find((item) => item.tenantId === event.target.value); if (!next) return; setSelectedId(next.tenantId); router.replace(`${window.location.pathname}?tenant=${encodeURIComponent(next.tenantCode)}&lang=${locale}`); }} className="border border-slate-300 bg-white px-3 py-2 text-sm font-bold">{contexts.map((item) => <option key={`${item.authorityType}-${item.authorityId}-${item.tenantId}`} value={item.tenantId}>{item.tenantName}</option>)}</select><input aria-label={copy.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="min-w-64 border border-slate-300 px-3 py-2 text-sm"/><button onClick={() => void refresh()} className="border border-slate-300 px-4 py-2 text-sm font-black">{copy.refresh}</button></div></div>
      <nav aria-label={locale === "zh" ? "租户工作区主导航" : "Tenant workspace primary navigation"} className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-3 xl:grid-cols-6">{primaryBackofficeNavigation.map((item) => <Link key={item.section} href={`/dashboard/v2/${item.section}?tenant=${encodeURIComponent(selected.tenantCode)}&lang=${locale}`} className={`rounded-lg px-3 py-3 text-center text-xs font-black ${item.section === section ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item.label[locale]}</Link>)}</nav><details className="mt-3 border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">{locale === "zh" ? "高级功能" : "Advanced"}</summary><div className="mt-3 flex flex-wrap gap-2">{advancedBackofficeNavigation.map((item) => <Link key={item.section} href={`/dashboard/v2/${item.section}?tenant=${encodeURIComponent(selected.tenantCode)}&lang=${locale}`} className={`rounded-lg px-3 py-2 text-xs font-bold ${item.section === section ? "bg-emerald-100 text-[#134d44]" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>{item.label[locale]}</Link>)}</div></details>
    </header>
    {error && <div className="border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{error}</div>}
    {render()}
  </div>;
}
