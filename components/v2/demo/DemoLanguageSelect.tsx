"use client";

import { useRouter } from "next/navigation";
import { DEMO_LANGUAGE_NAMES, DEMO_LOCALES, demoLanguageHref, demoText, isDemoLocale, type DemoLanguage } from "@/lib/demo/language";

export function DemoLanguageSelect({ language, light = false }: { language: DemoLanguage; light?: boolean }) {
  const router = useRouter();
  const colors = light
    ? "border-white/30 bg-[#103f38] text-white"
    : "border-slate-300 bg-white text-slate-900";

  return (
    <select
      aria-label={demoText(language, "Language", "语言")}
      value={language.locale}
      onChange={(event) => {
        const locale = event.target.value;
        if (isDemoLocale(locale) && locale !== language.locale) {
          router.push(demoLanguageHref(window.location.href, locale), { scroll: false });
        }
      }}
      className={`min-h-11 max-w-full cursor-pointer rounded-lg border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${colors}`}
    >
      {DEMO_LOCALES.map((locale) => <option key={locale} value={locale} lang={locale}>{DEMO_LANGUAGE_NAMES[locale]}</option>)}
    </select>
  );
}
