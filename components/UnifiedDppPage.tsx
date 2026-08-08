"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import {
  buildPublicDppViewModel,
  type DppBatteryOperatingModel,
  type DppAudience,
  type DppFieldModel,
  type DppItemModel,
  type DppOperatingHistoryPoint,
  type DppSectionModel,
} from "@/lib/publicDppViewModel";
import { createSupabaseClient } from "@/lib/supabase";

type Props = {
  data: any;
  dppUrl: string;
  audience?: DppAudience;
  isPreview?: boolean;
  accessControl?: React.ReactNode;
  showcase?: boolean;
};

const AUDIENCE_COPY = {
  zh: {
    PUBLIC: "公众信息",
    LEGITIMATE_INTEREST: "专业信息",
    AUTHORITY_ONLY: "监管信息",
  },
  en: {
    PUBLIC: "Public information",
    LEGITIMATE_INTEREST: "Professional information",
    AUTHORITY_ONLY: "Authority information",
  },
} as const;

const COPY = {
  zh: {
    passport: "数字产品护照",
    verifiedSource: "产品信息",
    scan: "扫码查看产品护照",
    downloadPdf: "下载护照 PDF",
    downloadJson: "下载 DPP 数据 JSON",
    downloadBatteryPassJson: "下载 BatteryPass 校验 JSON",
    navigation: "护照目录",
    expand: "展开",
    collapse: "收起",
    pending: "待补充",
    pendingText: "当前发布版本尚未提供可公开展示的数据。",
    openDocument: "查看文件",
    previewNotice: "内部受众预览",
    previewText: "此页面用于检查字段投影，不代表访问者已获得相应权限。正式权限将在服务器验证身份、组织和产品授权后返回。",
    publicNotice: "公开访问",
    publicText: "该二维码仅定位产品。未登录访问者只会获得公众字段，单体运行数据和受限证据不会在此页面返回。",
    grantedNotice: "已授权访问",
    grantedText: "服务器已根据当前账号的组织、角色和产品授权返回对应字段；二维码和网址参数本身不会授予权限。",
    showcaseNotice: "产品护照案例",
    showcaseText: "本案例为便于介绍与客户评审而展示全部字段。字段旁的权限标签表示正式产品中的访问要求，正式产品仍由服务器按身份、组织和产品授权返回数据。",
    showcaseAudience: "案例公开数据",
    accessLegend: "正式环境字段权限",
    publicAccess: "公众可见",
    professionalAccess: "专业授权",
    authorityAccess: "监管授权",
    identity: "关键身份",
    lastUpdated: "最后更新",
    lifecycle: "生命周期状态",
    footer: "同一发布数据用于网页、二维码和护照文件。",
    backHome: "返回 GreanLean",
  },
  en: {
    passport: "Digital Product Passport",
    verifiedSource: "Product information",
    scan: "Scan to view product passport",
    downloadPdf: "Download passport PDF",
    downloadJson: "Download DPP data JSON",
    downloadBatteryPassJson: "Download BatteryPass validation JSON",
    navigation: "Passport contents",
    expand: "Expand",
    collapse: "Collapse",
    pending: "Pending",
    pendingText: "The current publication does not yet contain public data for this module.",
    openDocument: "View document",
    previewNotice: "Internal audience preview",
    previewText: "This view checks field projection and does not grant access. Production access will be returned only after the server verifies identity, organisation and product authorisation.",
    publicNotice: "Public access",
    publicText: "The QR code identifies the product only. Anonymous visitors receive public fields; item operating data and restricted evidence are not returned here.",
    grantedNotice: "Authorised access",
    grantedText: "The server returned fields according to the current account's organisation, role and product grant. The QR code and URL do not grant access.",
    showcaseNotice: "Product passport case",
    showcaseText: "This case displays all fields for demonstrations and customer review. Access labels show the permissions applied to live products, where the server returns data according to identity, organisation and product grants.",
    showcaseAudience: "Public case data",
    accessLegend: "Live-product field access",
    publicAccess: "Public",
    professionalAccess: "Professional grant",
    authorityAccess: "Authority grant",
    identity: "Key identity",
    lastUpdated: "Last updated",
    lifecycle: "Lifecycle status",
    footer: "The same publication data drives the web page, QR code and passport document.",
    backHome: "Back to GreanLean",
  },
} as const;

