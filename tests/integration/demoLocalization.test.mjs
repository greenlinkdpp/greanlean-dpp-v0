import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DEMO_LOCALES, demoBilingualText, demoLanguageHref, demoLocale, demoText } from "../../lib/demo/language.ts";
import { productPassportHref } from "../../lib/dppNavigation.ts";
import { qrDemo } from "../../lib/qrDemo.ts";

test("demo links retain the selected language, GS1 identity, and preview context", () => {
  for (const locale of DEMO_LOCALES) {
    assert.equal(demoLocale(locale), locale);
    const path = productPassportHref("DPP-GLR-LMT-000002", locale, { demo: true });
    assert.equal(path, `/01/09506000134352/21/GLR-LMT-000002?lang=${locale}`);
  }
  assert.equal(productPassportHref("DPP-NEW-DEMO", "pl", { demo: true }), "/p/DPP-NEW-DEMO?lang=pl&demo=1");
  assert.equal(demoLocale("invalid"), "zh");
  assert.equal(demoLocale(["fr", "en"], "en"), "en");
  assert.equal(
    demoLanguageHref("https://www.greanlean.com/p/DPP-NEW-DEMO?lang=en&demo=1&audience=REPAIRER&audienceGrant=abc%2Bxyz#repair", "sv"),
    "/p/DPP-NEW-DEMO?lang=sv&demo=1&audience=REPAIRER&audienceGrant=abc%2Bxyz#repair",
  );
});

test("each added locale has independent catalog, QR, and passport copy", async () => {
  const primaryMessages = [
    "Language", "QR Code & Product Passport Showcase", "View Digital Product Passport",
    "Digital Product Passport", "Technical specifications", "DIGITAL BATTERY PASSPORT",
    ...qrDemo.sections.map(({ title }) => title.en),
    ...qrDemo.documents.map(({ title }) => title.en),
  ];
  for (const locale of DEMO_LOCALES.filter((value) => value !== "zh" && value !== "en")) {
    const messages = JSON.parse(await readFile(new URL(`../../locales/${locale}/demo.json`, import.meta.url), "utf8"));
    for (const source of primaryMessages) assert.ok(messages[source], `${locale} requires ${source}`);
    assert.ok(messages["{count} public DPPs"].includes("{count}"));
    const language = { locale, messages };
    assert.equal(demoBilingualText(language, qrDemo.title), messages[qrDemo.title.en]);
    assert.equal(demoBilingualText(language, { en: "English", [locale]: "Local publication" }), "Local publication");
    assert.equal(demoText(language, "new untranslated content"), "new untranslated content");
  }
});
