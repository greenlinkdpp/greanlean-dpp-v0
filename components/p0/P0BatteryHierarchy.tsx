"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { PublicationWorkflowManager } from "@/components/PublicationWorkflowManager";

type Hierarchy = { ownership: any; model: any; batches: any[]; items: any[]; publications: any[] };

export function P0BatteryHierarchy({ productId }: { productId: string }) {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const [data, setData] = useState<Hierarchy | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [serials, setSerials] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  async function load() {
    setError("");
    try { setData(await authenticatedFetch<Hierarchy>(`/api/v1/product-models/${productId}/hierarchy`)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Load failed."); }
  }
  useEffect(() => { void load(); }, [productId]);

  async function assign() {
    setSaving(true); setError("");
    try {
      await authenticatedFetch(`/api/v1/product-models/${productId}/hierarchy`, { method: "POST", body: JSON.stringify({ projectId: null }) });
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Assignment failed."); }
    finally { setSaving(false); }
  }

  async function bulkCreate(event: FormEvent) {
    event.preventDefault();
    const rows = serials.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (!rows.length) return;
    setSaving(true); setError("");
    try {
      await authenticatedFetch(`/api/v1/product-models/${productId}/items-bulk`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          batchId: data?.batches?.[0]?.id || null,
          items: rows.map((serialNumber) => ({ serialNumber, sourceSystem: "P0_BACKOFFICE" })),
        }),
      });
      setSerials("");
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Bulk creation failed."); }
    finally { setSaving(false); }
  }

  return <section className="border-y border-slate-200 bg-white">
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
      <div><p className="text-xs font-black uppercase text-emerald-700">MODEL → BATCH → ITEM</p><h3 className="mt-2 text-lg font-black text-slate-950">{zh ? "电池产品层级与唯一标识" : "Battery hierarchy and unique identifiers"}</h3><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">{zh ? "型号数据向批次和单体继承；单体序列号在组织内唯一，发布前必须预留 HTTPS UPI。" : "Model data is inherited by batches and items. Item serials are unique within the organisation and require an HTTPS UPI before publication."}</p></div>
      <button className="btn-secondary" onClick={() => void load()}>{zh ? "刷新" : "Refresh"}</button>
    </div>
    {error ? <div className="mx-5 mb-5 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}
    {data ? <div className="border-t border-slate-200 px-5 py-5">
      {!data.ownership?.organisation_id ? <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-4"><h4 className="font-black text-amber-950">{zh ? "需要明确产品归属" : "Product ownership is required"}</h4><p className="mt-1 text-sm font-semibold leading-6 text-amber-900">{zh ? "历史产品不会被系统自动归属。确认后，型号、现有批次和单体将绑定到当前组织。" : "Legacy products are never assigned automatically. Confirmation binds the model and existing hierarchy to the current organisation."}</p><button disabled={saving} onClick={() => void assign()} className="btn-primary mt-4">{zh ? "确认归属当前组织" : "Assign to current organisation"}</button></div> : <>
        <div className="grid gap-px bg-slate-200 md:grid-cols-3"><div className="bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">{zh ? "型号" : "Model"}</p><p className="mt-2 font-black text-slate-950">{data.model.battery_model_identifier || "-"}</p></div><div className="bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">{zh ? "批次" : "Batches"}</p><p className="mt-2 text-2xl font-black text-slate-950">{data.batches.length}</p></div><div className="bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">{zh ? "单体" : "Items"}</p><p className="mt-2 text-2xl font-black text-slate-950">{data.items.length}</p></div></div>
        <form onSubmit={bulkCreate} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"><label className="text-sm font-bold text-slate-700">{zh ? "批量单体序列号（每行一个，最多 100 个）" : "Item serials (one per line, maximum 100)"}<textarea className="input mt-2 min-h-28 w-full font-mono" value={serials} onChange={(event) => setSerials(event.target.value)} placeholder="SERIAL-0001\nSERIAL-0002" /></label><button disabled={saving || !serials.trim()} className="btn-primary self-end disabled:opacity-40">{saving ? (zh ? "处理中..." : "Processing...") : (zh ? "预检并批量创建" : "Validate and create")}</button></form>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-left text-sm"><thead><tr className="border-y border-slate-200 text-xs font-black text-slate-500"><th className="px-3 py-3">{zh ? "序列号" : "Serial"}</th><th className="px-3 py-3">UPI</th><th className="px-3 py-3">{zh ? "状态" : "Status"}</th><th className="px-3 py-3">{zh ? "发布版本" : "Publication"}</th><th className="px-3 py-3">{zh ? "操作" : "Action"}</th></tr></thead><tbody>{data.items.map((item) => { const pointer = data.publications.find((entry) => entry.battery_item_id === item.id); return <tr key={item.id} className="border-b border-slate-200"><td className="px-3 py-3 font-black text-slate-950">{item.serial_identifier}</td><td className="max-w-md break-all px-3 py-3 font-semibold text-slate-600">{item.unique_product_identifier || (zh ? "待预留" : "Pending")}</td><td className="px-3 py-3 font-bold text-slate-600">{item.p0_item_status}</td><td className="px-3 py-3 font-bold text-emerald-700">{pointer?.publication?.version_number ? `v${pointer.publication.version_number}` : "-"}</td><td className="px-3 py-3"><button type="button" className="btn-secondary" onClick={() => setSelectedItemId(item.id)}>{zh ? "审核与发布" : "Review & publish"}</button></td></tr>; })}</tbody></table></div>
        {selectedItemId ? <div className="mt-6 border-t border-slate-200 pt-6"><PublicationWorkflowManager productId={productId} batteryItemId={selectedItemId} /></div> : null}
      </>}
    </div> : <p className="border-t border-slate-200 px-5 py-8 text-sm font-semibold text-slate-500">{zh ? "正在加载层级..." : "Loading hierarchy..."}</p>}
  </section>;
}
