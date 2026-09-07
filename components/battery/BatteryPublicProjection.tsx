"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type Audience = "public" | "professional" | "authority";
type Props = { identifier: string; audience: Audience; locale: "en" | "zh"; showcase?: boolean };

function localizedScalar(value: string, locale: "en" | "zh") {
  if (locale === "en") return value;
  const exact: Record<string, string> = {
    "Industrial battery": "工业电池",
    "LMT battery": "轻型交通工具电池",
    original: "原始使用",
    repurposed: "梯次利用",
    "re-used": "再使用",
    remanufactured: "再制造",
    waste: "废弃",
    "Manufacturer cycle-life specification; laboratory verification pending.": "依据制造商循环寿命规格；实验室验证待补充。",
    "Electrolyte and substance declarations require supplier and laboratory verification.": "电解液与物质声明仍需供应商及实验室验证。",
    "Cathode: lithium iron phosphate; anode: graphite; electrolyte: LiPF6 in organic carbonate solvents; supplier verification pending.": "正极为磷酸铁锂，负极为石墨，电解液为有机碳酸酯溶剂中的六氟磷酸锂；供应商验证待补充。",
    "Lithium, natural graphite, copper and aluminium; quantities pending supplier verification.": "锂、天然石墨、铜和铝；具体含量待供应商验证。",
    "Stationary lithium-ion battery fire response": "固定式锂离子电池火灾响应",
    "Isolate the energy-storage enclosure, apply water cooling where safe and follow the site emergency response plan.": "隔离储能柜，在安全条件允许时采用水冷降温，并执行现场应急响应方案。",
  };
  return exact[value] || value
    .replaceAll("Hamburg, Germany", "德国汉堡")
    .replaceAll("Germany", "德国")
    .replaceAll("China", "中国");
}

function textValue(value: unknown, locale: "en" | "zh"): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? (locale === "zh" ? "是" : "Yes") : (locale === "zh" ? "否" : "No");
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const preferred = entries.find(([key]) => key === "value" || /value$/i.test(key));
    if (preferred) return textValue(preferred[1], locale);
    const numericValues = entries.filter(([, item]) => typeof item === "number");
    if (numericValues.length) return numericValues.map(([, item]) => textValue(item, locale)).join(" / ");
    const parts: string[] = entries.map(([, item]) => item)
      .flatMap((item) => Array.isArray(item) ? item : [item])
      .map((item) => typeof item === "object" && item !== null ? textValue(item, locale) : String(item))
      .map((item) => localizedScalar(item, locale))
      .filter((item, index, all) => item && item !== "—" && all.indexOf(item) === index);
    return parts.join(" · ") || "—";
  }
  return localizedScalar(String(value), locale);
}

function unitLabel(unit: string, locale: "en" | "zh") {
  if (locale === "en") return unit;
  return ({ cycles: "次", years: "年", months: "个月" } as Record<string, string>)[unit] || unit;
}

export function BatteryPublicProjection({ identifier, audience, locale, showcase = false }: Props) {
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
      const params = new URLSearchParams({ audience });
      if (showcase) params.set("showcase", "1");
      const response = await fetch(`/api/battery-dpp/public/${encodeURIComponent(identifier)}?${params.toString()}`, { headers, cache: "no-store" });
      if (!active) return;
      if (response.status === 404) return setState("hidden");
      if (response.status === 401 || response.status === 403) return setState("restricted");
      if (!response.ok) return setState("error");
      setData(await response.json());
      setState("ready");
    }
    load().catch(() => active && setState("error"));
    return () => { active = false; };
  }, [audience, identifier, showcase, supabase]);

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
    <section id="battery-regulatory-data" className="border-t border-slate-200 bg-[#f5f7f6]" aria-labelledby="battery-regulatory-title">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:py-10 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-black text-emerald-700">10</p>
          <h2 id="battery-regulatory-title" className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{locale === "zh" ? "电池护照标准字段" : "Battery passport standard fields"}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">{locale === "zh" ? `按电池类别展示当前护照中的适用信息 · 字段目录 ${data.catalogVersion}` : `Applicable passport information for this battery category · catalog ${data.catalogVersion}`}</p>
        </div>
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">{locale === "zh" ? "分类适用字段" : "Category-scoped fields"}</span>
      </div>
      {grouped.length ? (
        <div className="divide-y divide-slate-200">
          {grouped.map((group, index) => (
            <div key={group.code} className="py-6">
              <h3 className="text-sm font-black text-slate-900"><span className="mr-2 text-emerald-700">{String(index + 1).padStart(2, "0")}</span>{group.label}</h3>
              <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.fields.map((field) => (
                  <div key={field.id || `${field.fieldCode}-${field.number}`} className="border-t border-slate-100 pt-3">
                    <dt className="text-xs font-bold text-slate-500">{locale === "zh" ? field.labelZh : field.labelEn}</dt>
                    <dd className="mt-1 break-words text-sm font-black text-slate-900">{field.dataStatus === "missing" ? (locale === "zh" ? "待补充" : "Pending") : textValue(field.value, locale)}{field.dataStatus !== "missing" && field.unit ? ` ${unitLabel(field.unit, locale)}` : ""}</dd>
                    <dd className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500"><span>{field.dataBehavior === "DYNAMIC" ? (locale === "zh" ? "动态数据" : "Dynamic") : (locale === "zh" ? "静态数据" : "Static")}</span>{field.verificationStatus === "verified" ? <><span>·</span><span className="text-emerald-700">{locale === "zh" ? "已核验" : "Verified"}</span></> : null}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : <p className="mt-5 text-sm font-semibold text-slate-500">{locale === "zh" ? "当前权限层暂无已发布字段。" : "No published fields are available at this access level."}</p>}
      </div>
    </section>
  );
}
