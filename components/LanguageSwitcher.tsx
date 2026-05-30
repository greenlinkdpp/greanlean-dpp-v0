"use client";

import { useLanguage } from "@/components/LanguageProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setLocale("en")}
        className={
          locale === "en"
            ? "rounded bg-black px-3 py-1 text-white"
            : "rounded border px-3 py-1"
        }
      >
        EN
      </button>

      <button
        onClick={() => setLocale("zh")}
        className={
          locale === "zh"
            ? "rounded bg-black px-3 py-1 text-white"
            : "rounded border px-3 py-1"
        }
      >
        中文
      </button>
    </div>
  );
}