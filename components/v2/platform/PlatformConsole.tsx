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

function Cell({ value }: { value: unknown }) {
  return <span className="block max-w-xs truncate">{value === null || value === undefined || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}</span>;
}

function Table({ rows, columns, empty }: { rows: Row[]; columns: string[]; empty: string }) {
  if (!rows.length) return <div className="border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">{empty}</div>;
  return <div className="overflow-x-auto border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">{column.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column} className="px-4 py-3 font-medium text-slate-700"><Cell value={row[column]} /></td>)}</tr>)}</tbody></table></div>;
}

function Panel({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-slate-950">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}<div className="mt-4">{children}</div></section>;
}

export function PlatformConsole() {
  const { locale } = useLanguage();
  const [data, setData] = useState<PlatformData>({ tenants: [], organisations: [], products: [], dpps: [], imports: [], audit: [] });
  const [activeTenantId, setActiveTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const t = locale === "zh" ? {
    eyebrow: "GreanLean 平台", title: "Platform 多租户运营控制台", role: "平台管理员 · 全部租户",
    tenant: "当前租户", enter: "进入租户工作区", tenants: "租户管理", organisations: "全部组织", products: "全部产品", dpps: "全部 DPP",
    operations: "导入与运营状态", users: "用户与权限", audit: "审计日志", system: "系统 / 集成状态",
    empty: "暂无记录", scope: "平台读取保留租户归属；任何业务写入必须先选择并验证当前租户。",
  } : {
    eyebrow: "GreanLean Platform", title: "Platform multi-Tenant operations", role: "Platform Admin · All Tenants",
    tenant: "Current Tenant", enter: "Enter Tenant workspace", tenants: "Tenant management", organisations: "All organisations", products: "All products", dpps: "All DPPs",
    operations: "Import and operations status", users: "Users & permissions", audit: "Audit logs", system: "System / integration status",
    empty: "No records", scope: "Platform reads retain Tenant ownership; every business write requires a selected and verified active Tenant.",
  };

  useEffect(() => {
    let live = true;
    void (async () => {
      const { data: sessionData } = await createSupabaseClient().auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
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
      const reference = next.tenants.find((tenant) => tenant.code === "greanlean-reference-mobility") || next.tenants[0];
      setActiveTenantId(reference?.id || "");
      setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  const selected = useMemo(() => data.tenants.find((tenant) => tenant.id === activeTenantId), [activeTenantId, data.tenants]);
  if (loading) return <div className="grid min-h-[55vh] place-items-center font-bold text-slate-500">{locale === "zh" ? "正在加载平台范围…" : "Loading platform scope…"}</div>;
  if (error) return <div className="border border-red-200 bg-red-50 p-6 font-bold text-red-900">{error}</div>;

  return <div className="mx-auto max-w-[1600px] space-y-6">
    <header className="border border-slate-200 bg-slate-950 p-6 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">{t.eyebrow}</p><div className="mt-2 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><h1 className="text-3xl font-black">{t.title}</h1><p className="mt-2 text-sm font-semibold text-slate-300">{t.role}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{t.scope}</p></div><div className="min-w-[300px] border border-white/15 bg-white/5 p-4"><label htmlFor="platform-active-tenant" className="text-xs font-black uppercase text-slate-300">{t.tenant}</label><select id="platform-active-tenant" value={activeTenantId} onChange={(event) => setActiveTenantId(event.target.value)} className="mt-2 w-full bg-white px-3 py-2 text-sm font-bold text-slate-950">{data.tenants.filter((tenant) => tenant.status === "ACTIVE").map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.code}</option>)}</select>{selected && <Link href={`/dashboard/v2?tenant=${encodeURIComponent(selected.code)}&lang=${locale}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center bg-emerald-400 px-4 text-sm font-black text-slate-950">{t.enter}: {selected.name}</Link>}</div></div></header>
    <nav aria-label="Platform console sections" className="flex gap-2 overflow-x-auto bg-white p-3 text-sm font-black shadow-sm">{[["tenants",t.tenants],["organisations",t.organisations],["products",t.products],["dpps",t.dpps],["operations",t.operations],["audit",t.audit]].map(([id,label]) => <a key={id} href={`#${id}`} className="whitespace-nowrap border border-slate-200 px-3 py-2 hover:bg-slate-50">{label}</a>)}</nav>
    <div className="grid gap-4 sm:grid-cols-3">{[[t.tenants,data.tenants.length],[t.products,data.products.length],[t.dpps,data.dpps.length]].map(([label,value]) => <div key={String(label)} className="border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</div>
    <Panel id="tenants" title={t.tenants}><Table rows={data.tenants} columns={["name","code","status","organisationCount","modelCount","passportCount"]} empty={t.empty} /></Panel>
    <Panel id="organisations" title={t.organisations}><Table rows={data.organisations} columns={["tenantName","legal_name","trading_name","organisation_type","country","status","updated_at"]} empty={t.empty} /></Panel>
    <Panel id="products" title={t.products}><Table rows={data.products} columns={["tenantName","model_code","name","product_category","status","updated_at"]} empty={t.empty} /></Panel>
    <Panel id="dpps" title={t.dpps}><Table rows={data.dpps} columns={["tenantName","passport_identifier","subject_type","status","currentVersion","publicationState","publishedAt"]} empty={t.empty} /></Panel>
    <Panel id="operations" title={t.operations}><Table rows={data.imports} columns={["tenantName","file_format","status","created_at","committed_at"]} empty={t.empty} /></Panel>
    <div className="grid gap-6 xl:grid-cols-2"><Panel title={t.users}><p className="text-sm leading-6 text-slate-600">{locale === "zh" ? "平台授权与未来租户成员授权保持分离。此阶段未开放客户登录。" : "Platform authority remains separate from future Tenant membership authority. Customer login is not opened in this stage."}</p></Panel><Panel id="system" title={t.system}><p className="text-sm leading-6 text-slate-600">{locale === "zh" ? "连接器、Registry 和 Production 文件导入开关保持现状；本页只提供授权后的运行可见性。" : "Connector, Registry and Production file-import switches remain unchanged; this page provides authorised operating visibility only."}</p></Panel></div>
    <Panel id="audit" title={t.audit}><Table rows={data.audit} columns={["tenantName","platform_capability","resource_type","operation","decision","reason_code","correlation_id","created_at"]} empty={t.empty} /></Panel>
  </div>;
}
