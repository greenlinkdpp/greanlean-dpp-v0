"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { ProductRelatedManager } from "@/components/ProductRelatedManager";

type Product = Record<string, any>;

const LIFECYCLE_STATUSES = ["draft", "review", "published", "updated", "archived", "expired"] as const;
const CHANGE_TYPES = ["initial_publish", "certificate_update", "carbon_update", "batch_change", "data_correction", "status_change"] as const;

function nextPatchVersion(version: string | null | undefined) {
  const match = String(version || "v1.0").match(/^v(\d+)\.(\d+)$/);
  if (!match) return "v1.1";
  return `v${match[1]}.${Number(match[2]) + 1}`;
}

function statusLabel(status: string, locale: string) {
  const zh: Record<string, string> = {
    draft: "草稿",
    review: "待审核",
    published: "已发布",
    updated: "已更新",
    archived: "已归档",
    expired: "证书过期",
  };
  const en: Record<string, string> = {
    draft: "Draft",
    review: "In review",
    published: "Published",
    updated: "Updated",
    archived: "Archived",
    expired: "Certificate expired",
  };
  return (locale === "zh" ? zh : en)[status] || status;
}

function changeTypeLabel(type: string, locale: string) {
  const zh: Record<string, string> = {
    initial_publish: "v1.0 初始发布",
    certificate_update: "更新证书",
    carbon_update: "更新碳足迹",
    batch_change: "产品批次变更",
    data_correction: "数据修正",
    status_change: "状态变更",
  };
  const en: Record<string, string> = {
    initial_publish: "Initial publish",
    certificate_update: "Certificate update",
    carbon_update: "Carbon footprint update",
    batch_change: "Product batch change",
    data_correction: "Data correction",
    status_change: "Status change",
  };
  return (locale === "zh" ? zh : en)[type] || type;
}

