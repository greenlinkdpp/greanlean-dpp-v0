"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

type EvidenceLink = {
  id: string;
  field_code: string;
  verification_status: string;
};

type FileVersion = {
  id: string;
  version_number: number;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  checksum_sha256: string;
  created_at: string;
  links: EvidenceLink[];
};

type FileAsset = {
  id: string;
  asset_key: string;
  title: string;
  document_type: string;
  description: string | null;
  access_level_code: string;
  versions: FileVersion[];
};

type SupportedField = {
  fieldCode: string;
  moduleCode: string;
  labelEn: string;
  labelZh: string;
};

type EvidenceWorkspace = {
  assets: FileAsset[];
  supportedFields: SupportedField[];
};

const DOCUMENT_TYPES = [
  ["conformity-declaration", "符合性声明", "Declaration of conformity"],
  ["test-report", "检测报告", "Test report"],
  ["certificate", "证书", "Certificate"],
  ["material-declaration", "材料声明", "Material declaration"],
  ["carbon-footprint-report", "碳足迹报告", "Carbon-footprint report"],
  ["safety-document", "安全文件", "Safety document"],
  ["recycling-document", "回收与拆解文件", "Recycling and dismantling document"],
  ["other", "其他文件", "Other document"],
];

function normalizedAssetKey(documentType: string, title: string) {
  const suffix = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${documentType}-${suffix || Date.now()}`.slice(0, 160);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function EvidenceFileManager({ productId }: { productId: string }) {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [workspace, setWorkspace] = useState<EvidenceWorkspace | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("test-report");
  const [accessLevel, setAccessLevel] = useState("PUBLIC");
  const [description, setDescription] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error(zh ? "登录会话已失效，请重新登录。" : "Your session has expired.");
    }
    return accessToken;
  }, [supabase, zh]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = await token();
      const response = await fetch(
        `/api/internal/dpp-files?productId=${encodeURIComponent(productId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "DPP_FILE_LIST_FAILED");
      }
      setWorkspace(payload);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DPP_FILE_LIST_FAILED");
    } finally {
      setLoading(false);
    }
  }, [productId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  function chooseAsset(assetId: string) {
    setSelectedAssetId(assetId);
    const asset = workspace?.assets.find((item) => item.id === assetId);
    if (!asset) {
      setTitle("");
      setDescription("");
      setDocumentType("test-report");
      setAccessLevel("PUBLIC");
      return;
    }
    setTitle(asset.title);
    setDescription(asset.description || "");
    setDocumentType(asset.document_type);
    setAccessLevel(asset.access_level_code);
  }

  function toggleField(fieldCode: string) {
    setSelectedFields((current) => current.includes(fieldCode)
      ? current.filter((item) => item !== fieldCode)
      : [...current, fieldCode]);
  }

  async function upload() {
    if (!title.trim() || !file) {
      setMessage(zh ? "请填写文件名称并选择文件。" : "Enter a title and choose a file.");
      return;
    }
    setWorking(true);
    setMessage("");
    try {
      const accessToken = await token();
      const asset = workspace?.assets.find((item) => item.id === selectedAssetId);
      const fieldByCode = new Map(
        (workspace?.supportedFields || []).map((field) => [field.fieldCode, field]),
      );
      const form = new FormData();
      form.set("productId", productId);
      form.set("assetKey", asset?.asset_key || normalizedAssetKey(documentType, title));
      form.set("title", title.trim());
      form.set("documentType", documentType);
      form.set("description", description.trim());
      form.set("accessLevel", accessLevel);
      form.set("verificationStatus", "PENDING");
      form.set("fieldLinks", JSON.stringify(selectedFields.flatMap((fieldCode) => {
        const field = fieldByCode.get(fieldCode);
        return field
          ? [{ moduleCode: field.moduleCode, fieldCode: field.fieldCode }]
          : [];
      })));
      form.set("file", file);
      const response = await fetch("/api/internal/dpp-files", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "DPP_FILE_UPLOAD_FAILED");
      }
      await load();
      setFile(null);
      setSelectedFields([]);
      setMessage(zh
        ? `文件已上传为不可变版本 v${payload.versionNumber}，校验值已生成。`
        : `The file was uploaded as immutable version v${payload.versionNumber}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DPP_FILE_UPLOAD_FAILED");
    } finally {
      setWorking(false);
    }
  }

  async function download(version: FileVersion) {
    setWorking(true);
    setMessage("");
    try {
      const accessToken = await token();
      const response = await fetch(`/api/dpp-files/${version.id}?purpose=backoffice-review`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("DPP_FILE_DOWNLOAD_FAILED");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = version.original_filename;
      anchor.click();
      URL.revokeObjectURL(href);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "DPP_FILE_DOWNLOAD_FAILED");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="card">
      <div>
        <p className="text-xs font-black text-emerald-700">
          {zh ? "真实文件与字段证据" : "Files and field evidence"}
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-950">
          {zh ? "证据文件中心" : "Evidence file centre"}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {zh
            ? "文件上传后计算 SHA-256 并形成不可覆盖版本。上传仅表示证据已提交，只有后续审核通过才会显示为已核验。"
            : "Each upload receives a SHA-256 checksum and an immutable version. Uploading is not the same as verification."}
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4 border-t border-slate-200 pt-4">
          <label>
            <span className="label">{zh ? "文件资产" : "File asset"}</span>
            <select
              className="input mt-1"
              value={selectedAssetId}
              onChange={(event) => chooseAsset(event.target.value)}
            >
              <option value="">{zh ? "新增文件" : "New file"}</option>
              {(workspace?.assets || []).map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title} ({zh ? "新版本" : "new version"})
                </option>
              ))}
            </select>
          </label>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={zh ? "文件名称" : "File title"}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">{zh ? "文件类型" : "Document type"}</span>
              <select
                className="input mt-1"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
              >
                {DOCUMENT_TYPES.map(([value, labelZh, labelEn]) => (
                  <option key={value} value={value}>{zh ? labelZh : labelEn}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">{zh ? "最低访问权限" : "Minimum access"}</span>
              <select
                className="input mt-1"
                value={accessLevel}
                onChange={(event) => setAccessLevel(event.target.value)}
              >
                <option value="PUBLIC">{zh ? "公开" : "Public"}</option>
                <option value="LEGITIMATE_INTEREST">{zh ? "正当利益访问" : "Legitimate interest"}</option>
                <option value="AUTHORITY_ONLY">{zh ? "主管机关访问" : "Authority only"}</option>
                <option value="INTERNAL">{zh ? "内部访问" : "Internal"}</option>
              </select>
            </label>
          </div>
          <textarea
            className="input min-h-20"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={zh ? "文件说明（选填）" : "Description (optional)"}
          />
          <label>
            <span className="label">{zh ? "选择文件（最大 25 MB）" : "Choose file (25 MB maximum)"}</span>
            <input
              className="input mt-1"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>

          {(workspace?.supportedFields.length || 0) > 0 && (
            <fieldset>
              <legend className="label">
                {zh ? "该文件支持的法规字段（可多选）" : "Fields supported by this file"}
              </legend>
              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto border-y border-slate-200 py-3">
                {workspace?.supportedFields.map((field) => (
                  <label key={field.fieldCode} className="flex gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.fieldCode)}
                      onChange={() => toggleField(field.fieldCode)}
                    />
                    <span>
                      <strong className="block text-slate-900">
                        {zh ? field.labelZh : field.labelEn}
                      </strong>
                      <span className="text-xs text-slate-500">{field.fieldCode}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <button
            type="button"
            className="btn-primary w-full"
            disabled={working || !file}
            onClick={() => void upload()}
          >
            {working
              ? zh ? "正在处理..." : "Processing..."
              : selectedAssetId
                ? zh ? "上传新版本" : "Upload new version"
                : zh ? "上传并建立证据" : "Upload and create evidence"}
          </button>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-black text-slate-950">
              {zh ? "已存储文件" : "Stored files"}
            </h4>
            <button type="button" className="btn-secondary" disabled={loading} onClick={() => void load()}>
              {zh ? "刷新" : "Refresh"}
            </button>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">{zh ? "正在读取..." : "Loading..."}</p>
          ) : workspace?.assets.length ? (
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
              {workspace.assets.map((asset) => {
                const latest = asset.versions[0];
                return (
                  <article key={asset.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h5 className="font-black text-slate-950">{asset.title}</h5>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {asset.document_type} · {asset.access_level_code} · {asset.versions.length} {zh ? "个版本" : "versions"}
                        </p>
                      </div>
                      {latest && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={working}
                          onClick={() => void download(latest)}
                        >
                          {zh ? "下载最新版" : "Download latest"}
                        </button>
                      )}
                    </div>
                    {latest && (
                      <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                        <div><dt className="font-bold">{zh ? "文件" : "File"}</dt><dd className="break-all">{latest.original_filename} · {formatBytes(latest.byte_size)}</dd></div>
                        <div><dt className="font-bold">SHA-256</dt><dd className="break-all font-mono">{latest.checksum_sha256}</dd></div>
                        <div className="sm:col-span-2"><dt className="font-bold">{zh ? "已关联字段" : "Linked fields"}</dt><dd>{latest.links.length ? latest.links.map((link) => `${link.field_code} (${link.verification_status})`).join(", ") : zh ? "尚未关联" : "Not linked"}</dd></div>
                      </dl>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 border-y border-slate-200 py-8 text-center text-sm font-semibold text-slate-500">
              {zh ? "尚未上传真实证据文件。" : "No evidence files have been uploaded."}
            </p>
          )}
        </div>
      </div>
      {message && (
        <p className={`mt-4 text-sm font-semibold ${/失败|fail|error/i.test(message) ? "text-red-700" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </section>
  );
}
