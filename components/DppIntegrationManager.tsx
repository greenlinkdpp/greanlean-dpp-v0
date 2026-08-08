"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

type Workspace = {
  product: {
    sectorCode: string | null;
  };
  currentPublication: {
    id: string;
    version_number: number;
    status: string;
    snapshot_hash: string;
    published_at: string;
  } | null;
  activeConnector: {
    connector_code: string;
    chain_name: string;
    network: string;
    verified_at: string;
  } | null;
  registrySubmissions: Array<{
    id: string;
    environment: string;
    submission_status: string;
    mapping_version: string | null;
    submitted_at: string | null;
    error_code: string | null;
  }>;
  anchorRequests: Array<{
    id: string;
    request_status: string;
    anchored_hash: string;
    requested_at: string;
    receipt: {
      transaction_hash: string;
      block_number: string | null;
      explorer_url: string | null;
      confirmed_at: string;
    } | null;
  }>;
};

export function DppIntegrationManager({ productId }: { productId: string }) {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const request = useCallback(async (
    method: "GET" | "POST",
    body?: Record<string, unknown>,
  ) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error(zh ? "登录会话已失效。" : "Your session has expired.");
    const response = await fetch(
      `/api/internal/dpp-integrity/${encodeURIComponent(productId)}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message || "DPP_INTEGRITY_OPERATION_FAILED");
    }
    return payload;
  }, [productId, supabase, zh]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWorkspace(await request("GET"));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DPP_INTEGRITY_LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestAnchor() {
    setWorking(true);
    setMessage("");
    try {
      await request("POST", { action: "requestBlockchainAnchor" });
      await load();
      setMessage(zh ? "锚定申请已发送到已验证连接器。" : "The anchor request was queued for the verified connector.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DPP_INTEGRITY_OPERATION_FAILED");
    } finally {
      setWorking(false);
    }
  }

  const latestRegistry = workspace?.registrySubmissions[0] || null;
  const latestAnchor = workspace?.anchorRequests[0] || null;

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-emerald-700">
            {zh ? "外部系统与完整性" : "External systems and integrity"}
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            {zh ? "Registry 与区块链集成中心" : "Registry and blockchain integrations"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {zh
              ? "外部提交只使用当前不可变发布版本。平台不会生成模拟 Registry 成功状态或本地区块链交易 Hash。"
              : "External operations use the current immutable publication. The platform never fabricates Registry success or transaction hashes."}
          </p>
        </div>
        <button type="button" className="btn-secondary" disabled={loading} onClick={() => void load()}>
          {zh ? "重新检查" : "Refresh"}
        </button>
      </div>

      <dl className="mt-5 grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 lg:grid-cols-3">
        <div className="bg-white p-4">
          <dt className="text-xs font-bold text-slate-500">{zh ? "当前发布版本" : "Current publication"}</dt>
          <dd className="mt-2 font-black text-slate-950">
            {workspace?.currentPublication
              ? `v${workspace.currentPublication.version_number} · ${workspace.currentPublication.status}`
              : zh ? "尚无规范发布" : "No canonical publication"}
          </dd>
          {workspace?.currentPublication && (
            <p className="mt-2 break-all text-xs text-slate-500">
              SHA-256: {workspace.currentPublication.snapshot_hash}
            </p>
          )}
        </div>
        <div className="bg-white p-4">
          <dt className="text-xs font-bold text-slate-500">EU DPP Registry</dt>
          <dd className="mt-2 font-black text-slate-950">
            {latestRegistry
              ? `${latestRegistry.environment} · ${latestRegistry.submission_status}`
              : zh ? "尚无提交记录" : "No submission record"}
          </dd>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {workspace?.product.sectorCode === "battery"
              ? zh ? "电池 TEST 映射在电池工作区第 11 步生成。" : "Battery TEST mapping is generated in battery step 11."
              : zh ? "该行业的官方 Registry 语义映射尚未配置。" : "No official Registry semantic mapping is configured for this sector."}
          </p>
        </div>
        <div className="bg-white p-4">
          <dt className="text-xs font-bold text-slate-500">{zh ? "区块链连接器" : "Blockchain connector"}</dt>
          <dd className="mt-2 font-black text-slate-950">
            {workspace?.activeConnector
              ? `${workspace.activeConnector.chain_name} · ${workspace.activeConnector.network}`
              : zh ? "未配置真实连接器" : "No verified connector"}
          </dd>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {workspace?.activeConnector
              ? workspace.activeConnector.connector_code
              : zh ? "密钥和签名必须由外部密钥管理器提供。" : "Keys and signing must come from an external secret manager."}
          </p>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={
            working
            || !workspace?.currentPublication
            || !workspace?.activeConnector
            || latestAnchor?.request_status === "QUEUED"
            || Boolean(latestAnchor?.receipt)
          }
          onClick={() => void requestAnchor()}
        >
          {working
            ? zh ? "正在提交..." : "Submitting..."
            : zh ? "申请锚定当前版本" : "Anchor current publication"}
        </button>
        {!workspace?.activeConnector && (
          <span className="text-sm font-semibold text-amber-800">
            {zh ? "连接器未配置，锚定操作已禁用。" : "Anchoring is disabled until a connector is verified."}
          </span>
        )}
      </div>

      {workspace?.anchorRequests.length ? (
        <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
          {workspace.anchorRequests.map((anchor) => (
            <div key={anchor.id} className="py-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">
                    {anchor.receipt
                      ? zh ? "链上回执已确认" : "On-chain receipt confirmed"
                      : anchor.request_status}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    SHA-256: {anchor.anchored_hash}
                  </p>
                </div>
                {anchor.receipt?.explorer_url && (
                  <a
                    className="btn-secondary"
                    href={anchor.receipt.explorer_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {zh ? "查看区块浏览器" : "Open explorer"}
                  </a>
                )}
              </div>
              {anchor.receipt && (
                <p className="mt-2 break-all text-xs font-semibold text-emerald-700">
                  {zh ? "交易 Hash：" : "Transaction hash: "}
                  {anchor.receipt.transaction_hash}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {message && (
        <p className={`mt-4 text-sm font-semibold ${/失败|fail|error|not configured/i.test(message) ? "text-red-700" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </section>
  );
}
