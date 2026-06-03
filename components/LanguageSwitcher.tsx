"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [hrefs, setHrefs] = useState({ en: "?lang=en", zh: "?lang=zh" });

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", "en");
    const en = `${url.pathname}${url.search}${url.hash}`;
    url.searchParams.set("lang", "zh");
    const zh = `${url.pathname}${url.search}${url.hash}`;
    setHrefs({ en, zh });
  }, []);

  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-sm font-semibold shadow-sm">
      <a
        href={hrefs.en}
        onClick={() => setLocale("en")}
        className={
          locale === "en"
            ? "rounded-lg bg-slate-950 px-3 py-1.5 text-white"
            : "rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
        }
      >
        EN
      </a>

      <a
        href={hrefs.zh}
        onClick={() => setLocale("zh")}
        className={
          locale === "zh"
            ? "rounded-lg bg-slate-950 px-3 py-1.5 text-white"
            : "rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
        }
      >
        中文
      </a>
    </div>
  );
}
