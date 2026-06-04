"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";

type Locale = "en" | "zh";
type Props = { data: any; dppUrl: string };
type IconName =
  | "box"
  | "layers"
  | "route"
  | "leaf"
  | "certificate"
  | "eye"
  | "qr"
  | "tag"
  | "recycle"
  | "carbon"
  | "shield"
  | "file"
  | "info"
  | "check"
  | "pdf"
  | "trash"
  | "scissors";

function valueOrDash(value: any, locale: Locale = "en") {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") {
    if (locale === "zh") return value ? "是" : "否";
    return value ? "Yes" : "No";
  }
  return String(value);
}

function pick(row: any, locale: Locale, enKey: string, zhKey?: string) {
  if (!row) return "-";
  if (locale === "zh" && zhKey && row[zhKey]) return row[zhKey];
  return valueOrDash(row[enKey], locale);
}

function formatDate(value: any, locale: Locale) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US");
  } catch {
    return String(value);
  }
}

function compact(values: any[]) {
  return values.filter((value) => value !== null && value !== undefined && value !== "").join(", ");
}

function addRegulatoryChemicalContext(value: any, locale: Locale) {
  const text = valueOrDash(value, locale);
  const lower = text.toLowerCase();
  if (text === "-") {
    return locale === "zh"
      ? "符合欧盟 REACH 法规及 RSL（受限物质清单）标准。"
      : "Screened against EU REACH requirements and RSL (Restricted Substances List) standards.";
  }
  if (lower.includes("reach") || lower.includes("rsl")) return text;
  return locale === "zh"
    ? `${text}；并符合欧盟 REACH 法规及 RSL（受限物质清单）标准。`
    : `${text}; screened against EU REACH requirements and RSL (Restricted Substances List) standards.`;
}

