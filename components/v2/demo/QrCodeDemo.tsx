"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { QR_DEMO_ASSETS, QR_DEMO_PATH, QR_DEMO_URL, qrDemo, type DemoCopy } from "@/lib/qrDemo";
import styles from "./QrCodeDemo.module.css";

type Preview = { kind: "image"; index: number } | { kind: "document"; index: number };

export function QrCodeDemo({ locale }: { locale: "zh" | "en" }) {
  const zh = locale === "zh";
  const t = (value: DemoCopy) => value[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const open = (value: Preview) => { setPreview(value); dialog.current?.showModal(); };
  const title = preview ? t(preview.kind === "image" ? qrDemo.images[preview.index].title : qrDemo.documents[preview.index].title) : "";
  const document = preview?.kind === "document" ? qrDemo.documents[preview.index] : null;
  const documentUrl = (id: string) => `${QR_DEMO_ASSETS}/${id}-${locale}.html`;

  async function copyLink() {
    try { await navigator.clipboard.writeText(QR_DEMO_URL); setCopied(true); setCopyFailed(false); }
    catch { setCopyFailed(true); }
  }

  return <main className={styles.page} lang={zh ? "zh-CN" : "en"}>
    <header className={styles.top}>
      <Link className={styles.brand} href={`/demo?lang=${locale}`}>GreanLean<span>BATTERY INFORMATION</span></Link>
      <nav className={styles.languages} aria-label={zh ? "语言" : "Language"}>{(["zh", "en"] as const).map((lang) => <Link key={lang} href={`${QR_DEMO_PATH}?lang=${lang}`} aria-current={locale === lang ? "page" : undefined}>{lang === "zh" ? "中文" : "EN"}</Link>)}</nav>
    </header>
    <div className={styles.container}>
      <div className={styles.breadcrumb}><Link href={`/demo?lang=${locale}`}>← {zh ? "返回 Demo 展厅" : "Back to Demo Showcase"}</Link><span>QR CODE / BATCH INFORMATION</span></div>
      <div className={styles.demoNotice}><b>DEMO</b><p>{zh ? "批次电池信息页演示 · 产品、企业与文件均为示例数据" : "Batch battery information demo · Sample product, company and document data"}</p></div>
      <section className={styles.hero} aria-labelledby="qr-demo-title">
        <div className={styles.heroCopy}><div className={styles.identity}>
          <div><p className={styles.eyebrow}>{zh ? "批次电池信息" : "BATCH BATTERY INFORMATION"}</p><h1 id="qr-demo-title">{t(qrDemo.title)}</h1><p className={styles.model}>{qrDemo.model}</p></div>
          <div className={styles.batch}><span>{zh ? "批次／产品编号" : "Batch / product reference"}</span><strong>{qrDemo.batch}</strong><dl><div><dt>{zh ? "制造年月" : "Manufactured"}</dt><dd>2026-11</dd></div><div><dt>{zh ? "批次数量" : "Batch quantity"}</dt><dd>500 {zh ? "个" : "units"}</dd></div></dl></div>
        </div><dl className={styles.metrics}>{qrDemo.metrics.map(metric => <div key={metric.value}><dd>{metric.value}</dd><dt>{t(metric.label)}</dt></div>)}</dl></div>
        <aside className={styles.qrPanel} aria-label={zh ? "扫码体验" : "Scan to explore"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${QR_DEMO_ASSETS}/qr.svg`} alt={zh ? "指向本 Demo 信息页的二维码" : "QR code linking to this demo information page"} width={152} height={152} />
          <strong>{zh ? "扫码体验信息页" : "Scan to explore"}</strong><p>{zh ? "同一批次 · 同一信息入口" : "One batch · one information link"}</p>
          <div className={styles.qrActions}><a href={`${QR_DEMO_ASSETS}/qr.png`} download="GreanLean-QR-Code-Demo.png">↓ {zh ? "下载二维码" : "Download QR"}</a><button onClick={copyLink}>{copied ? (zh ? "已复制 ✓" : "Copied ✓") : (zh ? "复制链接" : "Copy link")}</button></div>
          <a className={styles.url} href={QR_DEMO_URL}>{QR_DEMO_URL.replace("https://", "")}</a><span role="status" className={styles.copyStatus}>{copyFailed ? (zh ? "请复制上方链接" : "Please copy the link above") : copied ? (zh ? "链接已复制" : "Link copied") : ""}</span>
        </aside>
      </section>
      <div className={styles.layout}><nav className={styles.jump} aria-label={zh ? "电池信息章节" : "Battery information sections"}><p>{zh ? "电池信息" : "BATTERY INFORMATION"}</p>{qrDemo.sections.map((section, i) => <a href={`#${section.id}`} key={section.id}><span>{String(i + 1).padStart(2, "0")}</span>{t(section.title)}</a>)}</nav>
        <div className={styles.content}>{qrDemo.sections.map((section, i) => <section className={styles.section} id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
          <header className={styles.sectionHead}><span>{String(i + 1).padStart(2, "0")}</span><div><h2 id={`${section.id}-title`}>{t(section.title)}</h2><p>{t(section.subtitle)}</p></div></header>
          {section.rows.length ? <dl className={styles.rows}>{section.rows.map(row => <div className={styles.field} key={row.label.en}><dt>{t(row.label)}</dt><dd>{t(row.value)}{"pending" in row && row.pending ? <span className={styles.pending}>{zh ? "待提供" : "Pending"}</span> : null}</dd></div>)}</dl> : null}
          {section.id === "labels" ? <div className={styles.gallery}>{qrDemo.images.map((image, index) => <button key={image.file} onClick={() => open({ kind: "image", index })} aria-label={`${zh ? "放大查看" : "Enlarge"} ${t(image.title)}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${QR_DEMO_ASSETS}/${image.file}`} alt={t(image.title)} width={640} height={380} loading="lazy" /><span>{t(image.title)} ↗</span></button>)}</div> : null}
          {section.id === "documents" ? <><div className={styles.documents}>{qrDemo.documents.map((doc, index) => <article key={doc.id}><span className={styles.fileType}>HTML · DEMO</span><h3>{t(doc.title)}</h3><p>{t(doc.description)}</p><div><button onClick={() => open({ kind: "document", index })}>{zh ? "预览" : "Preview"} ↗</button><a href={documentUrl(doc.id)} download>↓ {zh ? "下载文件" : "Download"}</a></div></article>)}</div><p className={styles.documentNote}>{zh ? "符合性声明、SDS 与检测报告待提供。本页下载内容为演示资料。" : "Declaration of conformity, SDS and test reports pending. Downloads on this page are sample materials."}</p></> : null}
        </section>)}</div>
      </div>
      <footer className={styles.footer}><p>GreanLean · QR Code Demo · {zh ? "批次级信息" : "Batch-level information"}</p><p>{zh ? "示例用于展示扫码信息体验，不构成产品合规证明" : "Sample content illustrates the scanning experience and does not certify product compliance"}</p><Link href={`/demo?lang=${locale}`}>{zh ? "浏览更多 Demo →" : "Explore more demos →"}</Link></footer>
    </div>
    <dialog ref={dialog} className={styles.viewer} aria-labelledby="qr-preview-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button className={styles.close} aria-label={zh ? "关闭预览" : "Close preview"} onClick={() => dialog.current?.close()}>×</button><h2 id="qr-preview-title">{title}</h2>
      {preview?.kind === "image" ? <img src={`${QR_DEMO_ASSETS}/${qrDemo.images[preview.index].file}`} alt={title} width={640} height={380} /> : null}
      {document ? <><div className={styles.documentPreview}><p className={styles.eyebrow}>GREANLEAN · DEMO ONLY</p><h3>{t(document.title)}</h3>{document.paragraphs.map(p => <p key={p.en}>{t(p)}</p>)}<p>{zh ? "演示资料 · 非签署声明、检测报告或合规证明" : "Sample material · not a signed declaration, test report or compliance certificate"}</p></div><a className={styles.download} href={documentUrl(document.id)} download>↓ {zh ? "下载文件" : "Download file"}</a></> : null}
    </dialog>
  </main>;
}
