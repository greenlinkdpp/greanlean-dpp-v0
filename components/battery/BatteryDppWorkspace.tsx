"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  BATTERY_CATEGORIES,
  BATTERY_WORKFLOW_STEPS,
  classifyBattery,
  hasBatteryFieldValue,
  type BatteryFieldValue,
  type BatteryLegalCategory,
  type BatteryWorkflowStepCode,
} from "@/lib/battery/catalog";
import {
  EU_BATTERY_PASSPORT_FIELDS,
  fieldForCanonicalCode,
  fieldValueForRegulatoryField,
  regulatoryFieldsForBattery,
  regulatoryStatusForField,
  localizedRegulatorySourceNote,
} from "@/lib/battery/regulatoryCatalog";
import {
  BATTERY_OPERATING_METRICS,
  operatingDataFreshness,
  operatingDataPolicyForBattery,
} from "@/lib/battery/operatingDataPolicy";
import { calculateBatteryReadiness } from "@/lib/battery/readiness";
import { createSupabaseClient } from "@/lib/supabase";

type Props = {
  productId: string;
  canManageRegistry?: boolean;
  initialStep?: BatteryWorkflowStepCode;
  allowedSteps?: BatteryWorkflowStepCode[];
  showClassificationControls?: boolean;
};

const accessLabels = {
  zh: { PUBLIC: "公开", LEGITIMATE_INTEREST: "正当利益访问", AUTHORITY_ONLY: "主管机关访问", INTERNAL: "内部访问" },
  en: { PUBLIC: "Public", LEGITIMATE_INTEREST: "Legitimate interest", AUTHORITY_ONLY: "Authority only", INTERNAL: "Internal" },
};
const granularityLabels = {
  zh: { model: "型号级", batch: "批次级", individual: "单体级", lifecycle: "生命周期级" },
  en: { model: "Model", batch: "Batch", individual: "Individual", lifecycle: "Lifecycle" },
};
const requirementLabels = {
  zh: { mandatory: "法规必填", conditional: "条件适用", optional: "可选", future: "未来要求", duplicate: "重复项", not_applicable: "不适用" },
  en: { mandatory: "Mandatory", conditional: "Conditional", optional: "Optional", future: "Future", duplicate: "Duplicate", not_applicable: "Not applicable" },
};

