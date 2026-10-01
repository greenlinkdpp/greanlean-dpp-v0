"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Demo = { id: string; category_code: string; title_en: string; title_zh: string; brand: string; sort_order: number; is_featured: boolean; is_public: boolean; passport_id: string };

export function PlatformDemoManager() {
  const { locale } = useLanguage();
  const [rows, setRows] = useState<Demo[]>([]); const [token, setToken] = useState(""); const [message, setMessage] = useState("");
  const zh = locale === "zh";
  async function load(accessToken = token) {
    if (!accessToken) return;
    const response = await fetch("/api/v2/platform/demos?pageSize=100", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(String(body?.error?.message || "Demo catalog could not be loaded.")); return; }
    setRows(body.data?.rows || []);
  }
  useEffect(() => { void (async () => { const { data } = await createSupabaseClient().auth.getSession(); const accessToken = data.session?.access_token || ""; setToken(accessToken); await load(accessToken); })(); }, []);
  async function update(id: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/v2/platform/demos/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(String(body?.error?.message || "Demo catalog update failed.")); return; }
    setMessage(zh ? "参考数据目录已保存。" : "Reference catalog saved."); await load();
  }
  return <main className="mx-auto max-w-6xl space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">{zh ? "平台运营" : "Platform Operations"}</p><h1 className="mt-2 text-3xl font-black text-[#133f38]">{zh ? "参考数据展厅管理" : "Reference Showcase management"}</h1><p className="mt-2 text-sm font-semibold text-slate-500">{zh ? "仅平台管理员可调整公开状态、排序和精选标识。参考 DPP 本身由受控发布流程建立。" : "Only Platform Admins can adjust public state, order, and featured state. Reference DPP content is created through the controlled publication flow."}</p></div><div className="flex gap-2"><Link href={`/demo?lang=${locale}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-black">{zh ? "查看公开展厅" : "View showcase"}</Link><Link href="/dashboard/platform" className="rounded-lg bg-[#134d44] px-4 py-2 text-sm font-black text-white">{zh ? "返回平台总览" : "Platform overview"}</Link></div></header>{message ? <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p> : null}<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500"><tr><th className="p-4">{zh ? "分类" : "Category"}</th><th className="p-4">{zh ? "标题" : "Title"}</th><th className="p-4">DPP</th><th className="p-4">{zh ? "排序" : "Order"}</th><th className="p-4">{zh ? "公开" : "Public"}</th><th className="p-4">{zh ? "精选" : "Featured"}</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="p-4 font-bold text-slate-600">{row.category_code}</td><td className="p-4"><p className="font-black text-slate-950">{zh ? row.title_zh : row.title_en}</p><p className="text-xs text-slate-500">{row.brand}</p></td><td className="p-4 font-mono text-xs text-slate-500">{row.passport_id}</td><td className="p-4"><input aria-label={`${row.title_en} order`} defaultValue={row.sort_order} type="number" min="0" className="w-20 border border-slate-300 px-2 py-1" onBlur={(event) => { const value = Number(event.target.value); if (Number.isInteger(value) && value !== row.sort_order) void update(row.id, { sort_order: value }); }} /></td><td className="p-4"><button onClick={() => void update(row.id, { is_public: !row.is_public })} className={`rounded-full px-3 py-1.5 text-xs font-black ${row.is_public ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{row.is_public ? (zh ? "已公开" : "Public") : (zh ? "未公开" : "Private")}</button></td><td className="p-4"><button onClick={() => void update(row.id, { is_featured: !row.is_featured })} className={`rounded-full px-3 py-1.5 text-xs font-black ${row.is_featured ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}>{row.is_featured ? (zh ? "精选" : "Featured") : "—"}</button></td></tr>)}</tbody></table></div></main>;
}
