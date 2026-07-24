import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import {
  INDUSTRIAL_DEMO,
  INDUSTRIAL_DEMO_DISASSEMBLY_EN,
  INDUSTRIAL_DEMO_DISASSEMBLY_ZH,
  INDUSTRIAL_DEMO_DOCUMENTS,
  INDUSTRIAL_DEMO_FIELD_GROUPS,
  INDUSTRIAL_DEMO_METRICS,
  type DemoAudience,
  type DemoField,
  type DemoLocale,
  type DemoVerification,
} from "@/lib/battery/industrialDemo";

type Props = {
  locale: DemoLocale;
  audience: DemoAudience;
};

const verificationLabels: Record<DemoVerification, { zh: string; en: string; tone: string }> = {
  SYNTHETIC_DEMO: { zh: "合成演示数据", en: "Synthetic demo", tone: "border-amber-200 bg-amber-50 text-amber-900" },
  SELF_DECLARED: { zh: "自行声明", en: "Self-declared", tone: "border-blue-200 bg-blue-50 text-blue-900" },
  DOCUMENT_SUPPORTED: { zh: "文件支持", en: "Document supported", tone: "border-cyan-200 bg-cyan-50 text-cyan-900" },
  THIRD_PARTY_VERIFIED: { zh: "第三方验证", en: "Third-party verified", tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  NOT_AVAILABLE: { zh: "暂未提供", en: "Not available", tone: "border-slate-200 bg-slate-100 text-slate-700" },
  NOT_APPLICABLE: { zh: "不适用", en: "Not applicable", tone: "border-slate-200 bg-white text-slate-600" },
};

function displayValue(field: DemoField, locale: DemoLocale) {
  const value = String(field.value);
  if (locale === "zh") {
    const localized: Record<string, string> = {
      ORIGINAL: "原始状态",
      "1.0.0-demo": "1.0.0（演示）",
      "Hamburg, Germany": "德国汉堡",
      "NOT APPLICABLE DECLARED LFP": "不适用于已声明的磷酸铁锂化学体系",
      "NOT INTENTIONALLY USED": "未有意使用",
    };
    return localized[value] || value;
  }
  const localized: Record<string, string> = {
    "可充电工业电池（固定式，额定能量大于 2 kWh）": "Rechargeable industrial battery (stationary, rated energy above 2 kWh)",
    "固定式储能、工商业储能、电池柜与机架集成": "Stationary storage, commercial and industrial storage, battery cabinet and rack integration",
    "磷酸铁锂 / 石墨（LFP）": "Lithium iron phosphate / graphite (LFP)",
    "方形 LFP 电芯": "Prismatic LFP cell",
    "自然风冷": "Natural air cooling",
    "集成式 BMS": "Integrated BMS",
    "锂、天然石墨、铜、铝": "Lithium, natural graphite, copper and aluminium",
    "受限访问：仅限合法利益主体": "Restricted: legitimate-interest actors only",
    "演示记录，未提供实验室检测证明": "Demo record; no laboratory test evidence provided",
    "待官方分类方法": "Pending official classification method",
    "电芯、铜铝导体、电子部件和金属外壳需分类交付有资质回收方": "Separate cells, copper/aluminium conductors, electronics and enclosure for an authorised recycler",
    "BMS、辅助电子部件和外部连接件可由授权人员更换": "BMS, auxiliary electronics and external connectors may be replaced by authorised personnel",
    "演示备件目录待提供": "Demo spare-parts catalogue pending",
    "80% DoD，25 °C": "80% DoD at 25 °C",
    "10 年或 6000 次循环": "10 years or 6,000 cycles",
    "演示政策记录": "Demo policy record",
    "关键材料至电池模块装配的示例链路": "Illustrative traceability from critical materials to battery-module assembly",
    "未进行第三方验证": "No third-party verification",
    "演示文件占位": "Demo document placeholder",
  };
  return localized[value] || value;
}

function VerificationBadge({ value, locale }: { value: DemoVerification; locale: DemoLocale }) {
  const item = verificationLabels[value];
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-black ${item.tone}`}>
      {item[locale]}
    </span>
  );
}

function FieldTable({ fields, locale }: { fields: DemoField[]; locale: DemoLocale }) {
  const granularityLabels = locale === "zh"
    ? { MODEL: "型号", BATCH: "批次", ITEM: "单体", EVENT: "事件", METRIC: "动态指标" }
    : { MODEL: "Model", BATCH: "Batch", ITEM: "Item", EVENT: "Event", METRIC: "Metric" };
  const unitLabels: Record<string, string> = locale === "zh"
    ? { cycle: "次", year: "年" }
    : { "次": "cycles", "年": "years" };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
            <th className="px-4 py-3">{locale === "zh" ? "数据项" : "Data point"}</th>
            <th className="px-4 py-3">{locale === "zh" ? "值" : "Value"}</th>
            <th className="px-4 py-3">{locale === "zh" ? "粒度" : "Granularity"}</th>
            <th className="px-4 py-3">{locale === "zh" ? "状态" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((item) => (
            <tr key={item.code} className="border-b border-slate-100 align-top last:border-b-0">
              <th className="px-4 py-4 text-sm font-bold text-slate-700">
                {locale === "zh" ? item.labelZh : item.labelEn}
              </th>
              <td className="max-w-[420px] break-words px-4 py-4 text-sm font-black text-slate-950">
                {displayValue(item, locale)}{item.unit ? ` ${unitLabels[item.unit] || item.unit}` : ""}
              </td>
              <td className="px-4 py-4 text-xs font-bold text-slate-500">{granularityLabels[item.granularity]}</td>
              <td className="px-4 py-4"><VerificationBadge value={item.verification} locale={locale} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Completeness({ locale }: { locale: DemoLocale }) {
  const rows = locale === "zh"
    ? [
        ["必填字段准备度", 78, "已有演示值，不代表法规合规"],
        ["支持文件完整度", 0, "当前仅有占位文件"],
        ["验证覆盖率", 0, "尚无第三方验证"],
        ["注册库准备度", 25, "仅完成本地结构映射"],
      ] as const
    : [
        ["Required-field readiness", 78, "Demo values present; not a compliance result"],
        ["Supporting-document completeness", 0, "Placeholders only"],
        ["Verification coverage", 0, "No third-party verification"],
        ["Registry readiness", 25, "Local structural mapping only"],
      ] as const;
  return (
    <section aria-labelledby="readiness-title" className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <h2 id="readiness-title" className="text-2xl font-black text-slate-950">
          {locale === "zh" ? "数据准备度" : "Data readiness"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          {locale === "zh"
            ? "以下百分比用于说明数据准备进度，不是“合规率”，也不表示已经完成欧盟注册。"
            : "These percentages describe data preparation. They are not a compliance score and do not indicate EU registration."}
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {rows.map(([label, value, note]) => (
            <div key={label} className="border-l-4 border-emerald-600 bg-white px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-black text-slate-800">{label}</h3>
                <span className="text-2xl font-black text-slate-950">{value}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-emerald-600" style={{ width: `${value}%` }} />
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BatteryDemoPassport({ locale, audience }: Props) {
  const zh = locale === "zh";
  const isRestrictedPreview = audience !== "consumer";
  const groups = audience === "consumer"
    ? INDUSTRIAL_DEMO_FIELD_GROUPS.filter((group) =>
        ["identity", "manufacturer", "technical", "materials", "carbon", "circularity", "performance"].includes(group.code))
    : INDUSTRIAL_DEMO_FIELD_GROUPS;
  const qrTarget = INDUSTRIAL_DEMO.upi;
  const disassembly = zh ? INDUSTRIAL_DEMO_DISASSEMBLY_ZH : INDUSTRIAL_DEMO_DISASSEMBLY_EN;

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <BrandLogo href={`/?lang=${locale}`} size="md" />
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
              {zh ? "演示护照" : "Demo passport"}
            </span>
            <Link
              href={`/passports/${INDUSTRIAL_DEMO.slug}?lang=${locale === "zh" ? "en" : "zh"}&view=${audience}`}
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-700"
            >
              {zh ? "EN" : "中文"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-14">
            <div className="self-center">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black">
                  {zh ? "工业电池（固定式，大于 2 kWh）" : "Industrial battery (stationary, above 2 kWh)"}
                </span>
                <span className="rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
                  {zh ? "合成演示数据" : "Synthetic demonstration data"}
                </span>
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-5xl">
                {zh ? "GreenVault ESS-14.3 工业储能电池模块" : "GreenVault ESS-14.3 Industrial Battery Module"}
              </h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-300">
                {zh
                  ? "14.336 kWh 固定式磷酸铁锂储能模块的数字电池护照演示，展示型号、批次、单体、可持续性、性能和生命周期数据如何组织。"
                  : "A digital battery passport demonstration for a 14.336 kWh stationary LFP storage module, showing how model, batch, item, sustainability, performance and lifecycle data are organised."}
              </p>
              <dl className="mt-8 grid gap-px overflow-hidden rounded-lg bg-white/15 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [zh ? "额定能量" : "Rated energy", "14.336 kWh"],
                  [zh ? "额定容量" : "Rated capacity", "280 Ah"],
                  [zh ? "标称电压" : "Nominal voltage", "51.2 V"],
                  [zh ? "化学体系" : "Chemistry", zh ? "磷酸铁锂" : "LFP / graphite"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-900 px-4 py-4">
                    <dt className="text-xs font-bold text-slate-400">{label}</dt>
                    <dd className="mt-1 text-lg font-black">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_180px] lg:grid-cols-1 xl:grid-cols-[1fr_180px]">
              <figure className="overflow-hidden rounded-lg bg-slate-100 p-3">
                <img
                  src={INDUSTRIAL_DEMO.image}
                  alt={zh ? "无品牌工业储能电池模块演示图片" : "Unbranded industrial energy-storage battery demo module"}
                  className="aspect-[4/3] h-full w-full object-cover"
                />
              </figure>
              <div className="rounded-lg bg-white p-4 text-slate-950">
                <p className="text-xs font-black text-slate-600">{zh ? "扫码访问护照" : "Scan passport"}</p>
                <img
                  src={`/api/qr?url=${encodeURIComponent(qrTarget)}`}
                  alt={zh ? "工业电池护照二维码" : "Industrial battery passport QR code"}
                  className="mx-auto mt-3 aspect-square w-full max-w-40"
                />
                <a href={qrTarget} className="mt-3 block break-all text-xs font-bold text-blue-700 underline">
                  {qrTarget}
                </a>
                <a
                  href={`/api/dpp-export?format=pdf&lang=${locale}&product=${encodeURIComponent(INDUSTRIAL_DEMO.dppId)}`}
                  className="mt-4 block rounded-md bg-blue-600 px-3 py-2.5 text-center text-xs font-black text-white"
                >
                  {zh ? "下载护照 PDF" : "Download passport PDF"}
                </a>
                {audience !== "consumer" && (
                  <a
                    href={`/api/dpp-export?format=json&lang=${locale}&product=${encodeURIComponent(INDUSTRIAL_DEMO.dppId)}`}
                    className="mt-2 block rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-center text-xs font-black text-emerald-900"
                  >
                    {zh ? "下载结构化 JSON" : "Download structured JSON"}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto max-w-7xl px-5 py-5 lg:px-8">
            <p className="font-black text-amber-950">
              {zh ? "重要说明：本页面和全部数值仅用于 Greanlean 产品演示。" : "Important: This page and every value are for Greanlean product demonstration only."}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
              {zh
                ? "它不构成真实产品声明、检测结论、法规认证、欧盟注册结果或法律意见；没有实时 BMS 连接，也没有第三方验证。"
                : "It is not a real product declaration, test result, regulatory certification, EU registration result or legal advice. There is no live BMS connection or third-party verification."}
            </p>
          </div>
        </section>

        <nav className="sticky top-0 z-20 overflow-x-auto border-b border-slate-200 bg-white/95 backdrop-blur" aria-label={zh ? "护照章节" : "Passport sections"}>
          <div className="mx-auto flex max-w-7xl gap-2 px-5 py-3 lg:px-8">
            {groups.map((group) => (
              <a key={group.code} href={`#${group.code}`} className="shrink-0 rounded-md px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 hover:text-slate-950">
                {zh ? group.labelZh : group.labelEn}
              </a>
            ))}
            {isRestrictedPreview && (
              <a href="#operating-history" className="shrink-0 rounded-md px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">
                {zh ? "运行历史" : "Operating history"}
              </a>
            )}
          </div>
        </nav>

        <Completeness locale={locale} />

        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="space-y-5">
            {groups.map((group, index) => {
              const visibleFields = group.fields.filter((item) =>
                audience === "consumer" ? item.access === "PUBLIC" : audience === "professional" ? item.access !== "AUTHORITY_ONLY" && item.access !== "INTERNAL" : true);
              return (
                <details id={group.code} key={group.code} open={index < 2} className="scroll-mt-20 border border-slate-200 bg-white">
                  <summary className="cursor-pointer list-none px-5 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-xs font-black text-emerald-700">{String(index + 1).padStart(2, "0")}</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">{zh ? group.labelZh : group.labelEn}</h2>
                        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{zh ? group.introZh : group.introEn}</p>
                      </div>
                      <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                        {zh ? `${visibleFields.length} 项` : `${visibleFields.length} fields`}
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-slate-200">
                    <FieldTable fields={visibleFields} locale={locale} />
                  </div>
                </details>
              );
            })}
          </div>

          {audience === "consumer" ? (
            <section className="mt-8 border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-black">{zh ? "受限数据" : "Restricted data"}</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                {zh
                  ? "详细材料组成、拆卸维修步骤、运行指标和完整测试文件仅向具备合法利益或监管权限的主体提供。公开二维码不会直接返回这些数据。"
                  : "Detailed composition, dismantling and repair steps, operating metrics and full test files are available only to legitimate-interest or authority actors. The public QR code does not return those fields."}
              </p>
            </section>
          ) : (
            <>
              <section id="disassembly" className="mt-8 scroll-mt-20 border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-black">{zh ? "拆卸、维修与安全" : "Dismantling, repair and safety"}</h2>
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
                    {zh ? "合法利益主体 · 界面演示" : "Legitimate interest · UI demo"}
                  </span>
                </div>
                <p className="mt-4 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-black text-red-900">
                  {zh ? "只有经过培训并获得授权的人员才可以拆卸电池。" : "Only trained and authorised personnel may dismantle the battery."}
                </p>
                <ol className="mt-5 grid gap-3 md:grid-cols-2">
                  {disassembly.map((step, index) => (
                    <li key={step} className="flex gap-3 border-t border-slate-200 pt-3 text-sm font-semibold leading-6 text-slate-700">
                      <span className="font-black text-emerald-700">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section id="operating-history" className="mt-8 scroll-mt-20 border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black">{zh ? "运行状态历史" : "Operating-state history"}</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      {zh ? "固定时间戳的 BMS 模拟数据，不是实时遥测。" : "Timestamped BMS simulation data, not live telemetry."}
                    </p>
                  </div>
                  <VerificationBadge value="SYNTHETIC_DEMO" locale={locale} />
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-3">{zh ? "指标" : "Metric"}</th>
                        <th className="px-3 py-3">{zh ? "数值" : "Value"}</th>
                        <th className="px-3 py-3">{zh ? "采集时间" : "Measured at"}</th>
                        <th className="px-3 py-3">{zh ? "来源" : "Source"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INDUSTRIAL_DEMO_METRICS.map((metric) => (
                        <tr key={`${metric.metric}-${metric.measuredAt}`} className="border-b border-slate-100">
                          <th className="px-3 py-4 font-black">{metric.metric}</th>
                          <td className="px-3 py-4 font-black">{metric.value} {metric.unit}</td>
                          <td className="px-3 py-4 text-slate-600">{metric.measuredAt}</td>
                          <td className="px-3 py-4 text-slate-600">{zh ? "演示 BMS 模拟器" : metric.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="documents" className="mt-8 border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-2xl font-black">{zh ? "合规文件占位" : "Conformity document placeholders"}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  {zh ? "没有伪造的实验室、证书编号或签章。打开文件会显示演示说明，不会返回 404。" : "No laboratory, certificate number or seal is fabricated. Opening a file shows a demo notice instead of a 404."}
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {INDUSTRIAL_DEMO_DOCUMENTS.map((document) => (
                    <a
                      key={document.type}
                      href={`${document.href}&lang=${locale}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-4 border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-800 hover:border-blue-300 hover:text-blue-800"
                    >
                      <span>{document.file}</span>
                      <span className="shrink-0 text-xs text-slate-500">{zh ? "演示占位" : "Demo placeholder"}</span>
                    </a>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="text-sm font-semibold">
            {zh ? "Greanlean 电池护照演示 · 无实时 BMS · 无正式欧盟 DPP 注册库提交" : "Greanlean battery passport demo · No live BMS · No formal Registry submission"}
          </p>
          <Link href={`/?lang=${locale}#showroom`} className="text-sm font-black text-white underline">
            {zh ? "返回案例展厅" : "Back to demo showroom"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
