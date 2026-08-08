"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { createSupabaseClient } from "@/lib/supabase";

export function OrganisationProfileManager() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const [workspace, setWorkspace] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ roleType: "MANUFACTURER", legalName: "", euContactName: "", euContactEmail: "", country: "", city: "", addressLine: "", verificationStatus: "NOT_STARTED" });

  async function load() {
    try {
      const data = await authenticatedFetch<any>("/api/v1/organisations/current");
      setWorkspace(data);
      setForm((current) => ({
        ...current,
        legalName: data.profile?.legal_name_snapshot || data.organisation.legal_name || "",
        roleType: data.profile?.role_type || "MANUFACTURER",
        euContactName: data.profile?.eu_contact_name || "",
        euContactEmail: data.profile?.eu_contact_email || "",
        country: data.profile?.legal_address_snapshot?.country || data.organisation.country_code || "",
        city: data.profile?.legal_address_snapshot?.city || "",
        addressLine: data.profile?.legal_address_snapshot?.addressLine || "",
        verificationStatus: data.profile?.verification_status || "NOT_STARTED",
      }));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Load failed."); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await authenticatedFetch("/api/v1/organisations/current", { method: "PUT", body: JSON.stringify({
        roleType: form.roleType, legalName: form.legalName, euContactName: form.euContactName,
        euContactEmail: form.euContactEmail, verificationStatus: form.verificationStatus,
        legalAddress: { country: form.country, city: form.city, addressLine: form.addressLine },
      }) });
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Save failed."); }
    finally { setSaving(false); }
  }

  async function exportProfile() {
    setError("");
    try {
      const { data } = await createSupabaseClient().auth.getSession();
      if (!data.session?.access_token) throw new Error("AUTH_REQUIRED");
      const response = await fetch("/api/v1/organisations/current/export", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("EXPORT_FAILED");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "economic-operator-profile.json";
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed.");
    }
  }

  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-7"><div><p className="text-xs font-black uppercase text-emerald-700">{zh ? "组织治理" : "Organisation governance"}</p><h1 className="mt-3 text-3xl font-black text-slate-950">{zh ? "经济运营者资料" : "Economic operator profile"}</h1><p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">{zh ? "资料每次保存都会创建新版本，历史法定名称、地址和验证状态不会被覆盖。" : "Each save creates a new profile version; previous legal details and verification status remain immutable."}</p></div><button type="button" onClick={() => void exportProfile()} className="btn-secondary">{zh ? "导出组织资料" : "Export profile"}</button></header>
    {error ? <div className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}
    {workspace ? <div className="grid gap-8 xl:grid-cols-[minmax(0,720px)_280px]">
      <form onSubmit={submit} className="border border-slate-200 bg-white p-6"><div className="grid gap-5 md:grid-cols-2"><label className="text-sm font-bold text-slate-700">{zh ? "运营者角色" : "Operator role"}<select className="input mt-2 w-full" value={form.roleType} onChange={(event) => setForm({ ...form, roleType: event.target.value })}><option>MANUFACTURER</option><option>IMPORTER</option><option>DISTRIBUTOR</option><option>AUTHORISED_REPRESENTATIVE</option><option>OTHER</option></select></label><label className="text-sm font-bold text-slate-700">{zh ? "法定名称" : "Legal name"}<input className="input mt-2 w-full" required value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></label><label className="text-sm font-bold text-slate-700">{zh ? "欧盟联系人" : "EU contact"}<input className="input mt-2 w-full" value={form.euContactName} onChange={(event) => setForm({ ...form, euContactName: event.target.value })} /></label><label className="text-sm font-bold text-slate-700">{zh ? "联系邮箱" : "Contact email"}<input type="email" className="input mt-2 w-full" value={form.euContactEmail} onChange={(event) => setForm({ ...form, euContactEmail: event.target.value })} /></label><label className="text-sm font-bold text-slate-700">{zh ? "国家代码" : "Country code"}<input className="input mt-2 w-full" maxLength={2} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value.toUpperCase() })} /></label><label className="text-sm font-bold text-slate-700">{zh ? "城市" : "City"}<input className="input mt-2 w-full" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label className="text-sm font-bold text-slate-700 md:col-span-2">{zh ? "注册地址" : "Registered address"}<input className="input mt-2 w-full" value={form.addressLine} onChange={(event) => setForm({ ...form, addressLine: event.target.value })} /></label></div><button disabled={saving} className="btn-primary mt-6 disabled:opacity-50">{saving ? (zh ? "保存中..." : "Saving...") : (zh ? "创建新资料版本" : "Create new profile version")}</button></form>
      <aside className="h-fit border-l-4 border-emerald-600 bg-emerald-50 p-5"><p className="text-xs font-black uppercase text-emerald-800">{zh ? "资料完整率" : "Profile completeness"}</p><p className="mt-3 text-4xl font-black text-emerald-950">{workspace.completeness.percent}%</p><p className="mt-2 text-sm font-semibold text-emerald-900">{workspace.completeness.completed} / {workspace.completeness.total}</p><div className="mt-4 h-2 bg-emerald-100"><div className="h-2 bg-emerald-600" style={{ width: `${workspace.completeness.percent}%` }} /></div><p className="mt-5 text-sm font-semibold text-emerald-900">{zh ? `当前版本：${workspace.profile?.version || 0}` : `Current version: ${workspace.profile?.version || 0}`}</p></aside>
    </div> : <p className="text-sm font-semibold text-slate-500">{zh ? "正在加载..." : "Loading..."}</p>}
  </div>;
}
