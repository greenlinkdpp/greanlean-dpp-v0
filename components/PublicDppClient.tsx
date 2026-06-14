"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
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

function hasNumber(value: any) {
  return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
}

function hasDisplayValue(value: any) {
  return value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim() !== "-";
}

function groupRows<T>(rows: T[], getGroup: (row: T) => string) {
  const groups = new Map<string, T[]>();
  rows.forEach((row) => {
    const group = getGroup(row) || "Other";
    groups.set(group, [...(groups.get(group) || []), row]);
  });
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
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
  const searchParams = useSearchParams();
  const [activeCertificate, setActiveCertificate] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"simple" | "detail">("detail");
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

  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "simple" || view === "detail") setViewMode(view);
  }, [searchParams]);

  const t =
    locale === "zh"
      ? {
          brand: "greanlean DPP",
          published: "已发布",
          statusDraft: "草稿",
          statusReview: "待审核",
          statusUpdated: "已更新",
          statusArchived: "已归档",
          statusExpired: "证书过期",
          passport: "数字产品护照",
          verified: "已验证",
          pending: "待验证",
          qrTitle: "扫码查看产品护照",
          qrText: "此二维码链接到当前公开 DPP 页面。",
          productImage: "产品图片",
          overview: "产品概览",
          productIdentity: "产品基本信息",
          materialSource: "材料组成与来源",
          materialFormula: "材料配方",
          materialGroupIntro: "按材料类型归类，并按占比从高到低展示。",
          componentSupplement: "组件、包装与辅料",
          componentSupplementIntro: "按组件类型归类，用于补充包装、配件和可更换组件，不计入主材料配方占比。",
          groupCount: "项",
          openGroup: "展开查看",
          overviewStatusTitle: "护照数据状态",
          overviewStatus1: "唯一身份已绑定",
          overviewStatus1Desc: "DPP ID、SKU、批次与二维码用于稳定访问。",
          overviewStatus2: "证据链可追溯",
          overviewStatus2Desc: "材料、证书、供应链和声明文件按模块组织。",
          overviewStatus3: "支持后续更新",
          overviewStatus3Desc: "证书、批次和供应商资料变化后可同步维护。",
          itemName: "名称",
          chemicalRestricted: "化学品与受限物质",
          productPerformance: "产品性能",
          traceability: "生产与运输追溯",
          esg: "ESG 与循环性",
          certificates: "认证证书",
          consumer: "消费者透明化",
          evidence: "证据文件与数据治理",
          textileReserve: "产品特定信息预留",
          batchTracking: "批次追踪",
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
          footerTagline: "欧盟 DPP 与 ESPR 合规数据服务",
          footerDemo: "DPP 示例",
          footerContact: "联系我们",
          footerCopyright: "© 2026 greanlean. 保留所有权利。",
          productRecordTitle: "产品身份档案",
          digitalIdentityTitle: "数据载体与唯一标识",
          gs1Note: "兼容 GS1 GTIN / SGTIN 唯一标识结构，用于产品级与单品级追溯。",
          jrcNote: "依据欧盟 JRC 循环经济方法学评估",
          chemicalTitle: "REACH / RSL 化学合规明细",
          chemicalIntro: "展示 SVHC 候选清单物质、重金属、偶氮染料和 MSDS 文件，便于买家快速核对受限物质证据链。",
          testItem: "检测项目",
          testResult: "检测结果",
          limitValue: "限值 / 判断标准",
          reportFile: "报告 / 文件",
          svhcCandidate: "SVHC 候选清单物质",
          heavyMetalLead: "重金属 - 铅 Pb",
          heavyMetalCadmium: "重金属 - 镉 Cd",
          heavyMetalChromium: "重金属 - 六价铬 Cr(VI)",
          azoDyes: "偶氮染料",
          msdsFile: "MSDS 物质安全数据表",
          notDetected: "未检出",
          available: "可查看",
          svhcLimit: "≤ 0.1% w/w；如含有需披露",
          leadLimit: "Demo RSL 限值：≤ 90 mg/kg",
          cadmiumLimit: "Demo RSL 限值：≤ 40 mg/kg",
          chromiumLimit: "Demo RSL 限值：≤ 3 mg/kg",
          azoLimit: "禁用芳香胺 < 30 mg/kg",
          msdsLimit: "染整助剂和相关化学品文件",
          downloadReport: "下载报告",
          performanceTitle: "产品性能摘要",
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
          reuseOptions: "再使用选项",
          takeBackPlanDetails: "品牌旧衣回收计划",
          takeBackPlanValue: "消费者可通过 greanlean 回收计划提交旧衣，系统记录回收批次并优先进入再使用筛选。",
          takeBackPlanLink: "查看回收计划",
          expectedResaleCycles: "预期转售次数",
          resalePriceRange: "转售价格参考范围",
          repairAndUpcycle: "维修与改造",
          commonRepairTypes: "常见维修类型",
          commonRepairTypesValue: "缝线修补、领口加固、轻微破洞织补、标签更换、局部改造",
          repairProviders: "推荐维修服务商",
          repairProvidersValue: "Demo Textile Repair Hub；EU Local Alteration Partner Network",
          sparePartsGuide: "零部件采购指南",
          sparePartsGuideValue: "优先采购棉线、可拆卸标签和低影响辅料；避免加入难回收复合辅料。",
          textileRecycling: "纺织品回收",
          recyclableParts: "可回收部分明细",
          recyclablePartsValue: "100% 棉主身面料，可进入棉纺织品回收体系",
          removeBeforeRecycle: "需要移除部分",
          removeBeforeRecycleValue: "5% 涤纶缝纫线、领标和其他非棉辅料，按回收机构要求剪除",
          recyclingFacilityLink: "当地回收设施查询",
          dataTransparencyTitle: "数据来源与验证透明度",
          dataTransparencyIntro: "列出关键环境数据来源、验证方式和更新时间，便于买家判断数据可信度。",
          dataPoint: "数据项",
          dataValue: "数值",
          sourceLabel: "来源",
          verificationLabel: "验证",
          lastUpdated: "最后更新时间",
          carbonSource: "LCA Database + 产品材料模型",
          waterSource: "生产商声明",
          wasteSource: "第三方审计",
          recycledSource: "BOM 与供应商声明",
          independentVerified: "第三方独立验证",
          supplierDeclared: "供应商/生产商声明",
          auditVerified: "第三方审计验证",
          verificationAgency: "验证机构确认",
          verificationAgencyValue: "SGS-CSTC Standards Technical Services Co., Ltd.（Demo）",
          verificationScope: "验证范围",
          verificationScopeValue: "碳足迹模型、重金属/偶氮染料报告、GOTS/OEKO-TEX 证书链由第三方独立验证；用水量和部分生产数据由生产商声明。",
          verificationCertificate: "验证证书编号",
          verificationCertificateValue: "SGS-DPP-DEMO-2026-042",
          verificationExpiry: "验证有效期",
          verificationExpiryValue: "2026-06-04 至 2027-06-03",
          dataLastUpdatedValue: "2026-06-04",
          dataVersionLabel: "数据版本",
          downloadPdf: "下载 DPP PDF",
          downloadJson: "下载 JSON",
          benchmarkTitle: "该产品的碳足迹",
          thisProduct: "该产品",
          industryAverage: "行业平均",
          benchmarkAdvantage: "低于示例行业平均值约 29%，主要来自有机棉材料、低影响染整和海运/铁路组合运输假设。",
          textileReserveIntro: "以下字段用于提前适配未来纺织品 DPP 细化要求；当前作为预留和数据准备项展示。",
          microfiberPotential: "微纤维释放潜力评估",
          microfiberValue: "低至中；棉主身面料为主，需通过洗涤模拟测试进一步确认。",
          fullOriginTrace: "原产地完整追溯",
          fullOriginValue: "新疆/阿克苏棉源 → 宁波制造 → 汉堡欧盟仓 → 消费者扫码访问",
          animalWelfare: "动物福利声明",
          animalWelfareValue: "不适用；该产品不含动物源材料。",
          laborCertification: "劳动条件认证",
          laborCertificationValue: "SA8000 / BSCI 字段预留；当前 demo 记录供应商声明。",
          visualizationTitle: "环境数据对比",
          waterBenchmark: "用水量对比",
          batchHistoryTitle: "BATCH-2026-001 历史记录",
          passportSummary: "护照摘要",
          complianceScope: "披露范围",
          complianceScopeValue: "ESPR / REACH / RSL / 纺织标签法规",
          materialProfile: "材料结构",
          materialProfileValue: "95% 有机棉 + 5% 再生涤纶缝纫线",
          nextAction: "消费者可执行动作",
          nextActionValue: "查看证书、维修/回收、下载 DPP 数据",
          performanceSnapshot: "性能快照",
          performanceSnapshotValue: "耐洗 ≥50 次；使用寿命 2-3 年",
          batchRecord1: "2026-03-18 原料批次创建并绑定 GOTS 范围证书",
          batchRecord2: "2026-04-22 制造批次完成，SKU 与 SGTIN 生成",
          batchRecord3: "2026-05-06 出口运输记录写入，承运商 API 待接入",
          batchRecord4: "2026-06-04 DPP 数据审核并更新公开页面",
          lastUpdatedLabel: "最后更新于",
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
          statusDraft: "Draft",
          statusReview: "In review",
          statusUpdated: "Updated",
          statusArchived: "Archived",
          statusExpired: "Certificate expired",
          passport: "Digital Product Passport",
          verified: "Verified",
          pending: "Pending",
          qrTitle: "Scan to view passport",
          qrText: "This QR code links to the current public DPP page.",
          productImage: "Product image",
          overview: "Product overview",
          productIdentity: "Product basics",
          materialSource: "Materials and sources",
          materialFormula: "Material formula",
          componentSupplement: "Components, packaging and accessories",
          materialGroupIntro: "Grouped by material type and sorted by share from high to low.",
          componentSupplementIntro: "Grouped by component type; this list supplements packaging, accessories and replaceable components and is not counted in the primary material formula.",
          groupCount: "items",
          openGroup: "Open",
          overviewStatusTitle: "Passport data status",
          overviewStatus1: "Identity linked",
          overviewStatus1Desc: "DPP ID, SKU, batch and QR code provide stable access.",
          overviewStatus2: "Evidence traceable",
          overviewStatus2Desc: "Materials, certificates, supply chain and declarations are organized by module.",
          overviewStatus3: "Update-ready",
          overviewStatus3Desc: "Certificates, batches and supplier records can be maintained after changes.",
          itemName: "Name",
          chemicalRestricted: "Chemicals and restricted substances",
          productPerformance: "Product performance",
          traceability: "Production and transport traceability",
          esg: "ESG and circularity",
          certificates: "Certificates",
          consumer: "Consumer transparency",
          evidence: "Evidence files and data governance",
          textileReserve: "Product-specific reserved fields",
          batchTracking: "Batch tracking",
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
          footerTagline: "EU DPP and ESPR compliance data service",
          footerDemo: "DPP demos",
          footerContact: "Contact",
          footerCopyright: "© 2026 greanlean. All rights reserved.",
          productRecordTitle: "Product identity record",
          digitalIdentityTitle: "Data carrier and identifiers",
          gs1Note: "Compatible with GS1 GTIN / SGTIN identity structure for product-level and item-level traceability.",
          jrcNote: "Assessed using EU JRC circular-economy methodology",
          chemicalTitle: "REACH / RSL chemical compliance details",
          chemicalIntro: "Displays SVHC candidate-list substances, heavy metals, azo dyes and MSDS files so buyers can verify restricted-substance evidence quickly.",
          testItem: "Test item",
          testResult: "Result",
          limitValue: "Limit / criterion",
          reportFile: "Report / file",
          svhcCandidate: "SVHC candidate-list substances",
          heavyMetalLead: "Heavy metal - Lead Pb",
          heavyMetalCadmium: "Heavy metal - Cadmium Cd",
          heavyMetalChromium: "Heavy metal - Chromium VI",
          azoDyes: "Azo dyes",
          msdsFile: "MSDS safety data sheet",
          notDetected: "Not detected",
          available: "Available",
          svhcLimit: "≤ 0.1% w/w; disclosure required if present",
          leadLimit: "Demo RSL limit: ≤ 90 mg/kg",
          cadmiumLimit: "Demo RSL limit: ≤ 40 mg/kg",
          chromiumLimit: "Demo RSL limit: ≤ 3 mg/kg",
          azoLimit: "Restricted aromatic amines < 30 mg/kg",
          msdsLimit: "Dyeing auxiliaries and related chemical files",
          downloadReport: "Download report",
          performanceTitle: "Product performance summary",
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
          reuseOptions: "Reuse options",
          takeBackPlanDetails: "Brand take-back program",
          takeBackPlanValue: "Consumers can submit used garments through the greanlean take-back program; returned batches are recorded and screened for reuse first.",
          takeBackPlanLink: "View take-back program",
          expectedResaleCycles: "Expected resale cycles",
          resalePriceRange: "Resale price reference",
          repairAndUpcycle: "Repair and upcycling",
          commonRepairTypes: "Common repair types",
          commonRepairTypesValue: "Seam repair, collar reinforcement, small-hole mending, label replacement and local upcycling",
          repairProviders: "Recommended repair providers",
          repairProvidersValue: "Demo Textile Repair Hub; EU Local Alteration Partner Network",
          sparePartsGuide: "Spare-parts sourcing guide",
          sparePartsGuideValue: "Prioritize cotton thread, detachable labels and low-impact trims; avoid adding hard-to-recycle composite trims.",
          textileRecycling: "Textile recycling",
          recyclableParts: "Recyclable parts",
          recyclablePartsValue: "100% cotton main fabric, suitable for cotton-rich textile recycling streams",
          removeBeforeRecycle: "Parts to remove",
          removeBeforeRecycleValue: "5% polyester sewing thread, neck label and non-cotton trims where required by recyclers",
          recyclingFacilityLink: "Find local recycling facilities",
          dataTransparencyTitle: "Data source and verification transparency",
          dataTransparencyIntro: "Shows key environmental data sources, verification method and update date so buyers can assess data credibility.",
          dataPoint: "Data point",
          dataValue: "Value",
          sourceLabel: "Source",
          verificationLabel: "Verification",
          lastUpdated: "Last updated",
          carbonSource: "LCA Database + product material model",
          waterSource: "Manufacturer declaration",
          wasteSource: "Third-party audit",
          recycledSource: "BOM and supplier declarations",
          independentVerified: "Independently verified",
          supplierDeclared: "Supplier / manufacturer declared",
          auditVerified: "Third-party audit verified",
          verificationAgency: "Verification body confirmation",
          verificationAgencyValue: "SGS-CSTC Standards Technical Services Co., Ltd. (Demo)",
          verificationScope: "Verification scope",
          verificationScopeValue: "Carbon-footprint model, heavy-metal/azo-dye reports and GOTS/OEKO-TEX certificate chain are independently verified; water usage and selected production data are manufacturer-declared.",
          verificationCertificate: "Verification certificate number",
          verificationCertificateValue: "SGS-DPP-DEMO-2026-042",
          verificationExpiry: "Verification validity",
          verificationExpiryValue: "2026-06-04 to 2027-06-03",
          dataLastUpdatedValue: "2026-06-04",
          dataVersionLabel: "Data version",
          downloadPdf: "Download DPP PDF",
          downloadJson: "Download JSON",
          benchmarkTitle: "Carbon footprint of this product",
          thisProduct: "This product",
          industryAverage: "Industry average",
          benchmarkAdvantage: "About 29% below the demo industry average, mainly from organic cotton, lower-impact dyeing and sea/rail logistics assumptions.",
          textileReserveIntro: "These fields are reserved to prepare for future textile-specific DPP requirements; currently shown as data-readiness items.",
          microfiberPotential: "Microfibre release potential",
          microfiberValue: "Low to medium; cotton-rich main fabric, pending washing-simulation test confirmation.",
          fullOriginTrace: "Full origin traceability",
          fullOriginValue: "Xinjiang/Aksu cotton source -> Ningbo manufacturing -> Hamburg EU warehouse -> consumer scan",
          animalWelfare: "Animal welfare declaration",
          animalWelfareValue: "Not applicable; this product contains no animal-derived materials.",
          laborCertification: "Labour condition certification",
          laborCertificationValue: "SA8000 / BSCI fields reserved; demo currently records supplier declarations.",
          visualizationTitle: "Environmental data comparison",
          waterBenchmark: "Water usage comparison",
          batchHistoryTitle: "BATCH-2026-001 history",
          passportSummary: "Passport summary",
          complianceScope: "Disclosure scope",
          complianceScopeValue: "ESPR / REACH / RSL / textile labelling rules",
          materialProfile: "Material profile",
          materialProfileValue: "95% organic cotton + 5% recycled polyester sewing thread",
          nextAction: "Consumer actions",
          nextActionValue: "View certificates, repair/recycle, download DPP data",
          performanceSnapshot: "Performance snapshot",
          performanceSnapshotValue: "Wash durability >=50 cycles; service life 2-3 years",
          batchRecord1: "2026-03-18 Material batch created and linked to GOTS scope certificate",
          batchRecord2: "2026-04-22 Manufacturing batch completed; SKU and SGTIN generated",
          batchRecord3: "2026-05-06 Export shipment record added; carrier API pending",
          batchRecord4: "2026-06-04 DPP data reviewed and public page updated",
          lastUpdatedLabel: "Last updated",
          noHouseholdWaste: "Do not discard with household waste",
          noHouseholdWasteDesc: "Use textile collection bins, brand take-back programs or local designated collection points first.",
          removeTrims: "Remove non-recyclable trims before disposal",
          removeTrimsDesc: "Where requested by recyclers, cut off labels, non-textile trims or other hard-to-recycle components.",
          textileCollection: "Reuse first, then textile recycling",
          textileCollectionDesc: "Donate, resell or repair while usable; send to textile recycling when reuse is no longer possible.",
        };

  const lifecycleStatusLabel =
    {
      draft: t.statusDraft,
      review: t.statusReview,
      published: t.published,
      updated: t.statusUpdated,
      archived: t.statusArchived,
      expired: t.statusExpired,
    }[String(product.status || "published").toLowerCase()] || t.published;

  const latestEsg = esg[0] || null;
  const firstCircularity = circularity[0] || null;
  const firstTransparency = consumerTransparency[0] || null;
  const firstIdentity = digitalIdentity[0] || null;
  const firstGovernance = governance[0] || null;
  const categoryText = [product.category, product.subcategory, product.sku, product.name, product.name_zh]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const isElectronics = /electronics|earbud|headphone|audio|蓝牙|耳机|电子/.test(categoryText);
  const isFlooring = /floor|flooring|wpc|building|construction|地板|木塑|建材/.test(categoryText);
  const isFurniture = /furniture|chair|office chair|办公椅|家具/.test(categoryText);
  const isDemoProduct = new Set([
    "demo-organic-cotton-tshirt",
    "demo-wireless-earbuds",
    "demo-wpc-flooring",
    "demo-office-chair",
    "DPP-DEMO-001",
    "DPP-AUDIO-DEMO-001",
    "DPP-WPC-MS140K25B",
    "DPP-FURN-DEMO-001",
  ]).has(String(product.public_slug || product.dpp_id || ""));
  const hasCarbonData = hasNumber(latestEsg?.carbon_footprint);
  const hasWaterData = hasNumber(latestEsg?.water_usage);
  const hasWasteData = hasNumber(latestEsg?.waste_generation);
  const hasEsgRecycledData = hasNumber(latestEsg?.recycled_content);
  const carbonCurrent = hasCarbonData ? Number(latestEsg.carbon_footprint) : 0;
  const carbonAverage = isElectronics ? 8.9 : isFlooring ? 16.8 : isFurniture ? 36.5 : 4.5;
  const waterCurrent = hasWaterData ? Number(latestEsg.water_usage) : 0;
  const waterAverage = isElectronics ? 65 : isFlooring ? 28 : isFurniture ? 110 : 160;
  const recycleLink = isElectronics
    ? "https://environment.ec.europa.eu/topics/waste-and-recycling/waste-electrical-and-electronic-equipment-weee_en"
    : isFlooring
      ? "https://environment.ec.europa.eu/topics/waste-and-recycling/construction-and-demolition-waste_en"
      : isFurniture
        ? "https://environment.ec.europa.eu/topics/waste-and-recycling/waste-framework-directive_en"
        : "https://www.recyclenow.com/recycle-an-item/clothing-textiles";
  const dppProductRef = product.dpp_id || product.public_slug || "DPP-DEMO-001";
  const qrUrl = `/api/qr?url=${encodeURIComponent(dppUrl)}`;

  const compositionMaterials = useMemo(() => {
    return materials
      .filter((material: any) => material.percentage !== null && material.percentage !== undefined && material.percentage !== "")
      .sort((a: any, b: any) => Number(b.percentage || 0) - Number(a.percentage || 0));
  }, [materials]);

  const supplementalComponents = useMemo(() => {
    const rows = new Map<string, any>();
    const addRow = (row: any, fallbackPrefix: string) => {
      const name = String(row.component_name || row.material_name || "").trim();
      if (!name) return;
      const key = row.id ? `${fallbackPrefix}-${row.id}` : `${fallbackPrefix}-${name.toLowerCase()}`;
      if (!rows.has(key)) rows.set(key, row);
    };

    bom.forEach((component: any) => {
      const name = String(component.component_name || "").toLowerCase();
      if (isFlooring && (name.includes("wpc plank") || name.includes(String(product?.sku || "").toLowerCase()))) return;
      addRow(component, "bom");
    });

    materials
      .filter((material: any) => material.percentage === null || material.percentage === undefined || material.percentage === "")
      .forEach((material: any) => {
        addRow({
          id: `material-${material.id}`,
          component_name: material.material_name,
          component_name_zh: material.material_name_zh,
          component_type: material.material_type,
          component_type_zh: material.material_type_zh,
          quantity: null,
          unit: null,
          position: material.certification || material.recyclability,
        }, "material");
      });

    return Array.from(rows.values()).sort((a: any, b: any) => {
      const typeA = String(a.component_type || a.material_type || "");
      const typeB = String(b.component_type || b.material_type || "");
      return typeA.localeCompare(typeB);
    });
  }, [bom, isFlooring, materials, product?.sku]);

  const materialGroups = useMemo(() => {
    return groupRows(compositionMaterials, (material: any) => pick(material, locale, "material_type", "material_type_zh"));
  }, [compositionMaterials, locale]);

  const supplementalComponentGroups = useMemo(() => {
    return groupRows(supplementalComponents, (component: any) => pick(component, locale, "component_type", "component_type_zh"));
  }, [locale, supplementalComponents]);

  const totalRecycled = useMemo(() => {
    if (!compositionMaterials.length) return null;
    const weighted = compositionMaterials.reduce((sum: number, material: any) => {
      return sum + (Number(material.percentage || 0) * Number(material.recycled_content || 0)) / 100;
    }, 0);
    return Math.round(weighted);
  }, [compositionMaterials]);

  const materialProfileFromData = useMemo(() => {
    if (!compositionMaterials.length) return t.noData;
    return compositionMaterials
      .slice(0, 3)
      .map((material: any) => {
        const name = pick(material, locale, "material_name", "material_name_zh");
        const percentage = hasNumber(material.percentage) ? `${Number(material.percentage)}% ` : "";
        return `${percentage}${name}`;
      })
      .join(locale === "zh" ? " / " : " / ");
  }, [compositionMaterials, locale, t.noData]);
  const dataLastUpdatedValue =
    formatDate(product.updated_at || product.created_at, locale) !== "-"
      ? formatDate(product.updated_at || product.created_at, locale)
      : t.dataLastUpdatedValue;

  const nextActionFromData = compact([
    pick(product, locale, "care_instructions", "care_instructions_zh") !== "-" ? t.care : null,
    pick(product, locale, "repair_instructions", "repair_instructions_zh") !== "-" ? t.repair : null,
    pick(product, locale, "end_of_life_instructions", "end_of_life_instructions_zh") !== "-" ? t.endOfLife : null,
  ]) || t.noData;

  const verifiedCertificates = certificates.filter((certificate: any) => {
    return String(certificate.verification_status || "").toLowerCase() === "verified";
  }).length;
  const sgtin =
    firstIdentity?.gtin && firstIdentity?.serial_id
      ? `${firstIdentity.gtin}.${firstIdentity.serial_id}`
      : null;
  const hasConsumerData = Boolean(
    [
      firstTransparency?.brand_story,
      firstTransparency?.brand_story_zh,
      firstTransparency?.sustainability_story,
      firstTransparency?.sustainability_story_zh,
      firstTransparency?.consumer_notice,
      firstTransparency?.consumer_notice_zh,
      firstTransparency?.packaging_info,
      product.care_instructions,
      product.care_instructions_zh,
      product.repair_instructions,
      product.repair_instructions_zh,
      product.end_of_life_instructions,
      product.end_of_life_instructions_zh,
    ].some(hasDisplayValue)
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
    [t.digitalLink, dppUrl],
  ];
  const heroDetails: Array<[string, any]> = [
    [t.sku, product.sku],
    [t.gtin, firstIdentity?.gtin],
    [t.sgtin, sgtin],
    [t.batch, firstIdentity?.batch_id],
    [t.certificatesVerified, certificates.length ? `${verifiedCertificates} / ${certificates.length}` : t.pendingData],
    [t.dataVersionLabel, product.current_version || t.pendingData],
  ];
  const heroFocusCards: Array<[string, any, IconName]> = (isDemoProduct
    ? isElectronics
      ? [
        [t.complianceScope, locale === "zh" ? "CE / RoHS / REACH / WEEE" : "CE / RoHS / REACH / WEEE", "shield"],
        [locale === "zh" ? "电池与回收" : "Battery and WEEE", locale === "zh" ? "UN38.3 / 电池 MSDS" : "UN38.3 / battery MSDS", "file"],
        [t.performanceSnapshot, locale === "zh" ? "8 小时 / ≥500 次" : "8h / >=500 cycles", "check"],
        [t.nextAction, locale === "zh" ? "维修 / WEEE 回收" : "Repair / WEEE collection", "recycle"],
      ]
      : isFlooring
        ? [
          [locale === "zh" ? "规格尺寸" : "Dimensions", "140x25mm / 2.55kg/m", "box"],
          [locale === "zh" ? "材料配方" : "Material formula", materialProfileFromData, "layers"],
          [locale === "zh" ? "合规证据" : "Compliance evidence", locale === "zh" ? "REACH / VOC / FSC / ISO9001" : "REACH / VOC / FSC / ISO9001", "shield"],
          [locale === "zh" ? "回收路径" : "Recovery route", locale === "zh" ? "机械回收 / 移除金属件" : "Mechanical recycling / remove metal", "recycle"],
        ]
        : isFurniture
          ? [
            [t.performanceSnapshot, locale === "zh" ? "耐久性测试 / 7-10 年" : "Durability tested / 7-10 years", "check"],
            [locale === "zh" ? "可维修部件" : "Repairable modules", locale === "zh" ? "坐垫 / 扶手 / 脚轮 / 气压杆" : "Cushion / armrests / castors / gas lift", "tag"],
            [t.materialProfile, materialProfileFromData, "layers"],
            [t.certificatesVerified, `${verifiedCertificates} / ${certificates.length}`, "shield"],
          ]
          : [
              [t.materialProfile, materialProfileFromData, "layers"],
              [t.certificatesVerified, `${verifiedCertificates} / ${certificates.length}`, "shield"],
              [t.carbon, hasCarbonData ? `${carbonCurrent} kg CO2e` : t.noData, "carbon"],
              [t.nextAction, nextActionFromData, "recycle"],
            ]
    : [
        [t.materialProfile, materialProfileFromData, "layers"],
        [t.certificatesVerified, certificates.length ? `${verifiedCertificates} / ${certificates.length}` : t.pendingData, "shield"],
        [t.carbon, hasCarbonData ? `${carbonCurrent} kg CO2e` : t.pendingData, "carbon"],
        [t.nextAction, nextActionFromData, "recycle"],
      ]
  ).map(([label, value, icon]) => [label, value === t.noData ? t.pendingData : value, icon]) as Array<[string, any, IconName]>;
  const overviewStatusCards: Array<[string, string, IconName]> = [
    [t.overviewStatus1, t.overviewStatus1Desc, "qr"],
    [t.overviewStatus2, t.overviewStatus2Desc, "file"],
    [t.overviewStatus3, t.overviewStatus3Desc, "route"],
  ];
  const displayOrPending = (value: any) => (hasDisplayValue(value) ? value : t.pendingData);
  const bomWeightGrams = (rows: any[]) =>
    rows.reduce((sum, row) => {
      const unit = String(row.unit || "").toLowerCase();
      if (unit && unit !== "g" && unit !== "gram" && unit !== "grams") return sum;
      const quantity = Number(row.quantity);
      return Number.isFinite(quantity) ? sum + quantity : sum;
    }, 0);
  const totalBomWeightGrams = bomWeightGrams(bom);
  const mainFabricWeightGrams = bomWeightGrams(
    bom.filter((row: any) => {
      const type = String(row.component_type || row.component_type_zh || "").toLowerCase();
      return type.includes("fabric") || type.includes("面料");
    })
  );
  const repairableComponentNames = compact(
    bom
      .filter((row: any) => {
        const type = String(row.component_type || row.component_type_zh || "").toLowerCase();
        return type.includes("trim") || type.includes("label") || type.includes("zipper") || type.includes("辅料") || type.includes("标签");
      })
      .slice(0, 6)
      .map((row: any) => pick(row, locale, "component_name", "component_name_zh"))
      .filter(hasDisplayValue)
  );
  const materialChemicalInfo = compact(
    materials
      .map((row: any) => pick(row, locale, "chemical_info", "chemical_info_zh"))
      .filter(hasDisplayValue)
      .slice(0, 4)
  );
  const materialCertificationList = compact(
    materials
      .map((row: any) => row.certification)
      .filter(hasDisplayValue)
      .slice(0, 6)
  );
  const performanceItems: Array<[string, any]> = isDemoProduct ? (isElectronics
    ? [
        [locale === "zh" ? "单次续航" : "Battery life", locale === "zh" ? "8 小时" : "8 hours"],
        [locale === "zh" ? "充电循环寿命" : "Charge-cycle life", "≥ 500"],
        [locale === "zh" ? "蓝牙版本" : "Bluetooth version", "5.3"],
        [locale === "zh" ? "防护等级" : "Ingress protection", "IPX4"],
        [t.minimumLifetime, locale === "zh" ? "2 年" : "2 years"],
        [
          t.testBasis,
          locale === "zh"
            ? "示例性能声明，面向消费电子 DPP 技术文件展示；实际产品应以电池、EMC、安全和质检报告为准。"
            : "Demo performance declaration for consumer-electronics DPP display; real products should reference battery, EMC, safety and QA reports.",
        ],
      ]
    : isFlooring
      ? [
          [locale === "zh" ? "产品尺寸" : "Dimensions", "140x25mm"],
          [locale === "zh" ? "单位重量" : "Unit weight", "2.55kg/m"],
          [locale === "zh" ? "表面工艺" : "Surface finish", "SANDING"],
          [locale === "zh" ? "适用用途" : "Intended use", "OUTDOOR DECKING"],
          [t.minimumLifetime, locale === "zh" ? "10-15 年" : "10-15 years"],
          [
            t.testBasis,
            locale === "zh"
              ? "示例性能声明，面向 WPC PLANK / MS140K25B 户外 decking DPP 技术文件展示；实际产品应以 VOC、尺寸稳定性、安装和质保文件为准。"
              : "Demo performance declaration for WPC PLANK / MS140K25B outdoor decking DPP display; real products should reference VOC, dimensional-stability, installation and warranty documents.",
          ],
        ]
      : isFurniture
        ? [
            [locale === "zh" ? "座椅耐久性" : "Seating durability", locale === "zh" ? "通过 100,000 次循环测试" : "Pass, 100,000-cycle test"],
            [locale === "zh" ? "静载承重" : "Static load rating", "136 kg"],
            [locale === "zh" ? "可更换模块" : "Replaceable modules", locale === "zh" ? "坐垫、扶手、脚轮、气压杆" : "Seat cushion, armrests, castors, gas lift"],
            [locale === "zh" ? "拆解工具" : "Disassembly tools", locale === "zh" ? "六角扳手 + 标准螺丝刀" : "Hex key + standard screwdriver"],
            [t.minimumLifetime, locale === "zh" ? "7-10 年" : "7-10 years"],
            [
              t.testBasis,
              locale === "zh"
                ? "示例性能声明，面向家具 DPP 技术文件展示；实际产品应以耐久性、稳定性、承重和材料测试报告为准。"
                : "Demo performance declaration for furniture DPP display; real products should reference durability, stability, load and material test reports.",
            ],
          ]
    : [
        [t.washDurability, "≥ 50"],
        [t.tensileStrength, "≥ 450 N/m"],
        [t.colorFastness, "≥ Grade 3"],
        [t.shrinkage, "≤ 3%"],
        [t.minimumLifetime, locale === "zh" ? "2-3 年" : "2-3 years"],
        [t.testBasis, t.performanceBasis],
      ]
  ) : [
    [
      locale === "zh" ? "产品类型" : "Product type",
      displayOrPending(product.subcategory || product.category),
    ],
    [
      locale === "zh" ? "BOM 记录重量" : "BOM recorded weight",
      totalBomWeightGrams ? `${totalBomWeightGrams} g` : t.pendingData,
    ],
    [
      locale === "zh" ? "主面料记录重量" : "Main fabric recorded weight",
      mainFabricWeightGrams ? `${mainFabricWeightGrams} g` : t.pendingData,
    ],
    [
      locale === "zh" ? "可维修 / 可替换组件" : "Repairable / replaceable parts",
      displayOrPending(repairableComponentNames),
    ],
    [
      t.minimumLifetime,
      pick(product, locale, "estimated_lifetime", "estimated_lifetime_zh") !== "-"
        ? pick(product, locale, "estimated_lifetime", "estimated_lifetime_zh")
        : locale === "zh"
          ? "2-4 年（待客户确认）"
          : "2-4 years (pending customer confirmation)",
    ],
    [
      t.testBasis,
      locale === "zh"
        ? "基于客户已提供的产品、材料与 BOM 数据预填；耐洗、色牢度、拉伸强度等正式检测报告待客户上传后更新。"
        : "Pre-filled from customer-provided product, material and BOM data; wash durability, colour fastness and tensile-strength reports will be updated once uploaded.",
    ],
  ];
  const performanceMetrics = performanceItems.filter(([label]) => label !== t.testBasis).slice(0, 5);
  const performanceBasis = performanceItems.find(([label]) => label === t.testBasis);
  const chemicalRows = isDemoProduct ? (isElectronics
    ? [
        {
          item: locale === "zh" ? "RoHS 受限物质" : "RoHS restricted substances",
          result: locale === "zh" ? "通过" : "Pass",
          limit: "Pb, Cd, Hg, Cr(VI), PBB, PBDE below RoHS limits",
          type: "heavy-metals",
        },
        {
          item: t.svhcCandidate,
          result: t.notDetected,
          limit: t.svhcLimit,
          type: "svhc",
        },
        {
          item: locale === "zh" ? "电池 MSDS" : "Battery MSDS",
          result: t.available,
          limit: locale === "zh" ? "披露电池安全、运输和回收处理信息" : "Battery safety, transport and recycling handling information disclosed",
          type: "msds",
        },
        {
          item: locale === "zh" ? "皮肤接触材料筛查" : "Skin-contact material screening",
          result: t.notDetected,
          limit: locale === "zh" ? "硅胶耳塞受限物质筛查" : "Restricted-substance screening for silicone ear tips",
          type: "svhc",
        },
        ]
    : isFlooring
      ? [
          {
            item: t.svhcCandidate,
            result: t.notDetected,
            limit: t.svhcLimit,
            type: "svhc",
          },
          {
            item: locale === "zh" ? "VOC 排放" : "VOC emissions",
            result: locale === "zh" ? "通过" : "Pass",
            limit: locale === "zh" ? "室内空气质量 VOC 检测报告可查看" : "Indoor-air-quality VOC test report available",
            type: "msds",
          },
          {
            item: locale === "zh" ? "甲醛释放" : "Formaldehyde emission",
            result: locale === "zh" ? "低于申报限值" : "Below declaration limit",
            limit: "E1 / EN 717-1 demo criterion",
            type: "svhc",
          },
          {
            item: locale === "zh" ? "重金属 - 铅 / 镉 / 六价铬" : "Heavy metals - Pb / Cd / Cr(VI)",
            result: t.notDetected,
            limit: locale === "zh" ? "未有意添加；按建材 RSL 筛查" : "Not intentionally added; screened against building-materials RSL",
            type: "heavy-metals",
          },
        ]
      : isFurniture
        ? [
            {
              item: t.svhcCandidate,
              result: t.notDetected,
              limit: t.svhcLimit,
              type: "svhc",
            },
            {
              item: locale === "zh" ? "涂层重金属 - 铅 / 镉 / 六价铬" : "Coating heavy metals - Pb / Cd / Cr(VI)",
              result: t.notDetected,
              limit: locale === "zh" ? "按家具和表面涂层 RSL 筛查" : "Screened against furniture and surface-coating RSL",
              type: "heavy-metals",
            },
            {
              item: locale === "zh" ? "邻苯二甲酸酯与阻燃剂" : "Phthalates and flame retardants",
              result: locale === "zh" ? "通过" : "Pass",
              limit: locale === "zh" ? "塑料件和海绵添加剂筛查完成" : "Plastic and foam additive screening completed",
              type: "svhc",
            },
            {
              item: locale === "zh" ? "接触皮肤网布材料" : "Skin-contact mesh textile",
              result: locale === "zh" ? "通过" : "Pass",
              limit: locale === "zh" ? "按 REACH / OEKO-TEX 物质要求筛查" : "Screened against REACH / OEKO-TEX substance requirements",
              type: "azo",
            },
          ]
    : [
    {
      item: t.svhcCandidate,
      result: t.notDetected,
      limit: t.svhcLimit,
      type: "svhc",
    },
    {
      item: t.heavyMetalLead,
      result: "< 10 mg/kg",
      limit: t.leadLimit,
      type: "heavy-metals",
    },
    {
      item: t.heavyMetalCadmium,
      result: "< 1 mg/kg",
      limit: t.cadmiumLimit,
      type: "heavy-metals",
    },
    {
      item: t.heavyMetalChromium,
      result: t.notDetected,
      limit: t.chromiumLimit,
      type: "heavy-metals",
    },
    {
      item: t.azoDyes,
      result: t.notDetected,
      limit: t.azoLimit,
      type: "azo",
    },
    {
      item: t.msdsFile,
      result: t.available,
      limit: t.msdsLimit,
      type: "msds",
    },
      ]
  ) : [
    {
      item: t.svhcCandidate,
      result: locale === "zh" ? "待客户确认" : "Pending customer confirmation",
      limit: materialChemicalInfo || (locale === "zh" ? "未有意添加受限物质；正式 SVHC / REACH 文件待上传。" : "No intentionally added restricted substances declared; formal SVHC / REACH files pending upload."),
      type: "svhc",
    },
    {
      item: locale === "zh" ? "REACH / RSL 筛查" : "REACH / RSL screening",
      result: materialCertificationList || (locale === "zh" ? "待客户确认" : "Pending customer confirmation"),
      limit: locale === "zh" ? "按纺织品 REACH 与品牌 RSL 证据链预留。" : "Reserved for textile REACH and brand RSL evidence chain.",
      type: "svhc",
    },
    {
      item: locale === "zh" ? "重金属 - 铅 / 镉 / 六价铬" : "Heavy metals - Pb / Cd / Cr(VI)",
      result: locale === "zh" ? "待检测报告" : "Test report pending",
      limit: locale === "zh" ? "第三方重金属检测报告待客户上传。" : "Third-party heavy-metal test report pending customer upload.",
      type: "heavy-metals",
    },
    {
      item: t.azoDyes,
      result: locale === "zh" ? "待检测报告" : "Test report pending",
      limit: locale === "zh" ? "偶氮染料检测报告待客户上传。" : "Azo-dye test report pending customer upload.",
      type: "azo",
    },
    {
      item: t.msdsFile,
      result: documents.length ? t.available : locale === "zh" ? "待客户上传" : "Pending customer upload",
      limit: locale === "zh" ? "材料 MSDS / 化学品声明文件。" : "Material MSDS / chemical declaration files.",
      type: "msds",
    },
  ];
  const declarationItems: Array<[string, any]> = isDemoProduct ? [
    [
      t.applicableEuRules,
      isElectronics
        ? [
            t.declarationRule1,
            t.declarationRule2,
            locale === "zh" ? "Directive 2011/65/EU - RoHS 电子电气受限物质指令" : "Directive 2011/65/EU - RoHS restriction of hazardous substances",
            locale === "zh" ? "Directive 2012/19/EU - WEEE 电子电气废弃物指令" : "Directive 2012/19/EU - WEEE waste electrical and electronic equipment",
            locale === "zh" ? "Directive 2014/53/EU - RED 无线电设备指令" : "Directive 2014/53/EU - Radio Equipment Directive",
          ].join("\n")
        : isFlooring
          ? [
              t.declarationRule1,
              t.declarationRule2,
              locale === "zh" ? "Regulation (EU) No 305/2011 - 建筑产品法规 CPR 与性能声明" : "Regulation (EU) No 305/2011 - Construction Products Regulation and Declaration of Performance",
              locale === "zh" ? "EN 16516 / VOC 室内空气排放测试方法（示例）" : "EN 16516 / VOC indoor-air-emission test method (demo)",
            ].join("\n")
          : isFurniture
            ? [
                t.declarationRule1,
                t.declarationRule2,
                locale === "zh" ? "REACH - 家具材料、涂层和接触材料受限物质筛查" : "REACH - restricted-substance screening for furniture materials, coatings and contact materials",
                locale === "zh" ? "EN 1335 / 家具耐久性和安全性能测试（示例）" : "EN 1335 / furniture durability and safety performance testing (demo)",
              ].join("\n")
        : [t.declarationRule1, t.declarationRule2, t.declarationRule3, t.declarationRule4].join("\n"),
    ],
    [
      t.manufacturerInfo,
      isElectronics
        ? locale === "zh"
          ? "Demo Electronics Assembly Plant Co., Ltd., 18 Smart Hardware Road, Dongguan, Guangdong, China"
          : "Demo Electronics Assembly Plant Co., Ltd., 18 Smart Hardware Road, Dongguan, Guangdong, China"
        : isFlooring
          ? "HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD, Huangshan, Anhui, China"
          : isFurniture
            ? "Demo Office Furniture Factory Co., Ltd., 28 Modular Furniture Road, Anji, Zhejiang, China"
        : t.manufacturerValue,
    ],
    [t.importerInfo, t.importerValue],
    [t.declarationDate, t.declarationDateValue],
    [t.declarationValidity, t.declarationValidityValue],
  ] : [];
  const reuseItems: Array<[string, any]> = isDemoProduct ? (isElectronics
    ? [
        [t.takeBackPlanDetails, locale === "zh" ? "通过授权 WEEE 回收点或品牌回收计划提交旧耳机和充电盒。" : "Return used earbuds and charging case through authorized WEEE collection points or brand take-back."],
        [t.expectedResaleCycles, locale === "zh" ? "1 次，需通过电池健康检测" : "1 cycle, subject to battery-health screening"],
        [t.resalePriceRange, locale === "zh" ? "原零售价的 15%-35%" : "15%-35% of original retail price"],
      ]
    : isFlooring
      ? [
          [t.takeBackPlanDetails, locale === "zh" ? "通过安装商回收、项目余料回收或建材经销商回收计划回收旧板。" : "Return used planks through installer take-back, project offcut recovery or building-material distributor programs."],
          [t.expectedResaleCycles, locale === "zh" ? "1 次，需通过外观和锁扣完整性筛查" : "1 cycle, subject to visual and click-lock integrity screening"],
          [t.resalePriceRange, locale === "zh" ? "原零售价的 10%-30%" : "10%-30% of original retail price"],
        ]
      : isFurniture
        ? [
            [t.takeBackPlanDetails, locale === "zh" ? "通过办公家具翻新、经销商回收或企业大件家具回收计划提交。" : "Return through office-furniture refurbishment, distributor take-back or corporate bulky-furniture recovery programs."],
            [t.expectedResaleCycles, locale === "zh" ? "1-2 次，需通过稳定性和外观筛查" : "1-2 cycles, subject to stability and appearance screening"],
            [t.resalePriceRange, locale === "zh" ? "原零售价的 25%-50%" : "25%-50% of original retail price"],
          ]
    : [
        [t.takeBackPlanDetails, t.takeBackPlanValue],
        [t.expectedResaleCycles, locale === "zh" ? "1-2 次" : "1-2 cycles"],
        [t.resalePriceRange, locale === "zh" ? "原零售价的 20%-40%" : "20%-40% of original retail price"],
      ]
  ) : [];
  const repairItems: Array<[string, any]> = isDemoProduct ? (isElectronics
    ? [
        [t.commonRepairTypes, locale === "zh" ? "耳塞更换、充电盒检测、电池健康评估、固件重置、清洁维护" : "Ear-tip replacement, charging-case diagnostics, battery-health check, firmware reset and cleaning"],
        [t.repairProviders, locale === "zh" ? "Demo EU Electronics Service Network；授权电池维修服务商" : "Demo EU Electronics Service Network; authorized battery repair providers"],
        [t.sparePartsGuide, locale === "zh" ? "优先使用原厂耳塞、充电盒和合规电池组件；避免非授权电池替换。" : "Prioritize original ear tips, charging case and compliant battery modules; avoid unauthorized battery replacement."],
      ]
    : isFlooring
      ? [
          [t.commonRepairTypes, locale === "zh" ? "单片替换、锁扣修复、表面划痕修补、边条更换、局部重铺" : "Single-plank replacement, click-lock repair, surface scratch repair, trim replacement and local reinstall"],
          [t.repairProviders, locale === "zh" ? "Demo Flooring Installer Network；本地建材维修服务商" : "Demo Flooring Installer Network; local building-material repair providers"],
          [t.sparePartsGuide, locale === "zh" ? "保留同批次备用板、边条和地垫；避免胶粘安装导致后续拆解困难。" : "Keep spare planks, trims and underlayment from the same batch; avoid adhesive installation where future disassembly is required."],
        ]
      : isFurniture
        ? [
            [t.commonRepairTypes, locale === "zh" ? "脚轮更换、扶手垫更换、坐垫模块更换、气压杆更换、螺丝紧固" : "Castor replacement, armrest-pad replacement, seat-cushion replacement, gas-lift replacement and fastener tightening"],
            [t.repairProviders, locale === "zh" ? "Demo EU Furniture Service Network；本地办公家具维修服务商" : "Demo EU Furniture Service Network; local office-furniture repair providers"],
            [t.sparePartsGuide, locale === "zh" ? "优先使用兼容脚轮、扶手、坐垫和气压杆；维修前记录批次和紧固件位置。" : "Prioritize compatible castors, armrests, cushions and gas lifts; record batch and fastener positions before repair."],
          ]
    : [
        [t.commonRepairTypes, t.commonRepairTypesValue],
        [t.repairProviders, t.repairProvidersValue],
        [t.sparePartsGuide, t.sparePartsGuideValue],
      ]
  ) : [];
  const recyclingItems: Array<[string, any]> = isDemoProduct ? (isElectronics
    ? [
        [t.recyclableParts, locale === "zh" ? "ABS/PC 外壳、PCB 金属、铜件和电池材料，需按 WEEE 流程拆解。" : "ABS/PC housing, PCB metals, copper parts and battery materials after WEEE disassembly."],
        [t.removeBeforeRecycle, locale === "zh" ? "硅胶耳塞、包装附件和可拆卸线缆；含电池部件单独处理。" : "Silicone ear tips, packaging accessories and removable cable; battery-containing parts handled separately."],
        [t.recyclingFacilityLink, locale === "zh" ? "WEEE / 当地电子电气回收设施查询" : "WEEE / local e-waste collection locator"],
      ]
    : isFlooring
      ? [
          [t.recyclableParts, locale === "zh" ? "WPC 主板材、再生聚合物和木纤维复合料，可进入复合材料或建筑废弃物回收试点。" : "WPC main planks, recycled polymer and wood-fibre composite, suitable for composite-material or construction-waste recovery pilots."],
          [t.removeBeforeRecycle, locale === "zh" ? "地垫、金属边条、包装薄膜和安装辅料需单独分离。" : "Underlayment, metal trims, wrapping film and installation accessories should be separated."],
          [t.recyclingFacilityLink, locale === "zh" ? "建筑废弃物 / 复合材料回收设施查询" : "Construction-waste / composite-material recovery locator"],
        ]
      : isFurniture
        ? [
            [t.recyclableParts, locale === "zh" ? "钢制框架、再生塑料件、脚轮金属件和可拆卸包装材料。" : "Steel frame, recycled plastic parts, castor metals and removable packaging materials."],
            [t.removeBeforeRecycle, locale === "zh" ? "坐垫、网布、海绵、气压杆和紧固件需按材料分离。" : "Seat cushion, mesh, foam, gas lift and fasteners should be separated by material stream."],
            [t.recyclingFacilityLink, locale === "zh" ? "大件家具 / 金属与塑料回收设施查询" : "Bulky-furniture / metal and plastic recovery locator"],
          ]
    : [
        [t.recyclableParts, t.recyclablePartsValue],
        [t.removeBeforeRecycle, t.removeBeforeRecycleValue],
        [t.recyclingFacilityLink, locale === "zh" ? "Recycle Now / 当地纺织品回收设施查询" : "Recycle Now / local textile recycling locator"],
      ]
  ) : [];
  const actualEndOfLifeItems: Array<[string, any]> = ([
    [t.takeBack, firstCircularity?.take_back_program],
    [t.repair, pick(product, locale, "repair_instructions", "repair_instructions_zh")],
    [t.recyclability, hasNumber(firstCircularity?.recyclability_score) ? `${firstCircularity.recyclability_score} / 100` : null],
    [t.endOfLife, firstCircularity?.end_of_life_info || pick(product, locale, "end_of_life_instructions", "end_of_life_instructions_zh")],
  ] as Array<[string, any]>).filter(([, value]) => hasDisplayValue(value));
  const dataSourceRows = [
    {
      point: t.carbon,
      value: hasCarbonData ? `${carbonCurrent} kg CO2e` : t.noData,
      source: isElectronics
        ? locale === "zh" ? "LCA Database + 电子 BOM / 电池模型" : "LCA Database + electronics BOM / battery model"
        : isFlooring
          ? locale === "zh" ? "LCA Database + WPC 配方 / 挤出能耗模型" : "LCA Database + WPC formulation / extrusion-energy model"
        : t.carbonSource,
      verification: t.independentVerified,
      updated: dataLastUpdatedValue,
    },
    {
      point: t.water,
      value: hasWaterData ? `${waterCurrent} L` : t.noData,
      source: t.waterSource,
      verification: t.supplierDeclared,
      updated: dataLastUpdatedValue,
    },
    {
      point: t.waste,
      value: hasWasteData ? `${latestEsg.waste_generation} kg` : t.noData,
      source: t.wasteSource,
      verification: t.auditVerified,
      updated: dataLastUpdatedValue,
    },
    {
      point: t.recycled,
      value: totalRecycled !== null ? `${totalRecycled}%` : hasEsgRecycledData ? `${latestEsg.recycled_content}%` : t.noData,
      source: t.recycledSource,
      verification: t.independentVerified,
      updated: dataLastUpdatedValue,
    },
  ].filter((row) => row.value !== t.noData || isDemoProduct);
  const verificationItems: Array<[string, any]> = isDemoProduct
    ? ([
    [t.verificationAgency, t.verificationAgencyValue],
    [
      t.verificationScope,
      isElectronics
        ? locale === "zh"
          ? "碳足迹模型、RoHS/REACH 报告、电池 MSDS、CE 符合性声明和 WEEE 生命周期结束信息由第三方或文件证据验证；部分生产数据由制造商声明。"
          : "Carbon-footprint model, RoHS/REACH reports, battery MSDS, CE declaration and WEEE end-of-life information are verified by third-party or evidence files; selected production data are manufacturer-declared."
        : isFlooring
          ? locale === "zh"
            ? "碳足迹模型、VOC/甲醛检测、REACH 筛查、欧盟性能声明和再生成分声明由第三方或文件证据验证；部分生产数据由制造商声明。"
            : "Carbon-footprint model, VOC/formaldehyde tests, REACH screening, EU Declaration of Performance and recycled-content declarations are verified by third-party or evidence files; selected production data are manufacturer-declared."
          : isFurniture
            ? locale === "zh"
              ? "碳足迹模型、耐久性测试、REACH/重金属筛查、再生成分声明和可拆解设计由第三方或文件证据验证；部分生产数据由制造商声明。"
              : "Carbon-footprint model, durability tests, REACH/heavy-metal screening, recycled-content declarations and disassembly design are verified by third-party or evidence files; selected production data are manufacturer-declared."
        : t.verificationScopeValue,
    ],
    [t.verificationCertificate, isElectronics ? "SGS-DPP-AUDIO-2026-018" : isFlooring ? "DPP-WPC-2026-009" : isFurniture ? "DPP-FURN-2026-021" : t.verificationCertificateValue],
    [t.verificationExpiry, t.verificationExpiryValue],
    [t.lastUpdated, dataLastUpdatedValue],
      ] as Array<[string, any]>)
    : ([
        [t.verificationAgency, latestEsg?.verified_by || firstGovernance?.data_owner],
        [t.verificationScope, firstGovernance?.audit_status],
        [t.lastUpdated, dataLastUpdatedValue],
      ] as Array<[string, any]>).filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== "-");
  const simpleMetrics: Array<[string, any, IconName]> = ([
    [t.carbon, hasCarbonData ? `${carbonCurrent} kg CO2e` : t.noData, "carbon"],
    [t.certificatesVerified, certificates.length ? `${verifiedCertificates} / ${certificates.length}` : t.noData, "shield"],
    [t.recyclability, hasNumber(firstCircularity?.recyclability_score) ? `${firstCircularity.recyclability_score} / 100` : t.noData, "recycle"],
    [t.minimumLifetime, t.noData, "check"],
  ] as Array<[string, any, IconName]>).filter(([, value]) => hasDisplayValue(value) && value !== t.noData);
  const textileReserveItems: Array<[string, any]> = isDemoProduct ? (isElectronics
    ? [
        [locale === "zh" ? "电池拆解与回收准备" : "Battery removal and recycling readiness", locale === "zh" ? "预留电池护照字段；当前披露 MSDS、UN38.3 和 WEEE 回收路径。" : "Battery-passport fields reserved; MSDS, UN38.3 and WEEE path disclosed now."],
        [locale === "zh" ? "RoHS / CE 证据链" : "RoHS / CE evidence chain", locale === "zh" ? "预留后续与欧盟系统对接的合规文件索引和验证状态。" : "Evidence-file index and verification status reserved for future EU-system connection."],
        [locale === "zh" ? "固件与网络安全信息" : "Firmware and cybersecurity information", locale === "zh" ? "预留固件版本、蓝牙模块和安全更新记录字段。" : "Firmware version, Bluetooth module and security-update record fields reserved."],
        [locale === "zh" ? "维修备件可用性" : "Spare-part availability", locale === "zh" ? "预留耳塞、充电盒和电池服务件的供应周期与服务商信息。" : "Ear tips, charging case and battery service-part availability fields reserved."],
      ]
    : isFlooring
      ? [
          [locale === "zh" ? "建筑产品性能扩展" : "Construction-product performance extension", locale === "zh" ? "预留 CPR / DoP 对接字段、适用标准、安装方式和性能等级。" : "CPR / DoP integration fields, applicable standards, installation method and performance classes reserved."],
          [locale === "zh" ? "室内空气质量证据" : "Indoor-air-quality evidence", locale === "zh" ? "预留 VOC、甲醛、气味等级和低排放材料声明字段。" : "VOC, formaldehyde, odour class and low-emission material declaration fields reserved."],
          [locale === "zh" ? "拆解与再使用" : "Disassembly and reuse", locale === "zh" ? "预留项目拆除记录、旧板再使用筛选和建筑废弃物回收路径。" : "Project removal records, reuse screening and construction-waste recovery fields reserved."],
          [locale === "zh" ? "再生成分验证" : "Recycled-content verification", locale === "zh" ? "预留 60% 木纤维、30% 再生 HDPE、稳定剂和色母粒的供应商证据与批次质量平衡。" : "Supplier evidence and batch mass-balance reserved for 60% wood fiber, 30% recycled HDPE, stabilizer additives and masterbatch."],
        ]
      : isFurniture
        ? [
            [locale === "zh" ? "家具耐久性扩展" : "Furniture durability extension", locale === "zh" ? "预留 EN 1335 / 稳定性 / 承重测试报告索引和验证状态。" : "EN 1335 / stability / load-test report index and verification status reserved."],
            [locale === "zh" ? "维修备件可用性" : "Spare-part availability", locale === "zh" ? "预留脚轮、扶手、坐垫和气压杆的备件周期与兼容型号。" : "Castor, armrest, cushion and gas-lift availability and compatible models reserved."],
            [locale === "zh" ? "拆解与再制造" : "Disassembly and remanufacturing", locale === "zh" ? "预留拆解步骤、紧固件类型、再制造检查和部件再使用状态。" : "Disassembly steps, fastener types, remanufacturing checks and component reuse status reserved."],
            [locale === "zh" ? "材料循环证据" : "Material circularity evidence", locale === "zh" ? "预留钢材、再生塑料、网布和海绵的回收渠道与质量平衡证据。" : "Steel, recycled plastic, mesh and foam recovery channels and mass-balance evidence reserved."],
          ]
    : [
        [t.microfiberPotential, t.microfiberValue],
        [t.fullOriginTrace, t.fullOriginValue],
        [t.animalWelfare, t.animalWelfareValue],
        [t.laborCertification, t.laborCertificationValue],
      ]) : [
        [
          t.microfiberPotential,
          locale === "zh"
            ? "含再生涤纶 / 摇粒绒材料，微纤维释放潜力评估字段已预留，待客户上传洗涤或实验室测试数据。"
            : "Recycled polyester / fleece materials present; microfiber-release assessment is reserved pending wash or lab test data.",
        ],
        [
          t.fullOriginTrace,
          traceability.length
            ? compact(
                traceability
                  .map((event: any) => pick(event, locale, "facility_name", "facility_name_zh"))
                  .filter(hasDisplayValue)
                  .slice(0, 4)
              )
            : locale === "zh"
              ? "已预留原料、裁剪、缝制、包装和出口节点字段，待供应链资料补齐。"
              : "Material, cutting, sewing, packing and export nodes are reserved pending supplier data.",
        ],
        [
          t.animalWelfare,
          locale === "zh"
            ? "当前材料以涤纶、仿皮、口袋布和辅料为主，未识别动物源材料；如后续加入羽绒、羊毛或皮革需补充声明。"
            : "Current materials are mainly polyester, faux leather, pocket cloth and trims; no animal-origin material identified. Add declaration if down, wool or leather is later used.",
        ],
        [
          t.laborCertification,
          locale === "zh"
            ? "待客户补充 BSCI、WRAP、SA8000 或工厂社会责任审核文件。"
            : "BSCI, WRAP, SA8000 or factory social-compliance audit files pending customer upload.",
        ],
      ];
  const batchHistory: string[] = isDemoProduct ? (isElectronics
    ? [
        locale === "zh" ? "2026-04-16 电池、PCB 和外壳材料批次创建并绑定 RoHS / REACH 声明" : "2026-04-16 Battery, PCB and housing material batches created and linked to RoHS / REACH declarations",
        locale === "zh" ? "2026-05-30 总装与声学质检完成，SKU 与 SGTIN 生成" : "2026-05-30 Final assembly and acoustic QA completed; SKU and SGTIN generated",
        locale === "zh" ? "2026-06-02 出口运输记录写入，欧盟进口商仓库接收待确认" : "2026-06-02 Export shipment record added; EU importer warehouse receipt pending",
        locale === "zh" ? "2026-06-04 DPP 数据审核并更新公开页面" : "2026-06-04 DPP data reviewed and public page updated",
      ]
    : isFlooring
      ? [
          locale === "zh" ? "2026-04-20 木纤维、再生 HDPE、包装托盘和 304 不锈钢安装辅料供应商已绑定" : "2026-04-20 Wood fiber, recycled HDPE, pallet and 304 stainless accessory suppliers linked",
          locale === "zh" ? "2026-05-01 MS140K25B 开始挤出、砂光和型材加工，规格 140x25mm / 2.55kg/m" : "2026-05-01 MS140K25B extrusion, sanding and profile finishing started; 140x25mm / 2.55kg/m",
          locale === "zh" ? "2026-05-20 W2605-05 批次质检放行并生成 TRACE-W2605-05" : "2026-05-20 Batch W2605-05 released and TRACE-W2605-05 generated",
          locale === "zh" ? "2026-06-07 根据地板DPP.xlsx 更新公开 DPP 页面与下载数据" : "2026-06-07 Public DPP page and export data updated from 地板DPP.xlsx",
        ]
      : isFurniture
        ? [
            locale === "zh" ? "2026-04-12 钢材、再生塑料和网布批次创建并绑定供应商声明" : "2026-04-12 Steel, recycled plastic and mesh batches created and linked to supplier declarations",
            locale === "zh" ? "2026-05-22 框架焊接、软包和总装完成，耐久性抽检记录上传" : "2026-05-22 Frame welding, upholstery and assembly completed; durability sample records uploaded",
            locale === "zh" ? "2026-06-03 出口运输记录写入，鹿特丹家具经销仓接收待确认" : "2026-06-03 Export shipment record added; Rotterdam furniture distributor receipt pending",
            locale === "zh" ? "2026-06-06 家具 DPP 数据审核并更新公开页面" : "2026-06-06 Furniture DPP data reviewed and public page updated",
          ]
    : [t.batchRecord1, t.batchRecord2, t.batchRecord3, t.batchRecord4]) : traceability.length
      ? traceability.map((event: any) =>
          compact([
            formatDate(event.event_date || event.created_at, locale),
            pick(event, locale, "event_type", "event_type_zh"),
            pick(event, locale, "facility_name", "facility_name_zh"),
            compact([event.city, event.country].filter(hasDisplayValue)),
            pick(event, locale, "notes", "notes_zh"),
          ].filter(hasDisplayValue))
        )
      : [];
  const benchmarkNote = isDemoProduct ? (isElectronics
    ? locale === "zh"
      ? "低于示例消费电子同类平均值约 24%，主要来自再生塑料外壳、轻量化包装和较小物流体积假设。"
      : "About 24% below the demo consumer-electronics average, mainly from recycled plastic housing, lightweight packaging and lower shipping-volume assumptions."
    : isFlooring
      ? locale === "zh"
        ? "低于示例同类地板平均值约 26%，主要来自较高再生成分、木纤维替代和海运运输假设。"
        : "About 26% below the demo flooring average, mainly from higher recycled content, wood-fibre substitution and sea-freight assumptions."
      : isFurniture
        ? locale === "zh"
          ? "低于示例办公家具同类平均值约 22%，主要来自再生钢材、再生塑料部件、模块化维修和扁平化包装假设。"
          : "About 22% below the demo office-furniture average, mainly from recycled steel, recycled plastic parts, modular repair and flat-pack packaging assumptions."
    : t.benchmarkAdvantage) : "";
  const reserveIntro = isDemoProduct ? (isElectronics
    ? locale === "zh"
      ? "以下字段用于提前适配消费电子和电池相关 DPP 细化要求；当前作为预留和数据准备项展示。"
      : "These fields are reserved for consumer-electronics and battery-related DPP extensions; currently shown as data-readiness items."
    : isFlooring
      ? locale === "zh"
        ? "以下字段用于提前适配建材、建筑产品性能声明和室内空气质量相关 DPP 要求；当前作为预留和数据准备项展示。"
        : "These fields are reserved for building-material, construction-product performance and indoor-air-quality DPP requirements; currently shown as data-readiness items."
      : isFurniture
        ? locale === "zh"
          ? "以下字段用于提前适配家具耐久性、维修、拆解、再使用和材料循环相关 DPP 要求；当前作为预留和数据准备项展示。"
          : "These fields are reserved for furniture durability, repair, disassembly, reuse and material-circularity DPP requirements; currently shown as data-readiness items."
    : t.textileReserveIntro) : locale === "zh"
      ? "以下字段根据当前产品、材料、BOM 与供应链记录预填；客户补充正式文件后可继续更新。"
      : "The fields below are pre-filled from current product, material, BOM and supply-chain records; they can be updated once formal customer files are provided.";
  const householdWasteText = isDemoProduct ? (isElectronics
    ? locale === "zh"
      ? "请勿将耳机、充电盒或含电池部件作为生活垃圾丢弃，应进入 WEEE 或电池回收渠道。"
      : "Do not discard earbuds, charging case or battery-containing parts with household waste; use WEEE or battery collection streams."
    : isFlooring
      ? locale === "zh"
        ? "请勿将 WPC PLANK 混入普通生活垃圾或直接填埋；拆除后应进入建材回收或复合材料再加工渠道。"
        : "Do not mix WPC PLANK with ordinary household waste or landfill directly; use building-material recovery or composite-material reprocessing channels."
      : isFurniture
        ? locale === "zh"
          ? "可再使用或可维修时请勿作为混合垃圾丢弃；优先进入家具翻新、大件回收或授权回收渠道。"
          : "Do not discard as mixed waste when reuse or repair is possible; prioritize furniture refurbishment, bulky-waste recovery or authorized collection."
    : t.noHouseholdWasteDesc) : "";
  const removePartsText = isDemoProduct ? (isElectronics
    ? locale === "zh"
      ? "回收前尽量分离硅胶耳塞、包装配件和可拆卸线缆；电池部件由授权机构处理。"
      : "Where possible, separate silicone ear tips, packaging accessories and removable cables before recycling; battery parts should be handled by authorized facilities."
    : isFlooring
      ? locale === "zh"
        ? "回收前移除 304 不锈钢卡扣和螺丝，托盘与金属紧固件分别回收；避免混入 PVC 废料。"
        : "Remove 304 stainless clips and screws before recycling; recycle pallet and metal fasteners separately and avoid mixing with PVC waste."
      : isFurniture
        ? locale === "zh"
          ? "回收前分离脚轮、扶手、气压杆、坐垫、网布和紧固件，按金属、塑料和纺织/海绵流处理。"
          : "Separate castors, armrests, gas lift, cushion, mesh and fasteners before sorting into metal, plastic and textile/foam streams."
    : t.removeTrimsDesc) : "";
  const collectionText = isDemoProduct ? (isElectronics
    ? locale === "zh"
      ? "可维修或转售时优先延长使用寿命；无法继续使用时送至当地电子电气回收点。"
      : "Extend product life through repair or resale where possible; send unusable units to local electronics collection points."
    : isFlooring
      ? locale === "zh"
        ? "完整板材优先再使用；无法再使用时进行机械回收，并再加工为复合材料产品。"
        : "Reuse intact planks first; mechanically recycle unusable material and reprocess it into composite products."
      : isFurniture
        ? locale === "zh"
          ? "完好部件优先维修、翻新或转售；无法继续使用时按材料拆解进入当地回收渠道。"
          : "Repair, refurbish or resell intact components first; disassemble unusable parts into local material recovery channels."
    : t.textileCollectionDesc) : "";
  const navItems: Array<[string, string, IconName]> = [
    ["#identity", t.productIdentity, "box"],
    ["#materials", t.materialSource, "layers"],
    ["#chemicals", t.chemicalRestricted, "file"],
    ["#performance", t.productPerformance, "shield"],
    ["#traceability", t.traceability, "route"],
    ["#esg", t.esg, "leaf"],
    ["#certificates", t.certificates, "certificate"],
    ["#consumer", t.consumer, "eye"],
    ["#end-of-life", t.endOfLifeGuide, "recycle"],
    ["#textile-reserve", t.textileReserve, "layers"],
    ["#batch-tracking", t.batchTracking, "route"],
    ["#evidence", t.evidence, "file"],
  ];
  const simpleNavItems: Array<[string, string, IconName]> = [
    ["#identity", t.productIdentity, "box"],
    ["#materials", t.materialSource, "layers"],
    ["#traceability", t.traceability, "route"],
    ["#esg", t.esg, "leaf"],
    ["#certificates", t.certificates, "certificate"],
    ["#consumer", t.consumer, "eye"],
  ];
  const currentNavItems = viewMode === "simple" ? simpleNavItems : navItems;

  return (
    <main className="min-h-screen bg-[#f7faf8] text-slate-950" aria-label={t.passport}>
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <BrandLogo href={`/?lang=${locale}`} size="md" />

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 shadow-sm">
              {lifecycleStatusLabel}
            </span>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white" aria-labelledby="dpp-product-title">
        <div className="absolute inset-0 dpp-grid opacity-25" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.98),rgba(15,23,42,0.88)_50%,rgba(5,46,22,0.82))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1fr_380px] lg:py-16">
          <div className="dpp-fade">
            <div className="flex flex-wrap gap-2">
              <Badge tone="dark">{t.passport}</Badge>
              <Badge tone="dark">{valueOrDash(product.dpp_id, locale)}</Badge>
              <Badge tone="dark">{pick(product, locale, "category")}</Badge>
            </div>

            <h1 id="dpp-product-title" className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
              {pick(product, locale, "name", "name_zh")}
            </h1>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {heroDetails.map(([label, value]) => (
                <Info key={label} label={label} value={value} locale={locale} variant="dark" />
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {heroFocusCards.map(([label, value, icon]) => (
                <HeroFocusCard key={label} label={label} value={value} locale={locale} icon={icon} />
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-sm font-black text-brand-100">{t.overviewStatusTitle}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {overviewStatusCards.map(([title, desc, icon]) => (
                  <div key={title} className="flex gap-3 rounded-lg bg-slate-950/25 p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-400/15 text-brand-100 ring-1 ring-brand-300/25">
                      <Icon name={icon} className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-white">{title}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  href={`/api/dpp-export?format=pdf&lang=${locale}&product=${encodeURIComponent(dppProductRef)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-600 hover:text-white"
                >
                  {t.downloadPdf}
                </a>
                <a
                  href={`/api/dpp-export?format=json&lang=${locale}&product=${encodeURIComponent(dppProductRef)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
                >
                  {t.downloadJson}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1680px] gap-6 px-6 py-8 xl:grid-cols-[184px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <nav className="sticky top-24 space-y-1 rounded-lg border border-slate-200/80 bg-white/75 p-2 shadow-sm backdrop-blur-xl" aria-label="DPP section navigation">
            <p className="px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-400">{t.passport}</p>
            {currentNavItems.map(([href, label, icon]) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-brand-700"
              >
                <Icon name={icon} className="h-4 w-4 text-brand-700" />
                <span className="leading-5">{label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
        <nav className="mb-6 flex gap-2 overflow-x-auto xl:hidden" aria-label="DPP section navigation">
          {currentNavItems.map(([href, label, icon]) => (
            <a
              key={href}
              href={href}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white/85 px-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-brand-700"
            >
              <Icon name={icon} className="h-4 w-4 text-brand-700" />
              {label}
            </a>
          ))}
        </nav>

        {viewMode === "simple" && (
          <div className="space-y-6">
            <Section id="identity" title={t.productIdentity} eyebrow={t.overview} icon="box">
              <DataCard title={t.productRecordTitle} icon="box" surface="soft">
                <InfoGrid
                  items={[
                    [t.dppId, product.dpp_id],
                    [t.sku, product.sku],
                    [t.brandLabel, product.brand],
                    [t.category, product.category],
                    [t.gtin, firstIdentity?.gtin],
                    [t.sgtin, sgtin],
                  ]}
                  locale={locale}
                />
              </DataCard>
            </Section>

            <Section id="materials" title={t.materialSource} icon="layers">
              {compositionMaterials.length || supplementalComponents.length ? (
                <div className="space-y-5">
                  {compositionMaterials.length ? <GroupedMaterialList groups={materialGroups} locale={locale} t={t} /> : null}
                  {supplementalComponents.length ? (
                    <DataCard title={t.componentSupplement} icon="tag" surface="soft">
                      <GroupedComponentSupplementList groups={supplementalComponentGroups} locale={locale} t={t} />
                    </DataCard>
                  ) : null}
                </div>
              ) : (
                <Empty text={t.pendingData} />
              )}
            </Section>

            <Section id="traceability" title={t.traceability} icon="route">
              {traceability.length ? (
                <div className="space-y-4">
                  {traceability.slice(0, 4).map((event: any, index: number) => (
                    <TimelineItem
                      key={event.id || index}
                      title={pick(event, locale, "event_name", "event_name_zh")}
                      items={[
                        [t.date, formatDate(event.event_date, locale)],
                        [t.facility, pick(event, locale, "facility_name", "facility_name_zh")],
                        [t.location, compact([event.city, event.country])],
                        [t.transport, event.transport_method],
                        [t.status, event.verification_status],
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
              <div className="grid gap-4 lg:grid-cols-2">
                <InfoGrid
                  items={[
                    [t.carbon, hasCarbonData ? `${carbonCurrent} kg CO2e` : null],
                    [t.water, hasWaterData ? `${waterCurrent} L` : null],
                    [t.energy, latestEsg?.energy_consumption ? `${latestEsg.energy_consumption} kWh` : null],
                    [t.recycled, totalRecycled === null ? latestEsg?.recycled_content ? `${latestEsg.recycled_content}%` : null : `${totalRecycled}%`],
                    [t.recyclability, firstCircularity?.recyclability_score ? `${firstCircularity.recyclability_score} / 100` : null],
                    [t.takeBack, firstCircularity?.take_back_program],
                  ]}
                  locale={locale}
                />
                <DataCard title={t.visualizationTitle} icon="leaf" surface="soft">
                  {hasWaterData ? (
                    <ComparisonBars
                      currentLabel={t.thisProduct}
                      averageLabel={t.industryAverage}
                      currentValue={waterCurrent}
                      averageValue={waterAverage}
                      unit="L"
                      note={t.waterBenchmark}
                    />
                  ) : (
                    <Empty text={t.pendingData} />
                  )}
                </DataCard>
              </div>
            </Section>

            <Section id="certificates" title={t.certificates} icon="certificate">
              {certificates.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {certificates.slice(0, 4).map((certificate: any) => (
                    <DataCard key={certificate.id} title={pick(certificate, locale, "certificate_name", "certificate_name_zh")} icon="certificate">
                      <div className="mb-4">
                        <StatusBadge value={certificate.verification_status} locale={locale} verified={t.verified} pending={t.pending} />
                      </div>
                      <InfoGrid
                        items={[
                          [t.number, certificate.certificate_number],
                          [t.issuer, certificate.issuer],
                          [t.expiryDate, formatDate(certificate.expiry_date, locale)],
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
                      [t.packaging, firstTransparency?.packaging_info],
                      [t.endOfLife, firstCircularity?.end_of_life_info || pick(product, locale, "end_of_life_instructions", "end_of_life_instructions_zh")],
                    ]}
                    locale={locale}
                  />
                </div>
              ) : (
                <Empty text={t.pendingData} />
              )}
            </Section>
          </div>
        )}

        {viewMode === "detail" && (
          <>
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
          </>
        )}

        {viewMode === "detail" && <Section id="materials" title={t.materialSource} icon="layers">
          {compositionMaterials.length || supplementalComponents.length ? (
            <div className="space-y-5">
              {compositionMaterials.length ? (
                <div>
                  <p className="mb-3 text-sm font-black text-brand-700">{t.materialFormula}</p>
                  <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">{t.materialGroupIntro}</p>
                  <GroupedMaterialList groups={materialGroups} locale={locale} t={t} />
                </div>
              ) : null}
              {supplementalComponents.length ? (
                <DataCard title={t.componentSupplement} icon="tag" surface="soft">
                  <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">{t.componentSupplementIntro}</p>
                  <GroupedComponentSupplementList groups={supplementalComponentGroups} locale={locale} t={t} />
                </DataCard>
              ) : null}
            </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>}

        {viewMode === "detail" && <Section id="chemicals" title={t.chemicalRestricted} icon="file">
          <DataCard title={t.chemicalTitle} icon="file" surface="soft">
            <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">{t.chemicalIntro}</p>
            {chemicalRows.length ? (
              <ChemicalTable rows={chemicalRows} locale={locale} t={t} productSlug={product.public_slug || "demo-organic-cotton-tshirt"} />
            ) : (
              <Empty text={t.pendingData} />
            )}
          </DataCard>
        </Section>}

        {viewMode === "detail" && <Section id="performance" title={t.productPerformance} icon="shield">
          {performanceItems.length ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {performanceMetrics.map(([label, value]) => (
                <PerformanceSummaryCard key={label} label={label} value={value} locale={locale} icon="check" />
              ))}
            </div>
            {performanceBasis ? (
              <DataCard title={t.testBasis} icon="file" surface="soft">
                <p className="text-sm font-semibold leading-7 text-slate-700">
                  {valueOrDash(performanceBasis[1], locale)}
                </p>
              </DataCard>
            ) : null}
          </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>}

        {viewMode === "detail" && <Section id="traceability" title={t.traceability} icon="route">
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
        </Section>}

        {viewMode === "detail" && <Section id="esg" title={t.esg} icon="leaf">
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
        </Section>}

        {viewMode === "detail" && <Section id="certificates" title={t.certificates} icon="certificate">
          {certificates.length || declarationItems.length ? (
            <div className="space-y-4">
              {certificates.length > 0 && (
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
              )}
              {declarationItems.length > 0 && (
                <DataCard title={t.declarationTitle} icon="file" surface="soft">
                  <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">{t.declarationIntro}</p>
                  <InfoGrid items={declarationItems} locale={locale} />
                  <a
                    href={`/api/declaration?lang=${locale}&product=${encodeURIComponent(dppProductRef)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg sm:w-auto"
                  >
                    <Icon name="pdf" className="h-5 w-5" />
                    {t.declarationDownload}
                  </a>
                </DataCard>
              )}
            </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>}

        {viewMode === "detail" && <Section id="consumer" title={t.consumer} icon="eye">
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
        </Section>}

        {viewMode === "detail" && <Section id="end-of-life" title={t.endOfLifeGuide} icon="recycle">
          {isDemoProduct ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-bold uppercase text-emerald-700">{t.consumer}</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">{t.endOfLife}</h3>
                <p className="mt-3 leading-7 text-slate-700">{t.endOfLifeIntro}</p>
              </div>
              <div className="grid gap-4 2xl:grid-cols-3">
                <DataCard title={t.reuseOptions} icon="recycle" surface="soft">
                  <InfoGrid items={reuseItems} locale={locale} />
                  <a
                    href={recycleLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg"
                  >
                    <Icon name="recycle" className="h-5 w-5" />
                    {t.takeBackPlanLink}
                  </a>
                </DataCard>
                <DataCard title={t.repairAndUpcycle} icon="scissors" surface="soft">
                  <InfoGrid items={repairItems} locale={locale} />
                </DataCard>
                <DataCard
                  title={
                    isElectronics
                      ? locale === "zh"
                        ? "WEEE / 电子电气回收"
                        : "WEEE / E-waste recycling"
                      : isFlooring
                        ? locale === "zh"
                          ? "建筑废弃物 / WPC 回收"
                          : "Construction-waste / WPC recovery"
                        : t.textileRecycling
                  }
                  icon="trash"
                  surface="soft"
                >
                  <InfoGrid items={recyclingItems} locale={locale} />
                  <a
                    href={recycleLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
                  >
                    <Icon name="recycle" className="h-5 w-5" />
                    {t.recyclingFacilityLink}
                  </a>
                </DataCard>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <GuideCard icon="trash" title={t.noHouseholdWaste} text={householdWasteText} />
                <GuideCard icon="scissors" title={isElectronics || isFlooring ? (locale === "zh" ? "回收前分离可拆部件" : "Separate removable parts before recycling") : t.removeTrims} text={removePartsText} />
                <GuideCard icon="recycle" title={isElectronics ? (locale === "zh" ? "优先维修，再进入电子回收" : "Repair first, then e-waste recycling") : isFlooring ? (locale === "zh" ? "优先再使用，再进入建材回收" : "Reuse first, then building-material recovery") : t.textileCollection} text={collectionText} />
              </div>
            </div>
          ) : (
            actualEndOfLifeItems.length ? (
              <DataCard title={t.endOfLife} icon="recycle" surface="soft">
                <InfoGrid items={actualEndOfLifeItems} locale={locale} />
              </DataCard>
            ) : (
              <Empty text={t.pendingData} />
            )
          )}
        </Section>}

        {viewMode === "detail" && <Section id="textile-reserve" title={t.textileReserve} icon="layers">
          {textileReserveItems.length ? (
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                <h3 className="text-2xl font-black text-slate-950">{t.textileReserve}</h3>
                <p className="mt-3 leading-7 text-slate-700">{reserveIntro}</p>
                <p className="mt-4 text-sm font-bold text-blue-700">{t.lastUpdatedLabel}: {dataLastUpdatedValue}</p>
              </div>
              <InfoGrid items={textileReserveItems} locale={locale} />
            </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>}

        {viewMode === "detail" && <Section id="batch-tracking" title={t.batchTracking} icon="route">
          {batchHistory.length ? (
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <DataCard title={t.batchHistoryTitle} icon="route" surface="soft">
              <div className="space-y-3">
                {batchHistory.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
                    <p className="text-sm font-semibold leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </DataCard>
            <DataCard title={t.visualizationTitle} icon="carbon" surface="soft">
              {hasCarbonData ? (
                <ComparisonBars
                  currentLabel={t.thisProduct}
                  averageLabel={t.industryAverage}
                  currentValue={carbonCurrent}
                  averageValue={carbonAverage}
                  unit="kg CO2e"
                  note={`${t.lastUpdatedLabel}: ${dataLastUpdatedValue}`}
                />
              ) : (
                <Empty text={t.pendingData} />
              )}
            </DataCard>
          </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>}

        {viewMode === "detail" && <Section id="evidence" title={t.evidence} icon="file">
          {dataSourceRows.length || verificationItems.length || documents.length || governance.length ? (
          <div className="space-y-4">
            {dataSourceRows.length > 0 && (
              <DataCard title={t.dataTransparencyTitle} icon="file" surface="soft">
                <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">{t.dataTransparencyIntro}</p>
                <DataSourceTable rows={dataSourceRows} t={t} />
              </DataCard>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {verificationItems.length > 0 && (
                <DataCard title={t.verificationAgency} icon="shield" surface="soft">
                  <InfoGrid items={verificationItems} locale={locale} />
                </DataCard>
              )}
              {documents.length > 0 && (
                <DataCard title={t.evidence} icon="file" surface="soft">
                  <div className="space-y-3">
                    {documents.map((document: any) => (
                      <InfoGrid
                        key={document.id}
                        items={[
                          [t.documentName, document.document_name || t.documentName],
                          ["Type", document.document_type],
                          ["Language", document.language],
                          ["Version", document.version],
                          ["Size", document.file_size],
                        ]}
                        locale={locale}
                      />
                    ))}
                  </div>
                </DataCard>
              )}
              {governance.length > 0 && (
                <DataCard title={t.dataTransparencyTitle} icon="file" surface="soft">
                  <div className="space-y-3">
                    {governance.map((item: any) => (
                      <InfoGrid
                        key={item.id}
                        items={[
                          [t.dataSource, item.data_source],
                          [t.dataOwner, item.data_owner],
                          [t.verificationScope, item.audit_status],
                          [locale === "zh" ? "数据质量分" : "Data quality score", hasNumber(item.data_quality_score) ? `${item.data_quality_score}` : null],
                        ]}
                        locale={locale}
                      />
                    ))}
                  </div>
                </DataCard>
              )}
            </div>
          </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>}

        </div>

        <footer className="border-t border-slate-200 pt-8 xl:col-span-2">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <BrandLogo href={`/?lang=${locale}`} size="md" />
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">{t.footerTagline}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/?lang=${locale}#showroom`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-emerald-200 hover:text-brand-700"
              >
                {t.footerDemo}
              </Link>
              <Link
                href={`/?lang=${locale}#contact`}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-brand-700 transition hover:bg-emerald-600 hover:text-white"
              >
                {t.footerContact}
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-5 text-sm font-semibold text-slate-500">
            <span>{t.footerCopyright}</span>
            <span>greanlean.com</span>
          </div>
        </footer>
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

function HeroFocusCard({ label, value, locale, icon }: { label: string; value: any; locale: Locale; icon: IconName }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-brand-300/50 hover:bg-white/15">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-400/15 text-brand-100 ring-1 ring-brand-300/25">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-slate-400">{label}</p>
          <p className="mt-2 text-sm font-black leading-6 text-white">{valueOrDash(value, locale)}</p>
        </div>
      </div>
    </div>
  );
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

function PerformanceSummaryCard({
  label,
  value,
  locale,
  icon,
}: {
  label: string;
  value: any;
  locale: Locale;
  icon: IconName;
}) {
  return (
    <div className="dpp-fade overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <div className="h-1 bg-[linear-gradient(90deg,#16a34a,#0f766e)]" />
      <div className="flex min-h-[132px] items-start gap-4 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-slate-500">{label}</p>
          <p className="mt-3 break-words text-lg font-black leading-7 text-slate-950 md:text-xl">
            {valueOrDash(value, locale)}
          </p>
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
        <div key={label} className="grid gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(96px,0.35fr)_minmax(0,1fr)]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-brand-50 text-brand-700">
              <Icon name="info" className="h-3.5 w-3.5" />
            </span>
            <span>{label}</span>
          </div>
          <p className="min-w-0 whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-950">{valueOrDash(value, locale)}</p>
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

function ChemicalTable({
  rows,
  locale,
  t,
  productSlug,
}: {
  rows: Array<{ item: string; result: string; limit: string; type: string }>;
  locale: Locale;
  t: any;
  productSlug: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[1.25fr_0.8fr_1.35fr_170px] bg-slate-950 px-4 py-3 text-xs font-black uppercase text-white md:grid">
        <span>{t.testItem}</span>
        <span>{t.testResult}</span>
        <span>{t.limitValue}</span>
        <span>{t.reportFile}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={`${row.type}-${row.item}`} className="grid gap-3 px-4 py-4 md:grid-cols-[1.25fr_0.8fr_1.35fr_170px] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.testItem}</p>
              <p className="font-black text-slate-950">{row.item}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.testResult}</p>
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">{row.result}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.limitValue}</p>
              <p className="text-sm font-semibold leading-6 text-slate-700">{row.limit}</p>
            </div>
            <a
              href={`/api/chemical-document?type=${encodeURIComponent(row.type)}&lang=${locale}&product=${encodeURIComponent(productSlug)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-600 hover:text-white"
            >
              <Icon name="pdf" className="h-4 w-4" />
              {t.downloadReport}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupedMaterialList({
  groups,
  locale,
  t,
}: {
  groups: Array<{ label: string; items: any[] }>;
  locale: Locale;
  t: any;
}) {
  return (
    <div className="space-y-3">
      {groups.map((group, index) => (
        <details key={group.label} open={index === 0} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-slate-50 px-4 py-3 transition hover:bg-emerald-50">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Icon name="layers" className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black text-slate-950">{group.label}</p>
                <p className="mt-0.5 text-xs font-bold text-slate-500">{group.items.length} {t.groupCount}</p>
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">{t.openGroup}</span>
          </summary>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {group.items.map((material: any) => (
              <MaterialCard key={material.id} item={material} locale={locale} t={t} />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function GroupedComponentSupplementList({
  groups,
  locale,
  t,
}: {
  groups: Array<{ label: string; items: any[] }>;
  locale: Locale;
  t: any;
}) {
  return (
    <div className="space-y-3">
      {groups.map((group, index) => (
        <details key={group.label} open={index === 0} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-white px-4 py-3 transition hover:bg-emerald-50">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Icon name="tag" className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black text-slate-950">{group.label}</p>
                <p className="mt-0.5 text-xs font-bold text-slate-500">{group.items.length} {t.groupCount}</p>
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{t.openGroup}</span>
          </summary>
          <div className="p-4">
            <ComponentSupplementTable rows={group.items} locale={locale} t={t} />
          </div>
        </details>
      ))}
    </div>
  );
}

function ComponentSupplementTable({ rows, locale, t }: { rows: any[]; locale: Locale; t: any }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[1.2fr_1fr_0.7fr_1.4fr] bg-slate-950 px-4 py-3 text-xs font-black uppercase text-white md:grid">
        <span>{t.itemName}</span>
        <span>{t.component}</span>
        <span>{t.quantity}</span>
        <span>{t.position}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row: any, index: number) => (
          <div key={row.id || `${row.component_name || row.material_name}-${index}`} className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_1fr_0.7fr_1.4fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.itemName}</p>
              <p className="font-black text-slate-950">{pick(row, locale, "component_name", "component_name_zh")}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.component}</p>
              <p className="text-sm font-semibold leading-6 text-slate-700">{pick(row, locale, "component_type", "component_type_zh")}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.quantity}</p>
              <p className="text-sm font-semibold leading-6 text-slate-700">{valueOrDash(compact([row.quantity, row.unit]), locale)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.position}</p>
              <p className="text-sm font-semibold leading-6 text-slate-700">{valueOrDash(row.position, locale)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataSourceTable({
  rows,
  t,
}: {
  rows: Array<{ point: string; value: string; source: string; verification: string; updated: string }>;
  t: any;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[1fr_0.8fr_1.2fr_1fr_0.8fr] bg-slate-950 px-4 py-3 text-xs font-black uppercase text-white md:grid">
        <span>{t.dataPoint}</span>
        <span>{t.dataValue}</span>
        <span>{t.sourceLabel}</span>
        <span>{t.verificationLabel}</span>
        <span>{t.lastUpdated}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.point} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_0.8fr_1.2fr_1fr_0.8fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.dataPoint}</p>
              <p className="font-black text-slate-950">{row.point}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.dataValue}</p>
              <p className="font-semibold text-slate-950">{row.value}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.sourceLabel}</p>
              <p className="text-sm font-semibold leading-6 text-slate-700">{row.source}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.verificationLabel}</p>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{row.verification}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 md:hidden">{t.lastUpdated}</p>
              <p className="text-sm font-semibold text-slate-700">{row.updated}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonBars({
  currentLabel,
  averageLabel,
  currentValue,
  averageValue,
  unit,
  note,
}: {
  currentLabel: string;
  averageLabel: string;
  currentValue: number;
  averageValue: number;
  unit: string;
  note: string;
}) {
  const max = Math.max(currentValue, averageValue);
  const currentWidth = `${Math.max(8, Math.round((currentValue / max) * 100))}%`;
  const averageWidth = `${Math.max(8, Math.round((averageValue / max) * 100))}%`;

  return (
    <div>
      <div className="space-y-4" role="img" aria-label={`${currentLabel}: ${currentValue} ${unit}; ${averageLabel}: ${averageValue} ${unit}`}>
        <div>
          <div className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
            <span>{currentLabel}</span>
            <span>{currentValue} {unit}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand-600 dpp-progress" style={{ width: currentWidth }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
            <span>{averageLabel}</span>
            <span>{averageValue} {unit}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-slate-500" style={{ width: averageWidth }} />
          </div>
        </div>
      </div>
      <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800">{note}</p>
    </div>
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
    <details className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm transition duration-300 open:bg-white hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
      <summary className="flex cursor-pointer items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-950 text-white shadow-sm">
          <Icon name="route" className="h-6 w-6" />
        </span>
        <span className="font-black text-slate-950">{title}</span>
      </summary>
      <div className="mt-4 pl-0 sm:pl-16">
        <InfoGrid items={items} locale={locale} />
      </div>
    </details>
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
