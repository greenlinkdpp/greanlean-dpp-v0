import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { qrDemo, QR_DEMO_URL } from "../../lib/qrDemo.ts";

const directory = path.resolve("public/demo/qr-code/assets");
await fs.mkdir(directory, { recursive: true });
const qr = await QRCode.toString(QR_DEMO_URL, { type: "svg", errorCorrectionLevel: "M", margin: 4, color: { dark: "#163f31", light: "#ffffff" } });
await fs.writeFile(path.join(directory, "qr.svg"), qr);
await QRCode.toFile(path.join(directory, "qr.png"), QR_DEMO_URL, { width: 1200, margin: 4, errorCorrectionLevel: "M", color: { dark: "#163f31", light: "#ffffff" } });
const escape = text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const text = (x, y, value, size = 18, fill = "#42634d", weight = 500) => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(value)}</text>`;
const svg = (title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380" role="img" aria-label="${escape(title)}"><rect width="640" height="380" rx="12" fill="#f3f7f1"/><g font-family="Arial, sans-serif">${text(28, 34, "GreanLean", 20, "#245b40", 700)}${text(503, 32, "DEMO ONLY", 12, "#a08851", 700)}${body}${text(28, 357, "ILLUSTRATION · GL24/12-DEMO · SAMPLE DATA", 11, "#8fa28e")}</g></svg>`;
const nestedQr = qr.replace(/<svg[^>]*>/, '<svg x="408" y="112" width="170" height="170" viewBox="0 0 41 41">');
// Preserve the library-generated QR viewBox, which depends on the encoded URL.
const viewBox = qr.match(/viewBox="([^"]+)"/)[1];
const labelQr = nestedQr.replace('viewBox="0 0 41 41"', `viewBox="${viewBox}"`);
const assets = {
  "battery-pack.svg": svg("Demo battery pack illustration", `<defs><linearGradient id="case" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#50715b"/><stop offset="1" stop-color="#244534"/></linearGradient></defs><ellipse cx="314" cy="303" rx="202" ry="15" fill="#dbe6d9"/><path d="M129 124 365 90 508 143 273 181Z" fill="#77937a"/><path d="M129 124 273 181 273 302 129 245Z" fill="#385942"/><path d="M273 181 508 143 508 265 273 302Z" fill="url(#case)"/><path d="M211 106v-24c0-19 87-32 100-9l9 26" fill="none" stroke="#284834" stroke-width="12" stroke-linecap="round"/><rect x="312" y="198" width="148" height="61" rx="4" fill="#edf3e7" transform="rotate(-9 312 198)"/>${text(324, 215, "GL24/12-DEMO", 14, "#35583c", 700)}${text(326, 238, "24 V · 12 Ah · 288 Wh", 10)}<path d="M434 110q65-42 84 6" fill="none" stroke="#353f35" stroke-width="6"/><path d="M450 117q55-23 73 12" fill="none" stroke="#b27057" stroke-width="5"/><circle cx="521" cy="125" r="8" fill="#b68a56"/>`),
  "product-label.svg": svg("Demo product label with scannable QR", `<rect x="35" y="72" width="570" height="250" rx="9" fill="#fff" stroke="#cbdcc9"/>${text(58, 107, "RECHARGEABLE LI-ION BATTERY", 16, "#285238", 700)}${text(58, 143, "GL24/12-DEMO", 25, "#244e35", 700)}${text(58, 178, "24 V  /  12 Ah  /  288 Wh", 20)}${text(58, 211, "BATCH  DEMO-B2412-202611", 14)}${text(58, 239, "NMC · 2.21 kg · 2026-11", 14)}${text(58, 279, "SAMPLE LABEL · SEPARATE COLLECTION", 11, "#8b9e89")}${labelQr}`),
  "materials.svg": svg("Illustrative battery material structure", `<rect x="56" y="90" width="240" height="219" rx="12" fill="#dce9d8" stroke="#96b08f"/><rect x="76" y="111" width="200" height="177" rx="5" fill="#f9fbf6"/>${[0,1,2,3].map((i) => `<rect x="${91+i*45}" y="135" width="31" height="125" rx="9" fill="${["#aecaa4","#7ca379","#b9cbae","#4e8055"][i]}"/><rect x="${101+i*45}" y="128" width="11" height="9" fill="#7c9676"/>`).join("")}${text(335, 125, "NMC CHEMISTRY", 21, "#325c3b", 700)}${["Cathode / NMC", "Anode / graphite", "Electrolyte / lithium salt", "Case & conductors / Al, Cu"].map((value, i) => text(335, 170+i*34, value, 15)).join("")}`),
  "collection.svg": svg("Illustration of separate battery collection", `<g fill="none" stroke="#456d49" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="m137 139 14 133h79l14-133M130 128h122M167 125l6-20h35l7 20M174 151v94m36-94v94M106 91l164 204M270 91 106 295"/><circle cx="166" cy="283" r="8"/><circle cx="221" cy="283" r="8"/></g>${text(325, 158, "SEPARATE", 26, "#325b39", 700)}${text(325, 193, "COLLECTION", 26, "#325b39", 700)}${text(325, 238, "Keep waste batteries out", 16)}${text(325, 263, "of household waste", 16)}`),
};
for (const [name, content] of Object.entries(assets)) await fs.writeFile(path.join(directory, name), content);
for (const locale of ["zh", "en"]) for (const doc of qrDemo.documents) {
  const notice = locale === "zh" ? "演示资料 · 非签署声明、检测报告或合规证明" : "Sample material · not a signed declaration, test report or compliance certificate";
  const html = `<!doctype html><html lang="${locale === "zh" ? "zh-CN" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(doc.title[locale])} | GreanLean Demo</title><style>body{max-width:760px;margin:60px auto;padding:24px;font:16px/1.8 Arial,sans-serif;color:#23463a}h1{font-size:28px}small{color:#8a7444}footer{border-top:1px solid #dce8df;margin-top:40px;padding-top:20px;font-size:12px;color:#71836f}a{color:#205d49}</style></head><body><small>GREANLEAN · DEMO ONLY</small><h1>${escape(doc.title[locale])}</h1>${doc.paragraphs.map(p => `<p>${escape(p[locale])}</p>`).join("")}<footer>${escape(notice)}<p><a href="${QR_DEMO_URL}?lang=${locale}">${QR_DEMO_URL}</a></p></footer></body></html>`;
  await fs.writeFile(path.join(directory, `${doc.id}-${locale}.html`), html);
}
console.log(JSON.stringify({ directory, qrTarget: QR_DEMO_URL, files: 10 }));
