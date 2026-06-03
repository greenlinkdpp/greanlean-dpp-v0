"use client";

import { ProductManager } from "@/components/ProductManager";
import { useLanguage } from "@/components/LanguageProvider";

export default function ProductsPage() {
  const { locale } = useLanguage();
  const t =
    locale === "zh"
      ? {
          title: "产品中心",
          subtitle: "先创建产品，再进入产品详情补充材料、追溯、ESG、证书和消费者透明化数据。",
        }
      : {
          title: "Product Hub",
          subtitle: "Create a product first, then open its detail page to complete materials, traceability, ESG, certificates and consumer transparency.",
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
