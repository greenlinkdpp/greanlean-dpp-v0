"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  BATTERY_CATEGORIES,
  BATTERY_WORKFLOW_STEPS,
  classifyBattery,
  fieldsForBattery,
  hasBatteryFieldValue,
  requirementStatusForField,
  type BatteryFieldValue,
  type BatteryLegalCategory,
  type BatteryWorkflowStepCode,
} from "@/lib/battery/catalog";
import { calculateBatteryReadiness } from "@/lib/battery/readiness";
import { createSupabaseClient } from "@/lib/supabase";
import { RegistryWorkbench } from "./RegistryWorkbench";

type Props = { productId: string };

const accessLabels = {
  zh: { PUBLIC: "公开", LEGITIMATE_INTEREST: "正当利益访问", AUTHORITY_ONLY: "主管机关访问", INTERNAL: "内部访问" },
  en: { PUBLIC: "Public", LEGITIMATE_INTEREST: "Legitimate interest", AUTHORITY_ONLY: "Authority only", INTERNAL: "Internal" },
};
const granularityLabels = {
  zh: { MODEL: "型号级", BATCH: "批次级", ITEM: "单体级", MODEL_YEAR_SITE: "型号 + 年份 + 制造场所", MODEL_SITE: "型号 + 制造场所" },
  en: { MODEL: "Model", BATCH: "Batch", ITEM: "Item", MODEL_YEAR_SITE: "Model + year + site", MODEL_SITE: "Model + site" },
};
const requirementLabels = {
  zh: { CONFIRMED_MANDATORY: "法规必填", CONDITIONAL_MANDATORY: "条件必填", DRAFT_MANDATORY: "草案必填", VOLUNTARY: "自愿", NOT_APPLICABLE: "不适用", TBD: "待确认" },
  en: { CONFIRMED_MANDATORY: "Confirmed mandatory", CONDITIONAL_MANDATORY: "Conditional", DRAFT_MANDATORY: "Draft mandatory", VOLUNTARY: "Voluntary", NOT_APPLICABLE: "Not applicable", TBD: "TBD" },
};

