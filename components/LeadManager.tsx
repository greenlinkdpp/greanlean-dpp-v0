"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Lead = {
  id: string;
  name: string;
  company: string | null;
  contact: string;
  industry: string | null;
  message: string | null;
  status: string | null;
  source: string | null;
  created_at: string | null;
};

const STATUS_OPTIONS = ["new", "contacted", "closed"];

function formatDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function LeadManager() {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const t =
    locale === "zh"
      ? {
          refresh: "刷新",
          search: "搜索姓名、公司、联系方式、行业或需求",
          all: "全部",
          new: "新线索",
          contacted: "已联系",
          closed: "已关闭",
          empty: "暂无提交记录。",
          count: "条记录",
          contact: "联系方式",
          company: "公司",
          industry: "行业",
          source: "来源",
          submittedAt: "提交时间",
          note: "需求说明",
          status: "状态",
          loading: "正在加载客户提交信息...",
        }
      : {
          refresh: "Refresh",
          search: "Search name, company, contact, industry or message",
          all: "All",
          new: "New",
          contacted: "Contacted",
          closed: "Closed",
          empty: "No submissions yet.",
          count: "records",
          contact: "Contact",
          company: "Company",
          industry: "Industry",
          source: "Source",
          submittedAt: "Submitted",
          note: "Message",
          status: "Status",
          loading: "Loading customer submissions...",
        };

  async function load() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setLeads((data || []) as Lead[]);
    }

    setLoading(false);
  }

  async function updateStatus(id: string, nextStatus: string) {
    setMessage("");
    const { error } = await supabase.from("leads").update({ status: nextStatus }).eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setLeads((items) => items.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const statusMatch = status === "all" || (lead.status || "new") === status;
      const text = [lead.name, lead.company, lead.contact, lead.industry, lead.message, lead.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return statusMatch && (!keyword || text.includes(keyword));
    });
  }, [leads, query, status]);

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {filtered.length} / {leads.length} {t.count}
          </p>
        </div>
        <button onClick={load} className="btn-secondary py-2" type="button">
          {t.refresh}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px]">
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">{t.all}</option>
          <option value="new">{t.new}</option>
          <option value="contacted">{t.contacted}</option>
          <option value="closed">{t.closed}</option>
        </select>
      </div>

      {message ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p> : null}

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-100" />
          ))}
          <p className="text-sm text-slate-500">{t.loading}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {filtered.map((lead) => (
            <article key={lead.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950">{lead.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {t.submittedAt}: {formatDate(lead.created_at, locale)}
                  </p>
                </div>
                <select
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                  value={lead.status || "new"}
                  onChange={(event) => updateStatus(lead.id, event.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t[option as keyof typeof t]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  [t.company, lead.company],
                  [t.contact, lead.contact],
                  [t.industry, lead.industry],
                  [t.source, lead.source],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value || "-"}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-400">{t.note}</p>
                <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-700">{lead.message || "-"}</p>
              </div>
            </article>
          ))}

          {!filtered.length ? <p className="py-10 text-center text-slate-500">{t.empty}</p> : null}
        </div>
      )}
    </div>
  );
}
