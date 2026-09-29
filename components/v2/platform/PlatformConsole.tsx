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
  if (!rows.length) return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">{empty}</div>;
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">{column.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white">{rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column} className="px-4 py-3 font-medium text-slate-700"><Cell value={row[column]} /></td>)}</tr>)}</tbody></table></div>;
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
  const t = locale === "zh" ? {
    eyebrow: "平台运营", title: "平台总览", role: "平台管理员 · 全部租户",
    tenant: "Active Tenant", chooseTenant: "请选择 Tenant", enter: "进入租户工作区", tenants: "Tenant 运营进度", products: "全部产品", dpps: "全部 DPP",
    operations: "需要关注", empty: "暂无记录", scope: "跨 Tenant 读取始终保留归属。进入业务工作区前，必须显式选择并验证 Active Tenant。",
    models: "产品型号", passports: "DPP 护照", attention: "运营异常", action: "操作", noSelection: "未选择 Tenant，不会建立业务写入上下文。",
  } : {
    eyebrow: "Platform Operations", title: "Platform Overview", role: "Platform Admin · All Tenants",
    tenant: "Active Tenant", chooseTenant: "Select a Tenant", enter: "Enter Tenant workspace", tenants: "Tenant operating progress", products: "All products", dpps: "All DPPs",
    operations: "Needs attention", empty: "No records", scope: "Cross-Tenant reads retain ownership. An Active Tenant must be explicitly selected and verified before entering a business workspace.",
    models: "Product models", passports: "DPP passports", attention: "Operational exceptions", action: "Action", noSelection: "No Tenant selected; no business-write context has been established.",
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
      setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  const selected = useMemo(() => data.tenants.find((tenant) => tenant.id === activeTenantId), [activeTenantId, data.tenants]);
  const attention = useMemo(() => data.imports.filter((item) => ["FAILED", "QUARANTINED"].includes(String(item.status).toUpperCase())), [data.imports]);
  if (loading) return <div className="grid min-h-[55vh] place-items-center font-bold text-slate-500">{locale === "zh" ? "正在加载平台范围…" : "Loading platform scope…"}</div>;
  if (error) return <div className="border border-red-200 bg-red-50 p-6 font-bold text-red-900">{error}</div>;

  return <div className="mx-auto max-w-[1600px] space-y-6">
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">{t.eyebrow}</p><h1 className="mt-2 text-3xl font-black text-[#133f38]">{t.title}</h1><p className="mt-2 text-sm font-semibold text-slate-500">{t.role}</p><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t.scope}</p></div>
      <div className="min-w-[320px] rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm"><label htmlFor="platform-active-tenant" className="text-xs font-black uppercase tracking-wide text-slate-500">{t.tenant}</label><select id="platform-active-tenant" value={activeTenantId} onChange={(event) => setActiveTenantId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950"><option value="">{t.chooseTenant}</option>{data.tenants.filter((tenant) => tenant.status === "ACTIVE").map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.code}</option>)}</select>{selected ? <Link href={`/dashboard/v2?tenant=${encodeURIComponent(selected.code)}&lang=${locale}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#134d44] px-4 text-sm font-black text-white hover:bg-[#0b3832]">{t.enter}: {selected.name}</Link> : <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{t.noSelection}</p>}</div>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[[t.tenants,data.tenants.length],[t.models,data.products.length],[t.passports,data.dpps.length],[t.attention,attention.length]].map(([label,value]) => <div key={String(label)} className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-[#133f38]">{value}</p></div>)}</div>
    <Panel id="tenants" title={t.tenants} subtitle={locale === "zh" ? "每个入口均显式携带 Tenant code，服务端仍会重新验证平台权限与 Tenant 状态。" : "Every entry carries an explicit Tenant code; the server still revalidates platform authority and Tenant status."}>
      {data.tenants.length ? <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-50"><tr>{["Tenant","Status",t.models,t.passports,t.action].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white">{data.tenants.map((tenant) => <tr key={String(tenant.id)}><td className="px-4 py-3"><p className="font-black text-slate-900">{tenant.name}</p><p className="mt-1 text-xs text-slate-500">{tenant.code}</p></td><td className="px-4 py-3 font-bold text-slate-700">{tenant.status}</td><td className="px-4 py-3 font-bold text-slate-700">{tenant.modelCount ?? 0}</td><td className="px-4 py-3 font-bold text-slate-700">{tenant.passportCount ?? 0}</td><td className="px-4 py-3"><Link href={`/dashboard/v2?tenant=${encodeURIComponent(tenant.code)}&lang=${locale}`} className="inline-flex min-h-10 items-center rounded-lg border border-[#134d44] px-3 text-xs font-black text-[#134d44] hover:bg-emerald-50">{t.enter}</Link></td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">{t.empty}</p>}
    </Panel>
    <div className="grid gap-6 xl:grid-cols-2"><Panel id="products" title={t.products}><Table rows={data.products} columns={["tenantName","model_code","name","status"]} empty={t.empty} /></Panel><Panel id="dpps" title={t.dpps}><Table rows={data.dpps} columns={["tenantName","passport_identifier","status","publicationState"]} empty={t.empty} /></Panel></div>
    <Panel id="operations" title={t.operations}><Table rows={attention} columns={["tenantName","file_format","status","created_at"]} empty={t.empty} /></Panel>
  </div>;
}
