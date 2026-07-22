"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type Audience = "public" | "professional" | "authority";
type Props = { identifier: string; audience: Audience; locale: "en" | "zh" };

function textValue(value: unknown, locale: "en" | "zh") {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? (locale === "zh" ? "是" : "Yes") : (locale === "zh" ? "否" : "No");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function BatteryPublicProjection({ identifier, audience, locale }: Props) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "hidden" | "restricted" | "error">("loading");

  useEffect(() => {
    let active = true;
    async function load() {
      setState("loading");
      const headers: Record<string, string> = {};
      if (audience !== "public") {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token) headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }
      const response = await fetch(`/api/battery-dpp/public/${encodeURIComponent(identifier)}?audience=${audience}`, { headers, cache: "no-store" });
      if (!active) return;
      if (response.status === 404) return setState("hidden");
      if (response.status === 401 || response.status === 403) return setState("restricted");
      if (!response.ok) return setState("error");
      setData(await response.json());
      setState("ready");
    }
    load().catch(() => active && setState("error"));
    return () => { active = false; };
  }, [audience, identifier, supabase]);

  if (state === "hidden") return null;
  if (state === "loading") return <p className="mb-6 text-sm font-semibold text-slate-500">{locale === "zh" ? "正在读取电池护照数据..." : "Loading battery passport data..."}</p>;
  if (state === "restricted") {
    return <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{locale === "zh" ? "该视图包含受限电池护照字段，需要已获授权的登录身份。" : "This view contains restricted battery-passport fields and requires an approved signed-in identity."}</div>;
  }
  if (state === "error") {
    return <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{locale === "zh" ? "电池护照法规数据暂时无法读取。" : "Battery-passport regulatory data is temporarily unavailable."}</div>;
  }

  const grouped = Object.values((data?.fields || []).reduce((groups: Record<string, any>, field: any) => {
    const key = field.groupCode || "other";
    groups[key] ||= { code: key, label: locale === "zh" ? field.groupLabelZh : field.groupLabelEn, fields: [] };
    groups[key].fields.push(field);
    return groups;
  }, {})) as Array<{ code: string; label: string; fields: any[] }>;

  return (
    <section id="battery-regulatory-data" className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="battery-regulatory-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 id="battery-regulatory-title" className="text-xl font-black text-slate-950">{locale === "zh" ? "电池护照法规数据" : "Battery passport regulatory data"}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{locale === "zh" ? `字段目录版本 ${data.catalogVersion}` : `Field catalog version ${data.catalogVersion}`}</p>
        </div>
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">{locale === "zh" ? "服务器权限投影" : "Server access projection"}</span>
      </div>
      {grouped.length ? (
        <div className="mt-5 space-y-6">
          {grouped.map((group) => (
            <div key={group.code}>
              <h3 className="text-sm font-black text-slate-900">{group.label}</h3>
              <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.fields.map((field) => (
                  <div key={field.fieldCode} className="border-t border-slate-100 pt-3">
                    <dt className="text-xs font-bold text-slate-500">{locale === "zh" ? field.labelZh : field.labelEn}</dt>
                    <dd className="mt-1 break-words text-sm font-black text-slate-900">{textValue(field.value, locale)}{field.unit ? ` ${field.unit}` : ""}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : <p className="mt-5 text-sm font-semibold text-slate-500">{locale === "zh" ? "当前权限层暂无已发布字段。" : "No published fields are available at this access level."}</p>}
    </section>
  );
}
