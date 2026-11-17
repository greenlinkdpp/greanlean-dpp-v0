export const DEMO_LOCALES = ["zh", "en", "de", "fr", "es", "it", "nl", "pl", "pt", "sv"] as const;
export type DemoLocale = (typeof DEMO_LOCALES)[number];
export type DemoLanguage = { locale: DemoLocale; messages?: Readonly<Record<string, string>> };

export const DEMO_LANGUAGE_NAMES = {
  zh: "中文", en: "English", de: "Deutsch", fr: "Français", es: "Español",
  it: "Italiano", nl: "Nederlands", pl: "Polski", pt: "Português", sv: "Svenska",
} satisfies Record<DemoLocale, string>;

export function isDemoLocale(value: unknown): value is DemoLocale {
  return DEMO_LOCALES.some((locale) => locale === value);
}

export function demoLocale(value: unknown, fallback: DemoLocale = "zh"): DemoLocale {
  return isDemoLocale(value) ? value : fallback;
}

export function sourceLocale(locale: DemoLocale): "zh" | "en" {
  return locale === "zh" ? "zh" : "en";
}

export function formatDemoLocale(locale: DemoLocale): string {
  return locale === "zh" ? "zh-CN" : locale === "en" ? "en-GB" : locale === "pt" ? "pt-PT" : locale;
}

export function demoText(language: DemoLanguage, en: string, zh = en): string {
  if (language.locale === "zh") return zh;
  if (language.messages && Object.hasOwn(language.messages, en)) return language.messages[en];
  return en;
}

export function demoMessages<T extends Record<string, string>>(language: DemoLanguage, messages: T): { [Key in keyof T]: string } {
  return Object.fromEntries(Object.entries(messages).map(([key, label]) => [key, demoText(language, label)])) as {
    [Key in keyof T]: string;
  };
}

export function demoBilingualText(language: DemoLanguage, value: Readonly<Partial<Record<DemoLocale, string>>>): string {
  const localized = value[language.locale];
  if (typeof localized === "string" && localized.length) return localized;
  return demoText(language, value.en || value.zh || "", value.zh || value.en || "");
}

export function demoLanguageHref(current: string, locale: DemoLocale): string {
  const url = new URL(current, "https://demo.invalid");
  url.searchParams.set("lang", locale);
  return url.pathname + url.search + url.hash;
}
