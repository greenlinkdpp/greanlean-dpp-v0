"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandLogo } from "@/components/BrandLogo";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [canUseLegacyDashboard, setCanUseLegacyDashboard] = useState(false);
  const [hasV2Backoffice, setHasV2Backoffice] = useState(false);
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
        v2Operations: "V2 运营控制台",
        platformConsole: "多租户平台控制台",
        partnerWorkspace: "合作伙伴工作台",
        partnerRole: "合作伙伴编辑者",
        platformRole: "平台管理员",
        platformGroup: "平台",
        tenantGroup: "租户工作区",
        currentScope: "当前范围",
        allTenants: "平台 · 全部租户",
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
        v2Operations: "V2 Operations Console",
        platformConsole: "Multi-Tenant Platform Console",
        partnerWorkspace: "Partner workspace",
        partnerRole: "Partner editor",
        platformRole: "Platform administrator",
        platformGroup: "Platform",
        tenantGroup: "Tenant workspace",
        currentScope: "Current Scope",
        allTenants: "Platform · All Tenants",
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
          label: t.platformGroup,
          items: [[t.platformConsole, "/dashboard/platform", "01"]],
        },
        {
          label: t.tenantGroup,
          items: [[t.v2Operations, "/dashboard/v2", "02"]],
        },
      ]
    : [
        {
          label: t.workspaceGroup,
          items: [
            ...(canUseLegacyDashboard ? [[t.products, "/dashboard/products", "01"]] : []),
            ...(hasV2Backoffice ? [[t.v2Operations, "/dashboard/v2", "V2"]] : []),
          ],
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
    const tenant = searchParams.get("tenant");
    const params = new URLSearchParams({ lang: locale });
    if (tenant && href.startsWith("/dashboard/v2")) params.set("tenant", tenant);
    return `${href}?${params.toString()}`;
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
        const returnTo = `${pathname}?lang=${locale}`;
        router.replace(`/login?lang=${locale}&next=${encodeURIComponent(returnTo)}`);
        return;
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [response, v2Response] = await Promise.all([
        fetch("/api/access-context", { headers, cache: "no-store" }),
        fetch("/api/v2/backoffice/context", { headers, cache: "no-store" }),
      ]);
      const [identity, v2Identity] = await Promise.all([
        response.json().catch(() => null),
        v2Response.json().catch(() => null),
      ]);
      if (!active) return;
      const canUseLegacy = response.ok && Boolean(identity?.canUseDashboard);
      const tenantContexts = v2Response.ok && Array.isArray(v2Identity?.data)
        ? v2Identity.data.filter((item: { authorityType?: string }) => item.authorityType === "TENANT" || item.authorityType === "PLATFORM")
        : [];
      const platformContexts = tenantContexts.filter((item: { authorityType?: string }) => item.authorityType === "PLATFORM");
      const canUseV2Backoffice = tenantContexts.length > 0;
      const hasPlatformAuthority = platformContexts.length > 0;
      const isV2Route = pathname === "/dashboard/v2" || pathname.startsWith("/dashboard/v2/");

      if (!canUseLegacy && !canUseV2Backoffice) {
        router.replace(`/?lang=${locale}`);
        return;
      }

      setCanUseLegacyDashboard(canUseLegacy);
      setIsPlatformAdmin(hasPlatformAuthority || Boolean(identity?.isPlatformAdmin));
      setHasV2Backoffice(canUseV2Backoffice);
      const requestedTenant = searchParams.get("tenant");
      const requestedContext = tenantContexts.find(
        (item: { tenantCode?: string; tenantId?: string }) => item.tenantCode === requestedTenant || item.tenantId === requestedTenant,
      );
      setOrganisationName(requestedContext?.tenantName || identity?.memberships?.[0]?.organisationName || "");

      if (!canUseLegacy && canUseV2Backoffice && !isV2Route && !hasPlatformAuthority) {
        router.replace(`/dashboard/v2?lang=${locale}`);
        return;
      }
      const partnerRouteAllowed =
        pathname === "/dashboard/products" ||
        pathname.startsWith("/dashboard/products/") ||
        (canUseV2Backoffice && isV2Route) ||
        (hasPlatformAuthority && pathname === "/dashboard/platform");
      if (canUseLegacy && !identity.isPlatformAdmin && !partnerRouteAllowed) {
        router.replace(`/dashboard/products?lang=${locale}`);
        return;
      }
      setCheckingAuth(false);
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [locale, pathname, router, searchParams]);

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
    <div className="min-h-screen bg-[#0b2824] text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#0b2824] lg:flex lg:flex-col">
        <div className="px-5 pb-2 pt-5">
          <div className="rounded-[14px] bg-white px-3 py-2 shadow-sm">
            <BrandLogo href={isPlatformAdmin ? "/dashboard/platform" : "/dashboard/v2"} size="md" />
          </div>
        </div>

        <div className="mx-5 mt-4 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[.12em] text-emerald-200/60">{t.currentScope}</p>
          <p className="mt-1 truncate text-sm font-black text-white">
            {isPlatformAdmin && pathname === "/dashboard/platform" ? t.allTenants : organisationName ? `Tenant · ${organisationName}` : t.tenantGroup}
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
                      "flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-bold transition",
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
          className="mx-5 mb-5 shrink-0 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
        >
          {t.signOut}
        </button>
      </aside>

      <main className="lg:pl-64">
        <div className="min-h-screen bg-[#f6f8f7] text-slate-950">
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo href={isPlatformAdmin ? "/dashboard/platform" : "/dashboard/v2"} size="sm" />
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
                  {isPlatformAdmin && pathname === "/dashboard/platform" ? t.allTenants : `${t.tenantGroup} · ${organisationName || t.partnerRole}`}
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
