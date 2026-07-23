"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type Props = { productId: string; isZh: boolean };

type ValidationRow = {
  id: string;
  rule_code: string;
  severity: "INFO" | "WARNING" | "ERROR" | "BLOCKER";
  passed: boolean;
  message_en: string;
  message_zh: string;
};

type Submission = {
  id: string;
  environment: "TEST";
  granularity: string;
  mapping_version: string;
  request_hash: string;
  submission_status: string;
  registry_correlation_id: string | null;
  retry_of_submission_id: string | null;
  created_at: string;
  validationResults: ValidationRow[];
  errors: Array<{ id: string; error_code: string | null; redacted_message: string; retryable: boolean }>;
};

type Workspace = {
  environment: "TEST";
  productionEnabled: false;
  mapping: {
    version: string;
    operationalRuleVersion: string;
    registrySchemaVersion: string | null;
    officialBatterySemanticCatalogueAvailable: boolean;
  };
  submissions: Submission[];
};

const statusZh: Record<string, string> = {
  PREPARING: "准备中", VALIDATING: "校验中", READY: "测试文件已就绪", SUBMITTED: "已人工提交",
  REJECTED: "测试环境已拒绝", FAILED: "失败", ACCEPTED: "已接受",
};

const statusEn: Record<string, string> = {
  PREPARING: "Preparing", VALIDATING: "Validating", READY: "TEST file ready", SUBMITTED: "Manually submitted",
  REJECTED: "Rejected in TEST", FAILED: "Failed", ACCEPTED: "Accepted",
};

const severityZh: Record<ValidationRow["severity"], string> = { INFO: "提示", WARNING: "警告", ERROR: "错误", BLOCKER: "阻断项" };
const granularityZh: Record<string, string> = { MODEL: "型号级", BATCH: "批次级", ITEM: "单体级" };

