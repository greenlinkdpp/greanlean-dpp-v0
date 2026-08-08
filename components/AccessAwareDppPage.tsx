"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UnifiedDppPage } from "@/components/UnifiedDppPage";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";
import type { DppAudience } from "@/lib/publicDppViewModel";

type AccessState =
  | { status: "checking" }
  | { status: "public" }
  | { status: "login_required" }
  | { status: "denied"; message: string }
  | { status: "granted"; audience: DppAudience; level: string; preview: boolean }
  | { status: "requested" }
  | { status: "unavailable"; message: string };

type Props = {
  identifier: string;
  publicData: any | null;
  dppUrl: string;
  requestedView?: string;
  previewRequested?: boolean;
  showcase?: boolean;
};

const COPY = {
  zh: {
    checking: "正在核验当前账号的访问权限...",
    publicTitle: "需要查看专业或监管信息？",
    publicText: "二维码只用于定位产品。登录后，系统会根据所属组织、角色和产品授权自动返回可访问字段。",
    login: "登录并继续",
    loginTitle: "此视图需要身份验证",
    loginText: "修改网址不会获得更高权限。请先登录，系统将核验你的组织身份和产品授权。",
    deniedTitle: "当前账号尚未获得此产品权限",
    deniedText: "你仍可查看公众信息，也可以提交产品范围的访问申请。",
    request: "申请访问",
    cancel: "取消",
    grantedTitle: "已通过服务器权限核验",
    grantedText: "当前页面只包含该账号在有效组织与产品授权范围内可访问的字段，本次访问已记录审计。",
    requestedTitle: "访问申请已提交",
    requestedText: "平台管理员完成组织与角色核验后，授权将在批准范围和有效期内自动生效。",
    unavailableTitle: "权限服务尚未启用",
    unavailableText: "请先在 Supabase 执行身份与权限迁移，再使用专业、监管和后台预览功能。",
    organisationName: "组织法定名称",
    registrationId: "组织注册号（可选）",
    countryCode: "国家代码（可选）",
    role: "申请角色",
    buyer: "采购商 / 合作伙伴",
    service: "维修服务商",
    recycler: "再利用 / 回收商",
    authority: "监管机构 / 公告机构",
    purpose: "访问目的",
    purposePlaceholder: "请说明业务关系、所需信息和具体用途（至少 10 个字）",
    submit: "提交申请",
    submitting: "提交中...",
    close: "关闭",
    noData: "没有找到可显示的 DPP 数据。",
    professional: "专业信息",
    authorityAudience: "监管信息",
    internalPreview: "内部预览",
  },
  en: {
    checking: "Checking access for the current account...",
    publicTitle: "Need professional or authority information?",
    publicText: "The QR code identifies the product only. After login, fields are returned according to the verified organisation, role and product grant.",
    login: "Log in to continue",
    loginTitle: "Identity verification is required",
    loginText: "Changing the URL cannot elevate access. Log in so the server can verify organisation and product authorisation.",
    deniedTitle: "This account has no active grant for this product",
    deniedText: "Public information remains available. You can submit a product-scoped access request.",
    request: "Request access",
    cancel: "Cancel",
    grantedTitle: "Server authorisation passed",
    grantedText: "This page contains only fields allowed by the account's active organisation and product grant. The access has been audited.",
    requestedTitle: "Access request submitted",
    requestedText: "The grant will become active within its approved scope and validity period after organisation and role review.",
    unavailableTitle: "Access service is not enabled",
    unavailableText: "Apply the identity and access migration in Supabase before using professional, authority or internal preview access.",
    organisationName: "Legal organisation name",
    registrationId: "Registration ID (optional)",
    countryCode: "Country code (optional)",
    role: "Requested role",
    buyer: "Buyer / partner",
    service: "Repair service provider",
    recycler: "Reuse / recycler",
    authority: "Authority / notified body",
    purpose: "Access purpose",
    purposePlaceholder: "Describe the business relationship, required information and specific purpose.",
    submit: "Submit request",
    submitting: "Submitting...",
    close: "Close",
    noData: "No DPP data is available for display.",
    professional: "Professional information",
    authorityAudience: "Authority information",
    internalPreview: "Internal preview",
  },
} as const;

function audienceQuery(view?: string) {
  const normalized = String(view || "").toLowerCase();
  if (["audit", "authority"].includes(normalized)) return "authority";
  if (["professional", "detail"].includes(normalized)) return "professional";
  if (["consumer", "public"].includes(normalized)) return "public";
  return "auto";
}

