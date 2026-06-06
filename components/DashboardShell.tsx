"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandLogo } from "@/components/BrandLogo";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLanguage();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const t = locale === "zh"
      ? {
        overview: "后台首页",
        products: "产品中心",
        suppliers: "供应商库",
        importData: "批量导入",
        materials: "材料快录",
        esg: "ESG 快录",
        certificates: "证书快录",
        workspace: "DPP 工作流",
        signOut: "退出登录"
      }
    : {
        overview: "Dashboard",
        products: "Product Hub",
        suppliers: "Supplier Library",
        importData: "Bulk Import",
        materials: "Materials Quick Entry",
        esg: "ESG Quick Entry",
        certificates: "Certificate Quick Entry",
        workspace: "DPP Workflow",
        signOut: "Sign out"
      };

  const nav = [
    [t.overview, "/dashboard"],
    [t.products, "/dashboard/products"],
    [t.importData, "/dashboard/import"],
    [t.suppliers, "/dashboard/suppliers"],
  ];

  function withLocale(href: string) {
    return `${href}?lang=${locale}`;
  }

  async function signOut() {
    await createSupabaseClient().auth.signOut();
    router.push(`/login?lang=${locale}`);
  }

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const {
        data: { user },
      } = await createSupabaseClient().auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace(`/login?lang=${locale}`);
        return;
      }

      setCheckingAuth(false);
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [locale, router]);

  if (checkingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <BrandLogo href={`/?lang=${locale}`} size="md" />
          <p className="mt-6 text-sm font-semibold text-slate-300">
            {locale === "zh" ? "正在检查登录状态..." : "Checking session..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950 p-6 lg:block">
        <BrandLogo href="/dashboard" size="md" />

        <nav className="mt-10 space-y-2">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={withLocale(href)}
              className={clsx(
                "block rounded-lg px-4 py-3 text-sm font-semibold transition",
                pathname === href ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="absolute bottom-6 left-6 right-6 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
        >
          {t.signOut}
        </button>
      </aside>

      <main className="lg:pl-72">
        <div className="min-h-screen bg-slate-50 text-slate-950">
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo href="/dashboard" size="sm" />
              <LanguageSwitcher />
            </div>

            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {nav.map(([label, href]) => (
                <Link
                  key={href}
                  href={withLocale(href)}
                  className={clsx(
                    "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold",
                    pathname === href ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:p-10">
            <div className="mb-6 hidden items-center justify-between lg:flex">
              <div>
                <p className="text-sm font-semibold text-slate-500">{t.workspace}</p>
                <div className="mt-1">
                  <BrandLogo href="/dashboard" size="sm" />
                </div>
              </div>
              <LanguageSwitcher />
            </div>

            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
