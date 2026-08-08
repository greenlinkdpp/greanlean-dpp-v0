"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function DashboardPage() {
  const { locale } = useLanguage();
  const zh = locale === "zh";

  const t = zh
    ? {
        eyebrow: "GREANLEAN 平台运营",
        title: "数字产品护照工作台",
        subtitle: "从产品建档、行业数据和证据协作，到校验、发布与持续更新，在同一条受控流程中完成。",
        primary: "进入产品中心",
        secondary: "查看客户提交",
        workflow: "核心工作流",
        workflowDesc: "以产品为主线推进，避免同一字段在多个后台模块重复维护。",
        actions: "常用入口",
        identity: "产品建档与分类",
        identityDesc: "确定行业、品类、细分模板和 DPP 粒度，建立唯一产品身份。",
        data: "行业数据协作",
        dataDesc: "按法规模板维护材料、碳足迹、性能、运行状态和追溯数据。",
        lifecycle: "运行、追溯与生命周期",
        lifecycleDesc: "维护生产追溯、BMS/EMS 运行数据、维修、回收和生命周期事件。",
        evidence: "证据与审核",
        evidenceDesc: "上传声明和测试文件，完成来源、版本、访问级别与核验状态管理。",
        publish: "校验与发布",
        publishDesc: "生成标准化 JSON，审核不可变版本，并发布统一的产品护照入口。",
        products: "产品中心",
        productsDesc: "创建、编辑和检查所有 DPP。",
        imports: "批量导入",
        importsDesc: "将客户或供应链数据映射到平台字段。",
        submissions: "客户提交",
        submissionsDesc: "查看客户线索和资料提交，仅 GreanLean 可见。",
        access: "访问审批",
        accessDesc: "管理组织、角色与产品级字段授权。",
        suppliers: "供应商库",
        suppliersDesc: "维护供应链主体及来源信息。",
        open: "打开",
        boundaryTitle: "权限边界",
        boundaryDesc: "合作伙伴仅能进入获授权产品并维护允许的数据；客户提交、访问审批、发布、注册库和系统治理由 GreanLean 管理员负责。",
      }
    : {
        eyebrow: "GREANLEAN PLATFORM OPERATIONS",
        title: "Digital Product Passport workspace",
        subtitle: "Manage product setup, sector data, evidence, validation, publishing, and ongoing updates in one controlled workflow.",
        primary: "Open Product Hub",
        secondary: "Review submissions",
        workflow: "Core workflow",
        workflowDesc: "Progress by product so each field has one maintained source.",
        actions: "Quick access",
        identity: "Product setup and classification",
        identityDesc: "Select sector, category, profile and passport granularity, then establish the unique product identity.",
        data: "Sector data collaboration",
        dataDesc: "Maintain materials, footprint, performance, operating status and traceability against the selected profile.",
        lifecycle: "Operation, traceability and lifecycle",
        lifecycleDesc: "Maintain production traceability, BMS/EMS operating data, service, recovery and lifecycle events.",
        evidence: "Evidence and review",
        evidenceDesc: "Manage declarations and test files with provenance, version, access level and verification state.",
        publish: "Validate and publish",
        publishDesc: "Generate standardised JSON, approve an immutable version and publish one passport access point.",
        products: "Product Hub",
        productsDesc: "Create, edit and review every DPP.",
        imports: "Bulk Import",
        importsDesc: "Map customer and supply-chain data to platform fields.",
        submissions: "Customer Submissions",
        submissionsDesc: "Review customer leads and supplied information. GreanLean only.",
        access: "Access Review",
        accessDesc: "Manage organisation, role and product-scoped field grants.",
        suppliers: "Supplier Library",
        suppliersDesc: "Maintain supply-chain parties and provenance.",
        open: "Open",
        boundaryTitle: "Access boundary",
        boundaryDesc: "Partners can open authorised products and maintain allowed data. Customer submissions, access decisions, publishing, Registry operations, and platform governance remain under GreanLean administration.",
      };

  const workflow = [
    [t.identity, t.identityDesc],
    [t.data, t.dataDesc],
    [t.lifecycle, t.lifecycleDesc],
    [t.evidence, t.evidenceDesc],
    [t.publish, t.publishDesc],
  ];
  const actions = [
    [t.products, t.productsDesc, "/dashboard/products", "01"],
    [t.imports, t.importsDesc, "/dashboard/import", "02"],
    [t.submissions, t.submissionsDesc, "/dashboard/leads", "03"],
    [t.suppliers, t.suppliersDesc, "/dashboard/suppliers", "04"],
    [t.access, t.accessDesc, "/dashboard/access", "05"],
  ];

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-xs font-black uppercase text-emerald-700">{t.eyebrow}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black text-slate-950 lg:text-4xl">{t.title}</h1>
            <p className="mt-3 text-base font-semibold leading-7 text-slate-600">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn-primary" href={`/dashboard/products?lang=${locale}`}>{t.primary}</Link>
            <Link className="btn-secondary" href={`/dashboard/leads?lang=${locale}`}>{t.secondary}</Link>
          </div>
        </div>
      </header>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">{t.workflow}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{t.workflowDesc}</p>
          </div>
        </div>
        <div className="mt-5 grid border-y border-slate-200 bg-white md:grid-cols-2 xl:grid-cols-5">
          {workflow.map(([title, description], index) => (
            <div key={title} className="min-h-52 border-b border-slate-200 p-5 md:border-r xl:border-b-0">
              <span className="text-xs font-black text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="text-xl font-black text-slate-950">{t.actions}</h2>
          <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200 bg-white">
            {actions.map(([title, description, href, index]) => (
              <Link
                key={href}
                href={`${href}?lang=${locale}`}
                className="group grid gap-3 px-5 py-4 transition hover:bg-emerald-50/50 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="text-xs font-black text-slate-400 group-hover:text-emerald-700">{index}</span>
                <div>
                  <h3 className="font-black text-slate-950">{title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p>
                </div>
                <span className="text-sm font-black text-emerald-700">{t.open}</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="h-fit border-l-4 border-emerald-600 bg-emerald-50 px-5 py-5">
          <h2 className="font-black text-emerald-950">{t.boundaryTitle}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900">{t.boundaryDesc}</p>
        </aside>
      </section>
    </div>
  );
}
