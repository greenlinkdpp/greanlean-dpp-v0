"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function DashboardPage() {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          title: "后台首页",
          subtitle: "管理你的数字产品护照数据。",
          createProduct: "创建产品",
          products: "产品管理",
          productsDesc: "创建并发布产品护照",
          suppliers: "供应商",
          suppliersDesc: "管理供应链合作伙伴",
          materials: "材料",
          materialsDesc: "管理产品材料与成分",
          esg: "ESG 指标",
          esgDesc: "追踪可持续发展指标",
          certificates: "证书",
          certificatesDesc: "管理产品证书与验证信息",
          open: "打开 →",
        }
      : {
          title: "Dashboard",
          subtitle: "Manage your Digital Product Passport data.",
          createProduct: "Create Product",
          products: "Products",
          productsDesc: "Create and publish product passports",
          suppliers: "Suppliers",
          suppliersDesc: "Manage supply chain partners",
          materials: "Materials",
          materialsDesc: "Manage product materials and composition",
          esg: "ESG",
          esgDesc: "Track sustainability metrics",
          certificates: "Certificates",
          certificatesDesc: "Manage product certificates and verification",
          open: "Open →",
        };

  const cards = [
    {
      title: t.products,
      desc: t.productsDesc,
      href: "/dashboard/products",
    },
    {
      title: t.suppliers,
      desc: t.suppliersDesc,
      href: "/dashboard/suppliers",
    },
    {
      title: t.materials,
      desc: t.materialsDesc,
      href: "/dashboard/materials",
    },
    {
      title: t.esg,
      desc: t.esgDesc,
      href: "/dashboard/esg",
    },
    {
      title: t.certificates,
      desc: t.certificatesDesc,
      href: "/dashboard/certificates",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{t.title}</h1>

          <p className="mt-2 text-slate-600">{t.subtitle}</p>
        </div>

        <Link className="btn-primary" href="/dashboard/products">
          {t.createProduct}
        </Link>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card block transition hover:-translate-y-1 hover:border-brand-500 hover:shadow-md"
          >
            <h2 className="text-xl font-bold">{card.title}</h2>

            <p className="mt-2 text-slate-600">{card.desc}</p>

            <p className="mt-6 text-sm font-semibold text-brand-700">
              {t.open}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}