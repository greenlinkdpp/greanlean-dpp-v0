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
          badge: "欧盟 DPP 与 ESPR 合规数据服务",
          title: "把产品合规数据整理成可验证的数字产品护照。",
          subtitle:
            "欧盟可持续产品生态设计法规（ESPR）正在推动产品信息从静态文件走向数字化披露。greanlean 帮助出口企业建立产品身份、供应链证据、可持续信息和公开 DPP 页面，为后续客户审核、法规要求和系统对接提前准备。",
          primaryCta: "预约 DPP 评估",
          secondaryCta: "查看演示护照",
          stat1: "政策导向",
          stat1Desc: "围绕 ESPR、产品组规则和未来 DPP 要求提前整理数据。",
          stat2: "证据链",
          stat2Desc: "把产品、供应商、证书、追溯和环境数据连成可核验记录。",
          stat3: "公开展示",
          stat3Desc: "用二维码页面向买家、品牌方和消费者披露关键信息。",
          policyTitle: "DPP 不只是一个页面，而是欧盟产品合规的数据基础",
          policySubtitle:
            "法规要求会按产品类别逐步细化。企业现在最需要做的，是把散落在表格、证书、检测报告和供应链沟通里的信息，整理成可追溯、可更新、可对接的结构化数据。",
          policy1: "ESPR 框架",
          policy1Desc: "为产品耐用性、可维修性、资源效率、再生成分、碳和环境表现等信息建立数字披露基础。",
          policy2: "产品组规则",
          policy2Desc: "不同产品类别会有不同字段和证据要求，系统需要支持后续扩展，而不是一次性写死模板。",
          policy3: "供应链责任",
          policy3Desc: "客户和监管方会越来越关注材料来源、生产过程、运输路径、证书有效性和数据可信度。",
          serviceTitle: "greanlean 帮你从合规要求落到可执行数据",
          serviceSubtitle:
            "我们把 DPP 拆成企业真正能执行的工作流：先梳理字段，再收集证据，最后生成可展示、可追溯、可维护的产品护照。",
          identity: "产品身份与版本管理",
          identityDesc: "建立 SKU、批次、DPP ID、图片、公开链接和版本记录，避免后续数据无法对应产品。",
          evidence: "证书与证据文件",
          evidenceDesc: "管理证书、检测报告、LCA 摘要、供应商声明和验证状态，保留客户审核依据。",
          traceability: "供应链追溯记录",
          traceabilityDesc: "记录原料、生产、仓储和运输事件，形成可展示的产品生命周期线索。",
          sustainability: "可持续与循环信息",
          sustainabilityDesc: "沉淀碳、水、能源、废弃物、可维修性、可回收性和回收计划等信息。",
          passport: "公开 DPP 页面",
          passportDesc: "生成适合扫码查看的产品页面，用中英文展示买家和消费者关心的信息。",
          readiness: "未来系统对接准备",
          readinessDesc: "围绕结构化字段、权限、审计、导出和 API 预留数据基础，降低后续法规变化成本。",
          workflowTitle: "落地路径",
          workflow1: "判断产品进入欧盟市场时可能受到哪些 DPP / ESPR 信息要求影响",
          workflow2: "盘点现有产品资料、证书、检测报告和供应链数据缺口",
          workflow3: "建立产品数据模型和证据文件目录",
          workflow4: "生成公开 DPP 页面、二维码和客户可查看链接",
          workflow5: "持续维护版本、证书有效期和后续法规字段扩展",
          trustTitle: "为什么现在就要准备",
          trustSubtitle:
            "DPP 的难点不在页面设计，而在数据可信度。越早建立产品级数据结构，越容易响应品牌客户问卷、供应链审核、欧盟规则变化和未来平台对接。",
          contactTitle: "开始 DPP 准备度评估",
          contactSubtitle:
            "告诉我们你的产品类别、目标市场和现有资料情况，我们会帮你判断第一阶段应该先补哪些数据。",
        }
      : {
          badge: "EU DPP and ESPR compliance data service",
          title: "Turn product compliance data into verifiable digital product passports.",
          subtitle:
            "The EU Ecodesign for Sustainable Products Regulation is moving product information from static files toward digital disclosure. greanlean helps exporters build product identity, supply-chain evidence, sustainability data and public DPP pages for buyer audits, regulatory requirements and future system connections.",
          primaryCta: "Book DPP assessment",
          secondaryCta: "View demo passport",
          stat1: "Policy-driven",
          stat1Desc: "Prepare data around ESPR, product-group rules and future DPP requirements.",
          stat2: "Evidence chain",
          stat2Desc: "Connect product, supplier, certificate, traceability and environmental data into verifiable records.",
          stat3: "Public disclosure",
          stat3Desc: "Use QR-accessible pages for buyers, brands and consumers.",
          policyTitle: "DPP is not just a page. It is the data foundation for EU product compliance.",
          policySubtitle:
            "Requirements will be specified by product group over time. Companies need to turn scattered spreadsheets, certificates, test reports and supplier communication into structured data that can be traced, updated and connected.",
          policy1: "ESPR framework",
          policy1Desc: "Build the data foundation for durability, repairability, resource efficiency, recycled content, carbon and environmental performance disclosures.",
          policy2: "Product-group rules",
          policy2Desc: "Different product categories will need different fields and evidence, so the system must be extensible rather than fixed to one template.",
          policy3: "Supply-chain responsibility",
          policy3Desc: "Buyers and regulators increasingly care about material origin, production process, logistics path, certificate validity and data credibility.",
          serviceTitle: "greanlean turns compliance requirements into executable product data",
          serviceSubtitle:
            "We translate DPP preparation into a practical workflow: map fields, collect evidence, then publish product passports that are visible, traceable and maintainable.",
          identity: "Product identity and versioning",
          identityDesc: "Manage SKU, batch, DPP ID, images, public links and version records so data always maps back to the right product.",
          evidence: "Certificates and evidence files",
          evidenceDesc: "Manage certificates, test reports, LCA summaries, supplier declarations and verification status for buyer audits.",
          traceability: "Supply-chain traceability",
          traceabilityDesc: "Record sourcing, manufacturing, warehousing and logistics events as a visible product lifecycle trail.",
          sustainability: "Sustainability and circularity",
          sustainabilityDesc: "Collect carbon, water, energy, waste, repairability, recyclability and take-back information.",
          passport: "Public DPP page",
          passportDesc: "Generate QR-friendly product pages with bilingual information for buyers and consumers.",
          readiness: "Future system readiness",
          readinessDesc: "Reserve the data foundation for structured fields, permissions, audit, export and APIs to reduce future regulatory change cost.",
          workflowTitle: "Implementation Path",
          workflow1: "Assess which DPP / ESPR information requirements may affect your EU market products",
          workflow2: "Review existing product files, certificates, test reports and supply-chain data gaps",
          workflow3: "Create the product data model and evidence file structure",
          workflow4: "Publish the DPP page, QR code and customer-facing link",
          workflow5: "Maintain versions, certificate validity and future regulatory field extensions",
          trustTitle: "Why prepare now",
          trustSubtitle:
            "The hard part of DPP is not page design. It is data credibility. The earlier product-level data is structured, the easier it is to respond to buyer questionnaires, supply-chain audits, EU rule changes and future platform connections.",
          contactTitle: "Start your DPP readiness assessment",
          contactSubtitle:
            "Tell us your product category, target markets and current documentation. We will help identify which data to prepare first.",
        };

  const stats = [
    [t.stat1, t.stat1Desc],
    [t.stat2, t.stat2Desc],
    [t.stat3, t.stat3Desc],
  ];

  const policies = [
    [t.policy1, t.policy1Desc],
    [t.policy2, t.policy2Desc],
    [t.policy3, t.policy3Desc],
  ];

  const services = [
    [t.identity, t.identityDesc],
    [t.evidence, t.evidenceDesc],
    [t.traceability, t.traceabilityDesc],
    [t.sustainability, t.sustainabilityDesc],
    [t.passport, t.passportDesc],
    [t.readiness, t.readinessDesc],
  ];

  const workflow = [t.workflow1, t.workflow2, t.workflow3, t.workflow4, t.workflow5];

  return (
    <>
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0">
            <img src="/images/dpp-hero.png" alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/72" />
            <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-slate-950 via-slate-950/86 to-slate-950/28" />
            <div className="absolute inset-0 dpp-grid opacity-20" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="max-w-4xl dpp-fade">
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-brand-100 backdrop-blur">
                {t.badge}
              </p>

              <h1 className="mt-6 text-4xl font-black leading-[1.08] md:text-5xl lg:text-6xl">
                {t.title}
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
                {t.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#contact" className="btn-primary">
                  {t.primaryCta}
                </a>

                <Link href="/p/demo-organic-cotton-tshirt?lang=zh" className="btn-secondary">
                  {t.secondaryCta}
                </Link>
              </div>
            </div>

            <div className="mt-14 grid max-w-6xl gap-3 md:grid-cols-3">
              {stats.map(([title, desc]) => (
                <div key={title} className="dpp-fade rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">
                  <p className="font-bold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-4xl">
              <h2 className="text-4xl font-black text-slate-950">{t.policyTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">{t.policySubtitle}</p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {policies.map(([title, desc]) => (
                <article key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-md">
                  <h3 className="text-xl font-black text-slate-950">{title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="dpp" className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h2 className="text-4xl font-black text-slate-950">{t.serviceTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">{t.serviceSubtitle}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {services.map(([title, desc]) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-md">
                  <h3 className="font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-16 text-white lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <h2 className="text-4xl font-black">{t.workflowTitle}</h2>
              </div>

              <div className="grid gap-3">
                {workflow.map((item, index) => (
                  <div key={item} className="flex gap-4 rounded-lg border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
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
              <h2 className="text-3xl font-black text-slate-950">{t.trustTitle}</h2>
              <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">{t.trustSubtitle}</p>
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
