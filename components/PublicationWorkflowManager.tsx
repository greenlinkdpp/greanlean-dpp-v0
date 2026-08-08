"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

type Workspace = {
  dppId: string;
  sourceFingerprint: string;
  snapshotHash: string;
  audienceManifest: Record<string, { fieldCount: number; evidenceCount: number }>;
  comparison: {
    passed: boolean;
    matchedFacts: number;
    comparedFacts: number;
    differences: Array<{ key: string }>;
  } | null;
  currentPublication: {
    id: string;
    version_number: number;
    status: string;
    snapshot_hash: string;
    published_at: string;
  } | null;
  latestReview: {
    id: string;
    status: string;
    latest_validation_run_id: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    decision_reason: string | null;
    published_publication_id: string | null;
  } | null;
  latestValidation: {
    id: string;
    status: string;
    rule_set_version: string;
    passed_count: number;
    failed_count: number;
    blocker_count: number;
    warning_count: number;
    executed_at: string;
    failedResults: Array<{
      rule_code: string;
      severity: "BLOCKER" | "WARNING" | "INFO";
      module_code: string | null;
      field_code: string | null;
      message_zh: string | null;
      message_en: string | null;
      details: Record<string, unknown>;
    }>;
  } | null;
};

async function publicationRequest(
  productId: string,
  batteryItemId: string | null,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
) {
  const supabase = createSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("AUTH_REQUIRED");
  const response = await fetch(
    `/api/internal/dpp-publications/${productId}/candidate?workspace=1${batteryItemId ? `&batteryItemId=${encodeURIComponent(batteryItemId)}` : ""}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || "PUBLICATION_OPERATION_FAILED");
  }
  return payload;
}

export function PublicationWorkflowManager({ productId, batteryItemId = null }: { productId: string; batteryItemId?: string | null }) {
  const { locale } = useLanguage();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const zh = locale === "zh";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWorkspace(await publicationRequest(productId, batteryItemId, "GET"));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PUBLICATION_WORKSPACE_FAILED");
    } finally {
      setLoading(false);
    }
  }, [batteryItemId, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(body: Record<string, unknown>, success: string) {
    setWorking(true);
    setMessage("");
    try {
      await publicationRequest(productId, batteryItemId, "POST", {
        ...body,
        ...(batteryItemId ? { batteryItemId, changeReason: changeReason || null } : {}),
      });
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PUBLICATION_OPERATION_FAILED");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <section className="card">
        <p className="text-sm font-bold text-slate-500">
          {zh ? "正在生成规范发布候选..." : "Building the canonical publication candidate..."}
        </p>
      </section>
    );
  }

  const review = workspace?.latestReview;
  const canSubmit = !review
    || ["CHANGES_REQUESTED", "REJECTED", "CANCELLED", "PUBLISHED"].includes(review.status);
  const canDecide = review?.status === "IN_REVIEW"
    && Boolean(review.latest_validation_run_id);
  const hasBlockingFailures = (workspace?.latestValidation?.blocker_count || 0) > 0;
  const canPublish = review?.status === "APPROVED";
  const publicManifest = workspace?.audienceManifest?.PUBLIC;

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-emerald-700">
            {batteryItemId
              ? (zh ? "电池单体发布工作流" : "Battery-item publication workflow")
              : (zh ? "规范发布工作流" : "Canonical publication workflow")}
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            {zh ? "候选、校验、审核与发布" : "Candidate, validation, review and publication"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {zh
              ? "普通保存只更新草稿。完整发布必须经过候选聚合、规则校验、管理员批准和不可变版本写入。"
              : "Ordinary saves update drafts only. A complete publication requires aggregation, validation, approval and an immutable version."}
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
          {review?.status || (zh ? "尚未提交" : "NOT SUBMITTED")}
        </span>
      </div>

      {workspace && (
        <dl className="mt-5 grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white p-4">
            <dt className="text-xs font-bold text-slate-500">{zh ? "当前规范版本" : "Current canonical version"}</dt>
            <dd className="mt-2 font-black text-slate-950">
              {workspace.currentPublication
                ? `v${workspace.currentPublication.version_number}`
                : zh ? "尚未发布" : "Not published"}
            </dd>
          </div>
          <div className="bg-white p-4">
            <dt className="text-xs font-bold text-slate-500">{zh ? "公众字段" : "Public fields"}</dt>
            <dd className="mt-2 font-black text-slate-950">{publicManifest?.fieldCount || 0}</dd>
          </div>
          <div className="bg-white p-4">
            <dt className="text-xs font-bold text-slate-500">{zh ? "公众证据" : "Public evidence"}</dt>
            <dd className="mt-2 font-black text-slate-950">{publicManifest?.evidenceCount || 0}</dd>
          </div>
          <div className="bg-white p-4">
            <dt className="text-xs font-bold text-slate-500">{zh ? "旧版身份对比" : "Legacy identity comparison"}</dt>
            <dd className={`mt-2 font-black ${workspace.comparison?.passed ? "text-emerald-700" : "text-red-700"}`}>
              {workspace.comparison
                ? `${workspace.comparison.matchedFacts}/${workspace.comparison.comparedFacts}`
                : zh ? "无旧版数据" : "No legacy data"}
            </dd>
          </div>
        </dl>
      )}

      {workspace?.comparison && !workspace.comparison.passed && (
        <div className="mt-4 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {zh ? "阻断差异：" : "Blocking differences: "}
          {workspace.comparison.differences.map((item) => item.key).join(", ")}
        </div>
      )}

      {workspace?.latestValidation && (
        <div className="mt-5 border-y border-slate-200 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">
                {zh ? "发布校验结果" : "Publication validation"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {zh
                  ? `通过 ${workspace.latestValidation.passed_count} 项，阻断 ${workspace.latestValidation.blocker_count} 项，警告 ${workspace.latestValidation.warning_count} 项`
                  : `${workspace.latestValidation.passed_count} passed, ${workspace.latestValidation.blocker_count} blockers, ${workspace.latestValidation.warning_count} warnings`}
              </p>
            </div>
            <span className={`rounded-md px-3 py-2 text-xs font-black ${
              hasBlockingFailures
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}>
              {hasBlockingFailures
                ? zh ? "暂不可批准" : "Approval blocked"
                : zh ? "可进入批准" : "Ready for approval"}
            </span>
          </div>

          {workspace.latestValidation.failedResults.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
              {workspace.latestValidation.failedResults.map((result) => {
                const missing = Array.isArray(result.details?.missingFieldCodes)
                  ? result.details.missingFieldCodes.map(String)
                  : [];
                return (
                  <li key={result.rule_code} className="py-3">
                    <div className="flex flex-wrap items-start gap-2">
                      <span className={`rounded px-2 py-1 text-[11px] font-black ${
                        result.severity === "BLOCKER"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-800"
                      }`}>
                        {result.severity === "BLOCKER"
                          ? zh ? "阻断" : "Blocker"
                          : zh ? "警告" : "Warning"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">
                          {zh ? result.message_zh : result.message_en}
                        </p>
                        {missing.length > 0 && (
                          <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                            {zh ? "缺少字段：" : "Missing fields: "}
                            {missing.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {batteryItemId && workspace?.currentPublication && canSubmit ? (
          <label className="w-full text-sm font-bold text-slate-700">
            {zh ? "新版本变更原因（至少 10 个字符）" : "Change reason for the new version (minimum 10 characters)"}
            <input className="input mt-2 w-full" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} />
          </label>
        ) : null}
        {canSubmit && (
          <button
            type="button"
            disabled={working || Boolean(batteryItemId && workspace?.currentPublication && changeReason.trim().length < 10)}
            onClick={() => void act(
              { action: "submitReview" },
              zh ? "候选已提交并完成规则校验。" : "Candidate submitted and validated.",
            )}
            className="btn-primary"
          >
            {zh ? "提交候选并校验" : "Submit and validate candidate"}
          </button>
        )}
        {canDecide && review && (
          <>
            <button
              type="button"
              disabled={working || workspace?.comparison?.passed === false || hasBlockingFailures}
              onClick={() => void act(
                { action: "decideReview", reviewId: review.id, decision: "APPROVED" },
                zh ? "审核已批准。" : "Review approved.",
              )}
              className="btn-primary"
            >
              {zh ? "批准发布候选" : "Approve candidate"}
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => void act(
                {
                  action: "decideReview",
                  reviewId: review.id,
                  decision: "CHANGES_REQUESTED",
                  reason: zh ? "需要修正数据后重新提交。" : "Correct the data and resubmit.",
                },
                zh ? "已退回修改。" : "Changes requested.",
              )}
              className="btn-secondary"
            >
              {zh ? "退回修改" : "Request changes"}
            </button>
          </>
        )}
        {canPublish && review && (
          <button
            type="button"
            disabled={working}
            onClick={() => void act(
              { action: "publishReview", reviewId: review.id },
              zh ? "规范 DPP 版本已发布。" : "Canonical DPP version published.",
            )}
            className="btn-primary"
          >
            {zh ? "发布不可变版本" : "Publish immutable version"}
          </button>
        )}
        <button type="button" disabled={working} onClick={() => void load()} className="btn-secondary">
          {zh ? "重新检查" : "Refresh checks"}
        </button>
      </div>

      {workspace?.currentPublication && (
        <p className="mt-4 break-all rounded-md bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
          SHA-256: {workspace.currentPublication.snapshot_hash}
        </p>
      )}
      {message && (
        <p className={`mt-4 text-sm font-semibold ${/失败|error|failed/i.test(message) ? "text-red-700" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </section>
  );
}
