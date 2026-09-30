"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

type Row = Record<string, any>;
type PlatformData = {
  tenants: Row[];
  organisations: Row[];
  products: Row[];
  dpps: Row[];
  imports: Row[];
  audit: Row[];
};

const tenantCodePattern = /^[a-z][a-z0-9-]{2,62}$/;

function tenantCodeHelp(locale: string) {
  return locale === "zh"
    ? "租户编码必须以小写字母开头，仅可包含小写字母、数字和短横线，长度为 3–63 个字符。"
    : "Tenant code must start with a lowercase letter and contain only lowercase letters, numbers, or hyphens (3–63 characters).";
}

function tenantWriteErrorMessage(locale: string, body: any) {
  const code = body?.error?.code;
  if (code === "TENANT_CODE_INVALID") return tenantCodeHelp(locale);
  if (code === "TENANT_CODE_CONFLICT") return locale === "zh" ? "该租户编码已被使用，请换一个编码。" : "That Tenant code is already in use.";
  if (code === "TENANT_CODE_AND_NAME_REQUIRED") return locale === "zh" ? "请填写租户编码和租户名称。" : "Tenant code and name are required.";
  return String(body?.error?.message || (locale === "zh" ? "租户操作未能完成。" : "Tenant operation failed."));
}

function tenantKey(row: Row) {
  return String(row.tenant_id || row.tenantCode || row.tenantName || "unassigned");
}

function groupByTenant(rows: Row[]) {
  return rows.reduce<Record<string, Row[]>>((groups, row) => {
    const key = tenantKey(row);
    groups[key] = [...(groups[key] || []), row];
    return groups;
  }, {});
}

function Cell({ value }: { value: unknown }) {
  return <span className="block max-w-xs truncate">{value === null || value === undefined || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}</span>;
}

function tableLabel(column: string, locale: string) {
  const chinese: Record<string, string> = {
    model_code: "型号编码", name: "名称", status: "状态", updated_at: "更新时间", passport_identifier: "DPP 标识",
    subject_type: "主体类型", currentVersion: "当前版本", publicationState: "发布状态", tenantName: "租户",
    file_format: "文件格式", created_at: "创建时间",
  };
  return locale === "zh" ? chinese[column] || column.replaceAll("_", " ") : column.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ");
}

function Table({ rows, columns, empty, locale }: { rows: Row[]; columns: string[]; empty: string; locale: string }) {
  if (!rows.length) return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">{empty}</div>;
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">{tableLabel(column, locale)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column} className="px-4 py-3 font-medium text-slate-700"><Cell value={row[column]} /></td>)}</tr>)}</tbody></table></div>;
}

