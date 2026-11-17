import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import QRCode from "qrcode";
import { QR_DEMO_URL, qrDemo } from "../../lib/qrDemo.ts";

const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

test("QR assets encode the stable public batch demo URL", async () => {
  const expected = await QRCode.toString(QR_DEMO_URL, { type: "svg", errorCorrectionLevel: "M", margin: 4, color: { dark: "#163f31", light: "#ffffff" } });
  const actual = await fs.readFile("public/demo/qr-code/assets/qr.svg", "utf8");
  assert.equal(actual, expected);
  const label = await fs.readFile("public/demo/qr-code/assets/product-label.svg", "utf8");
  assert.ok(label.includes(expected.match(/<path[^>]*stroke[^>]*>/)[0]));
  assert.equal(qrDemo.sections.length, 5);
});

test("every bilingual demo document matches its preview and stays labelled as a sample", async () => {
  for (const locale of ["zh", "en"]) for (const doc of qrDemo.documents) {
    const html = await fs.readFile(`public/demo/qr-code/assets/${doc.id}-${locale}.html`, "utf8");
    assert.ok(html.includes("DEMO ONLY"));
    assert.ok(html.includes(escape(doc.title[locale])));
    for (const paragraph of doc.paragraphs) assert.ok(html.includes(escape(paragraph[locale])));
    assert.ok(html.includes(QR_DEMO_URL));
    assert.ok(!html.includes("gladwaybattery"));
  }
});
