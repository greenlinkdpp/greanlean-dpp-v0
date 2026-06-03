"use client";

import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { PublicHeader } from "@/components/PublicHeader";
import { useLanguage } from "@/components/LanguageProvider";

export default function Home() {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          badge: "面向中国出口企业的欧盟 DPP 服务商",
          title: "让产品数据成为可展示、可追溯、可对接的 DPP。",
          subtitle:
            "greanlean 帮助纺织、WPC 复合地板、五金金属配件等出口企业采集产品数据、生成 DPP 页面、管理证书与追溯信息，并为未来欧盟系统对接预留数据基础。",
          primaryCta: "获取 DPP 评估",
          secondaryCta: "查看演示 DPP",
          heroStat1: "6 类核心数据",
          heroStat1Desc: "产品、材料、追溯、ESG、证书、消费者透明化",
          heroStat2: "CSV / Excel 路线",
          heroStat2Desc: "从工厂现有表格批量录入",
          heroStat3: "二维码公开页",
          heroStat3Desc: "适合客户、品牌方和消费者查看",
          industriesTitle: "先服务最需要 DPP 准备的出口行业",
          industriesSubtitle:
            "第一阶段聚焦资料复杂、供应链长、认证多的制造品类，把通用 DPP 数据模型做成行业可落地模板。",
          textile: "纺织服装",
          textileDesc: "纤维成分、染整工艺、护理说明、GOTS / GRS / OEKO-TEX 等认证。",
          flooring: "WPC 复合地板",
          flooringDesc: "材料比例、VOC、耐磨、阻燃、FSC / REACH、回收与建筑材料数据。",
          metal: "五金金属配件",
          metalDesc: "材质牌号、表面处理、镀层、RoHS / REACH、批次与供应商追溯。",
          platformTitle: "一个平台覆盖 DPP 从录入到展示",
          platformSubtitle:
            "先让企业把真实数据结构化，再生成面向外部的产品护照页面。",
          productData: "产品数据中心",
          productDataDesc: "管理 SKU、品牌、图片、批次、产品描述、DPP ID 和发布状态。",
          supplyChain: "供应链追溯",
          supplyChainDesc: "记录原料、生产、加工、包装、运输等事件，连接供应商和工厂设施。",
          evidence: "ESG 与证据管理",
          evidenceDesc: "沉淀碳、水、能源、废弃物、可回收性、证书和报告链接。",
          passport: "公开 DPP 页面",
          passportDesc: "为每个产品生成二维码访问页面，展示消费者和买家关心的信息。",
          modulesTitle: "第一版 DPP 展示模块",
          module1: "产品基本信息、图片、二维码",
          module2: "产品材料组成与来源",
          module3: "生产与运输供应链追溯",
          module4: "ESG：碳、能源、资源、可回收性",
          module5: "认证证书与验证状态",
          module6: "消费者透明化说明",
          workflowTitle: "服务流程",
          workflow1: "评估产品品类和欧盟市场要求",
          workflow2: "整理企业现有表格、证书和供应商资料",
          workflow3: "批量导入 DPP 数据并校验",
          workflow4: "发布产品护照页面和二维码",
          workflow5: "为后续欧盟系统对接保留 API 和数据结构",
          readinessTitle: "为未来欧盟 DPP 对接做准备",
          readinessSubtitle:
            "目前最重要的是先把数据做成标准化、可追溯、可导出、可权限控制的结构。greanlean 的系统会围绕唯一产品标识、结构化字段、证据文件、版本记录和公开访问链接逐步完善。",
          contactTitle: "开始你的 DPP 准备度评估",
          contactSubtitle:
            "告诉我们你的产品类别、出口市场和已有数据情况，我们会帮你判断第一版 DPP 应该先做哪些字段。",
        }
      : {
          badge: "EU DPP services for Chinese exporters",
          title: "Turn product data into digital passports that are visible, traceable and ready to connect.",
          subtitle:
            "greanlean helps textile, WPC flooring, metal hardware and other export manufacturers collect product data, generate DPP pages, manage certificates and traceability, and prepare the data foundation for future EU system connections.",
          primaryCta: "Get DPP assessment",
          secondaryCta: "View demo DPP",
          heroStat1: "6 data modules",
          heroStat1Desc: "Product, materials, traceability, ESG, certificates and consumer transparency",
          heroStat2: "CSV / Excel path",
          heroStat2Desc: "Import from factory spreadsheets",
          heroStat3: "QR public page",
          heroStat3Desc: "Built for buyers, brands and consumers",
          industriesTitle: "Focused on export sectors that need DPP readiness first",
          industriesSubtitle:
            "The first phase targets product categories with complex data, long supply chains and many certificates, turning the DPP model into practical industry templates.",
          textile: "Textile & apparel",
          textileDesc: "Fiber composition, dyeing and finishing, care instructions, GOTS / GRS / OEKO-TEX certificates.",
          flooring: "WPC composite flooring",
          flooringDesc: "Material ratio, VOC, abrasion, flame retardancy, FSC / REACH, recycling and building material data.",
          metal: "Metal hardware",
          metalDesc: "Material grade, surface treatment, plating, RoHS / REACH, batch and supplier traceability.",
          platformTitle: "One platform from DPP input to public display",
          platformSubtitle:
            "Structure real company data first, then generate product passport pages for external stakeholders.",
          productData: "Product data hub",
          productDataDesc: "Manage SKU, brand, image, batch, product description, DPP ID and publishing status.",
          supplyChain: "Supply chain traceability",
          supplyChainDesc: "Record material, production, processing, packaging and transport events with suppliers and facilities.",
          evidence: "ESG and evidence management",
          evidenceDesc: "Collect carbon, water, energy, waste, recyclability, certificates and report links.",
          passport: "Public DPP page",
          passportDesc: "Generate a QR-accessible page for each product with information buyers and consumers care about.",
          modulesTitle: "First-version DPP display modules",
          module1: "Product basics, image and QR code",
          module2: "Material composition and source",
          module3: "Production and transport traceability",
          module4: "ESG: carbon, energy, resources and recyclability",
          module5: "Certificates and verification status",
          module6: "Consumer transparency information",
          workflowTitle: "Service workflow",
          workflow1: "Assess product category and EU market requirements",
          workflow2: "Organize existing spreadsheets, certificates and supplier data",
          workflow3: "Bulk import and validate DPP data",
          workflow4: "Publish product passport pages and QR codes",
          workflow5: "Reserve APIs and data structures for future EU system connections",
          readinessTitle: "Preparing for future EU DPP connections",
          readinessSubtitle:
            "The practical first step is standardized, traceable, exportable and permission-aware data. greanlean is built around unique product identifiers, structured fields, evidence files, version records and public access links.",
          contactTitle: "Start your DPP readiness assessment",
          contactSubtitle:
            "Tell us your product category, export markets and current data status. We will help identify which fields your first DPP should cover.",
        };

  const stats = [
    [t.heroStat1, t.heroStat1Desc],
    [t.heroStat2, t.heroStat2Desc],
    [t.heroStat3, t.heroStat3Desc],
  ];

  const industries = [
    [t.textile, t.textileDesc],
    [t.flooring, t.flooringDesc],
    [t.metal, t.metalDesc],
  ];

  const platformItems = [
    [t.productData, t.productDataDesc],
    [t.supplyChain, t.supplyChainDesc],
    [t.evidence, t.evidenceDesc],
    [t.passport, t.passportDesc],
  ];

  const modules = [t.module1, t.module2, t.module3, t.module4, t.module5, t.module6];
  const workflow = [t.workflow1, t.workflow2, t.workflow3, t.workflow4, t.workflow5];

  return (
    <>
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0">
            <img
              src="/images/dpp-hero.png"
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/70" />
            <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/20" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-brand-100">
                {t.badge}
              </p>

              <h1 className="mt-6 text-4xl font-black leading-[1.08] md:text-5xl lg:text-6xl">
                {t.title}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
                {t.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#contact" className="btn-primary">
                  {t.primaryCta}
                </a>

                <Link href="/p/demo-organic-cotton-tshirt" className="btn-secondary">
                  {t.secondaryCta}
                </Link>

              </div>
            </div>

            <div className="mt-14 grid max-w-5xl gap-3 md:grid-cols-3">
              {stats.map(([title, desc]) => (
                <div key={title} className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
                  <p className="font-bold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-black text-slate-950">{t.industriesTitle}</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{t.industriesSubtitle}</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {industries.map(([title, desc]) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h2 className="text-4xl font-black text-slate-950">{t.platformTitle}</h2>
                <p className="mt-4 text-lg leading-8 text-slate-600">{t.platformSubtitle}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {platformItems.map(([title, desc]) => (
                  <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <h3 className="font-black text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="dpp" className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h2 className="text-4xl font-black text-slate-950">{t.modulesTitle}</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((item, index) => (
                <div key={item} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <p className="font-semibold leading-7 text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-16 text-white lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 className="text-4xl font-black">{t.workflowTitle}</h2>
              </div>

              <div className="grid gap-3">
                {workflow.map((item, index) => (
                  <div key={item} className="flex gap-4 rounded-lg border border-white/10 bg-white/5 p-5">
                    <span className="text-sm font-black text-brand-200">{String(index + 1).padStart(2, "0")}</span>
                    <p className="leading-7 text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 lg:p-10">
              <h2 className="text-3xl font-black text-slate-950">{t.readinessTitle}</h2>
              <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">{t.readinessSubtitle}</p>
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <h2 className="text-4xl font-black text-slate-950">{t.contactTitle}</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{t.contactSubtitle}</p>
          </div>

          <LeadForm />
        </section>
      </main>
    </>
  );
}
