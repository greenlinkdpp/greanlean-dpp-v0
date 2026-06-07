"use client";

import { SimpleInsertManager } from "@/components/SimpleInsertManager";
import { useLanguage } from "@/components/LanguageProvider";
import { SupplierProductManager } from "@/components/SupplierProductManager";

export default function SuppliersPage() {
  const { locale } = useLanguage();
  const t =
    locale === "zh"
      ? { title: "供应商", subtitle: "管理供应链合作伙伴。" }
      : { title: "Suppliers", subtitle: "Manage suppliers." };

  return (
    <div>
      <h1 className="text-3xl font-black">{t.title}</h1>
      <p className="mt-2 text-slate-600">{t.subtitle}</p>
      <div className="mt-8">
        <SimpleInsertManager
          title="Suppliers"
          table="product_suppliers"
          fields={[
            { name: "supplier_name", placeholder: "Supplier name", placeholderZh: "供应商名称", required: true },
            { name: "supplier_type", placeholder: "Supplier type", placeholderZh: "供应商类型" },
            { name: "country", placeholder: "Country", placeholderZh: "国家" },
            { name: "city", placeholder: "City", placeholderZh: "城市" },
            { name: "email", placeholder: "Email", placeholderZh: "邮箱", type: "email" },
          ]}
        />
      </div>
      <div className="mt-8">
        <SupplierProductManager />
      </div>
    </div>
  );
}
