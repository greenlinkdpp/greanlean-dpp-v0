"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";

type Workspace = { project: any; assessments: any[]; tasks: any[]; products: any[] };

export function P0ProjectDetail({ projectId }: { projectId: string }) {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batteryCategory: "INDUSTRIAL", intendedUse: "home energy storage", ratedEnergyKwh: "14.336",
    euMarketStatus: "PLANNED", placingOperatorRole: "MANUFACTURER", disclaimerAcknowledged: false,
  });

  async function load() {
    setError("");
    try { setWorkspace(await authenticatedFetch<Workspace>(`/api/v1/projects/${projectId}`)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Load failed."); }
  }
  useEffect(() => { void load(); }, [projectId]);

  async function assess(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await authenticatedFetch(`/api/v1/projects/${projectId}/applicability`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          ratedEnergyKwh: form.ratedEnergyKwh ? Number(form.ratedEnergyKwh) : null,
          availableEvidence: [],
        }),
      });
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Save failed."); }
    finally { setSaving(false); }
  }

  if (!workspace && !error) return <p className="text-sm font-semibold text-slate-500">{zh ? "正在加载项目..." : "Loading project..."}</p>;

  return (
    <div className="space-y-8">
      {error ? <div className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}
      {workspace ? (
        <>
          <header className="border-b border-slate-200 pb-7">
            <p className="text-xs font-black uppercase text-emerald-700">{workspace.project.project_code}</p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">{workspace.project.name}</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">{workspace.project.scope_summary}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
              <span className="border border-slate-200 bg-white px-3 py-2">{workspace.project.status}</span>
              <span className="border border-slate-200 bg-white px-3 py-2">{workspace.project.applicability_result || (zh ? "未评估" : "Not assessed")}</span>
              <span className="border border-slate-200 bg-white px-3 py-2">{workspace.project.applicability_rule_version || "-"}</span>
            </div>
          </header>

          <section className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
            <form onSubmit={assess} className="h-fit border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black text-slate-950">{zh ? "适用性初评" : "Preliminary applicability"}</h2>
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-bold text-slate-700">{zh ? "电池类别" : "Battery category"}<select className="input mt-2 w-full" value={form.batteryCategory} onChange={(event) => setForm({ ...form, batteryCategory: event.target.value })}><option value="LMT">LMT</option><option value="EV">EV</option><option value="INDUSTRIAL">{zh ? "工业电池" : "Industrial"}</option><option value="PORTABLE">{zh ? "便携式" : "Portable"}</option><option value="SLI">SLI</option></select></label>
                <label className="block text-sm font-bold text-slate-700">{zh ? "预期用途" : "Intended use"}<input className="input mt-2 w-full" required value={form.intendedUse} onChange={(event) => setForm({ ...form, intendedUse: event.target.value })} /></label>
                <label className="block text-sm font-bold text-slate-700">{zh ? "额定能量 (kWh)" : "Rated energy (kWh)"}<input type="number" min="0" step="0.001" className="input mt-2 w-full" value={form.ratedEnergyKwh} onChange={(event) => setForm({ ...form, ratedEnergyKwh: event.target.value })} /></label>
                <label className="block text-sm font-bold text-slate-700">{zh ? "欧盟市场状态" : "EU market status"}<select className="input mt-2 w-full" value={form.euMarketStatus} onChange={(event) => setForm({ ...form, euMarketStatus: event.target.value })}><option value="YES">{zh ? "已投放" : "Yes"}</option><option value="PLANNED">{zh ? "计划投放" : "Planned"}</option><option value="NO">{zh ? "不投放" : "No"}</option><option value="UNKNOWN">{zh ? "待确认" : "Unknown"}</option></select></label>
                <label className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-600"><input type="checkbox" className="mt-1" checked={form.disclaimerAcknowledged} onChange={(event) => setForm({ ...form, disclaimerAcknowledged: event.target.checked })} /><span>{zh ? "我确认这是基于当前资料和规则版本的初步判断，不是法律认证。" : "I acknowledge this is a preliminary rule-based result, not legal certification."}</span></label>
              </div>
              <button disabled={saving || !form.disclaimerAcknowledged} className="btn-primary mt-5 w-full disabled:opacity-40">{saving ? (zh ? "评估中..." : "Assessing...") : (zh ? "保存初评并生成缺口" : "Save assessment and gaps")}</button>
            </form>

            <div className="space-y-8">
              <section className="border-y border-slate-200 bg-white">
                <div className="px-5 py-4"><h2 className="text-lg font-black text-slate-950">{zh ? "待办与缺口" : "Tasks and gaps"}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{workspace.tasks.filter((task) => task.status !== "DONE").length}</p></div>
                <div className="divide-y divide-slate-200 border-t border-slate-200">
                  {workspace.tasks.map((task) => <div key={task.id} className="grid gap-3 px-5 py-4 md:grid-cols-[100px_minmax(0,1fr)_100px]"><span className="text-xs font-black text-red-700">{task.priority}</span><div><h3 className="font-black text-slate-950">{task.title}</h3><p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{task.description}</p></div><span className="text-xs font-black text-slate-500">{task.status}</span></div>)}
                  {!workspace.tasks.length ? <p className="px-5 py-8 text-sm font-semibold text-slate-500">{zh ? "保存初评后自动生成缺口任务。" : "Gap tasks are generated after an assessment."}</p> : null}
                </div>
              </section>
              <section className="border-y border-slate-200 bg-white px-5 py-5"><h2 className="text-lg font-black text-slate-950">{zh ? "产品范围" : "Product scope"}</h2><p className="mt-2 text-sm font-semibold text-slate-500">{zh ? `${workspace.products.length} 个已明确归属的产品型号` : `${workspace.products.length} explicitly assigned product models`}</p></section>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