function valueText(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function percentBar(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

export function BatteryDppWorkspace({ productId }: Props) {
  const { locale } = useLanguage();
  const isZh = locale === "zh";
  const t = isZh
    ? {
        title: "电池 DPP 专用流程", subtitle: "按法定类别判断适用性，并依据 BatteryPass-Ready v1.3 参考字段逐步录入。",
        loading: "正在读取电池 DPP 数据...", retry: "重试", save: "保存当前电池 DPP", saving: "正在保存...", saved: "已保存。",
        category: "法定电池类别", energy: "额定能量（kWh）", stationary: "固定式工业电池", bms: "配有 BMS", applicability: "电池护照适用性",
        required: "适用", notRequired: "当前不适用", conditional: "待条件确认", tbd: "待人工确认", schema: "验证配置",
        fieldCount: "个适用字段", expanded: "展开字段说明", collapsed: "收起字段说明", unit: "单位", granularity: "数据粒度", access: "访问权限",
        source: "建议数据来源", evidence: "证明材料", evidenceRequired: "需要证明材料", evidenceOptional: "当前未要求证明材料", regulation: "法规/参考来源",
        complete: "已填写", missing: "未填写", evidenceStatus: "证据状态", verificationStatus: "核验状态", value: "字段值",
        confirmed: "法规必填完整度", conditionalMetric: "条件必填完整度", evidenceMetric: "证明材料完整度", verification: "数据核验完成度", registry: "Registry 注册准备度", tbdFields: "待确认字段",
        noFields: "此步骤没有需要人工填写的静态字段。", itemTitle: "单体与动态运行数据", itemIntro: "动态指标和生命周期事件只新增历史记录，不覆盖旧值。",
        item: "电池单体", serial: "序列号", upi: "唯一产品标识", createItem: "新增单体", metric: "动态指标", metricValue: "指标值", measuredAt: "测量时间", appendMetric: "追加指标",
        event: "生命周期事件", eventType: "事件类型", eventNote: "事件说明", appendEvent: "追加事件", noItems: "请先新增一个电池单体。",
        previewTitle: "DPP 预览和发布", consumer: "消费者预览", professional: "专业预览", audit: "审计预览", publishNote: "发布仍由上方产品版本区控制；电池字段会随发布版本形成快照。",
        registryTitle: "Registry 注册准备", registryNotice: "EU DPP Registry 已上线，但当前官方指南仍未提供可成功注册电池 DPP 的最终语义目录。本页只计算本地准备度，不宣称已经注册成功。",
      }
    : {
        title: "Battery DPP workflow", subtitle: "Determine statutory scope first, then complete the BatteryPass-Ready v1.3 reference fields step by step.",
        loading: "Loading battery DPP data...", retry: "Retry", save: "Save battery DPP", saving: "Saving...", saved: "Saved.",
        category: "Legal battery category", energy: "Rated energy (kWh)", stationary: "Stationary industrial battery", bms: "BMS present", applicability: "Battery-passport applicability",
        required: "Required", notRequired: "Not currently required", conditional: "Condition pending", tbd: "Manual confirmation", schema: "Validation configuration",
        fieldCount: "applicable fields", expanded: "Expand field guidance", collapsed: "Collapse field guidance", unit: "Unit", granularity: "Data granularity", access: "Access",
        source: "Suggested source", evidence: "Evidence", evidenceRequired: "Evidence required", evidenceOptional: "No evidence currently required", regulation: "Regulatory/reference source",
        complete: "Complete", missing: "Missing", evidenceStatus: "Evidence status", verificationStatus: "Verification status", value: "Field value",
        confirmed: "Confirmed mandatory completeness", conditionalMetric: "Conditional completeness", evidenceMetric: "Evidence completeness", verification: "Verification completion", registry: "Registry readiness", tbdFields: "TBD fields",
        noFields: "This step has no manually entered static fields.", itemTitle: "Items and operating data", itemIntro: "Dynamic metrics and lifecycle events append history and never overwrite earlier records.",
        item: "Battery item", serial: "Serial identifier", upi: "Unique product identifier", createItem: "Add item", metric: "Operating metric", metricValue: "Metric value", measuredAt: "Measured at", appendMetric: "Append metric",
        event: "Lifecycle event", eventType: "Event type", eventNote: "Event note", appendEvent: "Append event", noItems: "Add a battery item first.",
        previewTitle: "DPP preview and publishing", consumer: "Consumer preview", professional: "Professional preview", audit: "Audit preview", publishNote: "Publishing remains controlled by the product version section above; battery fields are included in the release snapshot.",
        registryTitle: "Registry readiness", registryNotice: "The EU DPP Registry is live, but its current official guide does not yet provide final battery semantics for a successful registration. This view measures local readiness and does not claim registration success.",
      };

  const supabase = useMemo(() => createSupabaseClient(), []);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<BatteryLegalCategory>("other");
  const [capacityKwh, setCapacityKwh] = useState("");
  const [stationary, setStationary] = useState(false);
  const [bmsPresent, setBmsPresent] = useState(true);
  const [activeStep, setActiveStep] = useState<BatteryWorkflowStepCode>("identity");
  const [values, setValues] = useState<Record<string, BatteryFieldValue>>({});
  const [guideOpen, setGuideOpen] = useState<Record<string, boolean>>({});

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error(isZh ? "登录会话已失效，请重新登录。" : "The session has expired. Please sign in again.");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }

  function localizedApiError(payload: any, status: number) {
    if (!isZh) return payload?.error?.message || String(status);
    const messages: Record<string, string> = {
      BATTERY_PROFILE_REQUIRED: "尚未保存电池型号档案，请先保存分类和型号信息。",
      BATTERY_CLASSIFICATION_REQUIRED: "请先选择法定电池类别。",
      SERIAL_IDENTIFIER_REQUIRED: "请填写电池单体序列号。",
      BATTERY_ITEM_NOT_FOUND: "没有找到对应的电池单体。",
      INVALID_BATTERY_METRIC: "请完整填写电池单体、动态指标和数值。",
      INVALID_BATTERY_EVENT: "请完整填写电池单体和生命周期事件。",
      BATTERY_SCHEMA_NOT_INSTALLED: "电池字段目录尚未安装。",
      BATTERY_SCHEMA_NOT_PUBLISHED: "电池字段目录尚未发布。",
    };
    return messages[payload?.error?.code] || "电池 DPP 请求未完成，请检查填写内容后重试。";
  }

  async function request(method: string, body?: unknown) {
    const response = await fetch(`/api/battery-dpp/${encodeURIComponent(productId)}`, {
      method,
      headers: await authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(localizedApiError(payload, response.status));
    return payload;
  }

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const data = await request("GET");
      setWorkspace(data);
      setValues(data.values || {});
      setCategory(data.profile?.legal_category_code || data.classification?.legalCategory || "other");
      setCapacityKwh(data.profile?.rated_energy_kwh == null ? "" : String(data.profile.rated_energy_kwh));
      setStationary(Boolean(data.profile?.stationary));
      setBmsPresent(data.profile?.bms_present !== false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const classification = classifyBattery({
    legalCategory: category,
    capacityKwh: capacityKwh === "" ? null : Number(capacityKwh),
    stationary,
    bmsPresent,
  });
  const readiness = calculateBatteryReadiness(classification, values);
  const currentStep = BATTERY_WORKFLOW_STEPS.find((step) => step.code === activeStep) || BATTERY_WORKFLOW_STEPS[0];
  const currentFields = fieldsForBattery(classification, { workflowStep: activeStep })
    .filter((field) => field.dataBehavior === "STATIC");
  const publicIdentifier = workspace?.product?.dpp_id || workspace?.product?.public_slug;

  function derivedValue(fieldCode: string) {
    const derived: Record<string, unknown> = {
      "battery.dpp_schema_version": workspace?.catalog?.catalogVersion || "1.3.0",
      "battery.dpp_status": workspace?.product?.status || "draft",
      "battery.dpp_granularity": "ITEM",
      "battery.unique_battery_identifier_unique_product_identifier": workspace?.product?.unique_product_identifier || "",
      "battery.battery_category": BATTERY_CATEGORIES.find((item) => item.code === category)?.[isZh ? "labelZh" : "labelEn"] || category,
    };
    return derived[fieldCode];
  }

  function displayedValue(fieldCode: string) {
    return values[fieldCode]?.value ?? derivedValue(fieldCode) ?? "";
  }

  function changeValue(fieldCode: string, patch: Partial<BatteryFieldValue>) {
    setValues((current) => ({ ...current, [fieldCode]: { ...current[fieldCode], ...patch, value: patch.value ?? current[fieldCode]?.value ?? "" } }));
  }

  function workspacePayload() {
    const staticValues = Object.fromEntries(Object.entries(values).filter(([fieldCode]) => {
      const field = fieldsForBattery(classification, { includeNotApplicable: true }).find((item) => item.fieldCode === fieldCode);
      return field?.dataBehavior === "STATIC";
    }));
    for (const field of currentFields) {
      const derived = derivedValue(field.fieldCode);
      if (derived !== undefined && staticValues[field.fieldCode] === undefined) {
        staticValues[field.fieldCode] = { value: derived, sourceType: "system_derived", verificationStatus: "unverified", evidenceStatus: "not_applicable" };
      }
    }
    return {
      classification: { legalCategory: category, capacityKwh: capacityKwh === "" ? null : Number(capacityKwh), stationary, bmsPresent },
      profile: {
        battery_model_identifier: displayedValue("battery.battery_model_identifier") || null,
        battery_mass_kg: Number(displayedValue("battery.battery_mass")) || null,
        battery_chemistry_code: displayedValue("battery.battery_chemistry") || null,
        economic_operator_name: displayedValue("battery.economic_operator_information") || null,
        manufacturer_name: displayedValue("battery.manufacturer_information") || null,
        manufacturing_place: displayedValue("battery.manufacturing_place") || null,
        warranty_description: displayedValue("battery.warranty_period_of_the_battery") || null,
      },
      values: staticValues,
    };
  }

  async function persistWorkspace() {
    const data = await request("PUT", workspacePayload());
    setWorkspace(data);
    setValues(data.values || {});
    return data;
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await persistWorkspace();
      setMessage(t.saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function performAction(body: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    try {
      if (body.action === "createItem" && !workspace?.profile) await persistWorkspace();
      const data = await request("POST", body);
      setWorkspace(data);
      setValues(data.values || {});
      setMessage(t.saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="rounded-lg border border-slate-200 bg-white p-6"><p className="text-sm font-semibold text-slate-600">{t.loading}</p></section>;
  if (!workspace) return <section className="rounded-lg border border-red-200 bg-white p-6"><p className="text-sm font-semibold text-red-700">{message}</p><button className="btn-secondary mt-4" onClick={load} type="button">{t.retry}</button></section>;

  const applicabilityLabel = classification.applicability === "REQUIRED" ? t.required : classification.applicability === "NOT_REQUIRED" ? t.notRequired : classification.applicability === "CONDITIONAL" ? t.conditional : t.tbd;
  const readinessRows = [
    [t.confirmed, readiness.confirmedMandatory], [t.conditionalMetric, readiness.conditionalMandatory], [t.evidenceMetric, readiness.evidence],
    [t.verification, readiness.verification], [t.registry, readiness.registry],
  ] as const;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-black text-slate-950">{t.title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t.subtitle}</p>
      </header>

      <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 md:grid-cols-4">
        <label><span className="label">{t.category}</span><select className="input mt-1" value={category} onChange={(event) => setCategory(event.target.value as BatteryLegalCategory)}>{BATTERY_CATEGORIES.map((item) => <option key={item.code} value={item.code}>{isZh ? item.labelZh : item.labelEn}</option>)}</select></label>
        <label><span className="label">{t.energy}</span><input className="input mt-1" min="0" step="0.01" type="number" value={capacityKwh} onChange={(event) => setCapacityKwh(event.target.value)} /></label>
        {category === "industrial" ? <label className="flex items-center gap-3 pt-6"><input checked={stationary} onChange={(event) => setStationary(event.target.checked)} type="checkbox" /><span className="text-sm font-bold text-slate-800">{t.stationary}</span></label> : <div />}
        {category === "industrial" ? <label className="flex items-center gap-3 pt-6"><input checked={bmsPresent} onChange={(event) => setBmsPresent(event.target.checked)} type="checkbox" /><span className="text-sm font-bold text-slate-800">{t.bms}</span></label> : <div />}
        <div className="md:col-span-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
          <span className="text-xs font-black uppercase text-slate-500">{t.applicability}</span>
          <span className="rounded-md bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">{applicabilityLabel}</span>
          <span className="text-sm font-semibold text-slate-600">{isZh ? classification.reasonZh : classification.reasonEn}</span>
          <span className="ml-auto text-xs font-bold text-slate-500">{t.schema}: {classification.schemaCode}</span>
        </div>
      </div>

      <nav className="flex overflow-x-auto border-b border-slate-200 px-4" aria-label={t.title}>
        {BATTERY_WORKFLOW_STEPS.map((step) => <button key={`${step.number}-${step.code}`} className={`min-w-36 border-b-2 px-3 py-4 text-left text-sm font-bold ${activeStep === step.code ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`} onClick={() => setActiveStep(step.code)} type="button"><span className="block text-xs">{step.number}</span>{isZh ? step.labelZh : step.labelEn}</button>)}
      </nav>

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase text-emerald-700">{currentStep.number}</p><h3 className="mt-1 text-lg font-black text-slate-950">{isZh ? currentStep.labelZh : currentStep.labelEn}</h3>{!["item_operation", "preview_publish", "registry_readiness"].includes(activeStep) ? <p className="mt-1 text-sm text-slate-500">{currentFields.length} {t.fieldCount}</p> : null}</div>
            {activeStep !== "item_operation" && activeStep !== "preview_publish" && activeStep !== "registry_readiness" ? <button className="btn-primary" disabled={saving} onClick={save} type="button">{saving ? t.saving : t.save}</button> : null}
          </div>

          {currentFields.length > 0 ? <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {currentFields.map((field) => {
              const requirement = requirementStatusForField(field, classification);
              const current = values[field.fieldCode];
              const complete = hasBatteryFieldValue({ value: displayedValue(field.fieldCode) });
              const isDerived = derivedValue(field.fieldCode) !== undefined;
              const inputValue = valueText(displayedValue(field.fieldCode));
              return <div key={field.fieldCode} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h4 className="font-black text-slate-950">{isZh ? field.labelZh : field.labelEn}{field.unit ? <span className="ml-2 text-xs font-bold text-slate-500">({field.unit})</span> : null}</h4><div className="mt-2 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{requirementLabels[isZh ? "zh" : "en"][requirement]}</span><span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{granularityLabels[isZh ? "zh" : "en"][field.dataGranularity]}</span><span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{accessLabels[isZh ? "zh" : "en"][field.accessLevel]}</span><span className={`rounded px-2 py-1 ${complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{complete ? t.complete : t.missing}</span></div></div>
                  <button className="text-sm font-bold text-emerald-700" onClick={() => setGuideOpen((currentState) => ({ ...currentState, [field.fieldCode]: !currentState[field.fieldCode] }))} type="button">{guideOpen[field.fieldCode] ? t.collapsed : t.expanded}</button>
                </div>
                {guideOpen[field.fieldCode] ? <div className="mt-4 grid gap-3 border-l-2 border-emerald-500 pl-4 text-sm leading-6 text-slate-600 md:grid-cols-2"><p>{isZh ? field.instructionZh : field.descriptionEn}</p><dl className="grid gap-1"><div><dt className="inline font-bold text-slate-800">{t.source}: </dt><dd className="inline">{isZh ? field.sourceSuggestionZh : "Use the authoritative source named in the field definition and retain provenance."}</dd></div><div><dt className="inline font-bold text-slate-800">{t.evidence}: </dt><dd className="inline">{field.evidenceRequired ? t.evidenceRequired : t.evidenceOptional}</dd></div><div><dt className="inline font-bold text-slate-800">{t.regulation}: </dt><dd className="inline">{field.regulatoryReference || "-"}</dd></div></dl></div> : null}
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <label><span className="label">{t.value}</span>{field.dataType === "string" && inputValue.length > 80 ? <textarea className="input mt-1 min-h-24" disabled={isDerived} value={inputValue} onChange={(event) => changeValue(field.fieldCode, { value: event.target.value })} /> : <input className="input mt-1" disabled={isDerived} type={["integer", "decimal"].includes(field.dataType) ? "number" : field.dataType === "date" ? "date" : field.dataType === "datetime" ? "datetime-local" : field.dataType === "uri" ? "url" : "text"} value={inputValue} onChange={(event) => changeValue(field.fieldCode, { value: event.target.value })} />}</label>
                  <label><span className="label">{t.evidenceStatus}</span><select className="input mt-1" value={current?.evidenceStatus || "missing"} onChange={(event) => changeValue(field.fieldCode, { evidenceStatus: event.target.value as BatteryFieldValue["evidenceStatus"] })}><option value="missing">{isZh ? "缺失" : "Missing"}</option><option value="declared">{isZh ? "已声明" : "Declared"}</option><option value="uploaded">{isZh ? "已上传" : "Uploaded"}</option><option value="verified">{isZh ? "已核验证据" : "Verified"}</option><option value="rejected">{isZh ? "已驳回" : "Rejected"}</option><option value="not_applicable">{isZh ? "不适用" : "Not applicable"}</option></select></label>
                  <label><span className="label">{t.verificationStatus}</span><select className="input mt-1" value={current?.verificationStatus || "unverified"} onChange={(event) => changeValue(field.fieldCode, { verificationStatus: event.target.value as BatteryFieldValue["verificationStatus"] })}><option value="unverified">{isZh ? "未核验" : "Unverified"}</option><option value="in_review">{isZh ? "核验中" : "In review"}</option><option value="verified">{isZh ? "已核验" : "Verified"}</option><option value="rejected">{isZh ? "已驳回" : "Rejected"}</option></select></label>
                </div>
              </div>;
            })}
          </div> : null}

          {currentFields.length === 0 && !["item_operation", "preview_publish", "registry_readiness"].includes(activeStep) ? <p className="mt-5 border-y border-slate-200 py-8 text-center text-sm font-semibold text-slate-500">{t.noFields}</p> : null}
          {activeStep === "item_operation" ? <ItemOperation workspace={workspace} isZh={isZh} saving={saving} t={t} onAction={performAction} /> : null}
          {activeStep === "preview_publish" ? <div className="mt-5 border-y border-slate-200 py-6"><h4 className="font-black text-slate-950">{t.previewTitle}</h4><p className="mt-2 text-sm text-slate-600">{t.publishNote}</p><div className="mt-4 flex flex-wrap gap-3">{publicIdentifier ? <><Link className="btn-secondary" href={`/p/${encodeURIComponent(publicIdentifier)}?preview=1&lang=${locale}&view=consumer`} target="_blank">{t.consumer}</Link><Link className="btn-primary" href={`/p/${encodeURIComponent(publicIdentifier)}?preview=1&lang=${locale}&view=professional`} target="_blank">{t.professional}</Link><Link className="btn-secondary" href={`/p/${encodeURIComponent(publicIdentifier)}?preview=1&lang=${locale}&view=audit`} target="_blank">{t.audit}</Link></> : null}</div></div> : null}
          {activeStep === "registry_readiness" ? <div className="mt-5"><h4 className="font-black text-slate-950">{t.registryTitle}</h4><p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-amber-800">{t.registryNotice}</p><RegistryWorkbench productId={productId} isZh={isZh} /></div> : null}
          {message ? <p className={`mt-4 text-sm font-semibold ${message === t.saved ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-black text-slate-950">{isZh ? "分项准备度" : "Readiness dimensions"}</h3>
          <div className="mt-4 grid gap-4">{readinessRows.map(([label, metric]) => <div key={label}><div className="flex justify-between gap-2 text-xs font-bold text-slate-600"><span>{label}</span><span>{metric.complete}/{metric.total}</span></div><div className="mt-2 h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-emerald-600" style={{ width: percentBar(metric.percent) }} /></div></div>)}</div>
          <div className="mt-5 border-t border-slate-200 pt-4"><p className="text-xs font-bold text-slate-500">{t.tbdFields}</p><p className="mt-1 text-2xl font-black text-slate-950">{readiness.tbdFieldCount}</p></div>
        </aside>
      </div>
    </section>
  );
}

function ItemOperation({ workspace, isZh, saving, t, onAction }: { workspace: any; isZh: boolean; saving: boolean; t: any; onAction: (body: Record<string, unknown>) => Promise<void> }) {
  const [itemId, setItemId] = useState(workspace.items?.[0]?.id || "");

  useEffect(() => {
    if (!itemId && workspace.items?.[0]?.id) setItemId(workspace.items[0].id);
  }, [itemId, workspace.items]);

  const selectedItemId = itemId || workspace.items?.[0]?.id || "";
  return <div className="mt-5 border-y border-slate-200 py-6">
    <h4 className="font-black text-slate-950">{t.itemTitle}</h4><p className="mt-2 text-sm text-slate-600">{t.itemIntro}</p>
    <form className="mt-5 grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onAction({ action: "createItem", serialIdentifier: form.get("serial"), uniqueProductIdentifier: form.get("upi") }); event.currentTarget.reset(); }}><label><span className="label">{t.serial}</span><input className="input mt-1" name="serial" required /></label><label><span className="label">{t.upi}</span><input className="input mt-1" name="upi" /></label><button className="btn-secondary self-end" disabled={saving}>{t.createItem}</button></form>
    {workspace.items?.length ? <>
      <div className="mt-6"><label><span className="label">{t.item}</span><select className="input mt-1" value={selectedItemId} onChange={(event) => setItemId(event.target.value)}>{workspace.items.map((item: any) => <option key={item.id} value={item.id}>{item.serial_identifier}</option>)}</select></label></div>
      <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const measuredAt = form.get("measuredAt"); onAction({ action: "appendMetric", batteryItemId: selectedItemId, metricType: form.get("metricType"), metricValue: form.get("metricValue"), measuredAt: measuredAt ? new Date(String(measuredAt)).toISOString() : new Date().toISOString(), dataSource: "manual" }); }}><label><span className="label">{t.metric}</span><select className="input mt-1" name="metricType"><option value="SOC">{isZh ? "荷电状态" : "State of charge"}</option><option value="REMAINING_CAPACITY">{isZh ? "剩余容量" : "Remaining capacity"}</option><option value="TEMPERATURE">{isZh ? "温度" : "Temperature"}</option><option value="FULL_CYCLE_COUNT">{isZh ? "完整循环次数" : "Full cycle count"}</option><option value="SOH_VOLUNTARY">{isZh ? "健康状态（自愿）" : "State of health (voluntary)"}</option></select></label><label><span className="label">{t.metricValue}</span><input className="input mt-1" name="metricValue" required step="any" type="number" /></label><label><span className="label">{t.measuredAt}</span><input className="input mt-1" name="measuredAt" type="datetime-local" /></label><button className="btn-primary self-end" disabled={saving}>{t.appendMetric}</button></form>
      <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onAction({ action: "appendLifecycleEvent", batteryItemId: selectedItemId, eventType: form.get("eventType"), eventData: { note: form.get("eventNote") }, dataSource: "manual" }); }}><label><span className="label">{t.eventType}</span><select className="input mt-1" name="eventType"><option value="commissioned">{isZh ? "投入使用" : "Commissioned"}</option><option value="repaired">{isZh ? "维修" : "Repaired"}</option><option value="repurposed">{isZh ? "梯次利用" : "Repurposed"}</option><option value="accident">{isZh ? "事故" : "Accident"}</option><option value="decommissioned">{isZh ? "退役" : "Decommissioned"}</option></select></label><label><span className="label">{t.eventNote}</span><input className="input mt-1" name="eventNote" /></label><button className="btn-secondary self-end" disabled={saving}>{t.appendEvent}</button></form>
      <div className="mt-6 grid gap-3 md:grid-cols-2">{workspace.metrics?.slice(0, 8).map((metric: any) => <div key={metric.id} className="rounded border border-slate-200 px-3 py-2 text-sm"><strong>{metric.metric_type}</strong><span className="ml-2">{metric.metric_value} {metric.unit}</span><p className="mt-1 text-xs text-slate-500">{new Date(metric.measured_at).toLocaleString()}</p></div>)}{workspace.lifecycleEvents?.slice(0, 8).map((event: any) => <div key={event.id} className="rounded border border-slate-200 px-3 py-2 text-sm"><strong>{event.event_type}</strong><p className="mt-1 text-xs text-slate-500">{new Date(event.event_time).toLocaleString()}</p></div>)}</div>
    </> : <p className="mt-5 text-sm font-semibold text-slate-500">{t.noItems}</p>}
  </div>;
}