export function ProductEditor({ productId }: { productId: string }) {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const t =
    locale === "zh"
      ? {
          loading: "加载产品中...",
          notFound: "未找到产品。",
          back: "返回产品列表",
          view: "查看公开 DPP",
          basic: "基础信息",
          publish: "生命周期与版本",
          name: "产品名称（英文）",
          nameZh: "产品名称（中文）",
          sku: "SKU",
          brand: "品牌",
          category: "分类",
          subcategory: "子分类",
          season: "季节 / 系列",
          description: "描述（英文）",
          descriptionZh: "描述（中文）",
          mainImage: "主图 URL",
          care: "护理说明（英文）",
          careZh: "护理说明（中文）",
          repair: "维修说明（英文）",
          repairZh: "维修说明（中文）",
          eol: "生命周期结束说明（英文）",
          eolZh: "生命周期结束说明（中文）",
          status: "生命周期状态",
          currentVersion: "当前版本",
          nextVersion: "本次保存版本号",
          changeType: "变更类型",
          changeSummary: "变更说明",
          publicSlug: "公开 Slug",
          dppId: "DPP ID",
          save: "保存产品并记录版本",
          saving: "保存中...",
          saved: "产品已保存，并已记录版本。",
          versionNote: "示例：v1.0 初始发布、v1.1 更新证书、v1.2 更新碳足迹、v2.0 产品批次变更。",
          components: "组件 / BOM",
          materials: "材料",
          esg: "ESG 指标",
          certificates: "证书",
          traceability: "供应链追踪",
          circularity: "循环性",
          transparency: "消费者透明度",
          identity: "数字身份",
          documents: "文档",
          versions: "版本历史",
        }
      : {
          loading: "Loading product...",
          notFound: "Product not found.",
          back: "Back to products",
          view: "View Public DPP",
          basic: "Basic Information",
          publish: "Lifecycle and versioning",
          name: "Product name (English)",
          nameZh: "Product name (Chinese)",
          sku: "SKU",
          brand: "Brand",
          category: "Category",
          subcategory: "Subcategory",
          season: "Season / Collection",
          description: "Description (English)",
          descriptionZh: "Description (Chinese)",
          mainImage: "Main image URL",
          care: "Care instructions (English)",
          careZh: "Care instructions (Chinese)",
          repair: "Repair instructions (English)",
          repairZh: "Repair instructions (Chinese)",
          eol: "End-of-life instructions (English)",
          eolZh: "End-of-life instructions (Chinese)",
          status: "Lifecycle status",
          currentVersion: "Current version",
          nextVersion: "Version for this save",
          changeType: "Change type",
          changeSummary: "Change summary",
          publicSlug: "Public Slug",
          dppId: "DPP ID",
          save: "Save Product and Record Version",
          saving: "Saving...",
          saved: "Product saved and version recorded.",
          versionNote: "Examples: v1.0 initial publish, v1.1 certificate update, v1.2 carbon update, v2.0 product batch change.",
          components: "Components / BOM",
          materials: "Materials",
          esg: "ESG Metrics",
          certificates: "Certificates",
          traceability: "Supply Chain Traceability",
          circularity: "Circularity",
          transparency: "Consumer Transparency",
          identity: "Digital Identity",
          documents: "Documents",
          versions: "Version history",
        };

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [versionRefreshKey, setVersionRefreshKey] = useState(0);

  async function loadProduct() {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").eq("id", productId).single();
    if (error) setMessage(error.message);
    else setProduct(data);
    setLoading(false);
  }

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;

    const form = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const payload: Record<string, any> = {};
    [
      "name",
      "name_zh",
      "sku",
      "brand",
      "category",
      "subcategory",
      "season",
      "description",
      "description_zh",
      "main_image",
      "care_instructions",
      "care_instructions_zh",
      "repair_instructions",
      "repair_instructions_zh",
      "end_of_life_instructions",
      "end_of_life_instructions_zh",
      "status",
      "current_version",
    ].forEach((key) => {
      payload[key] = String(form.get(key) || "").trim() || null;
    });
    payload.status = payload.status || "draft";
    payload.current_version = payload.current_version || "v1.0";
    payload.updated_at = now;

    const version = String(form.get("version") || payload.current_version || "v1.0").trim();
    const changeType = String(form.get("change_type") || "data_correction").trim();
    const changeSummary = String(form.get("change_summary") || "").trim();

    setSaving(true);
    setMessage("");

    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", product.id)
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    const { error: versionError } = await supabase.from("product_versions").upsert(
      {
        product_id: product.id,
        version,
        lifecycle_status: payload.status,
        change_type: changeType,
        change_summary: changeSummary || changeTypeLabel(changeType, locale),
        changed_by: "greanlean admin",
        snapshot: {
          product: updatedProduct,
          saved_at: now,
        },
      },
      { onConflict: "product_id,version" },
    );

    if (versionError) setMessage(versionError.message);
    else setMessage(t.saved);

    await loadProduct();
    setVersionRefreshKey((key) => key + 1);
    setSaving(false);
  }

  if (loading) return <p className="text-slate-600">{t.loading}</p>;
  if (!product) return <p className="text-red-600">{t.notFound}</p>;

  const publicIdentifier = product.dpp_id || product.public_slug;
  const suggestedVersion = product.current_version ? nextPatchVersion(product.current_version) : "v1.0";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/products" className="text-sm font-semibold text-brand-700">
            ← {t.back}
          </Link>
          <h1 className="mt-3 text-3xl font-black">{locale === "zh" && product.name_zh ? product.name_zh : product.name}</h1>
          <p className="mt-2 text-slate-500">
            {t.dppId}: {product.dpp_id || "—"} · {t.currentVersion}: {product.current_version || "v1.0"} · {statusLabel(product.status || "draft", locale)}
          </p>
        </div>
        {publicIdentifier && (
          <Link href={`/p/${encodeURIComponent(publicIdentifier)}`} target="_blank" className="btn-secondary">
            {t.view}
          </Link>
        )}
      </div>

      <form onSubmit={saveProduct} className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <section className="card space-y-5">
          <h2 className="text-xl font-bold">{t.basic}</h2>
          <input className="input" name="name" defaultValue={product.name || ""} placeholder={t.name} required />
          <input className="input" name="name_zh" defaultValue={product.name_zh || ""} placeholder={t.nameZh} />
          <div className="grid gap-4 md:grid-cols-3">
            <input className="input" name="sku" defaultValue={product.sku || ""} placeholder={t.sku} />
            <input className="input" name="brand" defaultValue={product.brand || ""} placeholder={t.brand} />
            <input className="input" name="category" defaultValue={product.category || ""} placeholder={t.category} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="input" name="subcategory" defaultValue={product.subcategory || ""} placeholder={t.subcategory} />
            <input className="input" name="season" defaultValue={product.season || ""} placeholder={t.season} />
          </div>
          <textarea className="input min-h-28" name="description" defaultValue={product.description || ""} placeholder={t.description} />
          <textarea className="input min-h-28" name="description_zh" defaultValue={product.description_zh || ""} placeholder={t.descriptionZh} />
          <input className="input" name="main_image" defaultValue={product.main_image || ""} placeholder={t.mainImage} />
          <textarea className="input min-h-24" name="care_instructions" defaultValue={product.care_instructions || ""} placeholder={t.care} />
          <textarea className="input min-h-24" name="care_instructions_zh" defaultValue={product.care_instructions_zh || ""} placeholder={t.careZh} />
          <textarea className="input min-h-24" name="repair_instructions" defaultValue={product.repair_instructions || ""} placeholder={t.repair} />
          <textarea className="input min-h-24" name="repair_instructions_zh" defaultValue={product.repair_instructions_zh || ""} placeholder={t.repairZh} />
          <textarea className="input min-h-24" name="end_of_life_instructions" defaultValue={product.end_of_life_instructions || ""} placeholder={t.eol} />
          <textarea className="input min-h-24" name="end_of_life_instructions_zh" defaultValue={product.end_of_life_instructions_zh || ""} placeholder={t.eolZh} />
        </section>

        <section className="card h-fit space-y-5">
          <h2 className="text-xl font-bold">{t.publish}</h2>
          <label>
            <span className="label">{t.status}</span>
            <select className="input mt-1" name="status" defaultValue={product.status || "draft"}>
              {LIFECYCLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.currentVersion}</span>
            <input className="input mt-1" name="current_version" defaultValue={product.current_version || "v1.0"} placeholder="v1.0" />
          </label>
          <label>
            <span className="label">{t.nextVersion}</span>
            <input className="input mt-1" name="version" defaultValue={suggestedVersion} placeholder="v1.1" />
          </label>
          <label>
            <span className="label">{t.changeType}</span>
            <select className="input mt-1" name="change_type" defaultValue="data_correction">
              {CHANGE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {changeTypeLabel(type, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.changeSummary}</span>
            <textarea className="input mt-1 min-h-24" name="change_summary" placeholder={t.versionNote} />
          </label>
          <Info label={t.publicSlug} value={product.public_slug} />
          <Info label={t.dppId} value={product.dpp_id} />
          <button disabled={saving} className="btn-primary w-full">
            {saving ? t.saving : t.save}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </section>
      </form>

      <ProductVersionHistory productId={productId} refreshKey={versionRefreshKey} title={t.versions} />

      <ProductRelatedManager productId={productId} title="Components / BOM" titleZh={t.components} table="product_bom" displayFields={["component_name", "component_type", "quantity", "unit", "position"]} fields={[{ name: "component_name", label: "Component Name", labelZh: "组件名称", required: true }, { name: "component_name_zh", label: "Component Name Chinese", labelZh: "组件名称中文" }, { name: "component_type", label: "Component Type", labelZh: "组件类型" }, { name: "component_type_zh", label: "Component Type Chinese", labelZh: "组件类型中文" }, { name: "quantity", label: "Quantity", labelZh: "数量", type: "number" }, { name: "unit", label: "Unit", labelZh: "单位" }, { name: "position", label: "Position", labelZh: "位置" }]} />
      <ProductRelatedManager productId={productId} title="Materials" titleZh={t.materials} table="product_materials" displayFields={["material_name", "percentage", "origin_country", "certification"]} fields={[{ name: "material_name", label: "Material Name", labelZh: "材料名称", required: true }, { name: "material_name_zh", label: "Material Name Chinese", labelZh: "材料名称中文" }, { name: "material_type", label: "Material Type", labelZh: "材料类型" }, { name: "material_type_zh", label: "Material Type Chinese", labelZh: "材料类型中文" }, { name: "percentage", label: "Percentage", labelZh: "占比 (%)", type: "number" }, { name: "recycled_content", label: "Recycled Content", labelZh: "再生成分 (%)", type: "number" }, { name: "origin_country", label: "Origin Country", labelZh: "原产国" }, { name: "chemical_info", label: "Chemical Info", labelZh: "化学信息" }, { name: "recyclability", label: "Recyclability", labelZh: "可回收性" }, { name: "certification", label: "Certification", labelZh: "认证" }]} />
      <ProductRelatedManager productId={productId} title="ESG Metrics" titleZh={t.esg} table="product_esg_metrics" displayFields={["carbon_footprint", "water_usage", "recycled_content", "methodology"]} fields={[{ name: "carbon_footprint", label: "Carbon Footprint", labelZh: "碳足迹", type: "number" }, { name: "water_usage", label: "Water Usage", labelZh: "用水量", type: "number" }, { name: "energy_consumption", label: "Energy Consumption", labelZh: "能源消耗", type: "number" }, { name: "waste_generation", label: "Waste Generation", labelZh: "废弃物", type: "number" }, { name: "recycled_content", label: "Recycled Content", labelZh: "再生成分", type: "number" }, { name: "chemical_management", label: "Chemical Management", labelZh: "化学品管理" }, { name: "lca_report_url", label: "LCA Report URL", labelZh: "LCA 报告 URL", type: "url" }, { name: "methodology", label: "Methodology", labelZh: "方法学" }, { name: "verified_by", label: "Verified By", labelZh: "验证方" }]} />
      <ProductRelatedManager productId={productId} title="Certificates" titleZh={t.certificates} table="product_certificates" displayFields={["certificate_name", "certificate_type", "issuer", "verification_status"]} fields={[{ name: "certificate_name", label: "Certificate Name", labelZh: "证书名称", required: true }, { name: "certificate_name_zh", label: "Certificate Name Chinese", labelZh: "证书名称中文" }, { name: "certificate_type", label: "Certificate Type", labelZh: "证书类型" }, { name: "certificate_type_zh", label: "Certificate Type Chinese", labelZh: "证书类型中文" }, { name: "certificate_number", label: "Certificate Number", labelZh: "证书编号" }, { name: "issuer", label: "Issuer", labelZh: "签发机构" }, { name: "issue_date", label: "Issue Date", labelZh: "签发日期", type: "date" }, { name: "expiry_date", label: "Expiry Date", labelZh: "到期日期", type: "date" }, { name: "certificate_url", label: "Certificate URL", labelZh: "证书 URL", type: "url" }, { name: "verification_status", label: "Verification Status", labelZh: "验证状态" }]} />
      <ProductRelatedManager productId={productId} title="Traceability Events" titleZh={t.traceability} table="product_traceability" orderBy="event_date" displayFields={["event_name", "country", "city", "facility_name", "verification_status"]} fields={[{ name: "event_type", label: "Event Type", labelZh: "事件类型" }, { name: "event_name", label: "Event Name", labelZh: "事件名称", required: true }, { name: "event_name_zh", label: "Event Name Chinese", labelZh: "事件名称中文" }, { name: "event_date", label: "Event Date", labelZh: "事件日期", type: "datetime-local" }, { name: "country", label: "Country", labelZh: "国家" }, { name: "city", label: "City", labelZh: "城市" }, { name: "facility_name", label: "Facility Name", labelZh: "设施名称" }, { name: "facility_name_zh", label: "Facility Name Chinese", labelZh: "设施名称中文" }, { name: "transport_method", label: "Transport Method", labelZh: "运输方式" }, { name: "verification_status", label: "Verification Status", labelZh: "验证状态" }, { name: "notes", label: "Notes", labelZh: "备注", type: "textarea" }, { name: "notes_zh", label: "Notes Chinese", labelZh: "备注中文", type: "textarea" }]} />
      <ProductRelatedManager productId={productId} title="Circularity" titleZh={t.circularity} table="product_circularity" displayFields={["repairability_score", "recyclability_score", "take_back_program", "resale_supported"]} fields={[{ name: "repairability_score", label: "Repairability Score", labelZh: "可维修性评分", type: "number" }, { name: "recyclability_score", label: "Recyclability Score", labelZh: "可回收性评分", type: "number" }, { name: "take_back_program", label: "Take Back Program", labelZh: "回收计划" }, { name: "resale_supported", label: "Resale Supported", labelZh: "支持二手转售", type: "checkbox" }, { name: "remanufacturing_supported", label: "Remanufacturing Supported", labelZh: "支持再制造", type: "checkbox" }, { name: "disassembly_guide", label: "Disassembly Guide", labelZh: "拆解指南", type: "textarea" }, { name: "recycling_instructions", label: "Recycling Instructions", labelZh: "回收说明", type: "textarea" }, { name: "end_of_life_info", label: "End-of-Life Info", labelZh: "生命周期结束信息", type: "textarea" }]} />
      <ProductRelatedManager productId={productId} title="Consumer Transparency" titleZh={t.transparency} table="product_consumer_transparency" displayFields={["brand_story", "sustainability_story", "consumer_notice"]} fields={[{ name: "brand_story", label: "Brand Story", labelZh: "品牌故事", type: "textarea" }, { name: "brand_story_zh", label: "Brand Story Chinese", labelZh: "品牌故事中文", type: "textarea" }, { name: "sustainability_story", label: "Sustainability Story", labelZh: "可持续故事", type: "textarea" }, { name: "sustainability_story_zh", label: "Sustainability Story Chinese", labelZh: "可持续故事中文", type: "textarea" }, { name: "consumer_notice", label: "Consumer Notice", labelZh: "消费者提示", type: "textarea" }, { name: "consumer_notice_zh", label: "Consumer Notice Chinese", labelZh: "消费者提示中文", type: "textarea" }, { name: "marketing_content", label: "Marketing Content", labelZh: "营销内容", type: "textarea" }, { name: "marketing_content_zh", label: "Marketing Content Chinese", labelZh: "营销内容中文", type: "textarea" }]} />
      <ProductRelatedManager productId={productId} title="Digital Identity" titleZh={t.identity} table="product_digital_identity" displayFields={["gtin", "batch_id", "serial_id", "digital_link_url"]} fields={[{ name: "product_uuid", label: "Product UUID", labelZh: "产品 UUID" }, { name: "gtin", label: "GTIN", labelZh: "GTIN" }, { name: "style_id", label: "Style ID", labelZh: "款式 ID" }, { name: "batch_id", label: "Batch ID", labelZh: "批次 ID" }, { name: "serial_id", label: "Serial ID", labelZh: "序列号" }, { name: "digital_link_url", label: "Digital Link URL", labelZh: "数字链接 URL", type: "url" }, { name: "qr_code_id", label: "QR Code ID", labelZh: "二维码 ID" }, { name: "nfc_id", label: "NFC ID", labelZh: "NFC ID" }, { name: "rfid_epc", label: "RFID EPC", labelZh: "RFID EPC" }]} />
      <ProductRelatedManager productId={productId} title="Documents" titleZh={t.documents} table="product_documents" displayFields={["document_name", "document_type", "language", "version"]} fields={[{ name: "document_name", label: "Document Name", labelZh: "文档名称", required: true }, { name: "document_type", label: "Document Type", labelZh: "文档类型" }, { name: "file_url", label: "File URL", labelZh: "文件 URL", type: "url" }, { name: "file_size", label: "File Size", labelZh: "文件大小" }, { name: "language", label: "Language", labelZh: "语言" }, { name: "uploaded_by", label: "Uploaded By", labelZh: "上传者" }, { name: "version", label: "Version", labelZh: "版本" }]} />
    </div>
  );
}

function ProductVersionHistory({ productId, refreshKey, title }: { productId: string; refreshKey: number; title: string }) {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("product_versions")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) setMessage(error.message);
      else setRows(data || []);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, refreshKey]);

  const emptyText = locale === "zh" ? "暂无版本记录。保存产品后会自动生成。" : "No version records yet. Saving the product will create one.";

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{rows.length} records</p>
        </div>
      </div>
      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      <div className="mt-5 grid gap-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black text-slate-950">{row.version}</p>
                <p className="mt-1 text-sm text-slate-500">{new Date(row.created_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700 shadow-sm">
                {statusLabel(row.lifecycle_status || "draft", locale)}
              </span>
            </div>
            <p className="mt-3 text-sm font-bold text-slate-700">{changeTypeLabel(row.change_type || "data_correction", locale)}</p>
            {row.change_summary && <p className="mt-2 text-sm leading-6 text-slate-600">{row.change_summary}</p>}
          </article>
        ))}
        {!rows.length && <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{emptyText}</p>}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-all font-bold text-slate-950">{value || "—"}</p>
    </div>
  );
}
