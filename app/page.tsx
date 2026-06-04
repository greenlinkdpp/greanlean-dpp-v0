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
          badge: "面向欧盟市场的 DPP 合规数据服务",
          title: "产品数字护照的欧盟合规解决方案",
          subtitle1: "帮助中国制造企业应对欧盟 DPP 逐步强制落地要求，提前建立产品身份、供应链证据、环境数据和证书链。",
          subtitle2: "快速生成、验证、更新产品电子护照，让欧洲买家、监管方和消费者看懂产品全生命周期。",
          primaryCta: "立即查看 Demo DPP",
          secondaryCta: "了解 2027 年要求",
          metric1: "试点服务",
          metric1Value: "8+",
          metric1Desc: "纺织企业与出口样品",
          metric2: "覆盖商品",
          metric2Value: "$120M+",
          metric2Desc: "欧盟市场商品数据模型",
          metric3: "字段校验",
          metric3Value: "99.8%",
          metric3Desc: "DPP 结构化字段通过率",
          metric4: "上线周期",
          metric4Value: "7 天",
          metric4Desc: "平均生成可扫码护照",
          showroomTitle: "DPP 用例展厅",
          showroomSubtitle: "不是概念介绍，而是可以直接扫码、查看、下载的产品护照示例。",
          case1: "有机棉 T 恤",
          case1Desc: "展示材料来源、GTIN/SGTIN、证书、REACH/RSL、碳足迹和 End of Life 指南。",
          case2: "纯棉衬衫",
          case2Desc: "适合品牌订单、面料批次和成衣证据链管理。",
          case3: "牛仔裤",
          case3Desc: "展示高水耗品类的水、染整、化学品和耐用性数据。",
          case4: "面料卷",
          case4Desc: "适合上游面料供应商向成衣客户提供可追溯材料数据。",
          viewPassport: "查看完整 DPP 护照",
          comingSoon: "样例准备中",
          comparisonTitle: "产品透明度对比",
          comparisonSubtitle: "传统品牌展示的是营销信息，DPP 品牌展示的是可验证数据。",
          traditional: "传统品牌",
          dppBrand: "greanlean DPP 品牌",
          compare1: "只展示成分与洗标",
          compare2: "证书散落在邮件和网盘",
          compare3: "供应链路径不可见",
          compare4: "消费者不知道如何维修/回收",
          compare5: "产品身份、批次和二维码绑定",
          compare6: "证书、检测报告和声明可下载",
          compare7: "原料、制造、运输时间线可展开",
          compare8: "End of Life 回收与再使用方案清晰",
          guideTitle: "2027 年前，企业应该先准备什么",
          guideSubtitle: "欧盟 DPP 要求会按产品组逐步细化。现在最重要的是把产品数据从文件夹变成可更新、可验证、可对接的结构化资产。",
          guide1: "梳理产品身份",
          guide1Desc: "SKU、GTIN、批次、序列号、图片和公开链接。",
          guide2: "补齐证据链",
          guide2Desc: "证书、检测报告、符合性声明、供应商声明和有效期。",
          guide3: "整理可持续数据",
          guide3Desc: "碳、水、能源、废弃物、耐用性、可维修性和可回收性。",
          guide4: "生成公开 DPP",
          guide4Desc: "中英文页面、二维码、PDF/JSON 下载和后续更新机制。",
          serviceTitle: "从资料整理到 DPP 页面上线",
          serviceSubtitle: "greanlean 帮你把分散的产品资料转成可展示、可审核、可持续维护的数字产品护照。",
          contactTitle: "开始 DPP 准备度评估",
          contactSubtitle: "告诉我们你的产品类别、目标市场和现有资料情况，我们会帮你判断第一阶段应该先补哪些数据。",
        }
      : {
          badge: "DPP compliance data service for the EU market",
          title: "EU compliance solutions for Digital Product Passports",
          subtitle1: "Help Chinese manufacturers prepare for phased EU DPP requirements by structuring product identity, supply-chain evidence, environmental data and certificate chains.",
          subtitle2: "Generate, verify and update electronic product passports so European buyers, regulators and consumers can understand the full product lifecycle.",
          primaryCta: "View Demo DPP now",
          secondaryCta: "Learn 2027 requirements",
          metric1: "Pilot service",
          metric1Value: "8+",
          metric1Desc: "textile exporters and samples",
          metric2: "Goods covered",
          metric2Value: "$120M+",
          metric2Desc: "EU-market data models",
          metric3: "Field checks",
          metric3Value: "99.8%",
          metric3Desc: "structured DPP field pass rate",
          metric4: "Launch time",
          metric4Value: "7 days",
          metric4Desc: "average QR passport setup",
          showroomTitle: "DPP use-case showroom",
          showroomSubtitle: "Not a concept page, but product passport examples that can be scanned, reviewed and downloaded.",
          case1: "Organic cotton T-shirt",
          case1Desc: "Shows material origin, GTIN/SGTIN, certificates, REACH/RSL, carbon footprint and End of Life guidance.",
          case2: "Pure cotton shirt",
          case2Desc: "Useful for brand orders, fabric batches and garment evidence-chain management.",
          case3: "Denim jeans",
          case3Desc: "Designed for water, dyeing, chemical and durability disclosures in high-impact categories.",
          case4: "Fabric roll",
          case4Desc: "Helps upstream fabric suppliers provide traceable material data to garment customers.",
          viewPassport: "View full DPP passport",
          comingSoon: "Sample in preparation",
          comparisonTitle: "Product transparency comparison",
          comparisonSubtitle: "Traditional brands show marketing information. DPP brands show verifiable product data.",
          traditional: "Traditional brand",
          dppBrand: "greanlean DPP brand",
          compare1: "Only composition and care label",
          compare2: "Certificates scattered in emails and folders",
          compare3: "Supply-chain path is invisible",
          compare4: "Consumers do not know how to repair or recycle",
          compare5: "Product identity, batch and QR code connected",
          compare6: "Certificates, test reports and declarations downloadable",
          compare7: "Material, manufacturing and logistics timeline expandable",
          compare8: "End of Life reuse and recycling plan is clear",
          guideTitle: "What to prepare before 2027",
          guideSubtitle: "EU DPP requirements will be specified by product group. The priority is to turn product files into structured assets that can be updated, verified and connected.",
          guide1: "Map product identity",
          guide1Desc: "SKU, GTIN, batch, serial number, image and public link.",
          guide2: "Complete evidence chain",
          guide2Desc: "Certificates, test reports, declaration of conformity, supplier declarations and validity.",
          guide3: "Structure sustainability data",
          guide3Desc: "Carbon, water, energy, waste, durability, repairability and recyclability.",
          guide4: "Publish public DPP",
          guide4Desc: "Bilingual page, QR code, PDF/JSON download and update mechanism.",
          serviceTitle: "From product files to live DPP pages",
          serviceSubtitle: "greanlean turns scattered product documentation into digital product passports that are visible, auditable and maintainable.",
          contactTitle: "Start your DPP readiness assessment",
          contactSubtitle: "Tell us your product category, target markets and current documentation. We will identify which data to prepare first.",
        };

  const metrics = [
    [t.metric1, t.metric1Value, t.metric1Desc],
    [t.metric2, t.metric2Value, t.metric2Desc],
    [t.metric3, t.metric3Value, t.metric3Desc],
    [t.metric4, t.metric4Value, t.metric4Desc],
  ];

  const cases = [
    {
      title: t.case1,
      desc: t.case1Desc,
      image: "/images/demo-organic-cotton-tshirt.png",
      href: "/p/demo-organic-cotton-tshirt?lang=zh",
      ready: true,
    },
    {
      title: t.case2,
      desc: t.case2Desc,
      image: "/images/demo-organic-cotton-tshirt.png",
      href: "#showroom",
      ready: false,
    },
    {
      title: t.case3,
      desc: t.case3Desc,
      image: "/images/dpp-hero.png",
      href: "#showroom",
      ready: false,
    },
    {
      title: t.case4,
      desc: t.case4Desc,
      image: "/images/dpp-hero.png",
      href: "#showroom",
      ready: false,
    },
  ];

  const guide = [
    [t.guide1, t.guide1Desc],
    [t.guide2, t.guide2Desc],
    [t.guide3, t.guide3Desc],
    [t.guide4, t.guide4Desc],
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
            <div className="max-w-4xl dpp-fade">
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-brand-100 backdrop-blur">
                {t.badge}
              </p>

              <h1 className="mt-6 text-4xl font-black leading-[1.08] md:text-5xl lg:text-6xl">
                {t.title}
              </h1>

              <div className="mt-6 max-w-3xl space-y-3 text-lg leading-8 text-slate-200">
                <p>{t.subtitle1}</p>
                <p>{t.subtitle2}</p>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/p/demo-organic-cotton-tshirt?lang=zh" className="btn-primary">
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
                <h2 className="text-4xl font-black">{t.guideTitle}</h2>
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
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
            <h2 className="text-3xl font-black text-slate-950">{t.serviceTitle}</h2>
            <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600">{t.serviceSubtitle}</p>
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
