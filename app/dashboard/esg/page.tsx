"use client";

import { SimpleInsertManager } from "@/components/SimpleInsertManager";
import { useLanguage } from "@/components/LanguageProvider";

export default function EsgPage() {
  const { locale } = useLanguage();
  const t =
    locale === "zh"
      ? { title: "ESG 指标", subtitle: "管理碳、能源、水和验证方法等可持续数据。" }
      : { title: "ESG Metrics", subtitle: "Manage ESG data." };

  return (
    <div>
      <h1 className="text-3xl font-black">{t.title}</h1>
      <p className="mt-2 text-slate-600">{t.subtitle}</p>
      <div className="mt-8">
        <SimpleInsertManager
          title="ESG Metrics"
          table="product_esg_metrics"
          fields={[
            { name: "carbon_footprint", placeholder: "Carbon footprint", placeholderZh: "碳足迹", type: "number" },
            { name: "water_usage", placeholder: "Water usage", placeholderZh: "用水量", type: "number" },
            { name: "energy_consumption", placeholder: "Energy consumption", placeholderZh: "能源消耗", type: "number" },
            { name: "methodology", placeholder: "Methodology", placeholderZh: "方法学" },
            { name: "verified_by", placeholder: "Verified by", placeholderZh: "验证方" },
          ]}
        />
      </div>
    </div>
  );
}
