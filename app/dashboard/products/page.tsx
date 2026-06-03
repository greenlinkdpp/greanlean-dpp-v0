"use client";

import { ProductManager } from "@/components/ProductManager";
import { useLanguage } from "@/components/LanguageProvider";

export default function ProductsPage() {
  const { locale } = useLanguage();
  const t =
    locale === "zh"
      ? {
          title: "产品管理",
          subtitle: "创建产品护照并发布公开 DPP 页面。",
        }
      : {
          title: "Products",
          subtitle: "Create product passports and publish public DPP pages.",
        };

  return (
    <div>
      <h1 className="text-3xl font-black">{t.title}</h1>
      <p className="mt-2 text-slate-600">{t.subtitle}</p>
      <div className="mt-8">
        <ProductManager />
      </div>
    </div>
  );
}