function valueText(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function percentBar(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function optionLabel(value: string, isZh: boolean) {
  const labels: Record<string, [string, string]> = {
    missing: ["缺失", "Missing"],
    declared: ["已声明", "Declared"],
    uploaded: ["已上传", "Uploaded"],
    verified: ["已核验", "Verified"],
    rejected: ["已驳回", "Rejected"],
    not_applicable: ["不适用", "Not applicable"],
    unverified: ["未核验", "Unverified"],
    in_review: ["核验中", "In review"],
    pending: ["待补充", "Pending"],
    confirmed: ["已确认", "Confirmed"],
    questioned: ["有疑问", "Questioned"],
    not_required: ["无需复核", "Not required"],
  };
  return labels[value]?.[isZh ? 0 : 1] || value;
}

export function BatteryDppWorkspace({
  productId,
  canManageRegistry: _canManageRegistry = true,
  initialStep = "identity",
  allowedSteps,
  showClassificationControls = true,
}: Props) {
  const { locale } = useLanguage();
  const isZh = locale === "zh";
  const t = isZh
    ? {
        title: "电池护照数据工作区", subtitle: "按《Digital Batteries Passport - data points by category》v2.0 的 71 项口径录入；BatteryPass-Ready 仅用于外部 JSON 适配与校验。",
        loading: "正在读取电池 DPP 数据...", retry: "重试", save: "保存当前电池 DPP", saving: "正在保存...", saved: "已保存。",
        category: "法定电池类别", energy: "额定能量（kWh）", stationary: "固定式工业电池", bms: "配有 BMS", applicability: "电池护照适用性",
        required: "适用", notRequired: "当前不适用", conditional: "待条件确认", tbd: "待人工确认", schema: "验证配置",
        fieldCount: "个适用字段", expanded: "展开字段说明", collapsed: "收起字段说明", unit: "单位", granularity: "数据粒度", access: "访问权限",
        source: "数据来源", sourceReference: "来源引用", evidence: "证明材料", evidenceRequired: "需要证明材料", evidenceOptional: "当前未要求证明材料", regulation: "法规来源",
        complete: "已填写", missing: "未填写", dataStatus: "数据状态", evidenceStatus: "证据状态", verificationStatus: "核验状态", expertReview: "专家复核", expertNote: "复核备注", value: "字段值",
        confirmed: "法规必填完整度", conditionalMetric: "条件适用完整度", optionalMetric: "可选项完整度", evidenceMetric: "证明材料完整度", verification: "数据核验完成度", registry: "关键标识准备度", futureFields: "未来要求（不计缺失）", duplicateFields: "重复项（不展示）",
        noFields: "此步骤没有需要人工填写的静态字段。", itemTitle: "单体运行记录", itemIntro: "这里保存单体级最新快照和完整历史。运行数据只追加、不覆盖，并且不进入消费者公开页面。",
        item: "电池单体", serial: "序列号", upi: "唯一产品标识", createItem: "新增单体", metric: "动态指标", metricValue: "指标值", measuredAt: "测量时间", appendMetric: "追加指标",
        event: "生命周期事件", eventType: "事件类型", eventNote: "事件说明", appendEvent: "追加事件", noItems: "请先新增一个电池单体。",
        collectionMode: "采集方式", restrictedAccess: "访问级别", syncCadence: "更新节奏", latestSnapshot: "最近快照", legitimateInterest: "仅限经批准的正当利益主体", noSnapshot: "尚无运行数据", sourceType: "数据来源", sourceDevice: "设备或网关标识",
        mapping: "现有字段映射", evidenceCount: "关联证据",
      }
    : {
        title: "Battery passport data workspace", subtitle: "Capture the 71 data points in Digital Batteries Passport - data points by category v2.0. BatteryPass-Ready remains an external JSON validation adapter.",
        loading: "Loading battery DPP data...", retry: "Retry", save: "Save battery DPP", saving: "Saving...", saved: "Saved.",
        category: "Legal battery category", energy: "Rated energy (kWh)", stationary: "Stationary industrial battery", bms: "BMS present", applicability: "Battery-passport applicability",
        required: "Required", notRequired: "Not currently required", conditional: "Condition pending", tbd: "Manual confirmation", schema: "Validation configuration",
        fieldCount: "applicable fields", expanded: "Expand field guidance", collapsed: "Collapse field guidance", unit: "Unit", granularity: "Data granularity", access: "Access",
        source: "Data source", sourceReference: "Source reference", evidence: "Evidence", evidenceRequired: "Evidence required", evidenceOptional: "No evidence currently required", regulation: "Legal source",
        complete: "Complete", missing: "Missing", dataStatus: "Data status", evidenceStatus: "Evidence status", verificationStatus: "Verification status", expertReview: "Expert review", expertNote: "Review note", value: "Field value",
        confirmed: "Mandatory completeness", conditionalMetric: "Conditional completeness", optionalMetric: "Optional completeness", evidenceMetric: "Evidence completeness", verification: "Verification completion", registry: "Key identifier readiness", futureFields: "Future fields (excluded)", duplicateFields: "Duplicates (hidden)",
        noFields: "This step has no manually entered static fields.", itemTitle: "Item operating records", itemIntro: "This area stores item-level latest snapshots and complete history. Operating data is append-only and never enters the public consumer page.",
        item: "Battery item", serial: "Serial identifier", upi: "Unique product identifier", createItem: "Add item", metric: "Operating metric", metricValue: "Metric value", measuredAt: "Measured at", appendMetric: "Append metric",
        event: "Lifecycle event", eventType: "Event type", eventNote: "Event note", appendEvent: "Append event", noItems: "Add a battery item first.",
        collectionMode: "Collection mode", restrictedAccess: "Access level", syncCadence: "Update cadence", latestSnapshot: "Latest snapshot", legitimateInterest: "Approved legitimate-interest users only", noSnapshot: "No operating data yet", sourceType: "Data source", sourceDevice: "Device or gateway identifier",
        mapping: "Existing-field mapping", evidenceCount: "Linked evidence",
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
  const [activeStep, setActiveStep] = useState<BatteryWorkflowStepCode>(initialStep);
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
      BATTERY_METRIC_OUT_OF_RANGE: "动态指标数值超出允许范围。",
      INVALID_MEASUREMENT_TIME: "测量时间无效或晚于当前时间。",
      INVALID_BATTERY_DATA_SOURCE: "请选择有效的数据来源。",
      BATTERY_SOURCE_DEVICE_REQUIRED: "BMS 或网关数据必须填写设备标识。",
      BATTERY_OPERATING_DATA_NOT_APPLICABLE: "请先确认电池护照分类，再启用自动运行数据采集。",
      INVALID_BATTERY_EVENT: "请完整填写电池单体和生命周期事件。",
      BATTERY_SCHEMA_NOT_INSTALLED: "电池字段目录尚未安装。",
      BATTERY_SCHEMA_NOT_PUBLISHED: "电池字段目录尚未发布。",
      BATTERY_INTERNAL_ACCESS_REQUIRED: "当前账号尚未获得电池 DPP 内部管理权限。",
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

  useEffect(() => {
    setActiveStep(initialStep);
  }, [initialStep, productId]);

  const classification = classifyBattery({
    legalCategory: category,
    capacityKwh: capacityKwh === "" ? null : Number(capacityKwh),
    stationary,
    bmsPresent,
  });
  const readiness = calculateBatteryReadiness(classification, {
    ...values,
    ...(workspace?.dynamicValues || {}),
  });
  const currentStep = BATTERY_WORKFLOW_STEPS.find((step) => step.code === activeStep) || BATTERY_WORKFLOW_STEPS[0];
  const currentFields = regulatoryFieldsForBattery(classification, { chapter: activeStep, dynamic: false });
  const operatingPolicy = operatingDataPolicyForBattery(classification);
  const visibleSteps = BATTERY_WORKFLOW_STEPS.filter((step) => !allowedSteps || allowedSteps.includes(step.code));

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
    const field = fieldForCanonicalCode(fieldCode);
    const stored = field ? fieldValueForRegulatoryField(field, values).value?.value : values[fieldCode]?.value;
    return stored ?? derivedValue(fieldCode) ?? "";
  }

  function changeValue(fieldCode: string, patch: Partial<BatteryFieldValue>) {
    setValues((current) => ({ ...current, [fieldCode]: { ...current[fieldCode], ...patch, value: patch.value ?? current[fieldCode]?.value ?? "" } }));
  }

  function workspacePayload() {
    const staticValues = Object.fromEntries(Object.entries(values).filter(([fieldCode]) => {
      const field = fieldForCanonicalCode(fieldCode);
      return field && !field.dynamic;
    }));
    for (const field of currentFields) {
      const derived = derivedValue(field.canonicalFieldCode);
      if (derived !== undefined && staticValues[field.canonicalFieldCode] === undefined) {
        staticValues[field.canonicalFieldCode] = { value: derived, dataStatus: "declared", sourceType: "system_derived", verificationStatus: "unverified", evidenceStatus: "not_applicable", fieldOrigin: "eu_guidance_v2" };
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
    [t.confirmed, readiness.confirmedMandatory], [t.conditionalMetric, readiness.conditionalMandatory], [t.optionalMetric, readiness.optional], [t.evidenceMetric, readiness.evidence],
    [t.verification, readiness.verification], [t.registry, readiness.registry],
  ] as const;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-black text-slate-950">{t.title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t.subtitle}</p>
      </header>

      {showClassificationControls ? <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 md:grid-cols-4">
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
      </div> : <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <span className="text-xs font-black uppercase text-slate-500">{t.applicability}</span>
        <span className="rounded-md bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">{applicabilityLabel}</span>
        <span className="text-sm font-semibold text-slate-600">{isZh ? classification.reasonZh : classification.reasonEn}</span>
      </div>}

      {visibleSteps.length > 1 ? <nav className="flex overflow-x-auto border-b border-slate-200 px-4" aria-label={t.title}>
        {visibleSteps.map((step) => <button key={`${step.number}-${step.code}`} className={`min-w-36 border-b-2 px-3 py-4 text-left text-sm font-bold ${activeStep === step.code ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`} onClick={() => setActiveStep(step.code)} type="button"><span className="block text-xs">{step.number}</span>{isZh ? step.labelZh : step.labelEn}</button>)}
      </nav> : null}

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase text-emerald-700">{String(currentStep.number).padStart(2, "0")}</p><h3 className="mt-1 text-lg font-black text-slate-950">{isZh ? currentStep.labelZh : currentStep.labelEn}</h3>{!["health", "lifecycle"].includes(activeStep) ? <p className="mt-1 text-sm text-slate-500">{currentFields.length} {t.fieldCount}</p> : null}</div>
            {currentFields.length > 0 ? <button className="btn-primary" disabled={saving} onClick={save} type="button">{saving ? t.saving : t.save}</button> : null}
          </div>

          {currentFields.length > 0 ? <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {currentFields.map((field) => {
              const requirement = regulatoryStatusForField(field, classification);
              const resolved = fieldValueForRegulatoryField(field, values);
              const current = values[field.canonicalFieldCode] || resolved.value;
              const complete = hasBatteryFieldValue({ value: displayedValue(field.canonicalFieldCode) });
              const isDerived = derivedValue(field.canonicalFieldCode) !== undefined;
              const inputValue = valueText(displayedValue(field.canonicalFieldCode));
              const accessLevel = field.access === "professional" ? "LEGITIMATE_INTEREST" : field.access === "regulator" ? "AUTHORITY_ONLY" : "PUBLIC";
              return <div key={field.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-black text-emerald-700">{field.id}</p><h4 className="mt-1 font-black text-slate-950">{isZh ? field.nameZh : field.nameEn}{field.unit ? <span className="ml-2 text-xs font-bold text-slate-500">({field.unit})</span> : null}</h4><div className="mt-2 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{requirementLabels[isZh ? "zh" : "en"][requirement]}</span><span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{granularityLabels[isZh ? "zh" : "en"][field.dataLevel]}</span><span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{accessLabels[isZh ? "zh" : "en"][accessLevel]}</span><span className={`rounded px-2 py-1 ${complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{complete ? t.complete : t.missing}</span>{field.mappingQuality !== "A" ? <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">{t.mapping} {field.mappingQuality}</span> : null}</div></div>
                  <button className="text-sm font-bold text-emerald-700" onClick={() => setGuideOpen((currentState) => ({ ...currentState, [field.id]: !currentState[field.id] }))} type="button">{guideOpen[field.id] ? t.collapsed : t.expanded}</button>
                </div>
                {guideOpen[field.id] ? <div className="mt-4 grid gap-3 border-l-2 border-emerald-500 pl-4 text-sm leading-6 text-slate-600 md:grid-cols-2"><p>{localizedRegulatorySourceNote(field, locale)}</p><dl className="grid gap-1"><div><dt className="inline font-bold text-slate-800">{t.regulation}: </dt><dd className="inline">{field.legalSource}</dd></div><div><dt className="inline font-bold text-slate-800">{t.evidence}: </dt><dd className="inline">{field.evidenceRequired ? t.evidenceRequired : t.evidenceOptional}</dd></div><div><dt className="inline font-bold text-slate-800">{t.mapping}: </dt><dd className="inline">{field.mappingQuality} · {resolved.fieldCode}</dd></div></dl></div> : null}
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <label><span className="label">{t.value}</span>{["object", "array"].includes(field.dataType) || inputValue.length > 80 ? <textarea className="input mt-1 min-h-24" disabled={isDerived} value={inputValue} onChange={(event) => changeValue(field.canonicalFieldCode, { value: event.target.value, fieldOrigin: "eu_guidance_v2" })} /> : <input className="input mt-1" disabled={isDerived} type={["integer", "decimal"].includes(field.dataType) ? "number" : field.dataType === "date" ? "date" : field.dataType === "datetime" ? "datetime-local" : field.dataType === "uri" ? "url" : "text"} value={inputValue} onChange={(event) => changeValue(field.canonicalFieldCode, { value: event.target.value, fieldOrigin: "eu_guidance_v2" })} />}</label>
                  <label><span className="label">{t.dataStatus}</span><select className="input mt-1" value={current?.dataStatus || (complete ? "declared" : "missing")} onChange={(event) => changeValue(field.canonicalFieldCode, { dataStatus: event.target.value as BatteryFieldValue["dataStatus"] })}><option value="missing">{optionLabel("missing", isZh)}</option><option value="pending">{optionLabel("pending", isZh)}</option><option value="declared">{optionLabel("declared", isZh)}</option><option value="verified">{optionLabel("verified", isZh)}</option>{requirement === "conditional" ? <option value="not_applicable">{optionLabel("not_applicable", isZh)}</option> : null}</select></label>
                  <label><span className="label">{t.source}</span><input className="input mt-1" value={current?.sourceType || ""} onChange={(event) => changeValue(field.canonicalFieldCode, { sourceType: event.target.value })} /></label>
                  <label><span className="label">{t.sourceReference}</span><input className="input mt-1" value={current?.sourceReference || ""} onChange={(event) => changeValue(field.canonicalFieldCode, { sourceReference: event.target.value })} /></label>
                  <div className="grid grid-cols-2 gap-3"><div><span className="label">{t.evidenceStatus}</span><p className="input mt-1 flex items-center bg-slate-50 font-semibold">{optionLabel(current?.evidenceStatus || "missing", isZh)} · {current?.evidenceCount || 0}</p></div><div><span className="label">{t.verificationStatus}</span><p className="input mt-1 flex items-center bg-slate-50 font-semibold">{optionLabel(current?.verificationStatus || "unverified", isZh)}</p></div></div>
                  <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3"><label><span className="label">{t.expertReview}</span><select className="input mt-1" value={current?.expertReviewStatus || field.expertReviewStatus} onChange={(event) => changeValue(field.canonicalFieldCode, { expertReviewStatus: event.target.value as BatteryFieldValue["expertReviewStatus"] })}><option value="not_required">{optionLabel("not_required", isZh)}</option><option value="pending">{optionLabel("pending", isZh)}</option><option value="confirmed">{optionLabel("confirmed", isZh)}</option><option value="questioned">{optionLabel("questioned", isZh)}</option></select></label><label><span className="label">{t.expertNote}</span><input className="input mt-1" value={current?.expertReviewNote || ""} onChange={(event) => changeValue(field.canonicalFieldCode, { expertReviewNote: event.target.value })} /></label></div>
                </div>
              </div>;
            })}
          </div> : null}

          {currentFields.length === 0 && !["health", "lifecycle"].includes(activeStep) ? <p className="mt-5 border-y border-slate-200 py-8 text-center text-sm font-semibold text-slate-500">{t.noFields}</p> : null}
          {activeStep === "health" ? <ItemOperation mode="metrics" workspace={workspace} operatingPolicy={operatingPolicy} isZh={isZh} saving={saving} t={t} onAction={performAction} /> : null}
          {activeStep === "lifecycle" ? <ItemOperation mode="lifecycle" workspace={workspace} operatingPolicy={operatingPolicy} isZh={isZh} saving={saving} t={t} onAction={performAction} /> : null}
          {activeStep === "evidence" ? <EvidenceSummary values={values} isZh={isZh} /> : null}
          {message ? <p className={`mt-4 text-sm font-semibold ${message === t.saved ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-black text-slate-950">{isZh ? "分项准备度" : "Readiness dimensions"}</h3>
          <div className="mt-4 grid gap-4">{readinessRows.map(([label, metric]) => <div key={label}><div className="flex justify-between gap-2 text-xs font-bold text-slate-600"><span>{label}</span><span>{metric.complete}/{metric.total}</span></div><div className="mt-2 h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-emerald-600" style={{ width: percentBar(metric.percent) }} /></div></div>)}</div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4"><div><p className="text-xs font-bold text-slate-500">{t.futureFields}</p><p className="mt-1 text-2xl font-black text-slate-950">{readiness.futureFieldCount}</p></div><div><p className="text-xs font-bold text-slate-500">{t.duplicateFields}</p><p className="mt-1 text-2xl font-black text-slate-950">{readiness.duplicateFieldCount}</p></div></div>
        </aside>
      </div>
    </section>
  );
}

function EvidenceSummary({ values, isZh }: { values: Record<string, BatteryFieldValue>; isZh: boolean }) {
  const rows = EU_BATTERY_PASSPORT_FIELDS
    .map((field) => ({ field, resolved: fieldValueForRegulatoryField(field, values).value }))
    .filter(({ resolved }) => resolved && hasBatteryFieldValue(resolved));
  if (!rows.length) {
    return <p className="mt-5 border-y border-slate-200 py-8 text-center text-sm font-semibold text-slate-500">{isZh ? "尚无已填写字段的数据来源或证据记录。" : "No source or evidence records are available for populated fields."}</p>;
  }
  return <div className="mt-5 overflow-x-auto border-y border-slate-200">
    <table className="min-w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs font-black text-slate-600"><tr><th className="px-3 py-3">{isZh ? "数据点" : "Data point"}</th><th className="px-3 py-3">{isZh ? "数据来源" : "Source"}</th><th className="px-3 py-3">{isZh ? "证据" : "Evidence"}</th><th className="px-3 py-3">{isZh ? "核验 / 专家复核" : "Verification / expert review"}</th><th className="px-3 py-3">{isZh ? "更新时间" : "Updated"}</th></tr></thead>
      <tbody className="divide-y divide-slate-200">{rows.map(({ field, resolved }) => <tr key={field.id}><td className="px-3 py-3 font-bold text-slate-900">{field.id} · {isZh ? field.nameZh : field.nameEn}</td><td className="px-3 py-3 text-slate-600">{resolved?.sourceType || "—"}{resolved?.sourceReference ? <span className="block text-xs">{resolved.sourceReference}</span> : null}</td><td className="px-3 py-3 text-slate-600">{optionLabel(resolved?.evidenceStatus || "missing", isZh)} · {resolved?.evidenceCount || 0}</td><td className="px-3 py-3 text-slate-600">{optionLabel(resolved?.verificationStatus || "unverified", isZh)} / {optionLabel(resolved?.expertReviewStatus || field.expertReviewStatus, isZh)}</td><td className="px-3 py-3 text-slate-600">{resolved?.lastUpdated ? new Date(resolved.lastUpdated).toLocaleString() : "—"}</td></tr>)}</tbody>
    </table>
  </div>;
}

function ItemOperation({
  mode,
  workspace,
  operatingPolicy,
  isZh,
  saving,
  t,
  onAction,
}: {
  mode: "metrics" | "lifecycle";
  workspace: any;
  operatingPolicy: ReturnType<typeof operatingDataPolicyForBattery>;
  isZh: boolean;
  saving: boolean;
  t: any;
  onAction: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [itemId, setItemId] = useState(workspace.items?.[0]?.id || "");
  const [dataSource, setDataSource] = useState("manual");

  useEffect(() => {
    if (!itemId && workspace.items?.[0]?.id) setItemId(workspace.items[0].id);
  }, [itemId, workspace.items]);

  const selectedItemId = itemId || workspace.items?.[0]?.id || "";
  const selectedMetrics = (workspace.metrics || []).filter((metric: any) => !selectedItemId || metric.battery_item_id === selectedItemId);
  const latestMeasuredAt = selectedMetrics[0]?.measured_at || null;
  const freshness = operatingDataFreshness(operatingPolicy, latestMeasuredAt);
  const databaseMetricByCode = new Map((workspace.metricTypes || []).map((metric: any) => [metric.code, metric]));
  const metricDefinitions = BATTERY_OPERATING_METRICS.map((metric) => ({
    ...metric,
    ...(databaseMetricByCode.get(metric.code) || {}),
  }));
  const collectionMode = {
    BMS_DAILY: isZh ? "BMS 日级快照" : "Daily BMS snapshot",
    CONNECTED_OR_SERVICE: isZh ? "设备网关或维保快照" : "Gateway or service snapshot",
    SERVICE_SNAPSHOT: isZh ? "维保事件快照" : "Service-event snapshot",
    VOLUNTARY: isZh ? "自愿记录" : "Voluntary record",
    MANUAL_REVIEW: isZh ? "分类确认后启用" : "Enable after classification",
  }[operatingPolicy.collectionMode];
  const freshnessLabel = {
    NOT_APPLICABLE: isZh ? "当前分类无强制要求" : "Not required for this category",
    MISSING: t.noSnapshot,
    RECORDED: latestMeasuredAt ? new Date(latestMeasuredAt).toLocaleString() : t.noSnapshot,
    CURRENT: latestMeasuredAt ? new Date(latestMeasuredAt).toLocaleString() : t.noSnapshot,
    DUE: isZh ? "需要更新" : "Update due",
    OVERDUE: isZh ? "已逾期" : "Overdue",
  }[freshness.status];
  const syncCadence = operatingPolicy.recommendedSyncHours
    ? (isZh ? `至少每 ${operatingPolicy.recommendedSyncHours} 小时` : `At least every ${operatingPolicy.recommendedSyncHours} hours`)
    : (isZh ? "按状态或维保事件更新" : "On status or service events");

  return <div className="mt-5 border-y border-slate-200 py-6">
    <h4 className="font-black text-slate-950">{mode === "metrics" ? t.itemTitle : (isZh ? "电池生命周期事件" : "Battery lifecycle events")}</h4><p className="mt-2 text-sm text-slate-600">{mode === "metrics" ? t.itemIntro : (isZh ? "记录 DP-67 至 DP-69 的生命周期状态和事件；护照发布状态与电池生命周期状态分别管理。" : "Record lifecycle status and events for DP-67 to DP-69. Passport publication status and battery lifecycle status are managed separately.")}</p>
    <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
      {[
        [t.collectionMode, collectionMode],
        [t.restrictedAccess, t.legitimateInterest],
        [t.syncCadence, syncCadence],
        [t.latestSnapshot, freshnessLabel],
      ].map(([label, value]) => <div key={label} className="bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-sm font-black leading-5 text-slate-900">{value}</p></div>)}
    </div>
    <div className={`mt-4 border-l-4 px-4 py-3 text-sm font-semibold leading-6 ${operatingPolicy.passportOperatingDataApplies ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-amber-500 bg-amber-50 text-amber-900"}`}>
      <p>{isZh ? operatingPolicy.guidanceZh : operatingPolicy.guidanceEn}</p>
      <p className="mt-1 text-xs font-bold opacity-80">{isZh ? operatingPolicy.legalBasisZh : operatingPolicy.legalBasisEn}</p>
    </div>
    <form className="mt-5 grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onAction({ action: "createItem", serialIdentifier: form.get("serial"), uniqueProductIdentifier: form.get("upi") }); event.currentTarget.reset(); }}><label><span className="label">{t.serial}</span><input className="input mt-1" name="serial" required /></label><label><span className="label">{t.upi}</span><input className="input mt-1" name="upi" /></label><button className="btn-secondary self-end" disabled={saving}>{t.createItem}</button></form>
    {workspace.items?.length ? <>
      <div className="mt-6"><label><span className="label">{t.item}</span><select className="input mt-1" value={selectedItemId} onChange={(event) => setItemId(event.target.value)}>{workspace.items.map((item: any) => <option key={item.id} value={item.id}>{item.serial_identifier}</option>)}</select></label></div>
      {mode === "metrics" ? <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const measuredAt = form.get("measuredAt"); onAction({ action: "appendMetric", batteryItemId: selectedItemId, metricType: form.get("metricType"), metricValue: form.get("metricValue"), measuredAt: measuredAt ? new Date(String(measuredAt)).toISOString() : new Date().toISOString(), dataSource: form.get("dataSource"), sourceDevice: form.get("sourceDevice") }); }}><label className="xl:col-span-2"><span className="label">{t.metric}</span><select className="input mt-1" name="metricType">{metricDefinitions.map((metric: any) => <option key={metric.code} value={metric.code}>{isZh ? metric.label_zh || metric.labelZh : metric.label_en || metric.labelEn} ({metric.default_unit || metric.defaultUnit})</option>)}</select></label><label><span className="label">{t.metricValue}</span><input className="input mt-1" name="metricValue" required step="any" type="number" /></label><label><span className="label">{t.measuredAt}</span><input className="input mt-1" name="measuredAt" type="datetime-local" /></label><label><span className="label">{t.sourceType}</span><select className="input mt-1" name="dataSource" value={dataSource} onChange={(event) => setDataSource(event.target.value)}><option value="manual">{isZh ? "人工记录" : "Manual"}</option><option value="service">{isZh ? "维保记录" : "Service record"}</option><option value="bms">{isZh ? "电池管理系统" : "BMS"}</option><option value="bms_gateway">{isZh ? "设备网关" : "Equipment gateway"}</option><option value="import">{isZh ? "经核验导入" : "Verified import"}</option></select></label><label><span className="label">{t.sourceDevice}</span><input className="input mt-1" disabled={!["bms", "bms_gateway"].includes(dataSource)} name="sourceDevice" required={["bms", "bms_gateway"].includes(dataSource)} /></label><button className="btn-primary md:col-span-2 xl:col-span-6 xl:justify-self-end" disabled={saving}>{t.appendMetric}</button></form> : null}
      {mode === "lifecycle" ? <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onAction({ action: "appendLifecycleEvent", batteryItemId: selectedItemId, eventType: form.get("eventType"), eventData: { note: form.get("eventNote") }, dataSource: "manual" }); }}><label><span className="label">{t.eventType}</span><select className="input mt-1" name="eventType"><option value="commissioned">{isZh ? "投入使用" : "Commissioned"}</option><option value="repaired">{isZh ? "维修" : "Repaired"}</option><option value="repurposed">{isZh ? "梯次利用" : "Repurposed"}</option><option value="reused">{isZh ? "再使用" : "Re-used"}</option><option value="remanufactured">{isZh ? "再制造" : "Remanufactured"}</option><option value="accident">{isZh ? "事故" : "Accident"}</option><option value="waste">{isZh ? "成为废弃物" : "Waste"}</option></select></label><label><span className="label">{t.eventNote}</span><input className="input mt-1" name="eventNote" /></label><button className="btn-secondary self-end" disabled={saving}>{t.appendEvent}</button></form> : null}
      <div className="mt-6 grid gap-3 md:grid-cols-2">{mode === "metrics" ? selectedMetrics.slice(0, 12).map((metric: any) => { const definition: any = metricDefinitions.find((item) => item.code === metric.metric_type); return <div key={metric.id} className="rounded border border-slate-200 px-3 py-2 text-sm"><strong>{isZh ? definition?.label_zh || definition?.labelZh || metric.metric_type : definition?.label_en || definition?.labelEn || metric.metric_type}</strong><span className="ml-2">{metric.metric_value} {metric.unit}</span><p className="mt-1 text-xs text-slate-500">{new Date(metric.measured_at).toLocaleString()} · {metric.data_source}{metric.source_device ? ` · ${metric.source_device}` : ""}</p></div>; }) : workspace.lifecycleEvents?.filter((event: any) => !selectedItemId || event.battery_item_id === selectedItemId).slice(0, 12).map((event: any) => <div key={event.id} className="rounded border border-slate-200 px-3 py-2 text-sm"><strong>{event.event_type}</strong><p className="mt-1 text-xs text-slate-500">{new Date(event.event_time).toLocaleString()}</p></div>)}</div>
    </> : <p className="mt-5 text-sm font-semibold text-slate-500">{t.noItems}</p>}
  </div>;
}