export function UnifiedDppPage({
  data,
  dppUrl,
  audience = "PUBLIC",
  isPreview = false,
  accessControl,
  showcase = false,
}: Props) {
  const { locale } = useLanguage();
  const t = COPY[locale];
  const viewModel = useMemo(
    () => buildPublicDppViewModel(data, { locale, audience, isPreview, dppUrl }),
    [audience, data, dppUrl, isPreview, locale],
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const exportIdentifier = data?.product?.dpp_id || data?.product?.public_slug || viewModel.identity.dppId;
  const hasBatteryPassExport = showcase && [
    "DPP-LMT-BAT-48V15AH",
    "DPP-GV-ESS-14K3-000001",
  ].includes(String(exportIdentifier));

  function toggleSection(id: string) {
    setCollapsed((current) => ({ ...current, [id]: !current[id] }));
  }

  const heroIdentity = [
    [locale === "zh" ? "DPP ID" : "DPP ID", viewModel.identity.dppId],
    [locale === "zh" ? "型号 / SKU" : "Model / SKU", viewModel.identity.model],
    [
      viewModel.identity.serial
        ? locale === "zh" ? "单体序列号" : "Item serial"
        : locale === "zh" ? "批次" : "Batch",
      viewModel.identity.serial || viewModel.identity.batch,
    ],
  ].filter(([, value]) => value);

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <BrandLogo href={`/?lang=${locale}`} size="md" />
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="hidden truncate text-sm font-bold text-slate-500 sm:block">
              {viewModel.identity.lifecycleStatus}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <section className="border-b border-slate-800 bg-[#07101f] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 sm:px-6 md:py-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-10 lg:py-12">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase">
              <span className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5">
                {t.passport}
              </span>
              <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-emerald-300">
                {viewModel.identity.sector}
              </span>
              {viewModel.identity.category && (
                <span className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-slate-200">
                  {viewModel.identity.category}
                </span>
              )}
            </div>

            <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              {viewModel.identity.name}
            </h1>
            <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-300 sm:text-lg">
              {viewModel.identity.description}
            </p>

            <div className="mt-6 overflow-hidden rounded-md bg-white lg:hidden">
              {viewModel.identity.image ? (
                <img
                  src={viewModel.identity.image}
                  alt={viewModel.identity.name}
                  className="aspect-[4/3] w-full object-contain p-4"
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center bg-slate-100 p-8 text-center text-lg font-black text-slate-500">
                  {viewModel.identity.name}
                </div>
              )}
            </div>

            {heroIdentity.length > 0 && (
              <div className="mt-7 grid gap-px overflow-hidden rounded-md border border-white/15 bg-white/15 sm:grid-cols-3">
                {heroIdentity.map(([label, value]) => (
                  <div key={label} className="min-w-0 bg-[#111a29] px-4 py-4">
                    <p className="text-xs font-bold text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {viewModel.heroMetrics.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {viewModel.heroMetrics.map((metric) => (
                  <div key={metric.label} className="min-h-28 rounded-md border border-white/15 bg-white/[0.07] p-3 sm:p-4">
                    <p className="text-xs font-bold leading-5 text-slate-400">{metric.label}</p>
                    <p className="mt-3 break-words text-base font-black leading-6 text-white sm:text-lg">{metric.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-5 text-sm">
              <div>
                <span className="text-slate-400">{t.lifecycle}</span>
                <strong className="ml-2 text-white">{viewModel.identity.lifecycleStatus}</strong>
              </div>
              {viewModel.identity.updatedAt && (
                <div>
                  <span className="text-slate-400">{t.lastUpdated}</span>
                  <strong className="ml-2 text-white">{viewModel.identity.updatedAt}</strong>
                </div>
              )}
            </div>
          </div>

          <aside className="self-start rounded-lg border border-white/15 bg-white/[0.08] p-4">
            <div className="hidden overflow-hidden rounded-md bg-white lg:block">
              {viewModel.identity.image ? (
                <img
                  src={viewModel.identity.image}
                  alt={viewModel.identity.name}
                  className="aspect-[4/3] w-full object-contain p-4"
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center bg-slate-100 p-8 text-center text-lg font-black text-slate-500">
                  {viewModel.identity.name}
                </div>
              )}
            </div>
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 rounded-md bg-white p-3 text-slate-950 lg:mt-3">
              <img
                src={viewModel.qr.image}
                alt={t.scan}
                className="h-[104px] w-[104px] rounded-md border border-slate-200 bg-white p-1"
              />
              <div className="flex min-w-0 flex-col justify-between">
                <div>
                  <p className="text-sm font-black">{t.scan}</p>
                  <p className="mt-1 break-all text-xs leading-5 text-slate-500">
                    {viewModel.identity.upi || viewModel.qr.target}
                  </p>
                </div>
                <div className="mt-3 grid gap-2">
                  <a
                    href={viewModel.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-black text-blue-700 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                  >
                    {t.downloadPdf}
                  </a>
                  {showcase && exportIdentifier ? (
                    <>
                      <a
                        href={`/api/dpp-export?product=${encodeURIComponent(exportIdentifier)}&format=canonical&showcase=1`}
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-center text-sm font-black text-emerald-800 transition hover:border-emerald-600 hover:bg-emerald-600 hover:text-white"
                      >
                        {t.downloadJson}
                      </a>
                      {hasBatteryPassExport ? (
                        <a
                          href={`/api/dpp-export?product=${encodeURIComponent(exportIdentifier)}&format=batterypass&showcase=1`}
                          className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-center text-sm font-black text-slate-800 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                        >
                          {t.downloadBatteryPassJson}
                        </a>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <nav className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur" aria-label={t.navigation}>
        <div className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-10">
          {viewModel.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
            >
              <span className="text-xs font-black text-emerald-700">{section.index}</span>
              {section.title}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
        <div className={`border-l-4 px-4 py-4 ${isPreview ? "border-amber-500 bg-amber-50" : "border-emerald-600 bg-emerald-50"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-sm font-black ${isPreview ? "text-amber-900" : "text-emerald-900"}`}>
              {showcase ? t.showcaseNotice : isPreview ? t.previewNotice : audience === "PUBLIC" ? t.publicNotice : t.grantedNotice}
            </p>
            <span className={`rounded-md px-2.5 py-1 text-xs font-black ${isPreview ? "bg-amber-200 text-amber-950" : "bg-emerald-200 text-emerald-950"}`}>
              {showcase ? t.showcaseAudience : AUDIENCE_COPY[locale][audience]}
            </span>
          </div>
          <p className={`mt-1 text-sm font-medium leading-6 ${isPreview ? "text-amber-800" : "text-emerald-800"}`}>
            {showcase ? t.showcaseText : isPreview ? t.previewText : audience === "PUBLIC" ? t.publicText : t.grantedText}
          </p>
          {showcase && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-emerald-200 pt-3">
              <span className="mr-1 text-xs font-black text-emerald-950">{t.accessLegend}</span>
              <AccessBadge audience="PUBLIC" locale={locale} />
              <AccessBadge audience="LEGITIMATE_INTEREST" locale={locale} />
              <AccessBadge audience="AUTHORITY_ONLY" locale={locale} />
            </div>
          )}
        </div>
      </div>
      {accessControl}

      <div className="border-t border-slate-200 bg-white">
        {viewModel.sections.map((section) => (
          <DppSection
            key={section.id}
            section={section}
            collapsed={Boolean(collapsed[section.id])}
            onToggle={() => toggleSection(section.id)}
            locale={locale}
            showAccessLabels={showcase}
          />
        ))}
      </div>

      <footer className="border-t border-slate-800 bg-[#07101f] text-slate-300">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
          <div>
            <BrandLogo
              href={`/?lang=${locale}`}
              size="md"
              wordmarkClassName="brightness-0 invert"
            />
            <p className="mt-3 text-sm leading-6 text-slate-400">{t.footer}</p>
          </div>
          <Link
            href={`/?lang=${locale}`}
            className="inline-flex h-10 items-center justify-center self-start rounded-md border border-white/20 px-4 text-sm font-black text-white transition hover:border-emerald-400 hover:text-emerald-300 md:self-auto"
          >
            {t.backHome}
          </Link>
        </div>
      </footer>
    </main>
  );
}

function DppSection({
  section,
  collapsed,
  onToggle,
  locale,
  showAccessLabels,
}: {
  section: DppSectionModel;
  collapsed: boolean;
  onToggle: () => void;
  locale: "zh" | "en";
  showAccessLabels: boolean;
}) {
  const t = COPY[locale];
  return (
    <section id={section.id} className="scroll-mt-32 border-b border-slate-200">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:py-10 lg:px-10">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-black text-emerald-700">{section.index}</p>
            <h2 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{section.title}</h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
              {section.intro}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls={`${section.id}-content`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700"
          >
            <span aria-hidden="true" className="text-base">{collapsed ? "+" : "−"}</span>
            <span className="hidden sm:inline">{collapsed ? t.expand : t.collapse}</span>
          </button>
        </div>

        {!collapsed && (
          <div id={`${section.id}-content`} className="mt-7">
            {section.status === "pending" ? (
              <div className="border-l-4 border-slate-300 bg-slate-50 px-4 py-4">
                <p className="text-sm font-black text-slate-700">{t.pending}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{t.pendingText}</p>
              </div>
            ) : (
              <>
                {section.batteryOperating ? (
                  <BatteryOperatingPanel
                    data={section.batteryOperating}
                    locale={locale}
                    showAccessLabels={showAccessLabels}
                  />
                ) : (
                  <>
                    {section.fields && section.fields.length > 0 && (
                      <FieldGrid fields={section.fields} locale={locale} showAccessLabels={showAccessLabels} />
                    )}
                    {section.items && section.items.length > 0 && (
                      <ItemGrid items={section.items} locale={locale} showAccessLabels={showAccessLabels} />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const OPERATING_METRIC_ORDER = [
  "SOC",
  "SOH_VOLUNTARY",
  "FULL_CHARGE_CAPACITY",
  "REMAINING_CAPACITY",
  "FULL_CYCLE_COUNT",
  "TEMPERATURE",
  "CURRENT_INTERNAL_RESISTANCE",
  "REMAINING_POWER_CAPABILITY",
  "ENERGY_THROUGHPUT",
  "CAPACITY_FADE",
];

const HISTORY_RANGES = ["24h", "7d", "30d", "12m", "all"] as const;

function BatteryOperatingPanel({
  data,
  locale,
  showAccessLabels,
}: {
  data: DppBatteryOperatingModel;
  locale: "zh" | "en";
  showAccessLabels: boolean;
}) {
  const sortedLatest = useMemo(() => [...data.latest].sort((left, right) => {
    const leftIndex = OPERATING_METRIC_ORDER.indexOf(left.metricType);
    const rightIndex = OPERATING_METRIC_ORDER.indexOf(right.metricType);
    return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex);
  }), [data.latest]);
  const initialMetric = (
    ["SOC", "SOH_VOLUNTARY", "TEMPERATURE", "CURRENT_INTERNAL_RESISTANCE"]
      .find((code) => data.history.some((point) => point.metricType === code))
    || data.history[0]?.metricType
    || ""
  );
  const [selectedMetric, setSelectedMetric] = useState(initialMetric);
  const [range, setRange] = useState<(typeof HISTORY_RANGES)[number]>("30d");
  const [history, setHistory] = useState<DppOperatingHistoryPoint[]>(data.history);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setHistory(data.history);
  }, [data.history]);

  const historyOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const point of data.history) options.set(point.metricType, point.label);
    return Array.from(options.entries());
  }, [data.history]);
  const chartPoints = history.filter((point) => point.metricType === selectedMetric);
  const selectedLabel = historyOptions.find(([code]) => code === selectedMetric)?.[1] || selectedMetric;
  const selectedUnit = chartPoints[0]?.unit || "";

  async function loadRange(nextRange: (typeof HISTORY_RANGES)[number]) {
    setRange(nextRange);
    if (!data.itemId || !selectedMetric) return;
    if (showAccessLabels) {
      const durationMs: Partial<Record<(typeof HISTORY_RANGES)[number], number>> = {
        "24h": 24 * 3_600_000,
        "7d": 7 * 86_400_000,
        "30d": 30 * 86_400_000,
        "12m": 365 * 86_400_000,
      };
      const latestTime = Math.max(
        ...data.history.map((point) => new Date(point.measuredAt).getTime()),
      );
      const minimumTime = durationMs[nextRange]
        ? latestTime - durationMs[nextRange]!
        : Number.NEGATIVE_INFINITY;
      setHistory(data.history.filter(
        (point) => new Date(point.measuredAt).getTime() >= minimumTime,
      ));
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const supabase = createSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("AUTH_REQUIRED");
      const params = new URLSearchParams({
        range: nextRange,
        metrics: selectedMetric,
      });
      const response = await fetch(
        `/api/battery-dpp/items/${encodeURIComponent(data.itemId)}/metrics/history?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.code || "LOAD_FAILED");
      setHistory((payload.history || []).map((row: any) => ({
        id: String(row.id),
        metricType: String(row.metricType),
        label: locale === "zh" ? String(row.labelZh) : String(row.labelEn),
        value: Number(row.value),
        unit: String(row.unit || ""),
        measuredAt: String(row.measuredAt),
      })));
    } catch {
      setLoadError(
        locale === "zh"
          ? "暂时无法读取所选时间范围，请稍后重试。"
          : "The selected history range could not be loaded. Try again shortly.",
      );
    } finally {
      setLoading(false);
    }
  }

  const summaryFields = [
    [locale === "zh" ? "数据新鲜度" : "Data freshness", data.summary.freshnessStatus],
    [locale === "zh" ? "最近测量时间" : "Latest measurement", formatDateTime(data.summary.latestMeasuredAt, locale)],
    [locale === "zh" ? "来源设备" : "Source device", data.summary.sourceDevice],
    [locale === "zh" ? "数据来源" : "Data source", data.summary.dataSource],
    [locale === "zh" ? "数据质量" : "Data quality", data.summary.qualityStatus],
    [locale === "zh" ? "核验状态" : "Verification", data.summary.verificationStatus],
    [locale === "zh" ? "更新模式" : "Update mode", data.summary.updateMode],
    [locale === "zh" ? "单体序列号" : "Item serial", data.itemSerial],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-8">
      <div className="grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        {summaryFields.map(([label, value]) => (
          <div key={label} className="min-w-0 bg-slate-50 px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-slate-500">{label}</p>
              {showAccessLabels && (
                <AccessBadge audience="LEGITIMATE_INTEREST" locale={locale} />
              )}
            </div>
            <p className="mt-1 break-words text-sm font-black leading-6 text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-black text-slate-950">
          {locale === "zh" ? "最新状态快照" : "Latest status snapshot"}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {locale === "zh"
            ? "按单体最近测量时间展示，不代表秒级实时监控。"
            : "Latest item measurements; this is not a second-by-second monitoring dashboard."}
        </p>
        {sortedLatest.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {sortedLatest.slice(0, 10).map((metric) => (
              <article key={metric.id} className="min-h-32 rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold leading-5 text-slate-500">{metric.label}</p>
                  {showAccessLabels && (
                    <AccessBadge audience="LEGITIMATE_INTEREST" locale={locale} />
                  )}
                </div>
                <p className="mt-3 text-2xl font-black text-slate-950">
                  {formatMetricValue(metric.value)}{" "}
                  <span className="text-sm text-slate-500">{metric.unit}</span>
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {formatDateTime(metric.measuredAt, locale)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {locale === "zh" ? "尚无单体运行快照。" : "No item operating snapshot is available."}
          </p>
        )}
      </div>

      {historyOptions.length > 0 && (
        <div className="border-t border-slate-200 pt-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-slate-950">
                  {locale === "zh" ? "历史趋势" : "History trend"}
                </h3>
                {showAccessLabels && (
                  <AccessBadge audience="LEGITIMATE_INTEREST" locale={locale} />
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {selectedLabel}{selectedUnit ? ` (${selectedUnit})` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedMetric}
                onChange={(event) => {
                  setSelectedMetric(event.target.value);
                  setHistory(data.history);
                  setRange("30d");
                }}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700"
                aria-label={locale === "zh" ? "选择趋势指标" : "Select trend metric"}
              >
                {historyOptions.map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
                {HISTORY_RANGES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={range === item}
                    onClick={() => loadRange(item)}
                    disabled={loading}
                    className={`h-10 min-w-12 border-r border-slate-200 px-2 text-xs font-black transition last:border-r-0 ${
                      range === item
                        ? "bg-emerald-700 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {rangeLabel(item, locale)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 sm:p-5">
            {loading ? (
              <div className="grid h-56 place-items-center text-sm font-bold text-slate-500">
                {locale === "zh" ? "正在读取历史记录..." : "Loading history..."}
              </div>
            ) : chartPoints.length ? (
              <BatteryTrendChart points={chartPoints} locale={locale} />
            ) : (
              <div className="grid h-56 place-items-center text-sm font-bold text-slate-500">
                {locale === "zh" ? "所选范围内没有记录。" : "No records are available in this range."}
              </div>
            )}
          </div>
          {loadError && <p className="mt-2 text-sm font-bold text-red-700">{loadError}</p>}
        </div>
      )}

      <div className="border-t border-slate-200 pt-8">
        <h3 className="text-lg font-black text-slate-950">
          {locale === "zh" ? "生命周期事件" : "Lifecycle events"}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {locale === "zh"
            ? "维修、故障、安全、BMS 更换、再利用、退役和回收记录只追加保存。"
            : "Maintenance, fault, safety, BMS replacement, reuse, retirement and recycling records are append-only."}
        </p>
        {data.events.length ? (
          <div className="mt-4">
            <ItemGrid
              items={data.events}
              locale={locale}
              showAccessLabels={showAccessLabels}
              inheritedAccess="LEGITIMATE_INTEREST"
            />
          </div>
        ) : (
          <p className="mt-4 border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {locale === "zh" ? "尚无生命周期事件记录。" : "No lifecycle event has been recorded."}
          </p>
        )}
      </div>
    </div>
  );
}

function BatteryTrendChart({
  points,
  locale,
}: {
  points: DppOperatingHistoryPoint[];
  locale: "zh" | "en";
}) {
  const width = 720;
  const height = 220;
  const paddingX = 24;
  const paddingY = 24;
  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = Math.max(maximum - minimum, 1);
  const coordinates = points.map((point, index) => {
    const x = points.length === 1
      ? width / 2
      : paddingX + index * ((width - paddingX * 2) / (points.length - 1));
    const y = height - paddingY - ((point.value - minimum) / span) * (height - paddingY * 2);
    return { x, y, point };
  });
  const polyline = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={locale === "zh" ? "电池指标历史趋势图" : "Battery metric history trend"}
        className="h-56 w-full"
      >
        {[0, 1, 2, 3, 4].map((line) => {
          const y = paddingY + line * ((height - paddingY * 2) / 4);
          return <line key={line} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        <polyline
          points={polyline}
          fill="none"
          stroke="#047857"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {last && <circle cx={last.x} cy={last.y} r="6" fill="#047857" stroke="white" strokeWidth="3" />}
      </svg>
      <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>{first ? formatDateTime(first.point.measuredAt, locale) : ""}</span>
        <span className="text-right">{last ? formatDateTime(last.point.measuredAt, locale) : ""}</span>
      </div>
    </div>
  );
}

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDateTime(value: string, locale: "zh" | "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function rangeLabel(range: (typeof HISTORY_RANGES)[number], locale: "zh" | "en") {
  const labels = {
    zh: { "24h": "24时", "7d": "7天", "30d": "30天", "12m": "12月", all: "全部" },
    en: { "24h": "24h", "7d": "7d", "30d": "30d", "12m": "12m", all: "All" },
  };
  return labels[locale][range];
}

function AccessBadge({
  audience,
  locale,
}: {
  audience: DppAudience;
  locale: "zh" | "en";
}) {
  const labels = {
    zh: {
      PUBLIC: "公众可见",
      LEGITIMATE_INTEREST: "专业授权",
      AUTHORITY_ONLY: "监管授权",
    },
    en: {
      PUBLIC: "Public",
      LEGITIMATE_INTEREST: "Professional grant",
      AUTHORITY_ONLY: "Authority grant",
    },
  } as const;
  const style = audience === "AUTHORITY_ONLY"
    ? "border-amber-300 bg-amber-50 text-amber-900"
    : audience === "LEGITIMATE_INTEREST"
      ? "border-blue-300 bg-blue-50 text-blue-800"
      : "border-emerald-300 bg-emerald-50 text-emerald-800";

  return (
    <span className={`inline-flex min-h-6 shrink-0 items-center rounded border px-2 text-[11px] font-black leading-5 ${style}`}>
      {labels[locale][audience]}
    </span>
  );
}

function FieldGrid({
  fields,
  locale,
  showAccessLabels,
}: {
  fields: DppFieldModel[];
  locale: "zh" | "en";
  showAccessLabels: boolean;
}) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map((item, index) => (
        <div key={`${item.label}-${index}`} className="min-w-0 bg-white px-4 py-4">
          <dt className="flex items-start justify-between gap-2 text-xs font-bold leading-5 text-slate-500">
            <span>{item.label}</span>
            {showAccessLabels && <AccessBadge audience={item.access || "PUBLIC"} locale={locale} />}
          </dt>
          <dd className="mt-1 break-words text-sm font-black leading-6 text-slate-900">
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer" className="text-blue-700 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-700">
                {item.value}
              </a>
            ) : item.value}
          </dd>
          {item.note && <p className="mt-1 text-xs leading-5 text-slate-500">{item.note}</p>}
        </div>
      ))}
    </dl>
  );
}

function ItemGrid({
  items,
  locale,
  showAccessLabels,
  inheritedAccess = "PUBLIC",
}: {
  items: DppItemModel[];
  locale: "zh" | "en";
  showAccessLabels: boolean;
  inheritedAccess?: DppAudience;
}) {
  const t = COPY[locale];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <article key={`${item.id}-${index}`} className="flex min-h-48 flex-col rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-base font-black leading-6 text-slate-950">{item.title}</h3>
              {item.subtitle && <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{item.subtitle}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {item.status && (
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600">
                  {item.status}
                </span>
              )}
              {showAccessLabels && (
                <AccessBadge audience={item.access || inheritedAccess} locale={locale} />
              )}
            </div>
          </div>
          {item.fields.length > 0 && (
            <dl className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              {item.fields.map((field, index) => (
                <div key={`${field.label}-${index}`} className="grid grid-cols-[108px_minmax(0,1fr)] gap-3 text-sm">
                  <dt className="font-bold leading-5 text-slate-500">
                    {field.label}
                    {showAccessLabels && (
                      <span className="mt-1 block">
                        <AccessBadge
                          audience={field.access || item.access || inheritedAccess}
                          locale={locale}
                        />
                      </span>
                    )}
                  </dt>
                  <dd className="break-words font-semibold leading-5 text-slate-800">{field.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {item.href && (
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex h-10 items-center justify-center self-start rounded-md border border-blue-200 bg-white px-3 text-sm font-black text-blue-700 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
            >
              {t.openDocument}
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
