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
            "围绕一个产品逐步补齐公开 DPP、证据链和欧盟合规披露所需的数据，最后发布二维码页面。",
          primary: "进入产品中心",
          secondary: "批量导入数据",
          product: "产品身份与数据载体",
          productDesc: "录入名称、SKU、品牌、图片、DPP ID、GTIN、SGTIN、批次、序列号、二维码/NFC/RFID 和公开链接。",
          bom: "BOM 与材料来源",
          bomDesc: "录入组件、材料比例、供应商、来源国家、再生成分、可回收性和材料证书。",
          chemicals: "化学品与受限物质",
          chemicalsDesc: "维护 REACH/SVHC、RoHS、重金属、偶氮染料、电池 MSDS 或其他受限物质报告。",
          performance: "产品技术性能",
          performanceDesc: "录入耐用性、强度、色牢度、续航、电池循环、防护等级等品类相关技术指标。",
          traceability: "供应链追溯时间线",
          traceabilityDesc: "记录原料/组件采购、制造、质检、仓储和出口运输事件，形成可展开时间线。",
          esg: "ESG、环境与循环性",
          esgDesc: "补充碳足迹、水、能源、废弃物、再生成分、维修性、回收性、回收计划和生命周期结束方案。",
          certificates: "证书与符合性声明",
          certificatesDesc: "维护证书、检测报告、EU Declaration of Conformity、签发机构、有效期、链接和验证状态。",
          consumer: "消费者透明化",
          consumerDesc: "补充品牌故事、可持续说明、护理、维修、包装、回收指引和消费者提示。",
          governance: "数据来源与验证治理",
          governanceDesc: "记录数据来源、负责人、第三方验证机构、证书编号、有效期、最后更新时间和质量评分。",
          publish: "发布 DPP",
          publishDesc: "检查公开展示页，确认二维码、图片、中英文内容、PDF/JSON 下载和法规证据链后发布给客户。",
          open: "打开",
          editInProduct: "在产品详情页编辑",
        }
      : {
          title: "DPP Workspace",
          subtitle:
            "Complete the public DPP, evidence chain and EU compliance disclosure data behind one product, then publish the QR page.",
          primary: "Open Product Hub",
          secondary: "Bulk Import Data",
          product: "Product identity and data carrier",
          productDesc: "Enter name, SKU, brand, image, DPP ID, GTIN, SGTIN, batch, serial, QR/NFC/RFID and public link.",
          bom: "BOM and material sources",
          bomDesc: "Enter components, material ratios, suppliers, origin, recycled content, recyclability and material certificates.",
          chemicals: "Chemicals and restricted substances",
          chemicalsDesc: "Manage REACH/SVHC, RoHS, heavy metals, azo dyes, battery MSDS or other restricted-substance reports.",
          performance: "Technical performance",
          performanceDesc: "Enter durability, strength, colour fastness, battery life, charge cycles, IP rating and category-specific indicators.",
          traceability: "Supply-chain timeline",
          traceabilityDesc: "Record component sourcing, manufacturing, QA, warehousing and export logistics events.",
          esg: "ESG, environment and circularity",
          esgDesc: "Add carbon, water, energy, waste, recycled content, repairability, recyclability, take-back and end-of-life data.",
          certificates: "Certificates and declarations",
          certificatesDesc: "Manage certificates, test reports, EU Declaration of Conformity, issuer, validity, links and verification status.",
          consumer: "Consumer transparency",
          consumerDesc: "Add brand story, sustainability notes, care, repair, packaging, recycling guidance and consumer notices.",
          governance: "Data source and governance",
          governanceDesc: "Record data source, owner, verifier, certificate number, validity, last update and quality score.",
          publish: "Publish DPP",
          publishDesc: "Review the public page, QR code, image and bilingual content before sharing with customers.",
          open: "Open",
          editInProduct: "Edit inside product detail",
        };

  const workflow = [
    { title: t.product, desc: t.productDesc, href: "/dashboard/products", action: t.open },
    { title: t.bom, desc: t.bomDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.chemicals, desc: t.chemicalsDesc, href: "/dashboard/import", action: t.secondary },
    { title: t.performance, desc: t.performanceDesc, href: "/dashboard/import", action: t.secondary },
    { title: t.traceability, desc: t.traceabilityDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.esg, desc: t.esgDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.certificates, desc: t.certificatesDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.consumer, desc: t.consumerDesc, href: "/dashboard/products", action: t.editInProduct },
    { title: t.governance, desc: t.governanceDesc, href: "/dashboard/import", action: t.secondary },
    { title: t.publish, desc: t.publishDesc, href: "/p/DPP-DEMO-001?lang=zh", action: t.open },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="max-w-5xl">
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
            </div>
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