export function RegistryWorkbench({ productId, isZh }: Props) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [resultSubmissionId, setResultSubmissionId] = useState("");
  const [resultOutcome, setResultOutcome] = useState("SUBMITTED");
  const [resultText, setResultText] = useState("");

  const t = isZh ? {
    loading: "正在读取 Registry 测试记录...", retry: "重试", environment: "Registry 环境", mapping: "映射版本", rules: "操作规则版本",
    semantic: "电池语义目录", unavailable: "官方目录尚未开放", notice: "当前仅支持生成测试映射文件和记录人工测试结果。官方电池语义目录尚未开放，因此不能标记为注册成功。",
    generate: "生成测试映射文件", generating: "正在生成...", history: "测试记录", empty: "尚未生成测试记录。", download: "下载映射文件",
    checks: "预校验", passed: "通过", failed: "未通过", warnings: "警告或限制", retryAction: "按当前数据重试", result: "记录人工测试结果",
    submission: "测试记录", outcome: "结果", response: "Registry 返回内容", record: "保存测试结果", submitted: "已人工提交", rejected: "测试环境拒绝", failedOutcome: "提交失败",
    batteryPassDownload: "下载 BatteryPass LMT JSON", batteryPassDownloaded: "BatteryPass LMT JSON 已通过本地 Schema 校验并下载。数据状态为测试、未验证。",
    saved: "测试结果已保存。", generated: "测试映射文件已生成。", generatedFailed: "测试映射文件已生成，但预校验未通过。请按展开的错误项补齐数据后重试。", noResponse: "记录拒绝或失败时，请填写 Registry 返回的错误内容。",
  } : {
    loading: "Loading Registry TEST records...", retry: "Retry", environment: "Registry environment", mapping: "Mapping version", rules: "Operational rule version",
    semantic: "Battery semantic catalogue", unavailable: "Official catalogue unavailable", notice: "This workbench only generates TEST mapping files and records manual test outcomes. A successful battery registration cannot be reported until the official battery semantic catalogue is available.",
    generate: "Generate TEST mapping file", generating: "Generating...", history: "TEST history", empty: "No TEST record has been generated.", download: "Download mapping file",
    checks: "Pre-validation", passed: "Passed", failed: "Not passed", warnings: "Warnings or limitations", retryAction: "Retry with current data", result: "Record manual TEST result",
    submission: "TEST record", outcome: "Outcome", response: "Registry response", record: "Save TEST result", submitted: "Manually submitted", rejected: "Rejected in TEST", failedOutcome: "Submission failed",
    batteryPassDownload: "Download BatteryPass LMT JSON", batteryPassDownloaded: "BatteryPass LMT JSON passed local Schema validation and was downloaded. Its data status is test and unverified.",
    saved: "TEST result saved.", generated: "TEST mapping file generated.", generatedFailed: "The TEST mapping file was generated, but local pre-validation failed. Correct the expanded errors and retry.", noResponse: "Enter the Registry error response for rejected or failed outcomes.",
  };

  async function authorizationHeaders(json = true) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error(isZh ? "登录会话已失效，请重新登录。" : "The session has expired. Please sign in again.");
    return { Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}) };
  }

  function localizedApiError(payload: any, status: number) {
    if (!isZh) return payload?.error?.message || String(status);
    const code = payload?.error?.code;
    const messages: Record<string, string> = {
      REGISTRY_ADAPTER_NOT_INSTALLED: "Registry 数据库升级尚未执行。请先运行第五阶段 SQL。",
      REGISTRY_ADAPTER_DISABLED: "当前环境尚未启用 Registry 测试适配器。",
      PUBLISHED_DPP_VERSION_REQUIRED: "请先发布包含 SHA-256 哈希的 DPP 版本，再生成测试映射。",
      REGISTRY_MAPPING_NOT_PUBLISHED: "数据库中没有已发布的电池 Registry 映射。",
      BATTERYPASS_ITEM_REQUIRED: "请先保存电池型号并创建一个电池单体。",
      BATTERYPASS_LMT_REQUIRED: "该下载仅适用于 LMT 轻型交通工具电池。",
      BATTERYPASS_EXPORT_INVALID: "当前数据尚未通过 BatteryPass LMT Schema 校验，请先运行产品补全 SQL。",
    };
    return messages[code] || "Registry 请求未完成，请稍后重试。";
  }

  async function api(method: string, body?: unknown) {
    const response = await fetch(`/api/registry/${encodeURIComponent(productId)}`, {
      method,
      headers: await authorizationHeaders(),
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
      const data = await api("GET");
      setWorkspace(data);
      if (!resultSubmissionId && data.submissions?.length) setResultSubmissionId(data.submissions[0].id);
    } catch (error) {
      setWorkspace(null);
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function generate(retryOfSubmissionId?: string) {
    setBusy(true);
    setMessage("");
    try {
      const result = await api("POST", { action: "generateMapping", retryOfSubmissionId });
      await load();
      setResultSubmissionId(result.submission.id);
      setMessage(result.submission.submission_status === "FAILED" ? t.generatedFailed : t.generated);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function download(submissionId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/registry/${encodeURIComponent(productId)}/export/${encodeURIComponent(submissionId)}`, {
        headers: await authorizationHeaders(false),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(localizedApiError(payload, response.status));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `registry-test-${submissionId.slice(0, 8)}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function downloadBatteryPass() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/battery-dpp/${encodeURIComponent(productId)}/batterypass-export`, {
        headers: await authorizationHeaders(false),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(localizedApiError(payload, response.status));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `batterypass-lmt-${productId}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(t.batteryPassDownloaded);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function recordResult(event: React.FormEvent) {
    event.preventDefault();
    if (!resultSubmissionId) return;
    if (resultOutcome !== "SUBMITTED" && !resultText.trim()) {
      setMessage(t.noResponse);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      let responsePayload: unknown = { message: resultText };
      if (resultText.trim().startsWith("{")) {
        try { responsePayload = JSON.parse(resultText); } catch { responsePayload = { message: resultText }; }
      }
      const data = await api("POST", { action: "recordTestResult", submissionId: resultSubmissionId, outcome: resultOutcome, responsePayload });
      setWorkspace(data);
      setResultText("");
      setMessage(t.saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="mt-5 text-sm font-semibold text-slate-600">{t.loading}</p>;
  if (!workspace) return <div className="mt-5 border-y border-red-200 py-5"><p className="text-sm font-semibold text-red-700">{message}</p><button className="btn-secondary mt-4" onClick={load} type="button">{t.retry}</button></div>;

  return <div className="mt-5 space-y-6">
    <div className="border-y border-amber-200 bg-amber-50 px-4 py-4">
      <p className="text-sm font-bold leading-6 text-amber-900">{t.notice}</p>
    </div>

    <dl className="grid border-y border-slate-200 md:grid-cols-2 xl:grid-cols-4">
      <div className="px-3 py-4"><dt className="text-xs font-bold text-slate-500">{t.environment}</dt><dd className="mt-1 font-black text-slate-950">{isZh ? "测试环境" : "TEST"}</dd></div>
      <div className="px-3 py-4"><dt className="text-xs font-bold text-slate-500">{t.mapping}</dt><dd className="mt-1 break-words text-sm font-black text-slate-950">{workspace.mapping.version}</dd></div>
      <div className="px-3 py-4"><dt className="text-xs font-bold text-slate-500">{t.rules}</dt><dd className="mt-1 break-words text-sm font-black text-slate-950">{isZh ? "DPP Registry 运营者指南 v1.0" : workspace.mapping.operationalRuleVersion}</dd></div>
      <div className="px-3 py-4"><dt className="text-xs font-bold text-slate-500">{t.semantic}</dt><dd className="mt-1 text-sm font-black text-amber-800">{t.unavailable}</dd></div>
    </dl>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <h4 className="font-black text-slate-950">{t.history}</h4>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" disabled={busy} onClick={downloadBatteryPass} type="button">{t.batteryPassDownload}</button>
        <button className="btn-primary" disabled={busy} onClick={() => generate()} type="button">{busy ? t.generating : t.generate}</button>
      </div>
    </div>

    {workspace.submissions.length === 0 ? <p className="border-y border-slate-200 py-8 text-center text-sm font-semibold text-slate-500">{t.empty}</p> : <div className="divide-y divide-slate-200 border-y border-slate-200">
      {workspace.submissions.map((submission) => {
        const failed = submission.validationResults.filter((row) => !row.passed);
        const errors = failed.filter((row) => row.severity === "ERROR");
        const warnings = failed.filter((row) => row.severity === "WARNING" || row.severity === "BLOCKER");
        return <article className="py-5" key={submission.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-black text-white">{isZh ? "测试环境" : "TEST"}</span><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{isZh ? granularityZh[submission.granularity] || submission.granularity : submission.granularity}</span><span className="text-sm font-black text-slate-950">{(isZh ? statusZh : statusEn)[submission.submission_status] || submission.submission_status}</span></div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{new Date(submission.created_at).toLocaleString(isZh ? "zh-CN" : "en-US")}</p>
              <p className="mt-1 break-all text-xs text-slate-500">SHA-256: {submission.request_hash}</p>
            </div>
            <div className="flex flex-wrap gap-2"><button className="btn-secondary py-2" disabled={busy} onClick={() => download(submission.id)} type="button">{t.download}</button><button className="btn-secondary py-2" disabled={busy} onClick={() => generate(submission.id)} type="button">{t.retryAction}</button></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="border-l-4 border-emerald-500 px-3"><p className="text-xs font-bold text-slate-500">{t.passed}</p><p className="mt-1 text-xl font-black text-slate-950">{submission.validationResults.filter((row) => row.passed).length}</p></div>
            <div className="border-l-4 border-red-500 px-3"><p className="text-xs font-bold text-slate-500">{t.failed}</p><p className="mt-1 text-xl font-black text-slate-950">{errors.length}</p></div>
            <div className="border-l-4 border-amber-500 px-3"><p className="text-xs font-bold text-slate-500">{t.warnings}</p><p className="mt-1 text-xl font-black text-slate-950">{warnings.length}</p></div>
          </div>
          {failed.length ? <details className="mt-4 border-t border-slate-200 pt-3" open={errors.length > 0}><summary className="cursor-pointer text-sm font-bold text-slate-700">{t.checks} ({failed.length})</summary><ul className="mt-3 space-y-2">{failed.map((row) => <li className="text-sm leading-6 text-slate-700" key={row.id}><span className="mr-2 font-black text-slate-950">{isZh ? severityZh[row.severity] : row.severity}</span>{isZh ? row.message_zh : row.message_en}</li>)}</ul></details> : null}
          {submission.errors.map((error) => <p className="mt-3 border-l-4 border-red-500 pl-3 text-sm font-semibold text-red-800" key={error.id}>{error.error_code ? `${error.error_code}: ` : ""}{error.redacted_message}</p>)}
        </article>;
      })}
    </div>}

    {workspace.submissions.length ? <form className="border-y border-slate-200 py-5" onSubmit={recordResult}>
      <h4 className="font-black text-slate-950">{t.result}</h4>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label><span className="label">{t.submission}</span><select className="input mt-1" value={resultSubmissionId} onChange={(event) => setResultSubmissionId(event.target.value)}>{workspace.submissions.map((row) => <option key={row.id} value={row.id}>{row.id.slice(0, 8)} · {(isZh ? statusZh : statusEn)[row.submission_status] || row.submission_status}</option>)}</select></label>
        <label><span className="label">{t.outcome}</span><select className="input mt-1" value={resultOutcome} onChange={(event) => setResultOutcome(event.target.value)}><option value="SUBMITTED">{t.submitted}</option><option value="REJECTED">{t.rejected}</option><option value="FAILED">{t.failedOutcome}</option></select></label>
      </div>
      <label className="mt-3 block"><span className="label">{t.response}</span><textarea className="input mt-1 min-h-28" value={resultText} onChange={(event) => setResultText(event.target.value)} /></label>
      <button className="btn-primary mt-3" disabled={busy} type="submit">{t.record}</button>
    </form> : null}
    {message ? <p className={`text-sm font-semibold ${message === t.saved || message === t.generated || message === t.batteryPassDownloaded ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}
  </div>;
}
