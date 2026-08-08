"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";

export function PublicHeader() {
  const { locale } = useLanguage();
  const [open, setOpen] = useState(false);

  const t =
    locale === "zh"
      ? {
          home: "首页",
          platform: "DPP 平台",
          industries: "行业方案",
          battery: "电池护照",
          cases: "产品护照案例",
          regulations: "法规与时间线",
          contact: "联系我们",
          login: "DPP 登录",
          menu: "打开导航菜单",
          close: "关闭导航菜单",
        }
      : {
          home: "Home",
          platform: "DPP platform",
          industries: "Industries",
          battery: "Battery Passport",
          cases: "Passport cases",
          regulations: "Regulations",
          contact: "Contact",
          login: "DPP login",
          menu: "Open navigation menu",
          close: "Close navigation menu",
        };

  const links = [
    [t.home, `/?lang=${locale}`],
    [t.platform, `/?lang=${locale}#platform`],
    [t.industries, `/?lang=${locale}#industries`],
    [t.battery, `/?lang=${locale}#battery-passport`],
    [t.cases, `/?lang=${locale}#passport-cases`],
    [t.regulations, `/?lang=${locale}#regulations`],
    [t.contact, `/?lang=${locale}#contact`],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-6">
        <BrandLogo href={`/?lang=${locale}`} size="md" />

        <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 xl:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => (
            <Link key={label} href={href} className="whitespace-nowrap transition hover:text-emerald-700">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href={`/login?lang=${locale}`}
            className="hidden items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
          >
            {t.login}
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center border border-slate-200 bg-white text-slate-800 xl:hidden"
            aria-label={open ? t.close : t.menu}
            aria-expanded={open}
            aria-controls="public-mobile-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="relative block h-4 w-5" aria-hidden="true">
              <span className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition ${open ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`absolute left-0 top-[7px] h-0.5 w-5 bg-current transition ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 top-[14px] h-0.5 w-5 bg-current transition ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <nav id="public-mobile-navigation" className="border-t border-slate-200 bg-white px-6 py-4 xl:hidden" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-7xl gap-1">
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="border-b border-slate-100 px-2 py-3 text-sm font-black text-slate-700 last:border-b-0 hover:text-emerald-700"
              >
                {label}
              </Link>
            ))}
            <Link href={`/login?lang=${locale}`} onClick={() => setOpen(false)} className="btn-primary mt-3 sm:hidden">
              {t.login}
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
