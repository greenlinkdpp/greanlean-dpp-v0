"use client";

import { FormEvent, useMemo, useState } from "react";
import { LeadForm } from "@/components/LeadForm";
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
  const selectedCategory = categoryOptions.find((option) => option.value === form.batteryCategory);
  const selectedOperator = operatorOptions.find((option) => option.value === form.placingOperatorRole);
  const marketLabel = {
    YES: zh ? "已投放" : "Already placed",
    PLANNED: zh ? "计划投放" : "Planned",
    NO: zh ? "不投放" : "Not placed",
    UNKNOWN: zh ? "待确认" : "To be confirmed",
  }[form.euMarketStatus] || form.euMarketStatus;
  const assessmentFacts = presentation ? [
    [zh ? "电池类别" : "Battery category", selectedCategory ? (zh ? selectedCategory.zh : selectedCategory.en) : form.batteryCategory],
    [zh ? "预期用途" : "Intended use", form.intendedUse],
    [zh ? "额定能量" : "Rated energy", `${form.ratedEnergyKwh || "-"} ${zh ? "千瓦时" : "kWh"}`],
    [zh ? "欧盟市场" : "EU market", marketLabel],
    [zh ? "责任主体" : "Responsible operator", selectedOperator ? (zh ? selectedOperator.zh : selectedOperator.en) : form.placingOperatorRole],
  ] : [];
  const pilotMessage = presentation
    ? (zh
        ? `电池适用性初评\n初步结果：${presentation.result}\n电池类别：${assessmentFacts[0][1]}\n预期用途：${form.intendedUse}\n额定能量：${form.ratedEnergyKwh || "-"} 千瓦时\n欧盟市场：${marketLabel}\n希望申请 GreanLean DPP 试点。`
        : `Battery applicability assessment\nPreliminary result: ${presentation.result}\nBattery category: ${assessmentFacts[0][1]}\nIntended use: ${form.intendedUse}\nRated energy: ${form.ratedEnergyKwh || "-"} kWh\nEU market: ${marketLabel}\nWe would like to apply for a GreanLean DPP pilot.`)
    : "";

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
                <div className="border-l-4 border-emerald-500 pl-5">
                  <p className="text-xs font-black text-emerald-700">{presentation.ruleVersion}</p>
                  <h2 className="mt-3 text-2xl font-black text-slate-950">{presentation.result}</h2>
                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{presentation.reason}</p>
                </div>

                <dl className="mt-7 grid border-y border-slate-200 sm:grid-cols-2">
                  {[
                    [zh ? "法规参考" : "Regulatory reference", zh ? "《欧盟电池法规》（EU）2023/1542 第 77 条" : "EU Battery Regulation 2023/1542, Article 77"],
                    [zh ? "适用时间节点" : "Application milestone", result.result === "PRELIMINARY_APPLICABLE" ? (zh ? "2027 年 2 月 18 日" : "18 February 2027") : (zh ? "需先确认适用范围" : "Scope confirmation required")],
                    [zh ? "评估层级" : "Assessment level", zh ? "产品型号初评" : "Preliminary product-model assessment"],
                    [zh ? "当前资料状态" : "Current input status", zh ? `核心事实 5 项；待补资料 ${presentation.tasks.length} 项` : `5 core facts; ${presentation.tasks.length} follow-up inputs`],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-slate-200 p-4 odd:sm:border-r last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
                      <dt className="text-xs font-bold text-slate-500">{label}</dt>
                      <dd className="mt-2 text-sm font-black leading-6 text-slate-950">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-7">
                  <h3 className="font-black text-slate-950">{zh ? "本次评估输入" : "Assessment inputs"}</h3>
                  <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                    {assessmentFacts.map(([label, value]) => (
                      <div key={label} className="grid gap-1 py-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                        <dt className="text-sm font-bold text-slate-500">{label}</dt>
                        <dd className="text-sm font-black text-slate-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="mt-7 border-t border-slate-200 pt-6">
                  <h3 className="font-black text-slate-950">{zh ? "下一步资料与待确认事项" : "Next inputs and open questions"}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {zh
                      ? "以下是建立试点数据底稿所需的首批资料，不要求申请时一次性准备完成。"
                      : "These are the initial inputs for a pilot data baseline. They do not need to be complete when applying."}
                  </p>
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

                <div className="mt-7 border-t border-slate-200 pt-6">
                  <h3 className="font-black text-slate-950">{zh ? "建议实施路径" : "Recommended implementation path"}</h3>
                  <ol className="mt-4 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2">
                    {[
                      [zh ? "01 确认范围" : "01 Confirm scope", zh ? "核实产品类别、欧盟市场角色和适用时间。" : "Confirm category, EU-market role and timing."],
                      [zh ? "02 建立标识" : "02 Establish identifiers", zh ? "确定型号、批次或单体层级及唯一产品标识。" : "Define model, batch or item granularity and the unique product identifier."],
                      [zh ? "03 补齐数据与证据" : "03 Complete data and evidence", zh ? "分配数据责任人，收集物料、技术、碳足迹和证明文件。" : "Assign owners and collect material, technical, carbon and evidence records."],
                      [zh ? "04 生成并维护护照" : "04 Publish and maintain", zh ? "完成校验、审核和发布，并持续追加生命周期信息。" : "Validate, approve and publish, then append lifecycle updates."],
                    ].map(([title, body]) => (
                      <li key={title} className="bg-white p-4">
                        <p className="text-sm font-black text-slate-950">{title}</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{body}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                <a href="#pilot-application" className="btn-primary mt-7">
                  {zh ? "申请 DPP 试点" : "Apply for a DPP pilot"}
                </a>
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                  {zh
                    ? "无需先注册账号。申请确认后，GreanLean 将按组织和产品范围开通项目权限。"
                    : "No account is required to apply. GreanLean will provision project access after confirming the organisation and product scope."}
                </p>
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

        {result && presentation ? (
          <section id="pilot-application" className="border-t border-slate-200 bg-white py-14">
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
              <div>
                <p className="text-sm font-black uppercase text-emerald-700">{zh ? "申请试点" : "Pilot application"}</p>
                <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950">
                  {zh ? "从一个产品开始建立可发布的 DPP 数据底稿" : "Start with one product and build a publishable DPP data baseline"}
                </h2>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                  {zh
                    ? "提交基本联系方式即可，无需先创建账号或准备全部资料。我们会根据本次评估结果确认试点范围、所需证据和实施计划。"
                    : "Submit basic contact details without creating an account or preparing every document. We will use this assessment to confirm scope, evidence and the implementation plan."}
                </p>
                <div className="mt-7 border-y border-slate-200 py-5">
                  <p className="text-sm font-black text-slate-950">{zh ? "申请后将确认" : "What we will confirm"}</p>
                  <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600">
                    {(zh
                      ? ["产品及电池法定类别", "型号、批次或单体数据粒度", "现有数据和证据缺口", "试点交付范围与账号权限"]
                      : ["Product and legal battery category", "Model, batch or item granularity", "Current data and evidence gaps", "Pilot deliverables and account access"]
                    ).map((item) => <li key={item} className="border-l-2 border-emerald-500 pl-3">{item}</li>)}
                  </ul>
                </div>
              </div>
              <LeadForm
                key={`${locale}-${form.batteryCategory}-${form.intendedUse}-${result.result}`}
                mode="pilot"
                source="battery-applicability"
                initialIndustry="battery"
                initialMessage={pilotMessage}
              />
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
