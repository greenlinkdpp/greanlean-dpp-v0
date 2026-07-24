"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import { DPP_SECTOR_PROFILES, findDppSectorProfile, uniqueByCode } from "@/lib/dppSectorProfiles";
import { useLanguage } from "@/components/LanguageProvider";

type Product = {
  id: string;
  name: string;
  name_zh?: string | null;
  sku: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  description_zh?: string | null;
  status: string | null;
  public_slug: string | null;
  dpp_id: string | null;
  sector_code?: string | null;
  category_code?: string | null;
  subcategory_code?: string | null;
  dpp_profile_key?: string | null;
};
const PAGE_SIZE = 8;
const LIFECYCLE_STATUSES = ["draft", "review", "published", "updated", "archived", "expired"];

function statusLabel(status: string | null | undefined, locale: string) {
  const zh: Record<string, string> = { draft: "草稿", review: "待审核", published: "已发布", updated: "已更新", archived: "已归档", expired: "证书过期" };
  const en: Record<string, string> = { draft: "Draft", review: "In review", published: "Published", updated: "Updated", archived: "Archived", expired: "Certificate expired" };
  return (locale === "zh" ? zh : en)[status || "draft"] || status || "draft";
}

export function ProductManager() {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const t = locale === "zh"
    ? {
        create: "创建 DPP",
        chooseProfile: "第一步：选择行业 / 品类 / 模板",
        sector: "行业",
        categoryLevel: "产品类别",
        profileLevel: "细分模板",
        basicInfo: "第二步：填写基础产品信息",
        name: "产品名称（英文）",
        nameZh: "产品名称（中文）",
        sku: "SKU",
        brand: "品牌",
        category: "业务分类",
        desc: "描述（英文）",
        descZh: "描述（中文）",
        submit: "创建草稿",
        creating: "创建中...",
        list: "产品列表",
        noSku: "无 SKU",
	        edit: "编辑",
	        simple: "消费者版 DPP",
	        detail: "专业版 DPP",
	        audit: "审计版 DPP",
	        del: "删除",
        confirm: "确定删除这个产品吗？",
        empty: "暂无产品。",
        created: "产品草稿已创建。",
        search: "搜索产品...",
        all: "全部",
        prev: "上一页",
        next: "下一页",
        refresh: "刷新",
        demo: "演示",
      }
    : {
        create: "Create DPP",
        chooseProfile: "Step 1: Choose sector / category / template",
        sector: "Sector",
        categoryLevel: "Product category",
        profileLevel: "Detailed profile",
        basicInfo: "Step 2: Enter basic product information",
        name: "Product name (English)",
        nameZh: "Product name (Chinese)",
        sku: "SKU",
        brand: "Brand",
        category: "Business category",
        desc: "Description (English)",
        descZh: "Description (Chinese)",
        submit: "Create Draft",
        creating: "Creating...",
        list: "Products",
        noSku: "No SKU",
	        edit: "Edit",
	        simple: "Consumer DPP",
	        detail: "Professional DPP",
	        audit: "Audit DPP",
	        del: "Delete",
        confirm: "Delete this product?",
        empty: "No products yet.",
        created: "Product draft created.",
        search: "Search products...",
        all: "All",
        prev: "Previous",
        next: "Next",
        refresh: "Refresh",
        demo: "Demo",
      };
  const defaultProfile = DPP_SECTOR_PROFILES[0];
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sectorCode, setSectorCode] = useState(defaultProfile?.sectorCode || "");
  const [categoryCode, setCategoryCode] = useState(defaultProfile?.categoryCode || "");
  const [profileKey, setProfileKey] = useState(defaultProfile?.profileKey || "");

  async function load(){ setLoading(true); const {data,error}=await supabase.from("products").select("*").order("created_at",{ascending:false}); if(error)setMsg(error.message); else setProducts(data||[]); setLoading(false); }
  useEffect(()=>{load();/* eslint-disable-next-line */},[]);
  const filtered=useMemo(()=>products.filter(p=>(status==="all"||p.status===status)&&(!q.trim()||[p.name,p.name_zh,p.sku,p.brand,p.category,p.public_slug,p.dpp_id].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()))),[products,q,status]);
  const total=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)); const rows=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE); useEffect(()=>setPage(1),[q,status]);
  const selectedProfile = findDppSectorProfile(profileKey) || defaultProfile;
  const sectorOptions = uniqueByCode(DPP_SECTOR_PROFILES, "sectorCode");
  const categoryOptions = uniqueByCode(
    DPP_SECTOR_PROFILES.filter((profile) => !sectorCode || profile.sectorCode === sectorCode),
    "categoryCode",
  );
  const profileOptions = DPP_SECTOR_PROFILES.filter(
    (profile) => (!sectorCode || profile.sectorCode === sectorCode) && (!categoryCode || profile.categoryCode === categoryCode),
  );

  async function createProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const name = String(f.get("name") || "").trim();
    const sku = String(f.get("sku") || "").trim();
    const profile = findDppSectorProfile(String(f.get("dpp_profile_key") || "")) || selectedProfile;

    setSaving(true);
    setMsg("");
    const { error } = await supabase.from("products").insert({
      name,
      name_zh: String(f.get("name_zh") || "").trim() || null,
      sku,
      brand: String(f.get("brand") || "").trim() || null,
      category: String(f.get("category") || "").trim() || profile?.categoryName || null,
      subcategory: profile?.subcategoryName || null,
      sector_code: profile?.sectorCode || null,
      category_code: profile?.categoryCode || null,
      subcategory_code: profile?.subcategoryCode || null,
      dpp_profile_key: profile?.profileKey || null,
      granularity_level: profile?.granularityLevels?.includes("item") ? "item" : profile?.granularityLevels?.[0] || "model",
      description: String(f.get("description") || "").trim() || null,
      description_zh: String(f.get("description_zh") || "").trim() || null,
      public_slug: slugify(name + "-" + (sku || Date.now())),
      dpp_id: "DPP-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      status: "draft",
      current_version: "v1.0",
      eu_registration_status: "not_registered",
    });
    if (error) setMsg(error.message);
    else {
      setMsg(t.created);
      formEl.reset();
      setSectorCode(defaultProfile?.sectorCode || "");
      setCategoryCode(defaultProfile?.categoryCode || "");
      setProfileKey(defaultProfile?.profileKey || "");
      await load();
    }
    setSaving(false);
  }
  async function remove(id:string){ if(!window.confirm(t.confirm))return; const {error}=await supabase.from("products").delete().eq("id",id); if(error)setMsg(error.message); else await load(); }
  return (
    <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
      <form onSubmit={createProduct} className="card h-fit space-y-5">
        <h2 className="text-xl font-bold">{t.create}</h2>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <h3 className="text-sm font-black text-slate-950">{t.chooseProfile}</h3>
          <div className="mt-4 space-y-3">
            <label>
              <span className="label">{t.sector}</span>
              <select
                className="input mt-1"
                value={sectorCode}
                onChange={(event) => {
                  const nextSector = event.target.value;
                  const nextCategory = DPP_SECTOR_PROFILES.find((profile) => profile.sectorCode === nextSector)?.categoryCode || "";
                  const nextProfile = DPP_SECTOR_PROFILES.find((profile) => profile.sectorCode === nextSector && profile.categoryCode === nextCategory);
                  setSectorCode(nextSector);
                  setCategoryCode(nextCategory);
                  setProfileKey(nextProfile?.profileKey || "");
                }}
              >
                {sectorOptions.map((profile) => (
                  <option key={profile.sectorCode} value={profile.sectorCode}>
                    {locale === "zh" ? profile.sectorNameZh : profile.sectorName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">{t.categoryLevel}</span>
              <select
                className="input mt-1"
                value={categoryCode}
                onChange={(event) => {
                  const nextCategory = event.target.value;
                  const nextProfile = DPP_SECTOR_PROFILES.find((profile) => profile.sectorCode === sectorCode && profile.categoryCode === nextCategory);
                  setCategoryCode(nextCategory);
                  setProfileKey(nextProfile?.profileKey || "");
                }}
              >
                {categoryOptions.map((profile) => (
                  <option key={profile.categoryCode} value={profile.categoryCode}>
                    {locale === "zh" ? profile.categoryNameZh : profile.categoryName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">{t.profileLevel}</span>
              <select
                className="input mt-1"
                name="dpp_profile_key"
                value={profileKey}
                onChange={(event) => {
                  const nextProfile = findDppSectorProfile(event.target.value);
                  setProfileKey(event.target.value);
                  if (nextProfile) {
                    setSectorCode(nextProfile.sectorCode);
                    setCategoryCode(nextProfile.categoryCode);
                  }
                }}
              >
                {profileOptions.map((profile) => (
                  <option key={profile.profileKey} value={profile.profileKey}>
                    {locale === "zh" ? profile.subcategoryNameZh : profile.subcategoryName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-950">{t.basicInfo}</h3>
          <input className="input" name="name" placeholder={t.name} required />
          <input className="input" name="name_zh" placeholder={t.nameZh} />
          <input className="input" name="sku" placeholder={t.sku} />
          <input className="input" name="brand" placeholder={t.brand} />
          <input className="input" name="category" placeholder={`${t.category}: ${selectedProfile?.categoryName || ""}`} />
          <textarea className="input min-h-24" name="description" placeholder={t.desc} />
          <textarea className="input min-h-24" name="description_zh" placeholder={t.descZh} />
        </div>

        <button disabled={saving} className="btn-primary w-full">
          {saving ? t.creating : t.submit}
        </button>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </form>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{t.list}</h2>
            <p className="mt-1 text-sm text-slate-500">{filtered.length} / {products.length}</p>
          </div>
          <button onClick={load} className="btn-secondary py-2" type="button">{t.refresh}</button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t.all}</option>
            {LIFECYCLE_STATUSES.map((option) => (
              <option key={option} value={option}>{statusLabel(option, locale)}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="mt-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        ) : (
          <div className="mt-4 divide-y divide-slate-200">
            {rows.map((p) => {
              const dppPath = encodeURIComponent(p.dpp_id || p.public_slug || "");
              const rowProfile = findDppSectorProfile(p.dpp_profile_key);
              const isDemo = /demo/i.test([p.dpp_id, p.public_slug, p.description, p.description_zh].filter(Boolean).join(" "));
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{locale === "zh" && p.name_zh ? p.name_zh : p.name}</p>
                      {isDemo && <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-black text-amber-900">{t.demo}</span>}
                    </div>
                    <p className="text-sm text-slate-500">{p.sku || t.noSku} · {statusLabel(p.status, locale)} · {p.brand || "—"}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {rowProfile ? (locale === "zh" ? rowProfile.nameZh : rowProfile.name) : p.dpp_profile_key || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
	                    <Link className="btn-secondary py-2" href={`/dashboard/products/${p.id}`}>{t.edit}</Link>
	                    {dppPath && <Link className="btn-secondary py-2" href={`/p/${dppPath}?view=consumer&lang=${locale}&preview=1`} target="_blank">{t.simple}</Link>}
	                    {dppPath && <Link className="btn-primary py-2" href={`/p/${dppPath}?view=professional&lang=${locale}&preview=1`} target="_blank">{t.detail}</Link>}
	                    {dppPath && <Link className="btn-secondary py-2" href={`/p/${dppPath}?view=audit&lang=${locale}&preview=1`} target="_blank">{t.audit}</Link>}
	                    <button onClick={() => remove(p.id)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" type="button">{t.del}</button>
                  </div>
                </div>
              );
            })}
            {!rows.length && <p className="py-8 text-center text-slate-500">{t.empty}</p>}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary py-2 disabled:opacity-50" type="button">{t.prev}</button>
          <p className="text-sm text-slate-500">{page} / {total}</p>
          <button disabled={page >= total} onClick={() => setPage((p) => Math.min(total, p + 1))} className="btn-secondary py-2 disabled:opacity-50" type="button">{t.next}</button>
        </div>
      </div>
    </div>
  );
}
