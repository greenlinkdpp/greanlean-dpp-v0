"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function DashboardPage() {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          title: "DPP 工作台",
          subtitle:
            "围绕一个产品逐步补齐 DPP 展示页所需的数据，最后发布公开二维码页面。",
          primary: "进入产品中心",
          secondary: "批量导入数据",
          demo: "查看演示 DPP",
          currentModel: "当前数据库模型",
          modelDesc:
            "数据库已按公开 DPP 展示页收敛为 6 类核心数据，并保留数字身份、证据文件和数据治理字段。",
          resetTitle: "数据库重置",
          resetDesc:
            "如需清空历史测试数据并只保留 demo，请在 Supabase SQL Editor 运行 supabase/reset_to_demo.sql。",
          product: "产品基本信息",
          productDesc: "录入名称、SKU、品牌、图片、DPP ID、公开 slug 和发布状态。",
          materials: "材料组成与来源",
          materialsDesc: "录入 BOM、材料比例、来源国家、化学品说明、回收属性和材料认证。",
          traceability: "生产与运输追溯",
          traceabilityDesc: "记录原料、生产、仓储和运输事件，形成产品供应链时间线。",
          esg: "ESG 与循环性",
          esgDesc: "补充碳足迹、水、能源、废弃物、可维修性、可回收性和回收计划。",
          certificates: "认证证书",
          certificatesDesc: "维护证书名称、编号、签发机构、有效期、链接和验证状态。",
          consumer: "消费者透明化",
          consumerDesc: "补充品牌故事、可持续说明、护理、维修、包装和生命周期结束说明。",
          publish: "发布 DPP",
          publishDesc: "检查公开展示页，确认二维码、图片和中英文内容后发布给客户。",
          open: "打开",
          editInProduct: "在产品详情页编辑",
        }
      : {
          title: "DPP Workspace",
          subtitle:
            "Complete the data behind one product passport step by step, then publish the public QR page.",
          primary: "Open Product Hub",
          secondary: "Bulk Import Data",
          demo: "View Demo DPP",
          currentModel: "Current database model",
          modelDesc:
            "The database is aligned to the public DPP display with 6 core data groups plus digital identity, evidence files and governance fields.",
          resetTitle: "Database reset",
          resetDesc:
            "To clear historical test data and keep only the demo, run supabase/reset_to_demo.sql in Supabase SQL Editor.",
          product: "Product basics",
          productDesc: "Enter name, SKU, brand, image, DPP ID, public slug and publishing status.",
          materials: "Materials and sources",
          materialsDesc: "Enter BOM, material ratios, origin, chemical notes, recyclability and material certificates.",
          traceability: "Production and transport traceability",
          traceabilityDesc: "Record sourcing, manufacturing, warehousing and logistics events as a product timeline.",
          esg: "ESG and circularity",
          esgDesc: "Add carbon, water, energy, waste, repairability, recyclability and take-back data.",
          certificates: "Certificates",
          certificatesDesc: "Manage certificate name, number, issuer, validity, link and verification status.",
          consumer: "Consumer transparency",
          consumerDesc: "Add brand story, sustainability notes, care, repair, packaging and end-of-life information.",
          publish: "Publish DPP",
          publishDesc: "Review the public page, QR code, image and bilingual content before sharing with customers.",
          open: "Open",
          editInProduct: "Edit inside product detail",
        };

  const workflow = [
    { title: t.product, desc: t.productDesc, href: "/dashboard/products", action: t.open },
    { title: t.materials, desc: t.materialsDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.traceability, desc: t.traceabilityDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.esg, desc: t.esgDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.certificates, desc: t.certificatesDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.consumer, desc: t.consumerDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.publish, desc: t.publishDesc, href: "/p/demo-organic-cotton-tshirt?lang=zh", action: t.demo },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_380px]">
          <div className="p-6 lg:p-8">
            <p className="text-sm font-bold text-brand-700">greanlean DPP</p>
            <h1 className="mt-3 text-3xl font-black lg:text-4xl">{t.title}</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">{t.subtitle}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="btn-primary" href="/dashboard/products">
                {t.primary}
              </Link>
              <Link className="btn-secondary" href="/dashboard/import?demo=1">
                {t.secondary}
              </Link>
              <Link className="btn-secondary" href="/p/demo-organic-cotton-tshirt?lang=zh" target="_blank">
                {t.demo}
              </Link>
            </div>
          </div>

          <aside className="bg-slate-950 p-6 text-white lg:p-8">
            <h2 className="text-xl font-black">{t.currentModel}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{t.modelDesc}</p>
            <div className="mt-6 rounded-lg border border-white/10 bg-white/10 p-4">
              <p className="font-bold text-brand-100">{t.resetTitle}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{t.resetDesc}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="grid gap-4">
          {workflow.map((step, index) => (
            <Link
              key={step.title}
              href={step.href}
              target={step.href.startsWith("/p/") ? "_blank" : undefined}
              className="group grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white hover:shadow-md md:grid-cols-[52px_1fr_160px]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950">{step.title}</h2>
                <p className="mt-1 leading-7 text-slate-600">{step.desc}</p>
              </div>
              <span className="self-center text-sm font-bold text-brand-700 group-hover:text-brand-800">
                {step.action}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
