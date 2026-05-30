"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import { useLanguage } from "@/components/LanguageProvider";
import { SimpleInsertManager } from "@/components/SimpleInsertManager";

type ProductEditorProps = {
  productId: string;
};

export function ProductEditor({
  productId,
}: ProductEditorProps) {
  const supabase = createSupabaseClient();

  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          loading: "加载中...",
          basicInfo: "基础信息",
          productName: "产品名称",
          sku: "SKU",
          brand: "品牌",
          category: "分类",
          description: "描述",
          saveProduct: "保存产品",
          saving: "保存中...",
          updated: "产品已更新",
          materials: "材料",
          certificates: "证书",
          esg: "ESG 指标",
        }
      : {
          loading: "Loading...",
          basicInfo: "Basic Information",
          productName: "Product name",
          sku: "SKU",
          brand: "Brand",
          category: "Category",
          description: "Description",
          saveProduct: "Save Product",
          saving: "Saving...",
          updated: "Product updated",
          materials: "Materials",
          certificates: "Certificates",
          esg: "ESG Metrics",
        };

  const [product, setProduct] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState("");

  async function loadProduct() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    setProduct(data || null);
  }

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function saveProduct(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    setLoading(true);

    const payload = {
      name: String(form.get("name") || "").trim(),
      sku: String(form.get("sku") || "").trim(),
      brand: String(form.get("brand") || "").trim(),
      category: String(form.get("category") || "").trim(),
      description: String(
        form.get("description") || ""
      ).trim(),
      public_slug: slugify(
        String(form.get("name") || ""),
        {
          lower: true,
        }
      ),
    };

    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", productId);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg(t.updated);

      await loadProduct();
    }

    setLoading(false);
  }

  if (!product) {
    return <p>{t.loading}</p>;
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={saveProduct}
        className="card space-y-4"
      >
        <h2 className="text-xl font-bold">
          {t.basicInfo}
        </h2>

        <input
          className="input"
          name="name"
          placeholder={t.productName}
          defaultValue={product.name}
          required
        />

        <input
          className="input"
          name="sku"
          placeholder={t.sku}
          defaultValue={product.sku}
        />

        <input
          className="input"
          name="brand"
          placeholder={t.brand}
          defaultValue={product.brand}
        />

        <input
          className="input"
          name="category"
          placeholder={t.category}
          defaultValue={product.category}
        />

        <textarea
          className="input min-h-28"
          name="description"
          placeholder={t.description}
          defaultValue={product.description}
        />

        <button
          disabled={loading}
          className="btn-primary"
        >
          {loading
            ? t.saving
            : t.saveProduct}
        </button>

        {msg && (
          <p className="text-sm text-slate-600">
            {msg}
          </p>
        )}
      </form>

      <SimpleInsertManager
        title={t.materials}
        table="product_materials"
        fields={[
          {
            name: "material_name",
            placeholder:
              locale === "zh"
                ? "材料名称"
                : "Material Name",
            required: true,
          },
          {
            name: "material_type",
            placeholder:
              locale === "zh"
                ? "材料类型"
                : "Material Type",
          },
          {
            name: "percentage",
            placeholder:
              locale === "zh"
                ? "占比 (%)"
                : "Percentage (%)",
            type: "number",
          },
          {
            name: "origin_country",
            placeholder:
              locale === "zh"
                ? "原产国"
                : "Origin Country",
          },
        ]}
      />

      <SimpleInsertManager
        title={t.certificates}
        table="product_certificates"
        fields={[
          {
            name: "certificate_name",
            placeholder:
              locale === "zh"
                ? "证书名称"
                : "Certificate Name",
            required: true,
          },
          {
            name: "certificate_type",
            placeholder:
              locale === "zh"
                ? "证书类型"
                : "Certificate Type",
          },
          {
            name: "issuer",
            placeholder:
              locale === "zh"
                ? "签发机构"
                : "Issuer",
          },
        ]}
      />

      <SimpleInsertManager
        title={t.esg}
        table="product_esg_metrics"
        fields={[
          {
            name: "carbon_footprint",
            placeholder:
              locale === "zh"
                ? "碳足迹"
                : "Carbon Footprint",
            type: "number",
          },
          {
            name: "water_usage",
            placeholder:
              locale === "zh"
                ? "用水量"
                : "Water Usage",
            type: "number",
          },
          {
            name: "recycled_content",
            placeholder:
              locale === "zh"
                ? "再生成分"
                : "Recycled Content",
            type: "number",
          },
          {
            name: "methodology",
            placeholder:
              locale === "zh"
                ? "方法学"
                : "Methodology",
          },
        ]}
      />
    </div>
  );
}