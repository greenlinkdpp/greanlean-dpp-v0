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
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [organisationName, setOrganisationName] = useState("");

  const t = locale === "zh"
      ? {
        overview: "后台首页",
        projects: "项目与适用性",
        organisation: "组织资料",
        products: "产品中心",
        leads: "客户提交",
        suppliers: "供应商库",
        access: "访问审批",
        importData: "批量导入",
        materials: "材料快录",
        esg: "ESG 快录",
        certificates: "证书快录",
        workspace: "DPP 工作流",
        partnerWorkspace: "合作伙伴工作台",
        partnerRole: "合作伙伴编辑者",
        platformRole: "平台管理员",
        workspaceGroup: "工作区",
        dataGroup: "数据协作",
        collaborationGroup: "客户协作",
        governanceGroup: "平台治理",
        currentOrganisation: "当前组织",
        signOut: "退出登录"
      }
    : {
        overview: "Dashboard",
        projects: "Projects & Applicability",
        organisation: "Organisation Profile",
        products: "Product Hub",
        leads: "Customer Submissions",
        suppliers: "Supplier Library",
        access: "Access Review",
        importData: "Bulk Import",
        materials: "Materials Quick Entry",
        esg: "ESG Quick Entry",
        certificates: "Certificate Quick Entry",
        workspace: "DPP Workflow",
        partnerWorkspace: "Partner workspace",
        partnerRole: "Partner editor",
        platformRole: "Platform administrator",
        workspaceGroup: "Workspace",
        dataGroup: "Data operations",
        collaborationGroup: "Collaboration",
        governanceGroup: "Governance",
        currentOrganisation: "Current organisation",
        signOut: "Sign out"
      };

  const navGroups = isPlatformAdmin
    ? [
        {
          label: t.workspaceGroup,
          items: [
            [t.overview, "/dashboard", "01"],
            [t.projects, "/dashboard/projects", "02"],
            [t.products, "/dashboard/products", "03"],
          ],
        },
        {
          label: t.dataGroup,
          items: [
            [t.importData, "/dashboard/import", "04"],
            [t.suppliers, "/dashboard/suppliers", "05"],
          ],
        },
        {
          label: t.collaborationGroup,
          items: [[t.leads, "/dashboard/leads", "06"]],
        },
        {
          label: t.governanceGroup,
          items: [
            [t.organisation, "/dashboard/organisation", "07"],
            [t.access, "/dashboard/access", "08"],
          ],
        },
      ]
    : [
        {
          label: t.workspaceGroup,
          items: [[t.products, "/dashboard/products", "01"]],
        },
      ];
  const nav = navGroups.flatMap((group) => group.items);

  useEffect(() => {
    const extraTitles: Record<string, string> = {
      "/dashboard/materials": t.materials,
      "/dashboard/esg": t.esg,
      "/dashboard/certificates": t.certificates,
      "/dashboard/access": t.access,
    };
    const titleEntries = nav.map(([label, href]) => [label, href]);
    const title =
      extraTitles[pathname] ||
      titleEntries.sort((a, b) => b[1].length - a[1].length).find(([, href]) => pathname === href || pathname.startsWith(`${href}/`))?.[0] ||
      t.workspace;
    document.title = `${title} | GREANLEAN DPP`;
  }, [nav, pathname, t.access, t.certificates, t.esg, t.materials, t.workspace]);

  function withLocale(href: string) {
    return `${href}?lang=${locale}`;
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  }

  async function signOut() {
    await createSupabaseClient().auth.signOut();
    router.push(`/login?lang=${locale}`);
  }

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session?.user) {
        router.replace(`/login?lang=${locale}`);
        return;
      }

      const response = await fetch("/api/access-context", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const identity = await response.json().catch(() => null);
      if (!active) return;
      if (!response.ok || !identity?.canUseDashboard) {
        router.replace(`/?lang=${locale}`);
        return;
      }
      setIsPlatformAdmin(Boolean(identity.isPlatformAdmin));
      setOrganisationName(identity.memberships?.[0]?.organisationName || "");
      const partnerRouteAllowed =
        pathname === "/dashboard/products" ||
        pathname.startsWith("/dashboard/products/");
      if (!identity.isPlatformAdmin && !partnerRouteAllowed) {
        router.replace(`/dashboard/products?lang=${locale}`);
        return;
      }
      setCheckingAuth(false);
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [locale, pathname, router]);

  if (checkingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <BrandLogo href={`/?lang=${locale}`} size="md" variant="light" />
          <p className="mt-6 text-sm font-semibold text-slate-300">
            {locale === "zh" ? "正在检查登录状态..." : "Checking session..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950 lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <BrandLogo href="/dashboard" size="md" variant="light" />
          <p className="mt-3 text-xs font-bold uppercase text-slate-500">{t.workspace}</p>
        </div>

        <div className="mx-4 mt-5 border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-[11px] font-black uppercase text-slate-500">{t.currentOrganisation}</p>
          <p className="mt-1 truncate text-sm font-black text-white">
            {isPlatformAdmin ? "GreanLean" : organisationName || t.partnerWorkspace}
          </p>
          <p className="mt-1 text-xs font-semibold text-emerald-300">
            {isPlatformAdmin ? t.platformRole : t.partnerRole}
          </p>
        </div>

        <nav className="mt-5 flex-1 space-y-6 overflow-y-auto px-4 pb-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[11px] font-black uppercase text-slate-500">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.items.map(([label, href, index]) => (
                  <Link
                    key={href}
                    href={withLocale(href)}
                    className={clsx(
                      "flex min-h-11 items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-bold transition",
                      isActive(href)
                        ? "border-emerald-400 bg-white/10 text-white"
                        : "border-transparent text-slate-300 hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <span className={clsx(
                      "text-[10px] font-black",
                      isActive(href) ? "text-emerald-300" : "text-slate-600",
                    )}>{index}</span>
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="mx-4 mb-5 shrink-0 border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
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
                    isActive(href) ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="mb-7 hidden items-center justify-between border-b border-slate-200 pb-5 lg:flex">
              <div>
                <p className="text-xs font-black uppercase text-emerald-700">
                  {isPlatformAdmin ? t.workspace : `${t.partnerWorkspace} · ${organisationName || t.partnerRole}`}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {isPlatformAdmin ? t.platformRole : t.partnerRole}
                </p>
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
