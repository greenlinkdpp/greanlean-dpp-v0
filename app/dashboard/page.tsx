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
          viewImport: "导入数据",
          snapshotTitle: "DPP 工作流",
          snapshotDesc: "从企业表格到公开产品护照页面。",
          step1: "录入产品",
          step2: "补充材料和证书",
          step3: "发布 DPP 页面",
          importData: "批量导入",
          importDataDesc: "上传模板并校验 DPP 数据",
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
          viewImport: "Import Data",
          snapshotTitle: "DPP workflow",
          snapshotDesc: "From company spreadsheets to public product passport pages.",
          step1: "Create products",
          step2: "Add materials and certificates",
          step3: "Publish DPP pages",
          importData: "Bulk Import",
          importDataDesc: "Upload templates and validate DPP data",
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
      title: t.importData,
      desc: t.importDataDesc,
      href: "/dashboard/import",
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
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <h1 className="text-3xl font-black">{t.title}</h1>

            <p className="mt-2 max-w-2xl text-slate-600">{t.subtitle}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-primary" href="/dashboard/products">
                {t.createProduct}
              </Link>
              <Link className="btn-secondary" href="/dashboard/import?demo=1">
                {t.viewImport}
              </Link>
            </div>
          </div>

          <div className="rounded-lg bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold text-brand-100">{t.snapshotTitle}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{t.snapshotDesc}</p>
            <div className="mt-5 grid gap-2 text-sm">
              {[t.step1, t.step2, t.step3].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded bg-brand-500 text-xs font-black text-slate-950">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card block transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
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
