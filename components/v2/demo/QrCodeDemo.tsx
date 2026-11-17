"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { QR_DEMO_ASSETS, QR_DEMO_PATH, QR_DEMO_URL, qrDemo, qrDemoDocumentNotice, type DemoCopy } from "@/lib/qrDemo";
import { demoBilingualText, demoText, type DemoLanguage } from "@/lib/demo/language";
import { DemoLanguageSelect } from "./DemoLanguageSelect";
import styles from "./QrCodeDemo.module.css";

type Preview = { kind: "image"; index: number } | { kind: "document"; index: number };

export function QrCodeDemo({ language }: { language: DemoLanguage }) {
  const { locale } = language;
  const t = (value: DemoCopy) => demoBilingualText(language, value);
  const ui = (en: string, zh: string) => demoText(language, en, zh);
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const open = (value: Preview) => { setPreview(value); dialog.current?.showModal(); };
  const title = preview ? t(preview.kind === "image" ? qrDemo.images[preview.index].title : qrDemo.documents[preview.index].title) : "";
  const document = preview?.kind === "document" ? qrDemo.documents[preview.index] : null;
  const documentUrl = (id: string) => locale === "zh" || locale === "en"
    ? `${QR_DEMO_ASSETS}/${id}-${locale}.html`
    : `${QR_DEMO_PATH}/documents/${id}?lang=${locale}`;

  async function copyLink() {
    try { await navigator.clipboard.writeText(QR_DEMO_URL); setCopied(true); setCopyFailed(false); }
    catch { setCopyFailed(true); }
  }

  return <main className={styles.page} lang={locale}>
    <header className={styles.top}>
      <Link className={styles.brand} href={`/demo?lang=${locale}`}>GreanLean<span>{ui("BATTERY INFORMATION", "电池信息")}</span></Link>
      <DemoLanguageSelect language={language} />
    </header>
    <div className={styles.container}>
      <div className={styles.breadcrumb}><Link href={`/demo?lang=${locale}`}>← {ui("Back to Demo Showcase", "返回 Demo 展厅")}</Link><span>{ui("QR CODE / BATCH INFORMATION", "二维码／批次信息")}</span></div>
      <div className={styles.demoNotice}><b>DEMO</b><p>{ui("Batch battery information demo · Sample product, company and document data", "批次电池信息页演示 · 产品、企业与文件均为示例数据")}</p></div>
      <section className={styles.hero} aria-labelledby="qr-demo-title">
        <div className={styles.heroCopy}><div className={styles.identity}>
          <div><p className={styles.eyebrow}>{ui("BATCH BATTERY INFORMATION", "批次电池信息")}</p><h1 id="qr-demo-title">{t(qrDemo.title)}</h1><p className={styles.model}>{qrDemo.model}</p></div>
          <div className={styles.batch}><span>{ui("Batch / product reference", "批次／产品编号")}</span><strong>{qrDemo.batch}</strong><dl><div><dt>{ui("Manufactured", "制造年月")}</dt><dd>2026-11</dd></div><div><dt>{ui("Batch quantity", "批次数量")}</dt><dd>500 {ui("units", "个")}</dd></div></dl></div>
        </div><dl className={styles.metrics}>{qrDemo.metrics.map(metric => <div key={metric.value}><dd>{metric.value}</dd><dt>{t(metric.label)}</dt></div>)}</dl></div>
        <aside className={styles.qrPanel} aria-label={ui("Scan to explore", "扫码体验")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${QR_DEMO_ASSETS}/qr.svg`} alt={ui("QR code linking to this demo information page", "指向本 Demo 信息页的二维码")} width={152} height={152} />
          <strong>{ui("Scan to explore", "扫码体验信息页")}</strong><p>{ui("One batch · one information link", "同一批次 · 同一信息入口")}</p>
          <div className={styles.qrActions}><a href={`${QR_DEMO_ASSETS}/qr.png`} download="GreanLean-QR-Code-Demo.png">↓ {ui("Download QR", "下载二维码")}</a><button onClick={copyLink}>{copied ? (ui("Copied ✓", "已复制 ✓")) : (ui("Copy link", "复制链接"))}</button></div>
          <a className={styles.url} href={QR_DEMO_URL}>{QR_DEMO_URL.replace("https://", "")}</a><span role="status" className={styles.copyStatus}>{copyFailed ? (ui("Please copy the link above", "请复制上方链接")) : copied ? (ui("Link copied", "链接已复制")) : ""}</span>
        </aside>
      </section>
      <div className={styles.layout}><nav className={styles.jump} aria-label={ui("Battery information sections", "电池信息章节")}><p>{ui("BATTERY INFORMATION", "电池信息")}</p>{qrDemo.sections.map((section, i) => <a href={`#${section.id}`} key={section.id}><span>{String(i + 1).padStart(2, "0")}</span>{t(section.title)}</a>)}</nav>
        <div className={styles.content}>{qrDemo.sections.map((section, i) => <section className={styles.section} id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
          <header className={styles.sectionHead}><span>{String(i + 1).padStart(2, "0")}</span><div><h2 id={`${section.id}-title`}>{t(section.title)}</h2><p>{t(section.subtitle)}</p></div></header>
          {section.rows.length ? <dl className={styles.rows}>{section.rows.map(row => <div className={styles.field} key={row.label.en}><dt>{t(row.label)}</dt><dd>{t(row.value)}{"pending" in row && row.pending ? <span className={styles.pending}>{ui("Pending", "待提供")}</span> : null}</dd></div>)}</dl> : null}
          {section.id === "labels" ? <div className={styles.gallery}>{qrDemo.images.map((image, index) => <button key={image.file} onClick={() => open({ kind: "image", index })} aria-label={`${ui("Enlarge", "放大查看")} ${t(image.title)}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${QR_DEMO_ASSETS}/${image.file}`} alt={t(image.title)} width={640} height={380} loading="lazy" /><span>{t(image.title)} ↗</span></button>)}</div> : null}
          {section.id === "documents" ? <><div className={styles.documents}>{qrDemo.documents.map((doc, index) => <article key={doc.id}><span className={styles.fileType}>HTML · DEMO</span><h3>{t(doc.title)}</h3><p>{t(doc.description)}</p><div><button onClick={() => open({ kind: "document", index })}>{ui("Preview", "预览")} ↗</button><a href={documentUrl(doc.id)} download>↓ {ui("Download", "下载文件")}</a></div></article>)}</div><p className={styles.documentNote}>{ui("Declaration of conformity, SDS and test reports pending. Downloads on this page are sample materials.", "符合性声明、SDS 与检测报告待提供。本页下载内容为演示资料。")}</p></> : null}
        </section>)}</div>
      </div>
      <footer className={styles.footer}><p>GreanLean · QR Code Demo · {ui("Batch-level information", "批次级信息")}</p><p>{ui("Sample content illustrates the scanning experience and does not certify product compliance", "示例用于展示扫码信息体验，不构成产品合规证明")}</p><Link href={`/demo?lang=${locale}`}>{ui("Explore more demos →", "浏览更多 Demo →")}</Link></footer>
    </div>
    <dialog ref={dialog} className={styles.viewer} aria-labelledby="qr-preview-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button className={styles.close} aria-label={ui("Close preview", "关闭预览")} onClick={() => dialog.current?.close()}>×</button><h2 id="qr-preview-title">{title}</h2>
      {preview?.kind === "image" ? <img src={`${QR_DEMO_ASSETS}/${qrDemo.images[preview.index].file}`} alt={title} width={640} height={380} /> : null}
      {document ? <><div className={styles.documentPreview}><p className={styles.eyebrow}>GreanLean · {ui("DEMO ONLY", "仅供演示")}</p><h3>{t(document.title)}</h3>{document.paragraphs.map(p => <p key={p.en}>{t(p)}</p>)}<p>{t(qrDemoDocumentNotice)}</p></div><a className={styles.download} href={documentUrl(document.id)} download>↓ {ui("Download file", "下载文件")}</a></> : null}
    </dialog>
  </main>;
}
