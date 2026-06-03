"use client";

import { SimpleInsertManager } from "@/components/SimpleInsertManager";
import { useLanguage } from "@/components/LanguageProvider";

export default function MaterialsPage() {
  const { locale } = useLanguage();
  const t =
    locale === "zh"
      ? { title: "材料", subtitle: "管理产品材料与成分。" }
      : { title: "Materials", subtitle: "Manage materials." };

  return (
    <div>
      <h1 className="text-3xl font-black">{t.title}</h1>
      <p className="mt-2 text-slate-600">{t.subtitle}</p>
      <div className="mt-8">
        <SimpleInsertManager
          title="Materials"
          table="product_materials"
          fields={[
            { name: "material_name", placeholder: "Material name", placeholderZh: "材料名称", required: true },
            { name: "material_type", placeholder: "Material type", placeholderZh: "材料类型" },
            { name: "origin_country", placeholder: "Origin country", placeholderZh: "原产国" },
            { name: "certification", placeholder: "Certification", placeholderZh: "认证" },
          ]}
        />
      </div>
    </div>
  );
}
