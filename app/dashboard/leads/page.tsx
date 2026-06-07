"use client";

import { LeadManager } from "@/components/LeadManager";
import { useLanguage } from "@/components/LanguageProvider";

export default function LeadsPage() {
  const { locale } = useLanguage();
  const t =
    locale === "zh"
      ? {
          title: "客户提交",
          subtitle: "查看官网首页表单提交的客户信息、需求说明和跟进状态。",
        }
      : {
          title: "Customer Submissions",
          subtitle: "View homepage form submissions, customer requirements and follow-up status.",
        };

  return (
    <div>
      <h1 className="text-3xl font-black">{t.title}</h1>
      <p className="mt-2 text-slate-600">{t.subtitle}</p>
      <div className="mt-8">
        <LeadManager />
      </div>
    </div>
  );
}
