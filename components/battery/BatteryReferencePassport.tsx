"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BATTERY_REFERENCE_SECTIONS, buildBatteryReferenceModel, type ReferenceCell, type ReferenceField } from "@/lib/battery/referencePassport";
import type { Battery71Source } from "@/lib/battery/passport71";
import { demoBilingualText, demoText, formatDemoLocale, sourceLocale, type DemoLanguage, type DemoLocale } from "@/lib/demo/language";
import { DemoLanguageSelect } from "@/components/v2/demo/DemoLanguageSelect";
import styles from "./BatteryReferencePassport.module.css";

const c = (...classes: string[]) => classes.map((name) => styles[name]).filter(Boolean).join(" ");
type Props = { source: Battery71Source; locale: DemoLocale; language?: DemoLanguage; demo?: boolean; qrUrl?: string; qrImageUrl?: string };

function text(value: unknown, language: DemoLanguage): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? demoText(language, "Yes", "是") : demoText(language, "No", "否");
  if (typeof value === "number" && language.messages) return new Intl.NumberFormat(formatDemoLocale(language.locale), { maximumFractionDigits: 8 }).format(value);
  if (Array.isArray(value)) return value.map((entry) => text(entry, language)).join(" · ");
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object[language.locale] === "string" || typeof object.en === "string" || typeof object.zh === "string") return demoBilingualText(language, object as Partial<Record<DemoLocale, string>>);
    return Object.values(object).filter((entry) => entry !== null && entry !== undefined && entry !== "").map((entry) => text(entry, language)).join(" · ");
  }
  return demoText(language, String(value));
}

