"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

type Props = {
  productId: string;
  identifier: string | null;
  hasBatteryPassSchema: boolean;
};

type ValidationResult = {
  valid: boolean;
  schemaCode: string;
  schemaId: string | null;
  errors: Array<{ instancePath: string; message?: string }>;
};

export function DppOutputPanel({
  productId,
  identifier,
  hasBatteryPassSchema,
}: Props) {
  const { locale } = useLanguage();
  const isZh = locale === "zh";
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const copy = isZh
    ? {
        title: "JSON 校验与导出",
        body: "网页、二维码、PDF 和结构化数据使用同一发布版本。BatteryPass 校验采用当前产品分类对应的本地 BatteryPass-Ready Schema，不等同于欧盟 Registry 正式受理。",
        canonical: "下载规范 DPP JSON",
        pdf: "下载护照 PDF",
        validate: "校验 BatteryPass JSON",
        validating: "正在校验...",
        batteryPass: "下载 BatteryPass JSON",
        passed: "本地 Schema 校验通过",
        failed: "本地 Schema 校验未通过",
        noIdentifier: "请先保存 DPP ID 或公开 Slug。",
        session: "登录会话已失效，请重新登录。",
        unavailable: "当前电池类别没有导入的 BatteryPass-Ready Schema。",
      }
    : {
        title: "JSON validation and export",
        body: "The web page, QR code, PDF and structured data use the same publication. BatteryPass validation uses the local BatteryPass-Ready Schema selected for the product category and is not an EU Registry acceptance result.",
        canonical: "Download canonical DPP JSON",
        pdf: "Download passport PDF",
        validate: "Validate BatteryPass JSON",
        validating: "Validating...",
        batteryPass: "Download BatteryPass JSON",
        passed: "Local Schema validation passed",
        failed: "Local Schema validation failed",
        noIdentifier: "Save a DPP ID or public slug first.",
        session: "Your session has expired. Sign in again.",
        unavailable: "No imported BatteryPass-Ready Schema is available for this battery category.",
      };

  async function authorizationHeader() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error(copy.session);
    return { Authorization: `Bearer ${token}` };
  }

  function localizedError(payload: any, status: number) {
    if (!isZh) return payload?.error?.message || String(status);
    const messages: Record<string, string> = {
      BATTERYPASS_ITEM_REQUIRED: "请先保存电池型号档案并创建电池单体。",
      BATTERYPASS_SCHEMA_UNAVAILABLE: copy.unavailable,
      BATTERYPASS_EXPORT_INVALID: "数据未通过当前 BatteryPass-Ready Schema，请先查看校验错误。",
    };
    return messages[payload?.error?.code] || payload?.error?.message || `请求失败（${status}）`;
  }

  async function validateBatteryPass() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/battery-dpp/${encodeURIComponent(productId)}/batterypass-export?mode=validate`,
        { headers: await authorizationHeader(), cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(localizedError(payload, response.status));
      setValidation(payload);
      setMessage(payload.valid ? copy.passed : copy.failed);
    } catch (error) {
      setValidation(null);
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function downloadBatteryPass() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/battery-dpp/${encodeURIComponent(productId)}/batterypass-export`,
        { headers: await authorizationHeader(), cache: "no-store" },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(localizedError(payload, response.status));
      }
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1]
        || `batterypass-${productId}.json`;
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(copy.passed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const canonicalHref = identifier
    ? `/api/dpp-export?product=${encodeURIComponent(identifier)}&format=canonical`
    : null;
  const pdfHref = identifier
    ? `/api/dpp-export?product=${encodeURIComponent(identifier)}&format=pdf`
    : null;

  return (
    <section id="editor-output" className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-black text-slate-950">{copy.title}</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{copy.body}</p>
      </div>
      <div className="flex flex-wrap gap-3 px-5 py-5 sm:px-6">
        {canonicalHref ? (
          <a className="btn-secondary" href={canonicalHref}>{copy.canonical}</a>
        ) : (
          <button className="btn-secondary" disabled type="button">{copy.noIdentifier}</button>
        )}
        {pdfHref ? <a className="btn-secondary" href={pdfHref} target="_blank" rel="noreferrer">{copy.pdf}</a> : null}
        {hasBatteryPassSchema ? (
          <>
            <button className="btn-secondary" disabled={busy} onClick={validateBatteryPass} type="button">
              {busy ? copy.validating : copy.validate}
            </button>
            <button className="btn-primary" disabled={busy} onClick={downloadBatteryPass} type="button">
              {copy.batteryPass}
            </button>
          </>
        ) : null}
      </div>
      {message ? (
        <div className={`border-t px-5 py-4 text-sm font-bold sm:px-6 ${
          validation?.valid ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"
        }`}>
          <p>{message}</p>
          {validation ? (
            <p className="mt-1 font-semibold">
              Schema: {validation.schemaCode}{validation.schemaId ? ` · ${validation.schemaId}` : ""}
            </p>
          ) : null}
          {validation?.errors?.length ? (
            <ul className="mt-3 space-y-1 font-semibold">
              {validation.errors.slice(0, 8).map((error, index) => (
                <li key={`${error.instancePath}-${index}`}>
                  {error.instancePath || "/"}: {error.message || "invalid"}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
