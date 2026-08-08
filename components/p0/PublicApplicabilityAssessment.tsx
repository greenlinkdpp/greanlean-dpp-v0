"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { useLanguage } from "@/components/LanguageProvider";
import {
  assessBatteryApplicability,
  presentBatteryApplicability,
  type ApplicabilityResult,
} from "@/lib/p0/applicability";

const categoryOptions = [
  { value: "LMT", zh: "轻型交通工具电池（LMT）", en: "Light means of transport battery (LMT)" },
  { value: "EV", zh: "电动汽车电池（EV）", en: "Electric vehicle battery (EV)" },
  { value: "INDUSTRIAL", zh: "工业电池", en: "Industrial battery" },
  { value: "PORTABLE", zh: "便携式电池", en: "Portable battery" },
  { value: "SLI", zh: "启动、照明和点火电池（SLI）", en: "Starting, lighting and ignition battery (SLI)" },
];

const operatorOptions = [
  { value: "MANUFACTURER", zh: "制造商", en: "Manufacturer" },
  { value: "IMPORTER", zh: "进口商", en: "Importer" },
  { value: "DISTRIBUTOR", zh: "经销商", en: "Distributor" },
  { value: "AUTHORISED_REPRESENTATIVE", zh: "授权代表", en: "Authorised representative" },
];

export function PublicApplicabilityAssessment() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const [result, setResult] = useState<ApplicabilityResult | null>(null);
  const [form, setForm] = useState({
    batteryCategory: "LMT",
    intendedUse: "",
    ratedEnergyKwh: "0.72",
    euMarketStatus: "PLANNED",
    placingOperatorRole: "MANUFACTURER",
    disclaimerAcknowledged: false,
  });
  const presentation = useMemo(
    () => result ? presentBatteryApplicability(result, locale) : null,
    [locale, result],
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    setResult(assessBatteryApplicability({
      ...form,
      ratedEnergyKwh: form.ratedEnergyKwh ? Number(form.ratedEnergyKwh) : null,
      euMarketStatus: form.euMarketStatus as "YES" | "NO" | "PLANNED" | "UNKNOWN",
      disclaimerAcknowledged: form.disclaimerAcknowledged,
      availableEvidence: [],
    }));
  }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-slate-950 py-14 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-sm font-black uppercase text-emerald-300">
              {zh ? "电池护照准备" : "Battery passport readiness"}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-5xl">
              {zh ? "用五项产品事实完成适用性初评" : "Assess preliminary scope from five product facts"}
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-300">
              {zh
                ? "结果会显示规则版本、待确认项和下一步资料，不构成法律认证。"
                : "The result includes the rule version, open questions and next inputs. It is not legal certification."}
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[420px_minmax(0,1fr)]">
          <form onSubmit={submit} className="h-fit border border-slate-200 bg-white p-6">
            <div className="space-y-5">
              <label className="block text-sm font-bold text-slate-700">
                {zh ? "电池类别" : "Battery category"}
                <select
                  className="input mt-2 w-full"
                  value={form.batteryCategory}
                  onChange={(event) => setForm({ ...form, batteryCategory: event.target.value })}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{zh ? option.zh : option.en}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-700">
                {zh ? "预期用途" : "Intended use"}
                <input
                  className="input mt-2 w-full"
                  required
                  placeholder={zh ? "例如：电动自行车" : "For example: electric bicycle"}
                  value={form.intendedUse}
                  onChange={(event) => setForm({ ...form, intendedUse: event.target.value })}
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                {zh ? "额定能量（千瓦时）" : "Rated energy (kWh)"}
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  className="input mt-2 w-full"
                  value={form.ratedEnergyKwh}
                  onChange={(event) => setForm({ ...form, ratedEnergyKwh: event.target.value })}
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                {zh ? "欧盟市场投放状态" : "EU market status"}
                <select
                  className="input mt-2 w-full"
                  value={form.euMarketStatus}
                  onChange={(event) => setForm({ ...form, euMarketStatus: event.target.value })}
                >
                  <option value="YES">{zh ? "已投放" : "Already placed"}</option>
                  <option value="PLANNED">{zh ? "计划投放" : "Planned"}</option>
                  <option value="NO">{zh ? "不投放" : "Not placed"}</option>
                  <option value="UNKNOWN">{zh ? "待确认" : "To be confirmed"}</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-700">
                {zh ? "市场投放责任主体" : "Operator placing the product on the market"}
                <select
                  className="input mt-2 w-full"
                  value={form.placingOperatorRole}
                  onChange={(event) => setForm({ ...form, placingOperatorRole: event.target.value })}
                >
                  {operatorOptions.map((option) => (
                    <option key={option.value} value={option.value}>{zh ? option.zh : option.en}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-600">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.disclaimerAcknowledged}
                  onChange={(event) => setForm({ ...form, disclaimerAcknowledged: event.target.checked })}
                />
                <span>
                  {zh
                    ? "我理解本结果是初步判断，需要结合最终法规和产品事实确认。"
                    : "I understand this is preliminary and requires confirmation against final requirements and product facts."}
                </span>
              </label>
            </div>
            <button disabled={!form.disclaimerAcknowledged} className="btn-primary mt-6 w-full disabled:opacity-40">
              {zh ? "生成初评结果" : "Generate preliminary result"}
            </button>
          </form>

          <div className="border-y border-slate-200 bg-white p-6">
            {result && presentation ? (
              <>
                <p className="text-xs font-black text-emerald-700">{presentation.ruleVersion}</p>
                <h2 className="mt-3 text-2xl font-black text-slate-950">{presentation.result}</h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{presentation.reason}</p>
                <div className="mt-7 border-t border-slate-200 pt-6">
                  <h3 className="font-black text-slate-950">{zh ? "下一步资料与待确认事项" : "Next inputs and open questions"}</h3>
                  <ol className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                    {presentation.tasks.map((task, index) => (
                      <li key={`${task.title}-${index}`} className="grid gap-2 py-4 sm:grid-cols-[36px_minmax(0,1fr)_80px]">
                        <span className="text-xs font-black text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <p className="font-black text-slate-950">{task.displayTitle}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{task.displayDescription}</p>
                        </div>
                        <span className="text-xs font-black text-red-700">{task.displayPriority}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <Link href={`/login?lang=${locale}`} className="btn-primary mt-6">
                  {zh ? "进入后台创建试点" : "Create a pilot project"}
                </Link>
              </>
            ) : (
              <div className="grid min-h-96 place-items-center text-center">
                <div>
                  <p className="text-sm font-black uppercase text-slate-400">{zh ? "尚未评估" : "Not assessed"}</p>
                  <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-slate-500">
                    {zh
                      ? "填写左侧产品事实后，系统会给出可追踪的初步结果、待确认问题和资料任务。"
                      : "Provide the product facts to generate a traceable preliminary result, open questions and evidence tasks."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
