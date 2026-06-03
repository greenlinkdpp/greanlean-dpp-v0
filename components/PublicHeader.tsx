"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";

export function PublicHeader() {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          home: "首页",
          solutions: "解决方案",
          dpp: "DPP",
          contact: "联系我们",
          login: "DPP 登录",
        }
      : {
          home: "Home",
          solutions: "Solutions",
          dpp: "DPP",
          contact: "Contact",
          login: "DPP Login",
        };

  const langQuery = `?lang=${locale}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href={`/${langQuery}`} className="flex items-center gap-3 font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">
            G
          </span>

          <span className="brand-wordmark">GREANLEAN</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
          <a className="transition hover:text-slate-950" href={`/${langQuery}`}>
            {t.home}
          </a>

          <a className="transition hover:text-slate-950" href={`/${langQuery}#solutions`}>
            {t.solutions}
          </a>

          <a className="transition hover:text-slate-950" href={`/${langQuery}#dpp`}>
            {t.dpp}
          </a>

          <a className="transition hover:text-slate-950" href={`/${langQuery}#contact`}>
            {t.contact}
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />

          <Link href={`/login${langQuery}`} className="btn-secondary px-4 py-2">
            {t.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