function CellValue({ cell, language }: { cell: ReferenceCell; language: DemoLanguage }) {
  const value = cell.value;
  const units: Record<string, string> = { cycles: "次", years: "年", months: "个月", "percentage points": "个百分点", "% / month": "% / 月" };
  const unit = cell.unit ? demoText(language, cell.unit, units[cell.unit]) : undefined;
  if (Array.isArray(value)) return <>{value.map((entry, index) => <span key={index}>{index ? " · " : ""}<CellValue cell={{ ...cell, value: entry }} language={language} /></span>)}</>;
  if (value && typeof value === "object" && "url" in value) {
    const doc = value as Record<string, unknown>;
    const url = typeof doc.url === "string" ? doc.url : "";
    if (url.startsWith("/api/demo-document?") || /^https:\/\//.test(url)) return <a className={c("field-link")} target="_blank" rel="noreferrer noopener" href={url.startsWith("/api/demo-document?") ? `${url}&lang=${language.locale}` : url}>{doc.title ? text(doc.title, language) : url}</a>;
  }
  if (typeof value === "string" && /^https:\/\//.test(value)) return <a className={c("field-link")} target="_blank" rel="noreferrer noopener" href={value}>{value}</a>;
  return <>{text(value, language)}{unit ? ` ${unit}` : ""}</>;
}

export function BatteryReferencePassport({ source, locale, language = { locale }, demo = false, qrUrl, qrImageUrl }: Props) {
  const model = useMemo(() => buildBatteryReferenceModel(source), [source]);
  const visibleRows = model.rows.filter(row => model.completeShowcase || (row.state !== "restricted" && row.state !== "not_applicable"));
  const visibleSections = BATTERY_REFERENCE_SECTIONS.filter(section => visibleRows.some(row => row.section === section.id));
  const [activeSection, setActiveSection] = useState(BATTERY_REFERENCE_SECTIONS[0].id);
  const [openImages, setOpenImages] = useState<Record<number, boolean>>({});
  const [zoomed, setZoomed] = useState<{ src: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const zh = locale === "zh";
  const t = (cn: string, en: string) => demoText(language, en, cn);
  const qr = qrUrl || `https://www.greanlean.com/api/v2/resolver/${encodeURIComponent(model.id)}?format=qr`;
  const qrDownload = model.serial !== "—" && qr.includes("/api/v2/resolver/") ? `${qr}${qr.includes("?") ? "&" : "?"}label=sn` : qr;
  const title = text(model.productName, language);
  const categoryLabel = model.category === "industrial" ? t("工业电池", "Industrial battery") : model.category === "ev" ? t("电动汽车电池", "EV battery") : t("轻型交通工具电池", "Light means of transport battery");

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id.replace("sec-", ""));
    }, { rootMargin: "-5% 0px -65% 0px", threshold: 0 });
    document.querySelectorAll("[data-reference-section]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [model.id]);

  useEffect(() => {
    if (!zoomed) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(null);
      if (event.key === "Tab") { event.preventDefault(); closeButton.current?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKeyDown); returnFocus.current?.focus(); };
  }, [zoomed]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(model.url); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }

  function requirement(row: ReferenceField) {
    const status = row.applicability;
    if (status === "future") return { label: t("目录暂缓项", "Deferred in catalog"), className: "none" };
    if (status === "duplicate") return { label: t("重复 · 对照展示", "Duplicate · cross-reference"), className: "none" };
    if (status === "not_applicable") return { label: t("当前类别不适用", "Not applicable"), className: "none" };
    if (status === "conditional") return { label: t("条件适用", "Conditional"), className: "cond" };
    if (status === "optional") return { label: t("可选", "Optional"), className: "opt" };
    if (status === "unconfirmed") return { label: t("适用性待确认", "Applicability pending"), className: "none" };
    return { label: t("必需", "Mandatory"), className: "" };
  }

  function attachment(row: ReferenceField) {
    const kind = ({ 7: "serial", 15: "materials", 41: "label" } as Record<number, string>)[row.number];
    if (!model.synthetic || !kind) return null;
    const src = `/api/battery-demo-illustration?identifier=${encodeURIComponent(model.id)}&kind=${kind}&lang=${sourceLocale(locale)}`;
    const label = t("查看图片附件", "View image attachment");
    return <>
      <button type="button" className={c("addl")} aria-expanded={Boolean(openImages[row.number])} aria-controls={`photo-${row.id}`} onClick={() => setOpenImages((current) => ({ ...current, [row.number]: !current[row.number] }))}>▧ {label} <span aria-hidden="true">{openImages[row.number] ? "⌃" : "⌄"}</span></button>
      {openImages[row.number] ? <div id={`photo-${row.id}`} className={c("photo", "open")}><button type="button" aria-label={t("放大演示图片", "Enlarge demonstration image")} onClick={() => setZoomed({ src, title: `${row.id} · ${t(row.labelZh, row.labelEn)}` })}><img src={src} alt={`${model.model} · ${t(row.labelZh, row.labelEn)} · DEMO`} /></button><p>{t("示例图片 · 点击放大", "Illustrative image · select to enlarge")}</p></div> : null}
    </>;
  }

  return <div className={c("root")} data-battery-reference="true" lang={locale}>
    <header className={c("hdr")}><div className={c("hdr-in")}><div><Link className={c("brand")} href={`/?lang=${sourceLocale(locale)}`} prefetch={false}>GreanLean</Link><span className={c("brandtag")}>{t("数字电池护照", "DIGITAL BATTERY PASSPORT")}</span></div><div className={c("hd-right")}><span className={c("hd-meta")}>{model.model} · {t("单品", "INDIVIDUAL")}</span>{demo ? <DemoLanguageSelect language={language} light /> : <nav className={c("toggle")} aria-label={t("语言选择", "Language selection")}><Link href={`${model.path}?lang=zh`} prefetch={false} lang="zh" aria-current={zh ? "page" : undefined} className={zh ? c("active") : undefined}>中文</Link><Link href={`${model.path}?lang=en`} prefetch={false} lang="en" aria-current={!zh ? "page" : undefined} className={!zh ? c("active") : undefined}>EN</Link></nav>}</div></div></header>
    <main className={c("page")}>
      <section className={c("hero")} aria-label={t("电池与护照身份", "Battery and passport identity")}>
        <div className={c("hero-main")}><div className={c("over")}>{t("单品数字电池护照", "INDIVIDUAL DIGITAL BATTERY PASSPORT")}</div><h1>{title}</h1><div className={c("hero-en")}>{categoryLabel}</div><div className={c("hero-pills")}><span className={c("chip")}>{model.model}</span><span className={c("chip")}>{model.category === "industrial" ? t("工业电池", "INDUSTRIAL BATTERY") : model.category === "ev" ? t("电动汽车电池", "EV BATTERY") : t("LMT 电池", "LMT BATTERY")}</span><span className={c("chip")}>{t("单品", "INDIVIDUAL")}</span>{model.synthetic ? <span className={c("chip", "pilot")}>{t("演示", "DEMO")}</span> : null}</div>
          <div className={c("hero-grid")}>{[[t("单品序列号", "Serial number"), model.serial], [t("护照标识符", "Passport identifier"), model.id], [t("生产年月", "Manufacturing month"), model.date], [t("产品型号", "Model"), model.model]].map(([label, value]) => <div key={label}><div className={c("hero-key")}>{label}</div><div className={c("hero-val")}>{value}</div></div>)}</div>
        </div>
        <div className={c("qrband")}><div className={c("qr-top")}><div className={c("qrbox")}><img src={qrImageUrl || qr} width={130} height={130} alt={t("单体电池护照二维码", "Individual battery passport QR code")} /></div><div className={c("qr-copy")}><div className={c("qr-kicker")}>{t("单品护照二维码", "INDIVIDUAL PASSPORT QR")}</div><div className={c("qr-title")}>{t("扫码查看护照", "Scan to view passport")}</div><div className={c("qr-desc")}>{t("扫码直达本单品护照", "Direct access to this individual passport")}</div></div></div><div className={c("qr-actions")}><a href={qrDownload} download={`${model.model}-${model.serial}-QR.png`}>{t("下载二维码", "Download QR")}</a><button type="button" className={c("secondary")} onClick={() => void copyLink()}>{copied ? t("已复制", "Copied") : t("复制链接", "Copy link")}</button></div>{copyError ? <p role="status" className={c("qr-small")}>{t("请复制此链接：", "Copy this link: ")}{model.url}</p> : null}</div>
      </section>
      <section className={c("stats")} aria-label={t("电池关键参数", "Key battery parameters")}>{[[t("额定电压", "Nominal voltage"), model.stats.voltage, "V"], [t("额定容量", "Rated capacity"), model.stats.capacity, "Ah"], [t("额定能量", "Rated energy"), model.stats.energy, "Wh"], [t("净重", "Net mass"), model.stats.mass, "kg"], [t("化学体系", "Chemistry"), model.stats.chemistry, ""]].map(([label, value, unit]) => <div key={label} className={c("stat")}><span>{label}</span><b className={c("stat-value")}>{text(value, language)}<small>{unit}</small></b></div>)}</section>
      {model.synthetic ? <p className={c("demo-banner")}>{t("演示数据 · 未提供的内容已补充为常规产品参数示例，不代表真实检测、核证或合规认证。", "DEMO DATA · Missing content is supplemented with illustrative product parameters, not actual testing, verification or conformity certification.")}</p> : null}
      {model.showcaseNotice ? <p className={c("demo-banner")}>{text(model.showcaseNotice, language)}</p> : null}
      <div className={c("cols")} data-battery-catalog="71"><nav className={c("side")} aria-label={t("电池护照信息", "Passport information")}><div className={c("side-h")}>{t("电池护照信息", "PASSPORT INFORMATION")}</div>{visibleSections.map((section, index) => <a key={section.id} href={`#sec-${section.id}`} className={activeSection === section.id ? c("on") : undefined} aria-current={activeSection === section.id ? "location" : undefined} onClick={() => setActiveSection(section.id)}><b>{String(index + 1).padStart(2, "0")}</b>{t(section.zh, section.en)}</a>)}</nav>
        <div className={c("content")}>{visibleSections.map((section, index) => {
          const rows = visibleRows.filter((row) => row.section === section.id);
          return <section key={section.id} className={c("panel")} id={`sec-${section.id}`} data-reference-section="true" aria-labelledby={`heading-${section.id}`}><header className={c("panel-h")}><div className={c("panel-num")}>{String(index + 1).padStart(2, "0")}</div><div><h2 id={`heading-${section.id}`}>{t(section.zh, section.en)}</h2><p>{t(section.subZh, section.subEn)}</p></div><span className={c("panel-count")}>{rows.length} {t("项信息", "items")}</span></header><div className={c("list")}>{rows.map((row) => {
            const badge = requirement(row);
            return <article className={c("frow")} data-battery-field={row.id} data-field-state={row.cells.length ? "provided" : row.state} data-demo-generated={row.generated ? "true" : undefined} key={row.id}><div><h3 className={c("ftitle", "group-title")}><span className={c("fidx")}>{String(row.number).padStart(2, "0")}</span>{t(row.labelZh, row.labelEn)}</h3><div><span className={c("requirement", badge.className)}>{badge.label}</span>{row.generated ? <span className={c("demo-tag")}>{t("演示值", "Demo value")}</span> : null}</div><div className={c("faccess")}>{t("建议访问：", "Suggested access: ")}{row.access === "public" ? t("公开", "Public") : t("特定主体", "Restricted parties")}</div></div><div className={c("fval")}>
              {row.cells.length ? <div className={c("kv", row.cells.length === 1 ? "single" : row.cells.length === 2 ? "long" : "")}>{row.cells.map((entry, cellIndex) => <div key={cellIndex}><label>{t(entry.zh, entry.en)}</label><strong><CellValue cell={entry} language={language} /></strong></div>)}</div> : <div className={c("empty")}>{row.state === "not_applicable" ? t("当前电池类别不适用", "Not applicable to this battery category") : row.state === "restricted" ? t("需授权后查看", "Authorization required") : t("尚未提供", "Not provided")}</div>}
              {row.number === 15 && model.synthetic ? <><div className={c("materials")}>{model.materials.map(([cn, en, formula, percent]) => <div className={c("mat")} key={String(cn)}><div className={c("mat-name")}>{t(String(cn), String(en))}<span>{formula}</span></div><div className={c("mat-bar")}><i style={{ width: `${percent}%` }} /></div><div className={c("mat-p")}>{percent}%</div></div>)}</div><p className={c("mat-notes")}>{t("材料质量占比为演示配方，不是再生材料比例。", "Material weight percentages illustrate a formulation, not recycled content.")}</p></> : null}
              {attachment(row)}
            </div></article>;
          })}</div></section>;
        })}</div>
      </div>
      <footer className={c("foot")}>GreanLean · {t("单品电池护照", "Individual battery passport")} · {visibleRows.length} {t("项可见信息", "visible data points")}{model.synthetic ? <p className={c("demo-note")}>{t("本页为合成演示数据，所有补充参数仅用于产品界面展示，不作为真实产品检测、维修或监管申报依据。", "Synthetic demonstration data. Supplementary parameters illustrate the interface and are not evidence for actual product testing, servicing or regulatory submissions.")}</p> : null}</footer>
    </main>
    {zoomed ? <div className={c("modal", "show")} role="dialog" aria-modal="true" aria-label={zoomed.title} onClick={() => setZoomed(null)}><span className={c("modal-title")}>{zoomed.title}</span><button ref={closeButton} type="button" className={c("modal-close")} aria-label={t("关闭图片", "Close image")} onClick={() => setZoomed(null)}>×</button><img src={zoomed.src} alt={zoomed.title} onClick={(event) => event.stopPropagation()} /></div> : null}
  </div>;
}
