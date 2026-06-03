"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";

type Locale = "en" | "zh";
type Props = { data: any; dppUrl: string };

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

export function PublicDppClient({ data, dppUrl }: Props) {
  const { locale } = useLanguage();
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
          productIdentity: "1. 产品基本信息",
          materialSource: "2. 材料组成与来源",
          traceability: "3. 生产与运输追溯",
          esg: "4. ESG 与循环性",
          certificates: "5. 认证证书",
          consumer: "6. 消费者透明化",
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
          productIdentity: "1. Product basics",
          materialSource: "2. Materials and sources",
          traceability: "3. Production and transport traceability",
          esg: "4. ESG and circularity",
          certificates: "5. Certificates",
          consumer: "6. Consumer transparency",
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
    [t.batch, firstIdentity?.batch_id],
    [t.serial, firstIdentity?.serial_id],
    [t.digitalLink, firstIdentity?.digital_link_url],
  ];

  const summaryMetrics: Array<[string, any]> = [
    [t.materialCount, materials.length],
    [t.recycled, totalRecycled === null ? "0%" : `${totalRecycled}%`],
    [t.carbon, latestEsg?.carbon_footprint ? `${latestEsg.carbon_footprint} kg CO2e` : "0 kg CO2e"],
    [t.certificatesVerified, `${verifiedCertificates} / ${certificates.length}`],
  ];
  const navItems = [
    ["#identity", t.productIdentity],
    ["#materials", t.materialSource],
    ["#traceability", t.traceability],
    ["#esg", t.esg],
    ["#certificates", t.certificates],
    ["#consumer", t.consumer],
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
              {productDetails.slice(1, 5).map(([label, value]) => (
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
          {summaryMetrics.map(([label, value]) => (
            <Metric key={label} label={label} value={value} locale={locale} />
          ))}
        </div>
      </section>

      <nav className="sticky top-[73px] z-30 border-b border-slate-200/80 bg-[#f7faf8]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 py-3">
          {navItems.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <Section id="identity" title={t.productIdentity} eyebrow={t.overview}>
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoGrid items={productDetails} locale={locale} />
            <InfoGrid items={identityDetails} locale={locale} />
          </div>
        </Section>

        <Section id="materials" title={t.materialSource}>
          {materials.length || bom.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {materials.map((material: any) => (
                <MaterialCard key={material.id} item={material} locale={locale} t={t} />
              ))}
              {bom.map((component: any) => (
                <DataCard key={component.id} title={pick(component, locale, "component_name", "component_name_zh")}>
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

        <Section id="traceability" title={t.traceability}>
          {traceability.length ? (
            <div className="space-y-4">
              {traceability.map((event: any, index: number) => (
                <TimelineItem
                  key={event.id || index}
                  index={index + 1}
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

        <Section id="esg" title={t.esg}>
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
                  [t.repairability, firstCircularity?.repairability_score],
                  [t.recyclability, firstCircularity?.recyclability_score],
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

        <Section id="certificates" title={t.certificates}>
          {certificates.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {certificates.map((certificate: any) => (
                <DataCard key={certificate.id} title={pick(certificate, locale, "certificate_name", "certificate_name_zh")}>
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
                    <a className="mt-4 inline-flex text-sm font-bold text-brand-700" href={certificate.certificate_url} target="_blank" rel="noreferrer">
                      {t.openCertificate}
                    </a>
                  )}
                </DataCard>
              ))}
            </div>
          ) : (
            <Empty text={t.pendingData} />
          )}
        </Section>

        <Section id="consumer" title={t.consumer}>
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

        {(documents.length || firstGovernance) && (
          <Section id="evidence" title={t.evidence}>
            <div className="grid gap-4 lg:grid-cols-2">
              {documents.length ? (
                <div className="space-y-3">
                  {documents.map((document: any) => (
                    <DataCard key={document.id} title={document.document_name || t.documentName}>
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
    </main>
  );
}

function Badge({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  const className =
    tone === "dark"
      ? "rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-slate-100 backdrop-blur"
      : "rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700";
  return <span className={className}>{children}</span>;
}

function Metric({ label, value, locale }: { label: string; value: any; locale: Locale }) {
  return (
    <div className="dpp-fade rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{valueOrDash(value, locale)}</p>
    </div>
  );
}

function Section({ id, title, eyebrow, children }: { id: string; title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section id={id} className="dpp-fade scroll-mt-36 border-t border-slate-200 py-10 first:border-t-0 first:pt-0 lg:py-14">
      {eyebrow && <p className="text-sm font-bold uppercase text-brand-700">{eyebrow}</p>}
      <h2 className={eyebrow ? "mt-2 text-3xl font-black text-slate-950" : "text-3xl font-black text-slate-950"}>{title}</h2>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function DataCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
      <h3 className="font-black text-slate-950">{title}</h3>
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
      : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";
  const labelClass = variant === "dark" ? "text-xs font-bold uppercase text-brand-100" : "text-xs font-bold uppercase text-slate-500";
  const valueClass = variant === "dark" ? "mt-2 break-words text-sm font-semibold leading-6 text-white" : "mt-2 break-words text-sm font-semibold leading-6 text-slate-950";
  return (
    <div className={className}>
      <p className={labelClass}>{label}</p>
      <p className={valueClass}>{valueOrDash(value, locale)}</p>
    </div>
  );
}

function InfoGrid({ items, locale }: { items: Array<[string, any]>; locale: Locale }) {
  return (
    <div className="grid gap-3">
      {items.map(([label, value]) => (
        <Info key={label} label={label} value={value} locale={locale} />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">{text}</div>;
}

function MaterialCard({ item, locale, t }: { item: any; locale: Locale; t: any }) {
  const pct = Number(item.percentage || 0);
  return (
    <DataCard title={pick(item, locale, "material_name", "material_name_zh")}>
      <InfoGrid
        items={[
          [t.materialType, pick(item, locale, "material_type", "material_type_zh")],
          [t.percentage, pct ? `${pct}%` : null],
          [t.recycled, item.recycled_content ? `${item.recycled_content}%` : null],
          [t.origin, item.origin_country],
          [t.certification, item.certification],
          [t.chemical, pick(item, locale, "chemical_info", "chemical_info_zh")],
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
  index,
  title,
  items,
  locale,
}: {
  index: number;
  title: string;
  items: Array<[string, any]>;
  locale: Locale;
}) {
  return (
    <article className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg sm:grid-cols-[48px_1fr]">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white shadow-sm">{index}</div>
      <div>
        <h3 className="font-black text-slate-950">{title}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map(([label, value]) => (
            <Info key={label} label={label} value={value} locale={locale} />
          ))}
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
