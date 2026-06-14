"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LeadForm } from "@/components/LeadForm";
import { PublicHeader } from "@/components/PublicHeader";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

type DemoProduct = {
  public_slug: string;
  dpp_id: string | null;
  main_image: string | null;
};

export default function Home() {
  const { locale } = useLanguage();
  const [demoProducts, setDemoProducts] = useState<Record<string, DemoProduct>>({});

  useEffect(() => {
    document.title =
      locale === "zh"
        ? "产品数字护照欧盟合规解决方案 | GREANLEAN DPP"
        : "EU Digital Product Passport Compliance Solution | GREANLEAN DPP";
  }, [locale]);

  useEffect(() => {
    let active = true;

    async function loadDemoProducts() {
      const { data } = await createSupabaseClient()
        .from("products")
        .select("public_slug, dpp_id, main_image")
        .in("public_slug", ["demo-organic-cotton-tshirt", "demo-wireless-earbuds", "demo-wpc-flooring", "demo-office-chair"]);

      if (!active) return;

      setDemoProducts(
        Object.fromEntries((data || []).map((item) => [item.public_slug, item]))
      );
    }

    loadDemoProducts();

    return () => {
      active = false;
    };
  }, []);

  const t =
    locale === "zh"
      ? {
          badge: "面向欧盟市场的 DPP 合规数据服务",
          titleLine1: "产品数字护照 DPP",
          titleLine2: "欧盟合规解决方案",
          subtitle1: "帮助中国制造企业应对欧盟 DPP 逐步强制落地要求，提前建立产品身份、供应链证据、环境数据和证书链。",
          subtitle2: "快速生成、验证、更新产品电子护照，让欧洲买家、监管方和消费者看懂产品全生命周期。",
          primaryCta: "立即查看 Demo DPP",
          secondaryCta: "了解 2027 年要求",
          metric1: "适配品类",
          metric1Value: "多行业",
          metric1Desc: "纺织、家具、地板、消费电子",
          metric2: "DPP 模块",
          metric2Value: "13 项",
          metric2Desc: "身份、材料、追溯、ESG、证据链等",
          metric3: "交付形式",
          metric3Value: "中英双语",
          metric3Desc: "网页护照、二维码、PDF / JSON 导出",
          metric4: "当前阶段",
          metric4Value: "Demo",
          metric4Desc: "可按真实产品资料定制试点",
          showroomTitle: "DPP 用例展厅",
          showroomSubtitle: "不是概念介绍，而是可以直接扫码、查看、下载的产品护照示例。",
          case1: "有机棉 T 恤",
          case1Desc: "展示材料来源、GTIN/SGTIN、证书、REACH/RSL、碳足迹和 End of Life 指南。",
          case2: "无线蓝牙耳机",
          case2Desc: "展示 CE、RoHS、REACH、WEEE、电池 MSDS、性能指标和电子废弃物回收路径。",
          case3: "WPC PLANK",
          case3Desc: "展示 MS140K25B 户外 decking 板材的材料配方、VOC/REACH/FSC/ISO9001 证据、供应链追溯和机械回收路径。",
          case4: "可拆解办公椅",
          case4Desc: "展示家具材料组成、耐久性、可维修性、可拆解设计、再生成分和回收路径。",
          viewPassport: "查看完整 DPP 护照",
          comingSoon: "样例准备中",
          comparisonTitle: "从静态资料到可验证 DPP 数据底座",
          comparisonSubtitle: "ESPR 下的数字产品护照不是宣传页，而是把产品身份、合规证据、可持续信息和循环利用说明组织成可读取、可更新、可核验的数据结构。",
          traditional: "传统资料管理",
          dppBrand: "greanlean DPP 数据底座",
          compare1: "产品资料分散在 Excel、PDF、邮件和网盘中",
          compare2: "证书、检测报告与具体 SKU / 批次没有稳定关联",
          compare3: "材料来源、关注物质、维修回收信息难以持续更新",
          compare4: "买家、监管方和消费者看到的信息版本不一致",
          compare5: "用 DPP ID、GTIN / SGTIN、批次和二维码建立唯一身份",
          compare6: "证书、DoC、检测报告、MSDS 与产品页面形成证据链",
          compare7: "按材料、供应链、ESG、循环性和消费者说明分模块披露",
          compare8: "同一数据可输出网页、二维码、PDF / JSON，并为未来系统对接预留",
          guideTitle: "2027 年前，企业应该先准备什么",
          guideTitleLine1: "2027 年前，",
          guideTitleLine2: "企业应该先准备什么",
          guideSubtitle: "欧盟 DPP 要求会按产品组逐步细化。现在最重要的是把产品数据从文件夹变成可更新、可验证、可对接的结构化资产。",
          guide1: "梳理产品身份",
          guide1Desc: "SKU、GTIN、批次、序列号、图片和公开链接。",
          guide2: "整理材料与产品结构",
          guide2Desc: "BOM、材料占比、辅料、包装、来源国家和供应商信息。",
          guide3: "补齐供应链与证据链",
          guide3Desc: "生产、运输、证书、检测报告、符合性声明、供应商声明和有效期。",
          guide4: "生成公开 DPP",
          guide4Desc: "中英文页面、二维码、PDF/JSON 下载和后续更新机制。",
          serviceTitle: "DPP 落地流程",
          serviceSubtitle: "greanlean 将企业现有产品文件整理成符合 DPP 逻辑的数据包，再发布为可扫码访问、可审查、可维护的数字产品护照。",
          serviceStep1: "资料收集",
          serviceStep1Desc: "汇总产品规格、BOM、材料来源、供应商声明、证书、检测报告和物流信息。",
          serviceStep2: "字段映射",
          serviceStep2Desc: "按 ESPR/DPP 常见信息要求整理为身份、材料、关注物质、性能、ESG、证据和循环性模块。",
          serviceStep3: "证据校验",
          serviceStep3Desc: "检查证书有效期、报告编号、声明主体、SKU/批次关联和缺失字段。",
          serviceStep4: "发布维护",
          serviceStep4Desc: "生成中英 DPP 页面、二维码和 PDF/JSON，并支持后续证书或批次数据更新。",
          contactTitle: "开始 DPP 准备度评估",
          contactSubtitle: "告诉我们你的产品类别、目标市场和现有资料情况，我们会帮你判断第一阶段应该先补哪些数据。",
          contactPanelTitle: "建议提前准备的资料",
          contactPanelDesc: "提交前可先整理产品照片、SKU 清单、BOM、材料来源、供应商信息、证书和检测报告。资料越完整，DPP 结构化速度越快。",
          contactPanelItem1: "产品身份与图片",
          contactPanelItem2: "材料、组件、包装和辅料",
          contactPanelItem3: "供应商、生产和运输记录",
          contactPanelItem4: "证书、检测报告和声明文件",
          footerTagline: "欧盟 DPP 与 ESPR 合规数据服务，帮助出口企业把产品资料整理成可展示、可审核、可维护的数字产品护照。",
          footerDemo: "DPP 示例",
          footerSolutions: "解决方案",
          footerContact: "联系我们",
          footerDashboard: "DPP 后台",
          footerCopyright: "© 2026 greanlean. 保留所有权利。",
        }
      : {
          badge: "DPP compliance data service for the EU market",
          titleLine1: "EU compliance solutions",
          titleLine2: "for Digital Product Passports",
          subtitle1: "Help Chinese manufacturers prepare for phased EU DPP requirements by structuring product identity, supply-chain evidence, environmental data and certificate chains.",
          subtitle2: "Generate, verify and update electronic product passports so European buyers, regulators and consumers can understand the full product lifecycle.",
          primaryCta: "View Demo DPP now",
          secondaryCta: "Learn 2027 requirements",
          metric1: "Product scope",
          metric1Value: "Multi-sector",
          metric1Desc: "textiles, furniture, flooring and electronics",
          metric2: "DPP modules",
          metric2Value: "13",
          metric2Desc: "identity, materials, traceability, ESG and evidence",
          metric3: "Delivery format",
          metric3Value: "EN / ZH",
          metric3Desc: "web passport, QR code, PDF / JSON export",
          metric4: "Current stage",
          metric4Value: "Demo",
          metric4Desc: "pilot setup based on real product files",
          showroomTitle: "DPP use-case showroom",
          showroomSubtitle: "Not a concept page, but product passport examples that can be scanned, reviewed and downloaded.",
          case1: "Organic cotton T-shirt",
          case1Desc: "Shows material origin, GTIN/SGTIN, certificates, REACH/RSL, carbon footprint and End of Life guidance.",
          case2: "Wireless Bluetooth earbuds",
          case2Desc: "Shows CE, RoHS, REACH, WEEE, battery MSDS, performance indicators and e-waste recovery paths.",
          case3: "WPC PLANK",
          case3Desc: "Shows MS140K25B outdoor decking formula, VOC/REACH/FSC/ISO9001 evidence, traceability and mechanical-recycling path.",
          case4: "Disassemblable office chair",
          case4Desc: "Shows furniture materials, durability, repairability, disassembly design, recycled content and recovery paths.",
          viewPassport: "View full DPP passport",
          comingSoon: "Sample in preparation",
          comparisonTitle: "From static files to a verifiable DPP data layer",
          comparisonSubtitle: "Under ESPR, a Digital Product Passport is not a campaign page. It structures product identity, compliance evidence, sustainability data and circularity guidance into information that can be read, updated and verified.",
          traditional: "Traditional file management",
          dppBrand: "greanlean DPP data layer",
          compare1: "Product files are split across spreadsheets, PDFs, emails and folders",
          compare2: "Certificates and test reports are not reliably tied to SKU or batch",
          compare3: "Material origin, substances of concern and end-of-life data are hard to maintain",
          compare4: "Buyers, regulators and consumers may see different versions of product information",
          compare5: "DPP ID, GTIN / SGTIN, batch and QR code create a stable product identity",
          compare6: "Certificates, DoC, test reports and MSDS become a linked evidence chain",
          compare7: "Materials, supply chain, ESG, circularity and consumer notes are disclosed by module",
          compare8: "The same data can power web pages, QR codes, PDF / JSON and future system integration",
          guideTitle: "What to prepare before 2027",
          guideTitleLine1: "Before 2027,",
          guideTitleLine2: "what should companies prepare?",
          guideSubtitle: "EU DPP requirements will be specified by product group. The priority is to turn product files into structured assets that can be updated, verified and connected.",
          guide1: "Map product identity",
          guide1Desc: "SKU, GTIN, batch, serial number, image and public link.",
          guide2: "Structure materials and product data",
          guide2Desc: "BOM, material share, trims, packaging, origin country and supplier information.",
          guide3: "Complete supply-chain and evidence chain",
          guide3Desc: "Production, transport, certificates, test reports, declaration of conformity, supplier declarations and validity.",
          guide4: "Publish public DPP",
          guide4Desc: "Bilingual page, QR code, PDF/JSON download and update mechanism.",
          serviceTitle: "DPP implementation workflow",
          serviceSubtitle: "greanlean turns existing product documentation into a DPP-ready data package, then publishes a scannable, reviewable and maintainable Digital Product Passport.",
          serviceStep1: "Collect files",
          serviceStep1Desc: "Gather product specs, BOM, material origin, supplier declarations, certificates, test reports and logistics data.",
          serviceStep2: "Map fields",
          serviceStep2Desc: "Structure the data into identity, materials, substances of concern, performance, ESG, evidence and circularity modules.",
          serviceStep3: "Check evidence",
          serviceStep3Desc: "Review certificate validity, report numbers, responsible parties, SKU/batch links and missing fields.",
          serviceStep4: "Publish and maintain",
          serviceStep4Desc: "Generate bilingual DPP pages, QR codes and PDF/JSON exports, with updates for future certificates and batches.",
          contactTitle: "Start your DPP readiness assessment",
          contactSubtitle: "Tell us your product category, target markets and current documentation. We will identify which data to prepare first.",
          contactPanelTitle: "Files worth preparing first",
          contactPanelDesc: "Before submitting, gather product images, SKU lists, BOM, material origins, supplier information, certificates and test reports. More complete files shorten DPP structuring time.",
          contactPanelItem1: "Product identity and images",
          contactPanelItem2: "Materials, components, packaging and trims",
          contactPanelItem3: "Suppliers, production and transport records",
          contactPanelItem4: "Certificates, test reports and declarations",
          footerTagline: "EU DPP and ESPR compliance data service for turning product documentation into presentable, reviewable and maintainable Digital Product Passports.",
          footerDemo: "DPP demo",
          footerSolutions: "Solutions",
          footerContact: "Contact",
          footerDashboard: "DPP login",
          footerCopyright: "© 2026 greanlean. All rights reserved.",
        };

  const metrics = [
    [t.metric1, t.metric1Value, t.metric1Desc],
    [t.metric2, t.metric2Value, t.metric2Desc],
    [t.metric3, t.metric3Value, t.metric3Desc],
    [t.metric4, t.metric4Value, t.metric4Desc],
  ];

  const cases = useMemo(
    () => [
      {
        title: t.case1,
        desc: t.case1Desc,
        image: demoProducts["demo-organic-cotton-tshirt"]?.main_image || "/images/demo-organic-cotton-tshirt.png",
        href: `/p/${encodeURIComponent(demoProducts["demo-organic-cotton-tshirt"]?.dpp_id || "DPP-DEMO-001")}?lang=zh`,
        ready: true,
      },
      {
        title: t.case2,
        desc: t.case2Desc,
        image:
          demoProducts["demo-wireless-earbuds"]?.main_image && !demoProducts["demo-wireless-earbuds"]?.main_image?.endsWith(".svg")
            ? demoProducts["demo-wireless-earbuds"]?.main_image
            : "/images/demo-wireless-earbuds.png",
        href: `/p/${encodeURIComponent(demoProducts["demo-wireless-earbuds"]?.dpp_id || "DPP-AUDIO-DEMO-001")}?lang=zh`,
        ready: true,
      },
      {
        title: t.case3,
        desc: t.case3Desc,
        image: demoProducts["demo-wpc-flooring"]?.main_image || "/images/demo-wpc-flooring.svg",
        href: `/p/${encodeURIComponent(demoProducts["demo-wpc-flooring"]?.dpp_id || "DPP-WPC-MS140K25B")}?lang=zh`,
        ready: true,
      },
      {
        title: t.case4,
        desc: t.case4Desc,
        image: demoProducts["demo-office-chair"]?.main_image || "/images/demo-office-chair.svg",
        href: `/p/${encodeURIComponent(demoProducts["demo-office-chair"]?.dpp_id || "DPP-FURN-DEMO-001")}?lang=zh`,
        ready: true,
      },
    ],
    [demoProducts, t.case1, t.case1Desc, t.case2, t.case2Desc, t.case3, t.case3Desc, t.case4, t.case4Desc]
  );

  const guide = [
    [t.guide1, t.guide1Desc],
    [t.guide2, t.guide2Desc],
    [t.guide3, t.guide3Desc],
    [t.guide4, t.guide4Desc],
  ];
  const serviceSteps = [
    [t.serviceStep1, t.serviceStep1Desc],
    [t.serviceStep2, t.serviceStep2Desc],
    [t.serviceStep3, t.serviceStep3Desc],
    [t.serviceStep4, t.serviceStep4Desc],
  ];

  return (
    <>
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0">
            <img src="/images/dpp-hero.png" alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/76" />
            <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-950/30" />
            <div className="absolute inset-0 dpp-grid opacity-20" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-24">
            <div className="max-w-5xl dpp-fade">
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-brand-100 backdrop-blur">
                {t.badge}
              </p>

              <h1 className="mt-6 max-w-[980px] text-4xl font-black leading-[1.08] md:text-5xl lg:text-[4.5rem]">
                <span className="block">{t.titleLine1}</span>
                <span className="block">{t.titleLine2}</span>
              </h1>

              <div className="mt-6 max-w-[1120px] space-y-3 text-lg leading-9 text-slate-200">
                <p>{t.subtitle1}</p>
                <p>{t.subtitle2}</p>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/p/DPP-DEMO-001?lang=zh" className="btn-primary">
                  {t.primaryCta}
                </Link>

                <a href="#guide" className="btn-secondary">
                  {t.secondaryCta}
                </a>
              </div>
            </div>

            <div className="mt-12 grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map(([label, value, desc]) => (
                <div key={label} className="dpp-fade rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">
                  <p className="text-sm font-bold text-brand-100">{label}</p>
                  <p className="mt-2 text-3xl font-black">{value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="showroom" className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-4xl">
              <h2 className="text-4xl font-black text-slate-950">{t.showroomTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">{t.showroomSubtitle}</p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {cases.map((item) => (
                <article key={item.title} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-md">
                  <img src={item.image} alt={item.title} className="h-44 w-full object-cover" />
                  <div className="p-5">
                    <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
                    <p className="mt-3 min-h-24 text-sm leading-6 text-slate-600">{item.desc}</p>
                    {item.ready ? (
                      <Link href={item.href} className="btn-primary mt-5 w-full">
                        {t.viewPassport}
                      </Link>
                    ) : (
                      <span className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                        {t.comingSoon}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-4xl">
              <h2 className="text-4xl font-black text-slate-950">{t.comparisonTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">{t.comparisonSubtitle}</p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <ComparisonCard title={t.traditional} tone="muted" items={[t.compare1, t.compare2, t.compare3, t.compare4]} />
              <ComparisonCard title={t.dppBrand} tone="brand" items={[t.compare5, t.compare6, t.compare7, t.compare8]} />
            </div>
          </div>
        </section>

        <section id="guide" className="bg-slate-950 py-16 text-white lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 className="text-4xl font-black">
                  <span className="block">{t.guideTitleLine1}</span>
                  <span className="block">{t.guideTitleLine2}</span>
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-300">{t.guideSubtitle}</p>
              </div>

              <div className="grid gap-3">
                {guide.map(([title, desc], index) => (
                  <div key={title} className="flex gap-4 rounded-lg border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500 text-sm font-black text-slate-950">{index + 1}</span>
                    <div>
                      <h3 className="font-black">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="solutions" className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-8 lg:p-10">
              <h2 className="text-3xl font-black text-slate-950">{t.serviceTitle}</h2>
              <p className="mt-4 whitespace-nowrap text-lg leading-8 text-slate-600 max-xl:whitespace-normal">{t.serviceSubtitle}</p>
            </div>
            <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
              {serviceSteps.map(([title, desc], index) => (
                <div key={title} className="border-b border-slate-200 p-6 last:border-b-0 md:border-r md:even:border-r-0 xl:border-b-0 xl:even:border-r xl:last:border-r-0">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <h2 className="text-4xl font-black text-slate-950">{t.contactTitle}</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{t.contactSubtitle}</p>
            <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
                <div className="relative min-h-56 overflow-hidden bg-slate-950">
                  <img src="/images/dpp-hero.png" alt="" className="h-full w-full object-cover opacity-75" />
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 to-emerald-950/30" />
                  <div className="absolute bottom-5 left-5 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur">
                    DPP readiness
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black text-slate-950">{t.contactPanelTitle}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{t.contactPanelDesc}</p>
                  <div className="mt-5 grid gap-2">
                    {[t.contactPanelItem1, t.contactPanelItem2, t.contactPanelItem3, t.contactPanelItem4].map((item) => (
                      <div key={item} className="flex gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <LeadForm />
        </section>
      </main>

      <HomeFooter t={t} locale={locale} />
    </>
  );
}

function HomeFooter({ t, locale }: { t: any; locale: "zh" | "en" }) {
  const links = [
    [t.footerDemo, `/p/DPP-DEMO-001?lang=${locale}`],
    [t.footerSolutions, `/?lang=${locale}#solutions`],
    [t.footerContact, `/?lang=${locale}#contact`],
    [t.footerDashboard, `/login?lang=${locale}`],
  ];

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandLogo href={`/?lang=${locale}`} size="md" />
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{t.footerTagline}</p>
          </div>

          <nav className="flex flex-wrap gap-3" aria-label="Footer navigation">
            {links.map(([label, href]) => (
              <Link key={label} href={href} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-brand-700">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm font-semibold text-slate-500">
          <span>{t.footerCopyright}</span>
          <span>greanlean.com</span>
        </div>
      </div>
    </footer>
  );
}

function ComparisonCard({ title, items, tone }: { title: string; items: string[]; tone: "muted" | "brand" }) {
  return (
    <article className={tone === "brand" ? "rounded-lg border border-brand-200 bg-brand-50 p-6 shadow-sm" : "rounded-lg border border-slate-200 bg-white p-6 shadow-sm"}>
      <h3 className="text-2xl font-black text-slate-950">{title}</h3>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg bg-white/80 p-4">
            <span className={tone === "brand" ? "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" : "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400"} />
            <p className="text-sm font-semibold leading-6 text-slate-700">{item}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
