"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";

type Project = {
  id: string;
  project_code: string;
  name: string;
  project_type: string;
  scope_summary: string;
  status: string;
  target_date?: string | null;
  applicability_result?: string | null;
  updated_at: string;
};

export function P0ProjectManager() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ projectCode: "", name: "", scopeSummary: "", targetDate: "" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setProjects(await authenticatedFetch<Project[]>("/api/v1/projects"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await authenticatedFetch<Project>("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify({ ...form, projectType: "PILOT", targetMarket: ["EU"] }),
      });
      setForm({ projectCode: "", name: "", scopeSummary: "", targetDate: "" });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const labels: Record<string, string> = zh ? {
    DRAFT: "草稿", ACTIVE: "进行中", BLOCKED: "受阻", ACCEPTANCE: "验收中", COMPLETED: "已完成", ARCHIVED: "已归档",
    PRELIMINARY_APPLICABLE: "初步适用", NOT_APPLICABLE: "初步不适用", PENDING: "待确认", INSUFFICIENT: "信息不足",
  } : {};

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-200 pb-7">
        <p className="text-xs font-black uppercase text-emerald-700">{zh ? "P0 交付主线" : "P0 delivery workflow"}</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">{zh ? "项目与适用性" : "Projects and applicability"}</h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
          {zh ? "先建立组织范围和试点项目，再记录带规则版本的初步适用性判断、待确认问题与缺口任务。这里不输出法律认证结论。" : "Create an organisation-scoped pilot, then record versioned preliminary applicability, open questions and gap tasks. This workflow does not issue legal certification."}
        </p>
      </header>

      {error ? <div className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}

      <section className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submit} className="h-fit border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black text-slate-950">{zh ? "创建单型号试点" : "Create a single-model pilot"}</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              {zh ? "项目编号" : "Project code"}
              <input className="input mt-2 w-full" required value={form.projectCode} onChange={(event) => setForm({ ...form, projectCode: event.target.value })} placeholder="PILOT-2026-001" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              {zh ? "项目名称" : "Project name"}
              <input className="input mt-2 w-full" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              {zh ? "实施范围" : "Scope"}
              <textarea className="input mt-2 min-h-28 w-full" required value={form.scopeSummary} onChange={(event) => setForm({ ...form, scopeSummary: event.target.value })} />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              {zh ? "目标日期" : "Target date"}
              <input type="date" className="input mt-2 w-full" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
            </label>
          </div>
          <button disabled={saving} className="btn-primary mt-5 w-full disabled:opacity-50">{saving ? (zh ? "创建中..." : "Creating...") : (zh ? "创建试点" : "Create pilot")}</button>
        </form>

        <div className="border-y border-slate-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">{zh ? "项目列表" : "Projects"}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{projects.length}</p>
            </div>
            <button className="btn-secondary" onClick={() => void load()}>{zh ? "刷新" : "Refresh"}</button>
          </div>
          {loading ? <p className="border-t border-slate-200 px-5 py-10 text-sm font-semibold text-slate-500">{zh ? "正在加载..." : "Loading..."}</p> : null}
          {!loading && !projects.length ? <p className="border-t border-slate-200 px-5 py-10 text-sm font-semibold text-slate-500">{zh ? "尚未创建项目。" : "No projects yet."}</p> : null}
          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {projects.map((project) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}?lang=${locale}`} className="grid gap-4 px-5 py-5 transition hover:bg-emerald-50/40 md:grid-cols-[minmax(0,1fr)_180px_120px] md:items-center">
                <div>
                  <p className="text-xs font-black uppercase text-emerald-700">{project.project_code} · {project.project_type}</p>
                  <h3 className="mt-2 text-lg font-black text-slate-950">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-500">{project.scope_summary}</p>
                </div>
                <div className="text-sm font-bold text-slate-600">
                  <p>{labels[project.applicability_result || ""] || project.applicability_result || (zh ? "未评估" : "Not assessed")}</p>
                  <p className="mt-1 text-xs text-slate-400">{project.target_date || "-"}</p>
                </div>
                <span className="text-sm font-black text-emerald-700">{labels[project.status] || project.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
