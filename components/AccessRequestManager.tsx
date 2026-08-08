"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

type AccessRequestRow = {
  id: string;
  requester_email?: string | null;
  requested_role_code: string;
  requested_access_level: string;
  purpose: string;
  status: string;
  decision_reason?: string | null;
  decided_at?: string | null;
  created_at: string;
  organisation?: {
    legal_name?: string;
    registration_id?: string;
    country_code?: string;
    verification_status?: string;
  } | null;
  product?: {
    name?: string;
    name_zh?: string;
    dpp_id?: string;
    public_slug?: string;
  } | null;
};

const COPY = {
  zh: {
    eyebrow: "身份与权限",
    title: "访问申请审批",
    subtitle: "核验申请人的组织和角色，为指定产品授予有期限的专业或监管访问权限。",
    loading: "正在加载访问申请...",
    empty: "当前没有访问申请。",
    requester: "申请账号",
    organisation: "申请组织",
    registration: "注册号",
    product: "申请产品",
    role: "申请角色",
    level: "权限等级",
    purpose: "访问目的",
    created: "申请时间",
    validity: "授权有效期至（可选）",
    reason: "审批说明（可选）",
    approve: "批准并授权",
    reject: "拒绝",
    processing: "处理中...",
    approved: "已批准",
    rejected: "已拒绝",
    pending: "待审批",
    migration: "请先执行 0013_identity_and_access.sql，再使用访问审批。",
    failed: "加载失败",
    decideFailed: "审批保存失败",
    notAdmin: "当前账号可以查看自身申请，但只有平台管理员可以审批。",
  },
  en: {
    eyebrow: "Identity and access",
    title: "Access request review",
    subtitle: "Verify the applicant organisation and role, then grant time-bounded professional or authority access to a product.",
    loading: "Loading access requests...",
    empty: "There are no access requests.",
    requester: "Applicant",
    organisation: "Organisation",
    registration: "Registration ID",
    product: "Product",
    role: "Requested role",
    level: "Access level",
    purpose: "Purpose",
    created: "Requested",
    validity: "Grant valid until (optional)",
    reason: "Decision note (optional)",
    approve: "Approve and grant",
    reject: "Reject",
    processing: "Processing...",
    approved: "Approved",
    rejected: "Rejected",
    pending: "Pending",
    migration: "Apply 0013_identity_and_access.sql before using access review.",
    failed: "Load failed",
    decideFailed: "The decision could not be saved",
    notAdmin: "This account can view its own requests, but only a platform administrator can approve them.",
  },
} as const;

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export function AccessRequestManager() {
  const { locale } = useLanguage();
  const t = COPY[locale];
  const [requests, setRequests] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [workingId, setWorkingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const { data: sessionData } = await createSupabaseClient().auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setLoading(false);
      setMessage(t.failed);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const [contextResponse, requestResponse] = await Promise.all([
      fetch("/api/access-context", { headers, cache: "no-store" }),
      fetch("/api/access-requests", { headers, cache: "no-store" }),
    ]);
    const context = await contextResponse.json().catch(() => null);
    const payload = await requestResponse.json().catch(() => null);
    setIsPlatformAdmin(Boolean(context?.isPlatformAdmin));
    if (!requestResponse.ok) {
      setMessage(payload?.error?.code === "ACCESS_MIGRATION_REQUIRED"
        ? t.migration
        : `${t.failed}: ${payload?.error?.message || requestResponse.status}`);
      setLoading(false);
      return;
    }
    setRequests((payload?.requests || []).map((row: AccessRequestRow) => ({
      ...row,
      organisation: normalizeRelation(row.organisation),
      product: normalizeRelation(row.product),
    })));
    setLoading(false);
  }, [t.failed, t.migration]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(requestId: string, decision: "approved" | "rejected") {
    const reason = (document.getElementById(`reason-${requestId}`) as HTMLInputElement | null)?.value || "";
    const validUntil = (document.getElementById(`valid-${requestId}`) as HTMLInputElement | null)?.value || "";
    const { data: sessionData } = await createSupabaseClient().auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setWorkingId(requestId);
    setMessage("");
    const response = await fetch(`/api/access-requests/${requestId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        decision,
        reason,
        validUntil: decision === "approved" && validUntil
          ? new Date(validUntil).toISOString()
          : null,
      }),
    });
    const payload = await response.json().catch(() => null);
    setWorkingId("");
    if (!response.ok) {
      setMessage(`${t.decideFailed}: ${payload?.error?.message || response.status}`);
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-black text-emerald-700">{t.eyebrow}</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">{t.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t.subtitle}</p>
      </div>

      {!isPlatformAdmin && !loading && (
        <p className="mt-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {t.notAdmin}
        </p>
      )}
      {message && (
        <p className="mt-5 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {message}
        </p>
      )}
      {loading ? (
        <p className="py-10 text-sm font-bold text-slate-500">{t.loading}</p>
      ) : requests.length === 0 ? (
        <p className="py-10 text-sm font-bold text-slate-500">{t.empty}</p>
      ) : (
        <div className="divide-y divide-slate-200">
          {requests.map((request) => {
            const organisation = normalizeRelation(request.organisation);
            const product = normalizeRelation(request.product);
            const statusLabel = request.status === "approved"
              ? t.approved
              : request.status === "rejected" ? t.rejected : t.pending;
            return (
              <article key={request.id} className="py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      {locale === "zh"
                        ? product?.name_zh || product?.name
                        : product?.name || product?.name_zh}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {product?.dpp_id || product?.public_slug}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-black ${
                    request.status === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : request.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-900"
                  }`}>
                    {statusLabel}
                  </span>
                </div>

                <dl className="mt-5 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    [t.requester, request.requester_email || "-"],
                    [t.organisation, organisation?.legal_name || "-"],
                    [t.registration, organisation?.registration_id || "-"],
                    [t.role, request.requested_role_code],
                    [t.level, request.requested_access_level],
                    [t.created, new Date(request.created_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-GB")],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white p-4">
                      <dt className="text-xs font-bold text-slate-500">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-black text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 border-l-4 border-slate-300 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-500">{t.purpose}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-800">{request.purpose}</p>
                </div>

                {request.status === "pending" && isPlatformAdmin && (
                  <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-[240px_minmax(0,1fr)_auto] lg:items-end">
                    <label className="text-sm font-bold text-slate-700">
                      {t.validity}
                      <input id={`valid-${request.id}`} type="date" className="input mt-1" />
                    </label>
                    <label className="text-sm font-bold text-slate-700">
                      {t.reason}
                      <input id={`reason-${request.id}`} className="input mt-1" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={workingId === request.id}
                        onClick={() => decide(request.id, "approved")}
                        className="btn-primary"
                      >
                        {workingId === request.id ? t.processing : t.approve}
                      </button>
                      <button
                        type="button"
                        disabled={workingId === request.id}
                        onClick={() => decide(request.id, "rejected")}
                        className="btn-secondary"
                      >
                        {t.reject}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
