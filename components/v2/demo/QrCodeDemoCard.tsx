import Link from "next/link";
import { QR_DEMO_ASSETS, QR_DEMO_PATH } from "@/lib/qrDemo";

import { demoText, type DemoLanguage } from "@/lib/demo/language";

export function QrCodeDemoCard({ language }: { language: DemoLanguage }) {
  const { locale } = language;
  const t = (en: string, zh: string) => demoText(language, en, zh);
  return <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-700/25">
    <div className="flex h-36 items-center justify-between gap-5 bg-[#e5eee6] px-5">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#245a44]">QR CODE</p><p className="mt-2 text-sm font-bold text-[#496d56]">{t("Batch battery information", "批次电池信息页")}</p><span className="mt-3 inline-block rounded bg-white/80 px-2 py-1 text-[10px] font-black tracking-wider text-[#47664f]">DEMO · {t("BATCH LEVEL", "批次级")}</span></div>
      {/* A real code for the stable public demo URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${QR_DEMO_ASSETS}/qr.svg`} alt={t("Scan to explore the QR code demo", "扫码体验二维码 Demo")} width={104} height={104} className="rounded-lg bg-white p-1" />
    </div>
    <div className="p-5"><h2 className="text-xl font-black text-[#133f38]">{t("QR Code Battery Information Demo", "QR Code 电池信息 Demo")}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{t("Scan for batch product, material, label, document and collection information, with multilingual content and document previews.", "扫码了解批次产品、材料、标签、文件与回收信息，支持多语言切换与附件预览。")}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-4">{[[t("Voltage", "标称电压"), "24 V"], [t("Capacity", "额定容量"), "12 Ah"], [t("Scope", "信息粒度"), t("Batch", "批次")]].map(([label, value]) => <div key={label}><dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-bold text-slate-700">{value}</dd></div>)}</dl>
      <Link href={`${QR_DEMO_PATH}?lang=${locale}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#134d44] px-4 text-sm font-black text-white hover:bg-[#0b3832]">{t("Explore QR Code Information", "体验 QR Code 信息页")}</Link>
    </div>
  </article>;
}
