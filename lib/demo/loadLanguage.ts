import type { DemoLanguage, DemoLocale } from "./language";

const dictionaries = {
  de: () => import("../../locales/de/demo.json"),
  fr: () => import("../../locales/fr/demo.json"),
  es: () => import("../../locales/es/demo.json"),
  it: () => import("../../locales/it/demo.json"),
  nl: () => import("../../locales/nl/demo.json"),
  pl: () => import("../../locales/pl/demo.json"),
  pt: () => import("../../locales/pt/demo.json"),
  sv: () => import("../../locales/sv/demo.json"),
};

export async function loadDemoLanguage(locale: DemoLocale): Promise<DemoLanguage> {
  return locale === "zh" || locale === "en"
    ? { locale }
    : { locale, messages: (await dictionaries[locale]()).default };
}
