"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";

export function PublicHeader() {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          solutions: "解决方案",
          dpp: "DPP",
          contact: "联系我们",
          login: "DPP 登录",
        }
      : {
          solutions: "Solutions",
          dpp: "DPP",
          contact: "Contact",
          login: "DPP Login",
        };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-600 text-white">
            G
          </span>

          <span>GreenLean</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
          <a href="/#solutions">{t.solutions}</a>

          <a href="/#dpp">{t.dpp}</a>

          <a href="/#contact">{t.contact}</a>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <Link href="/login" className="btn-secondary py-2">
            {t.login}
          </Link>
        </div>
      </div>
    </header>
  );
}