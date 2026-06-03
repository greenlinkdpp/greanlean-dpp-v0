"use client";

import { SimpleInsertManager } from "@/components/SimpleInsertManager";
import { useLanguage } from "@/components/LanguageProvider";

export default function CertificatesPage() {
  const { locale } = useLanguage();
  const t =
    locale === "zh"
      ? { title: "证书", subtitle: "管理产品证书与验证信息。" }
      : { title: "Certificates", subtitle: "Manage certificates." };

  return (
    <div>
      <h1 className="text-3xl font-black">{t.title}</h1>
      <p className="mt-2 text-slate-600">{t.subtitle}</p>
      <div className="mt-8">
        <SimpleInsertManager
          title="Certificates"
          table="product_certificates"
          fields={[
            { name: "certificate_name", placeholder: "Certificate name", placeholderZh: "证书名称", required: true },
            { name: "certificate_type", placeholder: "Certificate type", placeholderZh: "证书类型" },
            { name: "certificate_number", placeholder: "Certificate number", placeholderZh: "证书编号" },
            { name: "issuer", placeholder: "Issuer", placeholderZh: "签发机构" },
            { name: "verification_status", placeholder: "Verification status", placeholderZh: "验证状态" },
          ]}
        />
      </div>
    </div>
  );
}
