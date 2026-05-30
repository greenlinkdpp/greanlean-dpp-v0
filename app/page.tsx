"use client";

import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { LeadForm } from "@/components/LeadForm";
import { useLanguage } from "@/components/LanguageProvider";

export default function Home() {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          badge: "数字产品护照平台",
          title: "为全球产品构建合规、透明的 DPP。",
          subtitle:
            "GreenLean 帮助品牌管理产品身份、供应商、材料、ESG 数据、证书和面向消费者的产品护照页面。",
          cta: "获取免费评估",
          demo: "查看 DPP 示例",
          snapshot: "DPP 快照",
          demoProduct: "有机棉 T 恤",
          item1: "数字身份",
          item2: "BOM 与材料",
          item3: "供应链追踪",
          item4: "ESG 指标",
          item5: "证书",
          item6: "二维码 / NFC 产品护照",
          solutionsTitle1: "产品数据中心",
          solutionsDesc1: "管理 SKU、品牌、身份和产品护照数据。",
          solutionsTitle2: "供应链透明度",
          solutionsDesc2: "连接供应商、材料、原产地和认证信息。",
          solutionsTitle3: "公开 DPP 页面",
          solutionsDesc3: "生成面向消费者的二维码页面，用于合规和品牌展示。",
          dppTitle: "你的 DPP 包含什么",
          dpp1: "GTIN / SKU / 批次",
          dpp2: "材料与再生成分",
          dpp3: "碳、水和能源数据",
          dpp4: "证书与验证",
          contactTitle: "开始你的 DPP 准备度评估。",
          contactSubtitle:
            "告诉我们你的产品类别和目标市场，我们会帮助你规划下一步。",
        }
      : {
          badge: "Digital Product Passport Platform",
          title: "Build compliant, transparent DPPs for global products.",
          subtitle:
            "GreenLean helps brands manage product identity, suppliers, materials, ESG data, certificates and consumer-facing product passports.",
          cta: "Get free assessment",
          demo: "View demo DPP",
          snapshot: "DPP Snapshot",
          demoProduct: "Organic Cotton T-Shirt",
          item1: "Digital Identity",
          item2: "BOM & Materials",
          item3: "Supplier Traceability",
          item4: "ESG Metrics",
          item5: "Certificates",
          item6: "QR/NFC Public Passport",
          solutionsTitle1: "Product Data Hub",
          solutionsDesc1:
            "Manage SKU, brand, identity and product passport data.",
          solutionsTitle2: "Supply Chain Transparency",
          solutionsDesc2:
            "Connect suppliers, materials, origins and certifications.",
          solutionsTitle3: "Public DPP Pages",
          solutionsDesc3:
            "Generate consumer-facing QR pages for compliance and storytelling.",
          dppTitle: "What your DPP includes",
          dpp1: "GTIN / SKU / Batch",
          dpp2: "Materials & recycled content",
          dpp3: "Carbon, water and energy data",
          dpp4: "Certificates and verification",
          contactTitle: "Start your DPP readiness assessment.",
          contactSubtitle:
            "Tell us about your product category and target market. We will help you map the next step.",
        };

  const snapshotItems = [
    t.item1,
    t.item2,
    t.item3,
    t.item4,
    t.item5,
    t.item6,
  ];

  const solutionItems = [
    [t.solutionsTitle1, t.solutionsDesc1],
    [t.solutionsTitle2, t.solutionsDesc2],
    [t.solutionsTitle3, t.solutionsDesc3],
  ];

  const dppItems = [t.dpp1, t.dpp2, t.dpp3, t.dpp4];

  return (
    <>
      <PublicHeader />

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <p className="mb-5 inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
              {t.badge}
            </p>

            <h1 className="text-5xl font-black tracking-tight text-slate-950 lg:text-7xl">
              {t.title}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              {t.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#contact" className="btn-primary">
                {t.cta}
              </a>

              <Link
                href="/p/demo-organic-cotton-tshirt"
                className="btn-secondary"
              >
                {t.demo}
              </Link>
            </div>
          </div>

          <div className="card bg-slate-950 text-white">
            <p className="text-sm text-brand-50">{t.snapshot}</p>

            <h2 className="mt-3 text-3xl font-bold">{t.demoProduct}</h2>

            <div className="mt-8 grid gap-3">
              {snapshotItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {solutionItems.map(([title, desc]) => (
              <div className="card" key={title}>
                <h3 className="text-xl font-bold">{title}</h3>

                <p className="mt-3 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="dpp" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="text-4xl font-black">{t.dppTitle}</h2>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dppItems.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-slate-200 p-6 font-semibold"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2"
        >
          <div>
            <h2 className="text-4xl font-black">{t.contactTitle}</h2>

            <p className="mt-4 text-slate-600">{t.contactSubtitle}</p>
          </div>

          <LeadForm />
        </section>
      </main>
    </>
  );
}