export function AccessAwareDppPage({
  identifier,
  publicData,
  dppUrl,
  requestedView,
  previewRequested = false,
  showcase = false,
}: Props) {
  const { locale } = useLanguage();
  const t = COPY[locale];
  const requestedAudience = useMemo(() => audienceQuery(requestedView), [requestedView]);
  const explicitlyRestricted = ["professional", "authority"].includes(requestedAudience);
  const [data, setData] = useState(publicData);
  const [access, setAccess] = useState<AccessState>(
    explicitlyRestricted || previewRequested ? { status: "checking" } : { status: "public" },
  );
  const [showRequest, setShowRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    setData(publicData);
  }, [identifier, publicData]);

  useEffect(() => {
    if (showcase) {
      setData(publicData);
      setAccess({ status: "public" });
      return;
    }
    let active = true;

    async function resolve() {
      const supabase = createSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        if (!active) return;
        setAccess(explicitlyRestricted || previewRequested
          ? { status: "login_required" }
          : { status: "public" });
        return;
      }

      setAccess({ status: "checking" });
      const params = new URLSearchParams({ audience: requestedAudience });
      const response = await fetch(
        `/api/dpp-access/${encodeURIComponent(identifier)}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => null);
      if (!active) return;

      if (response.ok && payload?.access) {
        if (payload.data) setData(payload.data);
        if (payload.access.audience === "PUBLIC") {
          setAccess(requestedAudience === "auto"
            ? { status: "denied", message: t.deniedText }
            : { status: "public" });
          return;
        }
        setAccess({
          status: "granted",
          audience: payload.access.audience,
          level: payload.access.grantedLevel,
          preview: previewRequested && payload.access.maximumLevel === "INTERNAL",
        });
        return;
      }

      const code = payload?.error?.code;
      const message = payload?.error?.message || t.deniedText;
      if (response.status === 401) setAccess({ status: "login_required" });
      else if (response.status === 403) setAccess({ status: "denied", message });
      else if (code === "ACCESS_MIGRATION_REQUIRED") {
        setAccess({ status: "unavailable", message: t.unavailableText });
      } else {
        setAccess({ status: "unavailable", message });
      }
    }

    resolve();
    return () => {
      active = false;
    };
  }, [explicitlyRestricted, identifier, previewRequested, publicData, requestedAudience, showcase, t.deniedText, t.unavailableText]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setRequestError("");
    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setSubmitting(false);
      setAccess({ status: "login_required" });
      return;
    }
    const isAuthority = requestedAudience === "authority";
    const response = await fetch("/api/access-requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier,
        requestedLevel: isAuthority ? "AUTHORITY_ONLY" : "LEGITIMATE_INTEREST",
        requestedRole: isAuthority
          ? "authority_reviewer"
          : String(form.get("requestedRole") || "buyer"),
        organisationName: String(form.get("organisationName") || ""),
        organisationRegistrationId: String(form.get("registrationId") || ""),
        organisationCountryCode: String(form.get("countryCode") || ""),
        purpose: String(form.get("purpose") || ""),
      }),
    });
    const payload = await response.json().catch(() => null);
    setSubmitting(false);
    if (!response.ok) {
      setRequestError(payload?.error?.message || t.deniedText);
      return;
    }
    setShowRequest(false);
    setAccess({ status: "requested" });
  }

  const nextParams = new URLSearchParams({ lang: locale });
  if (requestedView) nextParams.set("view", requestedView);
  if (previewRequested) nextParams.set("preview", "1");
  const loginNextPath = `/p/${encodeURIComponent(identifier)}?${nextParams.toString()}`;
  const loginHref = `/login?lang=${locale}&next=${encodeURIComponent(loginNextPath)}`;
  let audience: DppAudience = "PUBLIC";
  let isPreview = false;
  if (showcase) {
    audience = "AUTHORITY_ONLY";
  } else if (access.status === "granted") {
    audience = access.audience;
    isPreview = access.preview;
  }

  const accessControl = (
    <div className="mx-auto max-w-[1440px] px-4 pb-6 sm:px-6 lg:px-10">
      <AccessPanel
        access={access}
        audience={audience}
        loginHref={loginHref}
        onRequest={() => setShowRequest(true)}
        t={t}
      />
      {showRequest && (
        <form onSubmit={submitRequest} className="mt-4 border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">{t.request}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{t.deniedText}</p>
            </div>
            <button type="button" onClick={() => setShowRequest(false)} className="text-sm font-bold text-slate-500 hover:text-slate-950">
              {t.close}
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              {t.organisationName}
              <input name="organisationName" required minLength={2} className="input mt-1" />
            </label>
            <label className="text-sm font-bold text-slate-700">
              {t.registrationId}
              <input name="registrationId" className="input mt-1" />
            </label>
            <label className="text-sm font-bold text-slate-700">
              {t.countryCode}
              <input name="countryCode" maxLength={2} placeholder="CN" className="input mt-1 uppercase" />
            </label>
            <label className="text-sm font-bold text-slate-700">
              {t.role}
              <select
                name="requestedRole"
                className="input mt-1"
                disabled={requestedAudience === "authority"}
                defaultValue={requestedAudience === "authority" ? "authority_reviewer" : "buyer"}
              >
                {requestedAudience === "authority" ? (
                  <option value="authority_reviewer">{t.authority}</option>
                ) : (
                  <>
                    <option value="buyer">{t.buyer}</option>
                    <option value="service_provider">{t.service}</option>
                    <option value="recycler">{t.recycler}</option>
                  </>
                )}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm font-bold text-slate-700">
            {t.purpose}
            <textarea
              name="purpose"
              required
              minLength={10}
              rows={4}
              placeholder={t.purposePlaceholder}
              className="input mt-1 min-h-28 resize-y"
            />
          </label>
          {requestError && <p className="mt-3 text-sm font-bold text-red-700">{requestError}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? t.submitting : t.submit}
            </button>
            <button type="button" onClick={() => setShowRequest(false)} className="btn-secondary">
              {t.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">
            {access.status === "checking" ? t.checking : t.noData}
          </p>
          <div className="mt-5">{accessControl}</div>
        </div>
      </main>
    );
  }

  return (
    <UnifiedDppPage
      data={data}
      dppUrl={dppUrl}
      audience={audience}
      isPreview={isPreview}
      accessControl={showcase ? null : accessControl}
      showcase={showcase}
    />
  );
}

function AccessPanel({
  access,
  audience,
  loginHref,
  onRequest,
  t,
}: {
  access: AccessState;
  audience: DppAudience;
  loginHref: string;
  onRequest: () => void;
  t: (typeof COPY)["zh"] | (typeof COPY)["en"];
}) {
  if (access.status === "checking") {
    return <p className="border-l-4 border-slate-400 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">{t.checking}</p>;
  }
  if (access.status === "granted") {
    const label = access.preview
      ? t.internalPreview
      : audience === "AUTHORITY_ONLY" ? t.authorityAudience : t.professional;
    return (
      <div className="border-l-4 border-emerald-600 bg-emerald-50 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-emerald-950">{t.grantedTitle}</p>
          <span className="bg-emerald-200 px-2 py-1 text-xs font-black text-emerald-950">{label}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-emerald-800">{t.grantedText}</p>
      </div>
    );
  }
  if (access.status === "login_required") {
    return (
      <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-4">
        <p className="text-sm font-black text-amber-950">{t.loginTitle}</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">{t.loginText}</p>
        <Link href={loginHref} className="btn-primary mt-3 inline-flex">{t.login}</Link>
      </div>
    );
  }
  if (access.status === "denied") {
    return (
      <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-4">
        <p className="text-sm font-black text-amber-950">{t.deniedTitle}</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">{access.message || t.deniedText}</p>
        <button type="button" onClick={onRequest} className="btn-primary mt-3">{t.request}</button>
      </div>
    );
  }
  if (access.status === "requested") {
    return (
      <div className="border-l-4 border-blue-600 bg-blue-50 px-4 py-4">
        <p className="text-sm font-black text-blue-950">{t.requestedTitle}</p>
        <p className="mt-1 text-sm leading-6 text-blue-800">{t.requestedText}</p>
      </div>
    );
  }
  if (access.status === "unavailable") {
    return (
      <div className="border-l-4 border-red-600 bg-red-50 px-4 py-4">
        <p className="text-sm font-black text-red-950">{t.unavailableTitle}</p>
        <p className="mt-1 text-sm leading-6 text-red-800">{access.message}</p>
      </div>
    );
  }
  return (
    <div className="border-l-4 border-slate-300 bg-slate-50 px-4 py-4">
      <p className="text-sm font-black text-slate-900">{t.publicTitle}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{t.publicText}</p>
      <Link href={loginHref} className="btn-secondary mt-3 inline-flex">{t.login}</Link>
    </div>
  );
}