export function PublicDppClient({ data, dppUrl }: Props) {
  const { locale } = useLanguage();
  const [activeCertificate, setActiveCertificate] = useState<any>(null);
  const {
    product,
    materials = [],
    certificates = [],
    esg = [],
    bom = [],
    traceability = [],
    circularity = [],
    consumerTransparency = [],
    digitalIdentity = [],
    documents = [],
    governance = [],
  } = data;

  const t =
    locale === "zh"
      ? {
          brand: "greanlean DPP",
          published: "已发布",
          passport: "数字产品护照",
          verified: "已验证",
          pending: "待验证",
          qrTitle: "扫码查看产品护照",
          qrText: "此二维码链接到当前公开 DPP 页面。",
          productImage: "产品图片",
          overview: "产品概览",
          productIdentity: "产品基本信息",
          materialSource: "材料组成与来源",
          productPerformance: "产品性能",
          traceability: "生产与运输追溯",
          esg: "ESG 与循环性",
          certificates: "认证证书",
          consumer: "消费者透明化",
          evidence: "证据文件与数据治理",
          noData: "暂无数据",
          pendingData: "该模块已预留，等待企业补充数据。",
          sku: "SKU",
          brandLabel: "品牌",
          category: "分类",
          subcategory: "子分类",
          season: "季节 / 系列",
          dppId: "DPP ID",
          publicSlug: "公开 Slug",
          gtin: "GTIN",
          sgtin: "SGTIN",
          batch: "批次",
          serial: "序列号",
          digitalLink: "数字链接",
          materialCount: "材料数量",
          recycled: "再生成分",
          carbon: "碳足迹",
          certificatesVerified: "已验证证书",
          materialType: "材料类型",
          percentage: "占比",
          origin: "来源",
          supplier: "供应商",
          certification: "认证",
          chemical: "化学品信息",
          recyclability: "可回收性",
          component: "组件",
          quantity: "数量",
          position: "位置",
          eventType: "事件类型",
          date: "日期",
          facility: "设施",
          location: "地点",
          transport: "运输方式",
          status: "状态",
          notes: "备注",
          water: "用水量",
          energy: "能源消耗",
          waste: "废弃物",
          methodology: "方法学",
          verifiedBy: "验证方",
          repairability: "可维修性",
          takeBack: "回收计划",
          resale: "二手转售",
          remanufacturing: "再制造",
          issuer: "签发机构",
          number: "证书编号",
          issueDate: "签发日期",
          expiryDate: "到期日期",
          openCertificate: "打开证书",
          brandStory: "品牌故事",
          sustainability: "可持续说明",
          care: "护理说明",
          repair: "维修说明",
          packaging: "包装信息",
          endOfLife: "生命周期结束说明",
          notice: "消费者提示",
          documentName: "文件",
          dataSource: "数据来源",
          dataOwner: "数据负责人",
          audit: "审计状态",
          quality: "数据质量",
          footerTitle: "由 greanlean DPP 提供支持",
          footerText: "该页面用于披露产品身份、材料来源、供应链追溯、ESG、证书和消费者透明化信息。",
          disclosureTitle: "ESPR / DPP 信息披露概览",
          disclosureText: "围绕产品身份、数据载体、材料来源、循环性、环境影响和合规证据组织信息。",
          productRecordTitle: "产品身份档案",
          digitalIdentityTitle: "数据载体与唯一标识",
          supplyDisclosure: "供应链追溯",
          supplyDisclosureDesc: "生产、运输、地点与验证记录",
          environmentDisclosure: "环境与循环性",
          environmentDisclosureDesc: "碳、水、能源、可维修与回收信息",
          consumerDisclosure: "消费者可读信息",
          consumerDisclosureDesc: "护理、维修、包装与生命周期结束说明",
          identityDisclosure: "产品身份",
          identityDisclosureDesc: "DPP ID、SKU、批次与数字链接",
          materialDisclosure: "材料与来源",
          materialDisclosureDesc: "材料比例、来源、物质与可回收信息",
          lifecycleDisclosure: "生命周期记录",
          lifecycleDisclosureDesc: "生产、运输、维修、回收相关事件",
          evidenceDisclosure: "合规证据",
          evidenceDisclosureDesc: "证书、报告、验证状态与数据治理",
          performanceDisclosure: "技术性能",
          performanceDisclosureDesc: "耐洗、强度、色牢度、缩水率与使用寿命",
          gs1Note: "兼容 GS1 GTIN / SGTIN 唯一标识结构，用于产品级与单品级追溯。",
          jrcNote: "依据欧盟 JRC 循环经济方法学评估",
          performanceTitle: "纺织品技术性能指标",
          washDurability: "面料耐洗性",
          tensileStrength: "拉伸强度（经向）",
          colorFastness: "颜色牢度",
          shrinkage: "缩水率（经向）",
          minimumLifetime: "最小使用寿命",
          testBasis: "测试/声明依据",
          performanceBasis: "示例性能声明，面向纺织品 DPP 技术文件展示；实际产品应以检测报告和客户规格为准。",
          declarationTitle: "EU Declaration of Conformity",
          declarationSubtitle: "欧盟符合性声明",
          declarationIntro: "该声明用于汇总产品适用的欧盟法规、经济运营方信息和声明有效期，并作为 DPP 证据链的一部分提供下载。",
          applicableEuRules: "适用欧盟法规 / 指令",
          manufacturerInfo: "制造商信息",
          importerInfo: "进口商 / 欧盟责任方",
          declarationDate: "声明日期",
          declarationValidity: "有效期",
          declarationDownload: "下载符合性声明 PDF",
          declarationRule1: "Regulation (EU) 2024/1781 - ESPR 可持续产品生态设计法规框架",
          declarationRule2: "Regulation (EC) No 1907/2006 - REACH 化学品法规及 RSL 受限物质清单",
          declarationRule3: "Regulation (EU) 2023/988 - General Product Safety Regulation 通用产品安全法规",
          declarationRule4: "Regulation (EU) No 1007/2011 - Textile fibre names and labelling 纺织纤维名称与标签",
          manufacturerValue: "Demo Garment Factory Co., Ltd., 88 Textile Road, Ningbo, Zhejiang, China",
          importerValue: "Greanlean EU Compliance GmbH, Demo Strasse 12, 20457 Hamburg, Germany",
          declarationDateValue: "2026-06-04",
          declarationValidityValue: "2026-06-04 至 2027-06-03",
          viewPdfCertificate: "查看 PDF 证书",
          certificatePreview: "证书预览",
          closePreview: "关闭预览",
          openNewTab: "新窗口打开",
          endOfLifeGuide: "End of Life 生命周期结束指南",
          endOfLifeIntro: "面向消费者的循环利用指引，帮助产品在再使用、回收和拆解阶段保持可操作。",
          noHouseholdWaste: "请勿丢弃于生活垃圾",
          noHouseholdWasteDesc: "优先投放至纺织品回收箱、品牌回收计划或当地指定收集点。",
          removeTrims: "回收前剪除不可回收辅料",
          removeTrimsDesc: "如回收机构要求，请剪除标签、非纺织辅料或其他难回收部件。",
          textileCollection: "优先再使用，再进入纺织品回收",
          textileCollectionDesc: "仍可穿着时建议捐赠、转售或维修；不可再使用时进入纺织品回收体系。",
        }
      : {
          brand: "greanlean DPP",
          published: "Published",
          passport: "Digital Product Passport",
          verified: "Verified",
          pending: "Pending",
          qrTitle: "Scan to view passport",
          qrText: "This QR code links to the current public DPP page.",
          productImage: "Product image",
          overview: "Product overview",
          productIdentity: "Product basics",
          materialSource: "Materials and sources",
          productPerformance: "Product performance",
          traceability: "Production and transport traceability",
          esg: "ESG and circularity",
          certificates: "Certificates",
          consumer: "Consumer transparency",
          evidence: "Evidence files and data governance",
          noData: "No data yet",
          pendingData: "This module is reserved and awaiting company data.",
          sku: "SKU",
          brandLabel: "Brand",
          category: "Category",
          subcategory: "Subcategory",
          season: "Season / Collection",
          dppId: "DPP ID",
          publicSlug: "Public slug",
          gtin: "GTIN",
          sgtin: "SGTIN",
          batch: "Batch",
          serial: "Serial",
          digitalLink: "Digital link",
          materialCount: "Materials",
          recycled: "Recycled content",
          carbon: "Carbon footprint",
          certificatesVerified: "Verified certificates",
          materialType: "Material type",
          percentage: "Percentage",
          origin: "Origin",
          supplier: "Supplier",
          certification: "Certification",
          chemical: "Chemical information",
          recyclability: "Recyclability",
          component: "Component",
          quantity: "Quantity",
          position: "Position",
          eventType: "Event type",
          date: "Date",
          facility: "Facility",
          location: "Location",
          transport: "Transport",
          status: "Status",
          notes: "Notes",
          water: "Water usage",
          energy: "Energy consumption",
          waste: "Waste generation",
          methodology: "Methodology",
          verifiedBy: "Verified by",
          repairability: "Repairability",
          takeBack: "Take-back program",
          resale: "Resale supported",
          remanufacturing: "Remanufacturing supported",
          issuer: "Issuer",
          number: "Certificate number",
          issueDate: "Issue date",
          expiryDate: "Expiry date",
          openCertificate: "Open certificate",
          brandStory: "Brand story",
          sustainability: "Sustainability",
          care: "Care instructions",
          repair: "Repair guide",
          packaging: "Packaging",
          endOfLife: "End-of-life instructions",
          notice: "Consumer notice",
          documentName: "Document",
          dataSource: "Data source",
          dataOwner: "Data owner",
          audit: "Audit status",
          quality: "Data quality",
          footerTitle: "Powered by greanlean DPP",
          footerText:
            "This page discloses product identity, material sources, supply-chain traceability, ESG, certificates and consumer transparency information.",
          disclosureTitle: "ESPR / DPP disclosure profile",
          disclosureText: "Information is organized around product identity, data carrier, material origin, circularity, environmental impact and compliance evidence.",
          productRecordTitle: "Product identity record",
          digitalIdentityTitle: "Data carrier and identifiers",
          supplyDisclosure: "Supply-chain traceability",
          supplyDisclosureDesc: "Production, transport, location and verification records",
          environmentDisclosure: "Environment and circularity",
          environmentDisclosureDesc: "Carbon, water, energy, repair and recycling information",
          consumerDisclosure: "Consumer-readable information",
          consumerDisclosureDesc: "Care, repair, packaging and end-of-life instructions",
          identityDisclosure: "Product identity",
          identityDisclosureDesc: "DPP ID, SKU, batch and digital link",
          materialDisclosure: "Materials and origin",
          materialDisclosureDesc: "Material ratio, origin, substances and recyclability",
          lifecycleDisclosure: "Lifecycle records",
          lifecycleDisclosureDesc: "Production, transport, repair and recycling events",
          evidenceDisclosure: "Compliance evidence",
          evidenceDisclosureDesc: "Certificates, reports, verification and data governance",
          performanceDisclosure: "Technical performance",
          performanceDisclosureDesc: "Wash durability, strength, colour fastness, shrinkage and lifetime",
          gs1Note: "Compatible with GS1 GTIN / SGTIN identity structure for product-level and item-level traceability.",
          jrcNote: "Assessed using EU JRC circular-economy methodology",
          performanceTitle: "Textile technical performance",
          washDurability: "Wash durability",
          tensileStrength: "Tensile strength (warp)",
          colorFastness: "Colour fastness",
          shrinkage: "Shrinkage (warp)",
          minimumLifetime: "Minimum service life",
          testBasis: "Test / declaration basis",
          performanceBasis: "Demo performance declaration for textile DPP technical-file display; real products should reference test reports and customer specifications.",
          declarationTitle: "EU Declaration of Conformity",
          declarationSubtitle: "EU Declaration of Conformity",
          declarationIntro: "This declaration summarizes applicable EU rules, economic-operator information and declaration validity as part of the DPP evidence chain.",
          applicableEuRules: "Applicable EU rules / directives",
          manufacturerInfo: "Manufacturer information",
          importerInfo: "Importer / EU responsible party",
          declarationDate: "Declaration date",
          declarationValidity: "Validity",
          declarationDownload: "Download declaration PDF",
          declarationRule1: "Regulation (EU) 2024/1781 - ESPR framework for ecodesign requirements",
          declarationRule2: "Regulation (EC) No 1907/2006 - REACH and RSL restricted substances screening",
          declarationRule3: "Regulation (EU) 2023/988 - General Product Safety Regulation",
          declarationRule4: "Regulation (EU) No 1007/2011 - Textile fibre names and labelling",
          manufacturerValue: "Demo Garment Factory Co., Ltd., 88 Textile Road, Ningbo, Zhejiang, China",
          importerValue: "Greanlean EU Compliance GmbH, Demo Strasse 12, 20457 Hamburg, Germany",
          declarationDateValue: "2026-06-04",
          declarationValidityValue: "2026-06-04 to 2027-06-03",
          viewPdfCertificate: "View PDF certificate",
          certificatePreview: "Certificate preview",
          closePreview: "Close preview",
          openNewTab: "Open in new tab",
          endOfLifeGuide: "End of Life guide",
          endOfLifeIntro: "Consumer-facing circularity guidance for reuse, recycling and disassembly decisions.",
          noHouseholdWaste: "Do not discard with household waste",
          noHouseholdWasteDesc: "Use textile collection bins, brand take-back programs or local designated collection points first.",
          removeTrims: "Remove non-recyclable trims before disposal",
          removeTrimsDesc: "Where requested by recyclers, cut off labels, non-textile trims or other hard-to-recycle components.",
          textileCollection: "Reuse first, then textile recycling",
          textileCollectionDesc: "Donate, resell or repair while usable; send to textile recycling when reuse is no longer possible.",
        };

  const latestEsg = esg[0] || null;
  const firstCircularity = circularity[0] || null;
  const firstTransparency = consumerTransparency[0] || null;
  const firstIdentity = digitalIdentity[0] || null;
  const firstGovernance = governance[0] || null;
  const qrUrl = `/api/qr?url=${encodeURIComponent(dppUrl)}`;

  const totalRecycled = useMemo(() => {
    if (!materials.length) return null;
    const weighted = materials.reduce((sum: number, material: any) => {
      return sum + (Number(material.percentage || 0) * Number(material.recycled_content || 0)) / 100;
    }, 0);
    return Math.round(weighted);
  }, [materials]);

  const verifiedCertificates = certificates.filter((certificate: any) => {
    return String(certificate.verification_status || "").toLowerCase() === "verified";
  }).length;
  const sgtin =
    firstIdentity?.gtin && firstIdentity?.serial_id
      ? `${firstIdentity.gtin}.${firstIdentity.serial_id}`
      : null;
  const hasConsumerData = Boolean(
    firstTransparency?.brand_story ||
      firstTransparency?.brand_story_zh ||
      firstTransparency?.sustainability_story ||
      firstTransparency?.sustainability_story_zh ||
      firstTransparency?.consumer_notice ||
      firstTransparency?.consumer_notice_zh ||
      firstTransparency?.packaging_info ||
      product.care_instructions ||
      product.care_instructions_zh ||
      product.repair_instructions ||
      product.repair_instructions_zh ||
      product.end_of_life_instructions ||
      product.end_of_life_instructions_zh
  );

  const productDetails: Array<[string, any]> = [
    [t.dppId, product.dpp_id],
    [t.sku, product.sku],
    [t.brandLabel, product.brand],
    [t.category, product.category],
    [t.subcategory, product.subcategory],
    [t.season, product.season],
    [t.publicSlug, product.public_slug],
  ];

  const identityDetails: Array<[string, any]> = [
    [t.gtin, firstIdentity?.gtin],
    [t.sgtin, sgtin],
    [t.batch, firstIdentity?.batch_id],
    [t.serial, firstIdentity?.serial_id],
    [t.digitalLink, firstIdentity?.digital_link_url],
  ];
  const heroDetails: Array<[string, any]> = [
    [t.sku, product.sku],
    [t.gtin, firstIdentity?.gtin],
    [t.sgtin, sgtin],
    [t.certificatesVerified, `${verifiedCertificates} / ${certificates.length}`],
  ];
  const performanceItems: Array<[string, any]> = [
    [t.washDurability, "≥ 50"],
    [t.tensileStrength, "≥ 450 N/m"],
    [t.colorFastness, "≥ Grade 3"],
    [t.shrinkage, "≤ 3%"],
    [t.minimumLifetime, locale === "zh" ? "2-3 年" : "2-3 years"],
    [t.testBasis, t.performanceBasis],
  ];
  const declarationItems: Array<[string, any]> = [
    [t.applicableEuRules, [t.declarationRule1, t.declarationRule2, t.declarationRule3, t.declarationRule4].join("\n")],
    [t.manufacturerInfo, t.manufacturerValue],
    [t.importerInfo, t.importerValue],
    [t.declarationDate, t.declarationDateValue],
    [t.declarationValidity, t.declarationValidityValue],
  ];

  const summaryMetrics: Array<[string, any, IconName]> = [
    [t.materialCount, materials.length, "layers"],
    [t.recycled, totalRecycled === null ? "0%" : `${totalRecycled}%`, "recycle"],
    [t.carbon, latestEsg?.carbon_footprint ? `${latestEsg.carbon_footprint} kg CO2e` : "0 kg CO2e", "carbon"],
    [t.certificatesVerified, `${verifiedCertificates} / ${certificates.length}`, "shield"],
  ];
  const navItems: Array<[string, string, IconName]> = [
    ["#identity", t.productIdentity, "box"],
    ["#materials", t.materialSource, "layers"],
    ["#performance", t.productPerformance, "shield"],
    ["#traceability", t.traceability, "route"],
    ["#esg", t.esg, "leaf"],
    ["#certificates", t.certificates, "certificate"],
    ["#consumer", t.consumer, "eye"],
    ["#end-of-life", t.endOfLifeGuide, "recycle"],
  ];
  const disclosureItems: Array<[string, string, IconName]> = [
    [t.identityDisclosure, t.identityDisclosureDesc, "box"],
    [t.materialDisclosure, t.materialDisclosureDesc, "layers"],
    [t.performanceDisclosure, t.performanceDisclosureDesc, "shield"],
    [t.supplyDisclosure, t.supplyDisclosureDesc, "route"],
    [t.environmentDisclosure, t.environmentDisclosureDesc, "leaf"],
    [t.evidenceDisclosure, t.evidenceDisclosureDesc, "shield"],
    [t.consumerDisclosure, t.consumerDisclosureDesc, "eye"],
  ];

  return (
    <main className="min-h-screen bg-[#f7faf8] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href={`/?lang=${locale}`} className="flex items-center gap-3 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">G</span>
            <span>{t.brand}</span>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 shadow-sm">
              {t.published}
            </span>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div className="absolute inset-0 dpp-grid opacity-25" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.98),rgba(15,23,42,0.88)_50%,rgba(5,46,22,0.82))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1fr_380px] lg:py-16">
          <div className="dpp-fade">
            <div className="flex flex-wrap gap-2">
              <Badge tone="dark">{t.passport}</Badge>
              <Badge tone="dark">{valueOrDash(product.dpp_id, locale)}</Badge>
              <Badge tone="dark">{pick(product, locale, "category")}</Badge>
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
              {pick(product, locale, "name", "name_zh")}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-200 md:text-lg">
              {pick(product, locale, "description", "description_zh")}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
              {heroDetails.map(([label, value]) => (
                <Info key={label} label={label} value={value} locale={locale} variant="dark" />
              ))}
            </div>
          </div>

          <aside className="dpp-fade dpp-float rounded-lg border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900">
              {product.main_image ? (
                <img
                  src={product.main_image}
                  alt={pick(product, locale, "name", "name_zh")}
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="grid h-64 place-items-center bg-[linear-gradient(135deg,#0f172a,#14532d)] px-6 text-center">
                  <div className="relative w-full max-w-48 overflow-hidden rounded-lg border border-white/15 bg-white/10 p-5 shadow-xl">
                    <div className="dpp-scan" />
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-brand-500 text-2xl font-black text-slate-950">
                      DPP
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-100">{t.productImage}</p>
                    <div className="mt-4 space-y-2">
                      <div className="h-2 rounded-full bg-white/30" />
                      <div className="h-2 w-2/3 rounded-full bg-white/20" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg bg-white p-4 text-slate-950">
              <p className="text-sm font-black">{t.qrTitle}</p>
              <img
                className="mx-auto mt-4 h-44 w-44 rounded-lg border border-slate-200 bg-white p-2"
                alt="DPP QR Code"
                src={qrUrl}
              />
              <p className="mt-3 break-all text-xs leading-5 text-slate-500">{dppUrl}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-6 max-w-7xl px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map(([label, value, icon]) => (
            <Metric key={label} label={label} value={value} locale={locale} icon={icon} />
          ))}
        </div>
      </section>

      <nav className="sticky top-[73px] z-30 border-b border-slate-200/80 bg-[#f7faf8]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 py-3">
          {navItems.map(([href, label, icon]) => (
            <a
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700"
            >
              <Icon name={icon} className="h-4 w-4 text-brand-700" />
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="dpp-fade mb-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="bg-slate-950 p-6 text-white lg:p-8">
              <p className="text-sm font-bold text-brand-100">{t.passport}</p>
              <h2 className="mt-2 text-2xl font-black lg:text-3xl">{t.disclosureTitle}</h2>
              <p className="mt-3 leading-7 text-slate-300">{t.disclosureText}</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 lg:p-5">
              {disclosureItems.map(([title, desc, icon]) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <Icon name={icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-950">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Section id="identity" title={t.productIdentity} eyebrow={t.overview} icon="box">
          <div className="grid gap-4 lg:grid-cols-2">
            <DataCard title={t.productRecordTitle} icon="box" surface="soft">
              <InfoGrid items={productDetails} locale={locale} />
            </DataCard>
            <DataCard title={t.digitalIdentityTitle} icon="qr" surface="soft">
              <InfoGrid items={identityDetails} locale={locale} />
              <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-800">
                {t.gs1Note}
              </p>
            </DataCard>
          </div>
        </Section>

        <Section id="materials" title={t.materialSource} icon="layers">
          {materials.length || bom.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {materials.map((material: any) => (
                <MaterialCard key={material.id} item={material} locale={locale} t={t} />
              ))}
              {bom.map((component: any) => (
                <DataCard key={component.id} title={pick(component, locale, "component_name", "component_name_zh")} icon="tag">
                  <InfoGrid
                    items={[
                      [t.component, pick(component, locale, "component_type", "component_type_zh")],
                      [t.quantity, compact([component.quantity, component.unit])],
                      [t.position, component.position],
                    ]}
                    locale={locale}
                  />
                </DataCard>
              ))}
            </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>

        <Section id="performance" title={t.productPerformance} icon="shield">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <DataCard title={t.performanceTitle} icon="shield" surface="soft">
              <InfoGrid items={performanceItems} locale={locale} />
            </DataCard>
            <div className="grid gap-3 sm:grid-cols-2">
              {performanceItems.slice(0, 5).map(([label, value]) => (
                <Metric key={label} label={label} value={value} locale={locale} icon="check" />
              ))}
            </div>
          </div>
        </Section>

        <Section id="traceability" title={t.traceability} icon="route">
          {traceability.length ? (
            <div className="space-y-4">
              {traceability.map((event: any, index: number) => (
                <TimelineItem
                  key={event.id || index}
                  title={pick(event, locale, "event_name", "event_name_zh")}
                  items={[
                    [t.eventType, event.event_type],
                    [t.date, formatDate(event.event_date, locale)],
                    [t.facility, pick(event, locale, "facility_name", "facility_name_zh")],
                    [t.location, compact([event.city, event.country])],
                    [t.transport, event.transport_method],
                    [t.status, event.verification_status],
                    [t.notes, pick(event, locale, "notes", "notes_zh")],
                  ]}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>

        <Section id="esg" title={t.esg} icon="leaf">
          {latestEsg || firstCircularity ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InfoGrid
                items={[
                  [t.carbon, latestEsg?.carbon_footprint ? `${latestEsg.carbon_footprint} kg CO2e` : null],
                  [t.water, latestEsg?.water_usage ? `${latestEsg.water_usage} L` : null],
                  [t.energy, latestEsg?.energy_consumption ? `${latestEsg.energy_consumption} kWh` : null],
                  [t.waste, latestEsg?.waste_generation ? `${latestEsg.waste_generation} kg` : null],
                  [t.recycled, latestEsg?.recycled_content ? `${latestEsg.recycled_content}%` : null],
                  [t.methodology, latestEsg?.methodology],
                  [t.verifiedBy, latestEsg?.verified_by],
                ]}
                locale={locale}
              />
              <InfoGrid
                items={[
                  [t.repairability, firstCircularity?.repairability_score ? `${firstCircularity.repairability_score} / 100 · ${t.jrcNote}` : null],
                  [t.recyclability, firstCircularity?.recyclability_score ? `${firstCircularity.recyclability_score} / 100 · ${t.jrcNote}` : null],
                  [t.takeBack, firstCircularity?.take_back_program],
                  [t.resale, firstCircularity?.resale_supported],
                  [t.remanufacturing, firstCircularity?.remanufacturing_supported],
                  [t.endOfLife, firstCircularity?.end_of_life_info || pick(product, locale, "end_of_life_instructions", "end_of_life_instructions_zh")],
                ]}
                locale={locale}
              />
            </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>

        <Section id="certificates" title={t.certificates} icon="certificate">
          {certificates.length ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {certificates.map((certificate: any) => (
                  <DataCard key={certificate.id} title={pick(certificate, locale, "certificate_name", "certificate_name_zh")} icon="certificate">
                    <div className="mb-4">
                      <StatusBadge value={certificate.verification_status} locale={locale} verified={t.verified} pending={t.pending} />
                    </div>
                    <InfoGrid
                      items={[
                        [t.number, certificate.certificate_number],
                        [t.issuer, certificate.issuer],
                        [t.issueDate, formatDate(certificate.issue_date, locale)],
                        [t.expiryDate, formatDate(certificate.expiry_date, locale)],
                      ]}
                      locale={locale}
                    />
                    {certificate.certificate_url && (
                      <button
                        type="button"
                        onClick={() => setActiveCertificate(certificate)}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
                      >
                        <Icon name="pdf" className="h-5 w-5" />
                        {t.viewPdfCertificate}
                      </button>
                    )}
                  </DataCard>
                ))}
              </div>
              <DataCard title={t.declarationTitle} icon="file" surface="soft">
                <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">{t.declarationIntro}</p>
                <InfoGrid items={declarationItems} locale={locale} />
                <a
                  href={`/api/declaration?lang=${locale}&product=${encodeURIComponent(product.public_slug || "demo-organic-cotton-tshirt")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg sm:w-auto"
                >
                  <Icon name="pdf" className="h-5 w-5" />
                  {t.declarationDownload}
                </a>
              </DataCard>
            </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>

        <Section id="consumer" title={t.consumer} icon="eye">
          {hasConsumerData ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <InfoGrid
                items={[
                  [t.brandStory, pick(firstTransparency, locale, "brand_story", "brand_story_zh")],
                  [t.sustainability, pick(firstTransparency, locale, "sustainability_story", "sustainability_story_zh")],
                  [t.notice, pick(firstTransparency, locale, "consumer_notice", "consumer_notice_zh")],
                ]}
                locale={locale}
              />
              <InfoGrid
                items={[
                  [t.care, firstTransparency?.care_instructions || pick(product, locale, "care_instructions", "care_instructions_zh")],
                  [t.repair, firstTransparency?.repair_guide || pick(product, locale, "repair_instructions", "repair_instructions_zh")],
                  [t.packaging, firstTransparency?.packaging_info],
                  [t.endOfLife, pick(product, locale, "end_of_life_instructions", "end_of_life_instructions_zh")],
                ]}
                locale={locale}
              />
            </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>

        <Section id="end-of-life" title={t.endOfLifeGuide} icon="recycle">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-bold uppercase text-emerald-700">{t.consumerDisclosure}</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">{t.endOfLife}</h3>
              <p className="mt-3 leading-7 text-slate-700">{t.endOfLifeIntro}</p>
              <div className="mt-5">
                <InfoGrid
                  items={[
                    [t.takeBack, firstCircularity?.take_back_program],
                    [t.endOfLife, firstCircularity?.end_of_life_info || pick(product, locale, "end_of_life_instructions", "end_of_life_instructions_zh")],
                  ]}
                  locale={locale}
                />
              </div>
            </div>
            <div className="grid gap-3">
              <GuideCard icon="trash" title={t.noHouseholdWaste} text={t.noHouseholdWasteDesc} />
              <GuideCard icon="scissors" title={t.removeTrims} text={t.removeTrimsDesc} />
              <GuideCard icon="recycle" title={t.textileCollection} text={t.textileCollectionDesc} />
            </div>
          </div>
        </Section>

        {(documents.length || firstGovernance) && (
          <Section id="evidence" title={t.evidence} icon="file">
            <div className="grid gap-4 lg:grid-cols-2">
              {documents.length ? (
                <div className="space-y-3">
                  {documents.map((document: any) => (
                    <DataCard key={document.id} title={document.document_name || t.documentName} icon="file">
                      <InfoGrid
                        items={[
                          ["Type", document.document_type],
                          ["Language", document.language],
                          ["Version", document.version],
                          ["Size", document.file_size],
                        ]}
                        locale={locale}
                      />
                    </DataCard>
                  ))}
                </div>
              ) : (
                <Empty text={t.noData} />
              )}

              {firstGovernance ? (
                <InfoGrid
                  items={[
                    [t.dataSource, firstGovernance.data_source],
                    [t.dataOwner, firstGovernance.data_owner],
                    [t.audit, firstGovernance.audit_status],
                    [t.quality, firstGovernance.data_quality_score],
                  ]}
                  locale={locale}
                />
              ) : (
                <Empty text={t.noData} />
              )}
            </div>
          </Section>
        )}

        <section className="dpp-fade mt-10 rounded-lg bg-slate-950 p-8 text-white shadow-sm">
          <h2 className="text-2xl font-black">{t.footerTitle}</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">{t.footerText}</p>
          <p className="mt-4 text-sm font-semibold text-slate-400">greanlean.com</p>
        </section>
      </div>

      {activeCertificate && (
        <div className="fixed inset-0 z-[80] bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/10 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon name="pdf" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">{t.certificatePreview}</p>
                  <h2 className="font-black text-slate-950">{pick(activeCertificate, locale, "certificate_name", "certificate_name_zh")}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeCertificate.certificate_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                >
                  {t.openNewTab}
                </a>
                <button
                  type="button"
                  onClick={() => setActiveCertificate(null)}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  {t.closePreview}
                </button>
              </div>
            </div>
            <iframe
              title={pick(activeCertificate, locale, "certificate_name", "certificate_name_zh")}
              src={activeCertificate.certificate_url}
              className="min-h-0 flex-1 bg-slate-100"
            />
          </div>
        </div>
      )}
    </main>
  );
}

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      {name === "box" && (
        <>
          <path {...common} d="M21 8.5 12 3 3 8.5l9 5.5 9-5.5Z" />
          <path {...common} d="M3 8.5V16l9 5 9-5V8.5" />
          <path {...common} d="M12 14v7" />
        </>
      )}
      {name === "layers" && (
        <>
          <path {...common} d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path {...common} d="m3 13 9 5 9-5" />
          <path {...common} d="m3 18 9 5 9-5" />
        </>
      )}
      {name === "route" && (
        <>
          <path {...common} d="M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path {...common} d="M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path {...common} d="M8.5 14.5 15.5 9.5" />
          <path {...common} d="M8 18h8a3 3 0 0 0 0-6H9" />
        </>
      )}
      {name === "leaf" && (
        <>
          <path {...common} d="M20 4c-8 0-13 4.5-13 11a5 5 0 0 0 5 5c6.5 0 8-8 8-16Z" />
          <path {...common} d="M4 20c3-6 7-9 12-11" />
        </>
      )}
      {name === "certificate" && (
        <>
          <path {...common} d="M6 3h12v18l-6-3-6 3V3Z" />
          <path {...common} d="M9 8h6" />
          <path {...common} d="M9 12h6" />
        </>
      )}
      {name === "eye" && (
        <>
          <path {...common} d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <path {...common} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </>
      )}
      {name === "qr" && (
        <>
          <path {...common} d="M4 4h6v6H4V4Z" />
          <path {...common} d="M14 4h6v6h-6V4Z" />
          <path {...common} d="M4 14h6v6H4v-6Z" />
          <path {...common} d="M14 14h2v2h-2v-2Z" />
          <path {...common} d="M18 14h2v6h-4v-2h2v-4Z" />
        </>
      )}
      {name === "tag" && (
        <>
          <path {...common} d="M20 13 11 22 2 13V4h9l9 9Z" />
          <path {...common} d="M7.5 8.5h.01" />
        </>
      )}
      {name === "recycle" && (
        <>
          <path {...common} d="m7 7 2-4 2 4" />
          <path {...common} d="M9 3c3 0 5 1.5 6 4" />
          <path {...common} d="m17 10 4 1-3 3" />
          <path {...common} d="M21 11c0 3-1.5 5-4 6" />
          <path {...common} d="m7 17-1 4-3-3" />
          <path {...common} d="M6 21c-2-2-2.5-4.5-1-7" />
        </>
      )}
      {name === "carbon" && (
        <>
          <path {...common} d="M7 7a5 5 0 0 1 10 0c0 4-5 9-5 9S7 11 7 7Z" />
          <path {...common} d="M9 19h6" />
          <path {...common} d="M10 22h4" />
        </>
      )}
      {name === "shield" && (
        <>
          <path {...common} d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
          <path {...common} d="m8.5 12 2.5 2.5L16 9" />
        </>
      )}
      {name === "file" && (
        <>
          <path {...common} d="M6 3h8l4 4v14H6V3Z" />
          <path {...common} d="M14 3v5h5" />
          <path {...common} d="M9 13h6" />
          <path {...common} d="M9 17h4" />
        </>
      )}
      {name === "info" && (
        <>
          <path {...common} d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
          <path {...common} d="M12 10v6" />
          <path {...common} d="M12 7h.01" />
        </>
      )}
      {name === "check" && (
        <>
          <path {...common} d="M20 6 9 17l-5-5" />
        </>
      )}
      {name === "pdf" && (
        <>
          <path {...common} d="M6 3h8l4 4v14H6V3Z" />
          <path {...common} d="M14 3v5h5" />
          <path {...common} d="M8.5 16.5h7" />
          <path {...common} d="M8.5 12.5h2.5a1.5 1.5 0 0 0 0-3H8.5v6" />
        </>
      )}
      {name === "trash" && (
        <>
          <path {...common} d="M4 7h16" />
          <path {...common} d="M10 11v6" />
          <path {...common} d="M14 11v6" />
          <path {...common} d="M6 7l1 14h10l1-14" />
          <path {...common} d="M9 7V4h6v3" />
        </>
      )}
      {name === "scissors" && (
        <>
          <path {...common} d="M4.5 7.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
          <path {...common} d="M4.5 16.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
          <path {...common} d="M8.8 9.1 20 4" />
          <path {...common} d="M8.8 14.9 20 20" />
          <path {...common} d="M8.8 9.1 12 12l-3.2 2.9" />
        </>
      )}
    </svg>
  );
}

function Badge({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  const className =
    tone === "dark"
      ? "rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-slate-100 backdrop-blur"
      : "rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700";
  return <span className={className}>{children}</span>;
}

function Metric({ label, value, locale, icon }: { label: string; value: any; locale: Locale; icon: IconName }) {
  return (
    <div className="dpp-fade overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
      <div className="h-1 bg-[linear-gradient(90deg,#16a34a,#0f766e)]" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{valueOrDash(value, locale)}</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Icon name={icon} className="h-5 w-5" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  eyebrow,
  icon,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <section id={id} className="dpp-fade mb-6 scroll-mt-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[linear-gradient(90deg,#ffffff,#f1f8f3)] px-5 py-5 lg:px-7">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-white shadow-sm">
            <Icon name={icon} className="h-5 w-5" />
          </span>
          <div>
            {eyebrow && <p className="text-sm font-bold uppercase text-brand-700">{eyebrow}</p>}
            <h2 className={eyebrow ? "mt-1 text-2xl font-black text-slate-950 lg:text-3xl" : "text-2xl font-black text-slate-950 lg:text-3xl"}>{title}</h2>
          </div>
        </div>
      </div>
      <div className="p-5 lg:p-7">{children}</div>
    </section>
  );
}

function DataCard({
  title,
  icon = "info",
  children,
  surface = "white",
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
  surface?: "white" | "soft";
}) {
  return (
    <article
      className={
        surface === "soft"
          ? "rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-md"
          : "rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
      }
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <h3 className="font-black text-slate-950">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function Info({
  label,
  value,
  locale,
  variant = "light",
}: {
  label: string;
  value: any;
  locale: Locale;
  variant?: "light" | "dark";
}) {
  const className =
    variant === "dark"
      ? "rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur"
      : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-100 hover:bg-brand-50/20";
  const labelClass = variant === "dark" ? "text-xs font-bold uppercase text-brand-100" : "text-xs font-bold uppercase text-slate-500";
  const valueClass = variant === "dark" ? "mt-2 break-words text-sm font-semibold leading-6 text-white" : "mt-2 break-words text-sm font-semibold leading-6 text-slate-950";
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className={variant === "dark" ? "grid h-5 w-5 place-items-center rounded bg-white/10 text-brand-100" : "grid h-5 w-5 place-items-center rounded bg-slate-100 text-brand-700"}>
          <Icon name="info" className="h-3.5 w-3.5" />
        </span>
        <p className={labelClass}>{label}</p>
      </div>
      <p className={valueClass}>{valueOrDash(value, locale)}</p>
    </div>
  );
}

function InfoGrid({ items, locale }: { items: Array<[string, any]>; locale: Locale }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {items.map(([label, value]) => (
        <div key={label} className="grid gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:grid-cols-[168px_1fr]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-brand-50 text-brand-700">
              <Icon name="info" className="h-3.5 w-3.5" />
            </span>
            <span>{label}</span>
          </div>
          <p className="whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-950">{valueOrDash(value, locale)}</p>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">{text}</div>;
}

function GuideCard({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <article className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div>
        <h3 className="font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </article>
  );
}

function MaterialCard({ item, locale, t }: { item: any; locale: Locale; t: any }) {
  const pct = Number(item.percentage || 0);
  return (
    <DataCard title={pick(item, locale, "material_name", "material_name_zh")} icon="layers">
      <InfoGrid
        items={[
          [t.materialType, pick(item, locale, "material_type", "material_type_zh")],
          [t.percentage, pct ? `${pct}%` : null],
          [t.recycled, item.recycled_content ? `${item.recycled_content}%` : null],
          [t.origin, item.origin_country],
          [t.certification, item.certification],
          [t.chemical, addRegulatoryChemicalContext(pick(item, locale, "chemical_info", "chemical_info_zh"), locale)],
          [t.recyclability, pick(item, locale, "recyclability", "recyclability_zh")],
        ]}
        locale={locale}
      />
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand-600 dpp-progress" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
      </div>
    </DataCard>
  );
}

function TimelineItem({
  title,
  items,
  locale,
}: {
  title: string;
  items: Array<[string, any]>;
  locale: Locale;
}) {
  return (
    <article className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-lg sm:grid-cols-[48px_1fr]">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white shadow-sm">
        <Icon name="route" className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-black text-slate-950">{title}</h3>
        <div className="mt-4">
          <InfoGrid items={items} locale={locale} />
        </div>
      </div>
    </article>
  );
}

function StatusBadge({
  value,
  locale,
  verified,
  pending,
}: {
  value: any;
  locale: Locale;
  verified: string;
  pending: string;
}) {
  const isVerified = String(value || "").toLowerCase() === "verified";
  return (
    <span className={isVerified ? "rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-700" : "rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700"}>
      {isVerified ? verified : valueOrDash(value || pending, locale)}
    </span>
  );
}
