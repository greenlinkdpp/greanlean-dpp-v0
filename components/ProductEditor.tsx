"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import { useLanguage } from "@/components/LanguageProvider";
import { SimpleInsertManager } from "@/components/SimpleInsertManager";

type ProductEditorProps = {
  productId: string;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  status: string | null;
  dpp_id: string | null;
  public_slug: string | null;
  main_image: string | null;
};

export function ProductEditor({ productId }: ProductEditorProps) {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          loading: "加载中...",
          back: "返回产品列表",
          editProduct: "编辑产品",
          dppId: "DPP ID",
          viewPublicDpp: "查看公开 DPP",
          basicInfo: "基础信息",
          productName: "产品名称",
          sku: "SKU",
          brand: "品牌",
          category: "分类",
          subcategory: "子分类",
          description: "描述",
          mainImage: "主图 URL",
          status: "状态",
          draft: "草稿",
          published: "已发布",
          saveProduct: "保存产品",
          saving: "保存中...",
          updated: "产品已更新",
          notFound: "未找到产品。",
          materials: "材料",
          certificates: "证书",
          esg: "ESG 指标",
          materialName: "材料名称",
          materialType: "材料类型",
          percentage: "占比 (%)",
          originCountry: "原产国",
          certificateName: "证书名称",
          certificateType: "证书类型",
          certificateNumber: "证书编号",
          issuer: "签发机构",
          carbonFootprint: "碳足迹",
          waterUsage: "用水量",
          energyConsumption: "能源消耗",
          recycledContent: "再生成分",
          methodology: "方法学",
          errorPrefix: "错误：",
        }
      : {
          loading: "Loading...",
          back: "Back to products",
          editProduct: "Edit Product",
          dppId: "DPP ID",
          viewPublicDpp: "View Public DPP",
          basicInfo: "Basic Information",
          productName: "Product name",
          sku: "SKU",
          brand: "Brand",
          category: "Category",
          subcategory: "Subcategory",
          description: "Description",
          mainImage: "Main image URL",
          status: "Status",
          draft: "Draft",
          published: "Published",
          saveProduct: "Save Product",
          saving: "Saving...",
          updated: "Product updated",
          notFound: "Product not found.",
          materials: "Materials",
          certificates: "Certificates",
          esg: "ESG Metrics",
          materialName: "Material Name",
          materialType: "Material Type",
          percentage: "Percentage (%)",
          originCountry: "Origin Country",
          certificateName: "Certificate Name",
          certificateType: "Certificate Type",
          certificateNumber: "Certificate Number",
          issuer: "Issuer",
          carbonFootprint: "Carbon Footprint",
          waterUsage: "Water Usage",
          energyConsumption: "Energy Consumption",
          recycledContent: "Recycled Content",
          methodology: "Methodology",
          errorPrefix: "Error: ",
        };

  const supabase = useMemo(() => createSupabaseClient(), []);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function loadProduct() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      setMsg({ type: "err", text: t.errorPrefix + error.message });
      setProduct(null);
    } else {
      setProduct(data || null);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, locale]);

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!product) return;

    const form = new FormData(e.currentTarget);

    setSaving(true);
    setMsg(null);

    const name = String(form.get("name") || "").trim();

    const payload = {
      name,
      sku: String(form.get("sku") || "").trim(),
      brand: String(form.get("brand") || "").trim(),
      category: String(form.get("category") || "").trim(),
      subcategory: String(form.get("subcategory") || "").trim(),
      description: String(form.get("description") || "").trim(),
      main_image: String(form.get("main_image") || "").trim(),
      status: String(form.get("status") || "draft"),
      public_slug: product.public_slug || slugify(name + "-" + (product.sku || Date.now())),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("products").update(payload).eq("id", productId);

    if (error) {
      setMsg({ type: "err", text: t.errorPrefix + error.message });
    } else {
      setMsg({ type: "ok", text: t.updated });
      await loadProduct();
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="card space-y-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="h-12 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded bg-slate-100" />
          <div className="h-28 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!product) {
    return <p className="text-red-600">{t.notFound}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/products" className="text-sm font-semibold text-brand-700">
            ← {t.back}
          </Link>

          <h1 className="mt-3 text-3xl font-black">{t.editProduct}</h1>

          <p className="mt-2 text-slate-500">
            {t.dppId}: {product.dpp_id || "-"}
          </p>
        </div>

        {product.public_slug && (
          <Link href={`/p/${product.public_slug}`} target="_blank" className="btn-secondary">
            {t.viewPublicDpp}
          </Link>
        )}
      </div>

      <form onSubmit={saveProduct} className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="card space-y-5">
          <h2 className="text-xl font-bold">{t.basicInfo}</h2>

          <div>
            <label className="label">{t.productName}</label>
            <input className="input mt-1" name="name" defaultValue={product.name || ""} required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">{t.sku}</label>
              <input className="input mt-1" name="sku" defaultValue={product.sku || ""} />
            </div>
            <div>
              <label className="label">{t.brand}</label>
              <input className="input mt-1" name="brand" defaultValue={product.brand || ""} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">{t.category}</label>
              <input className="input mt-1" name="category" defaultValue={product.category || ""} />
            </div>
            <div>
              <label className="label">{t.subcategory}</label>
              <input className="input mt-1" name="subcategory" defaultValue={product.subcategory || ""} />
            </div>
          </div>

          <div>
            <label className="label">{t.description}</label>
            <textarea className="input mt-1 min-h-32" name="description" defaultValue={product.description || ""} />
          </div>

          <div>
            <label className="label">{t.mainImage}</label>
            <input className="input mt-1" name="main_image" defaultValue={product.main_image || ""} placeholder="https://..." />
          </div>
        </div>

        <div className="card h-fit space-y-5">
          <h2 className="text-xl font-bold">{t.status}</h2>

          <select className="input" name="status" defaultValue={product.status || "draft"}>
            <option value="draft">{t.draft}</option>
            <option value="published">{t.published}</option>
          </select>

          <button disabled={saving} className="btn-primary w-full">
            {saving ? t.saving : t.saveProduct}
          </button>

          {msg && (
            <p className={msg.type === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
              {msg.text}
            </p>
          )}
        </div>
      </form>

      <SimpleInsertManager
        title={t.materials}
        table="product_materials"
        fixedValues={{ product_id: productId }}
        filterColumn="product_id"
        filterValue={productId}
        fields={[
          { name: "material_name", placeholder: t.materialName, required: true },
          { name: "material_type", placeholder: t.materialType },
          { name: "percentage", placeholder: t.percentage, type: "number" },
          { name: "origin_country", placeholder: t.originCountry },
        ]}
      />

      <SimpleInsertManager
        title={t.certificates}
        table="product_certificates"
        fixedValues={{ product_id: productId }}
        filterColumn="product_id"
        filterValue={productId}
        fields={[
          { name: "certificate_name", placeholder: t.certificateName, required: true },
          { name: "certificate_type", placeholder: t.certificateType },
          { name: "certificate_number", placeholder: t.certificateNumber },
          { name: "issuer", placeholder: t.issuer },
        ]}
      />

      <SimpleInsertManager
        title={t.esg}
        table="product_esg_metrics"
        fixedValues={{ product_id: productId }}
        filterColumn="product_id"
        filterValue={productId}
        pageSize={5}
        fields={[
          { name: "carbon_footprint", placeholder: t.carbonFootprint, type: "number" },
          { name: "water_usage", placeholder: t.waterUsage, type: "number" },
          { name: "energy_consumption", placeholder: t.energyConsumption, type: "number" },
          { name: "recycled_content", placeholder: t.recycledContent, type: "number" },
          { name: "methodology", placeholder: t.methodology },
        ]}
      />
    </div>
  );
}