function Panel({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#133f38]">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}<div className="mt-4">{children}</div></section>;
}

export function PlatformConsole() {
  const { locale } = useLanguage();
  const [data, setData] = useState<PlatformData>({ tenants: [], organisations: [], products: [], dpps: [], imports: [], audit: [] });
  const [activeTenantId, setActiveTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [newTenant, setNewTenant] = useState({ code: "", name: "" });
  const [writeMessage, setWriteMessage] = useState("");
  const t = locale === "zh" ? {
    eyebrow: "平台运营", title: "平台总览", role: "平台管理员 · 全部租户",
    tenant: "当前租户", chooseTenant: "请选择租户", enter: "进入租户工作区", tenants: "租户运营概览", products: "产品中心", dpps: "DPP 列表",
    operations: "需要关注", empty: "暂无记录", scope: "跨租户读取始终保留数据归属。进入业务工作区前，必须显式选择并验证当前租户。",
    models: "产品型号", passports: "DPP 护照", attention: "运营异常", action: "操作", noSelection: "尚未选择租户，不会建立业务写入上下文。",
  } : {
    eyebrow: "Platform Operations", title: "Platform Overview", role: "Platform Admin · All Tenants",
    tenant: "Active Tenant", chooseTenant: "Select a Tenant", enter: "Enter Tenant workspace", tenants: "Tenant operating progress", products: "Product Center", dpps: "DPP inventory",
    operations: "Needs attention", empty: "No records", scope: "Cross-Tenant reads retain ownership. An Active Tenant must be explicitly selected and verified before entering a business workspace.",
    models: "Product models", passports: "DPP passports", attention: "Operational exceptions", action: "Action", noSelection: "No Tenant selected; no business-write context has been established.",
  };

  useEffect(() => {
    let live = true;
    void (async () => {
      const { data: sessionData } = await createSupabaseClient().auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      setToken(token);
      const headers = { Authorization: `Bearer ${token}` };
      const responses = await Promise.all([
        fetch("/api/v2/platform/tenants?pageSize=100", { headers, cache: "no-store" }),
        fetch("/api/v2/platform/organisations?pageSize=100", { headers, cache: "no-store" }),
        fetch("/api/v2/platform/products?pageSize=100", { headers, cache: "no-store" }),
        fetch("/api/v2/platform/dpps?pageSize=100", { headers, cache: "no-store" }),
        fetch("/api/v2/platform/operations?pageSize=100", { headers, cache: "no-store" }),
      ]);
      const bodies = await Promise.all(responses.map((response) => response.json().catch(() => ({}))));
      if (!live) return;
      const failed = responses.findIndex((response) => !response.ok);
      if (failed >= 0) {
        setError(String(bodies[failed]?.error?.message || "Platform data could not be loaded."));
        setLoading(false);
        return;
      }
      const next: PlatformData = { tenants: bodies[0].data.rows || [], organisations: bodies[1].data.rows || [], products: bodies[2].data.rows || [], dpps: bodies[3].data.rows || [], imports: bodies[4].data.imports || [], audit: bodies[4].data.audit || [] };
      setData(next);
      setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  const selected = useMemo(() => data.tenants.find((tenant) => tenant.id === activeTenantId), [activeTenantId, data.tenants]);
  const attention = useMemo(() => data.imports.filter((item) => ["FAILED", "QUARANTINED"].includes(String(item.status).toUpperCase())), [data.imports]);
  const productsByTenant = useMemo(() => groupByTenant(data.products), [data.products]);
  const dppsByTenant = useMemo(() => groupByTenant(data.dpps), [data.dpps]);
  async function tenantWrite(path: string, method: string, payload?: Record<string, unknown>) {
    const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
    const body = await response.json().catch(() => ({})); setWriteMessage(response.ok ? (locale === "zh" ? "租户操作已保存，正在刷新。" : "Tenant operation saved; refreshing.") : tenantWriteErrorMessage(locale, body));
    if (response.ok) window.setTimeout(() => window.location.reload(), 350);
  }
  if (loading) return <div className="grid min-h-[55vh] place-items-center font-bold text-slate-500">{locale === "zh" ? "正在加载平台范围…" : "Loading platform scope…"}</div>;
  if (error) return <div className="border border-red-200 bg-red-50 p-6 font-bold text-red-900">{error}</div>;

  return <div className="mx-auto max-w-[1600px] space-y-6">
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">{t.eyebrow}</p><h1 className="mt-2 text-3xl font-black text-[#133f38]">{t.title}</h1><p className="mt-2 text-sm font-semibold text-slate-500">{t.role}</p><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t.scope}</p></div>
      <div className="min-w-[320px] rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm"><label htmlFor="platform-active-tenant" className="text-xs font-black uppercase tracking-wide text-slate-500">{t.tenant}</label><select id="platform-active-tenant" value={activeTenantId} onChange={(event) => setActiveTenantId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950"><option value="">{t.chooseTenant}</option>{data.tenants.filter((tenant) => tenant.status === "ACTIVE").map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.code}</option>)}</select>{selected ? <Link href={`/dashboard/v2?tenant=${encodeURIComponent(selected.code)}&lang=${locale}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#134d44] px-4 text-sm font-black text-white hover:bg-[#0b3832]">{t.enter}: {selected.name}</Link> : <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{t.noSelection}</p>}</div>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[[t.tenants,data.tenants.length],[t.models,data.products.length],[t.passports,data.dpps.length],[t.attention,attention.length]].map(([label,value]) => <div key={String(label)} className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-[#133f38]">{value}</p></div>)}</div>
    <Panel id="tenants" title={t.tenants} subtitle={locale === "zh" ? "平台租户管理通过权限控制接口执行并保留审计记录。存在产品、DPP 或成员关系的租户只能归档。" : "Platform Tenant management uses capability-gated, audited APIs. Tenants with Product, DPP, or membership records can only be archived."}>
      <form onSubmit={(event) => { event.preventDefault(); if (!tenantCodePattern.test(newTenant.code)) { setWriteMessage(tenantCodeHelp(locale)); return; } void tenantWrite("/api/v2/platform/tenants", "POST", newTenant); }} className="mb-5 grid gap-2 border-b border-slate-100 pb-5 sm:grid-cols-[1fr_1fr_auto]"><div><input required value={newTenant.code} onChange={(event) => setNewTenant((value) => ({ ...value, code: event.target.value }))} placeholder={locale === "zh" ? "新租户编码" : "New Tenant code"} aria-describedby="new-tenant-code-help" className="w-full border border-slate-300 px-3 py-2 text-sm"/><p id="new-tenant-code-help" className="mt-1 text-xs leading-4 text-slate-500">{tenantCodeHelp(locale)}</p></div><input required value={newTenant.name} onChange={(event) => setNewTenant((value) => ({ ...value, name: event.target.value }))} placeholder={locale === "zh" ? "新租户名称" : "New Tenant name"} className="h-10 border border-slate-300 px-3 py-2 text-sm"/><button className="h-10 bg-slate-950 px-4 py-2 text-sm font-black text-white">{locale === "zh" ? "+ 新建租户" : "+ Create Tenant"}</button></form>{writeMessage && <p className="mb-4 text-sm font-bold text-slate-600" role="status">{writeMessage}</p>}
      {data.tenants.length ? <div className="grid gap-4 xl:grid-cols-2">{data.tenants.map((tenant) => <article key={String(tenant.id)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-black text-slate-950">{tenant.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{tenant.code} · {tenant.status}</p></div><div className="flex gap-2"><Link href={`/dashboard/v2?tenant=${encodeURIComponent(tenant.code)}&lang=${locale}`} className="inline-flex min-h-10 items-center rounded-lg bg-[#134d44] px-3 text-xs font-black text-white hover:bg-[#0b3832]">{t.enter}</Link><button onClick={() => { const name = window.prompt(locale === "zh" ? "租户名称" : "Tenant name", tenant.name); if (name) void tenantWrite(`/api/v2/platform/tenants/${tenant.id}`, "PATCH", { name }); }} className="border border-slate-300 px-3 text-xs font-black">{locale === "zh" ? "编辑" : "Edit"}</button><button onClick={() => void tenantWrite(`/api/v2/platform/tenants/${tenant.id}`, "PATCH", { status: "ARCHIVED" })} className="border border-amber-300 px-3 text-xs font-black text-amber-800">{locale === "zh" ? "归档" : "Archive"}</button><button onClick={() => { if (window.confirm(`${locale === "zh" ? "删除空租户" : "Delete empty Tenant"}: ${tenant.name}?`)) void tenantWrite(`/api/v2/platform/tenants/${tenant.id}`, "DELETE"); }} className="border border-red-300 px-3 text-xs font-black text-red-700">{locale === "zh" ? "删除" : "Delete"}</button></div></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[[locale === "zh" ? "型号" : "Models",tenant.modelCount ?? 0],["SKU",tenant.skuCount ?? 0],[locale === "zh" ? "批次" : "Batches",tenant.batchCount ?? 0],[locale === "zh" ? "单件" : "Individuals",tenant.itemCount ?? 0],["DPP",tenant.passportCount ?? 0],[locale === "zh" ? "已发布" : "Published",tenant.publishedCount ?? 0],[locale === "zh" ? "待处理" : "Draft / review",tenant.draftReviewCount ?? 0],[locale === "zh" ? "完整度" : "Completeness",tenant.completeness == null ? "—" : `${tenant.completeness}%`]].map(([label,value]) => <div key={String(label)} className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-[#133f38]">{value}</p></div>)}</div><p className="mt-4 text-xs font-semibold text-slate-500">{locale === "zh" ? "最近更新" : "Last updated"}: {tenant.lastUpdated || "—"}</p></article>)}</div> : <p className="text-sm text-slate-500">{t.empty}</p>}
    </Panel>
    <div className="grid gap-6 xl:grid-cols-2"><Panel id="products" title={t.products} subtitle={locale === "zh" ? "默认按租户分组，可继续搜索并进入对应工作区。" : "Grouped by Tenant by default; continue with search and Tenant-scoped workspace entry."}>{Object.entries(productsByTenant).map(([key, rows]) => <details key={key} open className="border-b border-slate-100 py-3 last:border-0"><summary className="cursor-pointer text-sm font-black text-slate-900">{rows[0]?.tenantName || key} <span className="ml-2 text-xs font-semibold text-slate-500">{rows.length}</span></summary><div className="mt-3"><Table rows={rows} columns={["model_code","name","status","updated_at"]} empty={t.empty} locale={locale} /></div></details>)}</Panel><Panel id="dpps" title={t.dpps} subtitle={locale === "zh" ? "租户 → 数字产品护照；显示版本、主体、状态和更新时间。" : "Tenant → product passport; show version, subject, status, and updated time."}>{Object.entries(dppsByTenant).map(([key, rows]) => <details key={key} open className="border-b border-slate-100 py-3 last:border-0"><summary className="cursor-pointer text-sm font-black text-slate-900">{rows[0]?.tenantName || key} <span className="ml-2 text-xs font-semibold text-slate-500">{rows.length}</span></summary><div className="mt-3"><Table rows={rows} columns={["passport_identifier","subject_type","currentVersion","publicationState","updated_at"]} empty={t.empty} locale={locale} /></div></details>)}</Panel></div>
    <Panel id="operations" title={t.operations}><Table rows={attention} columns={["tenantName","file_format","status","created_at"]} empty={t.empty} locale={locale} /></Panel>
  </div>;
}
