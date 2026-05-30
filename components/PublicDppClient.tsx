"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Props = {
  product: any;
  materials: any[];
  esg: any[];
  certificates: any[];
  dppUrl: string;
};

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">
        {value || "-"}
        {value && unit ? <span className="ml-1 text-base font-semibold text-slate-500">{unit}</span> : null}
      </p>
    </div>
  );
}

export function PublicDppClient({ product, materials, esg, certificates, dppUrl }: Props) {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          published: "已发布",
          digitalPassport: "数字产品护照",
          scan: "扫码查看此产品护照",
          sku: "SKU",
          brand: "品牌",
          category: "分类",
          materials: "材料组成",
          esg: "ESG 指标",
          certificates: "证书与验证",
          noMaterials: "暂无材料记录。",
          noEsg: "暂无 ESG 记录。",
          noCertificates: "暂无证书记录。",
          carbon: "碳足迹",
          water: "用水量",
          energy: "能源消耗",
          recycled: "再生成分",
          methodology: "方法学",
          origin: "原产地",
          type: "类型",
          issuer: "签发机构",
          status: "状态",
          productInfo: "产品信息",
          complianceSummary: "合规摘要",
          summaryText: "本页面展示该产品的材料、证书和环境指标，用于支持数字产品护照披露。",
          back: "返回首页",
        }
      : {
          published: "Published",
          digitalPassport: "Digital Product Passport",
          scan: "Scan to view this product passport",
          sku: "SKU",
          brand: "Brand",
          category: "Category",
          materials: "Material Composition",
          esg: "ESG Metrics",
          certificates: "Certificates & Verification",
          noMaterials: "No material records yet.",
          noEsg: "No ESG records yet.",
          noCertificates: "No certificate records yet.",
          carbon: "Carbon footprint",
          water: "Water usage",
          energy: "Energy consumption",
          recycled: "Recycled content",
          methodology: "Methodology",
          origin: "Origin",
          type: "Type",
          issuer: "Issuer",
          status: "Status",
          productInfo: "Product Information",
          complianceSummary: "Compliance Summary",
          summaryText: "This page presents material, certificate and environmental data to support Digital Product Passport disclosure.",
          back: "Back to site",
        };

  const firstEsg = esg[0] || {};

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="font-bold">
            GreenLean DPP
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
              {t.published}
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl">
            <p className="text-sm font-semibold text-brand-500">{t.digitalPassport}</p>
            <p className="mt-4 text-sm text-slate-400">{product.dpp_id}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight lg:text-6xl">{product.name}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{product.description}</p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-white/10 px-4 py-2">
                {t.sku}: {product.sku || "N/A"}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2">
                {t.brand}: {product.brand || "N/A"}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2">
                {t.category}: {product.category || "N/A"}
              </span>
            </div>
          </div>

          <div className="card text-center">
            {product.main_image ? (
              <img
                src={product.main_image}
                alt={product.name}
                className="mb-5 h-40 w-full rounded-2xl object-cover"
              />
            ) : null}
            <img
              className="mx-auto h-44 w-44"
              alt="DPP QR Code"
              src={`/api/qr?url=${encodeURIComponent(dppUrl)}`}
            />
            <p className="mt-3 text-xs text-slate-500">{t.scan}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard label={t.carbon} value={firstEsg.carbon_footprint} unit="kg CO₂e" />
          <MetricCard label={t.water} value={firstEsg.water_usage} unit="L" />
          <MetricCard label={t.energy} value={firstEsg.energy_consumption} unit="kWh" />
          <MetricCard label={t.recycled} value={firstEsg.recycled_content} unit="%" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="card">
            <h2 className="text-2xl font-black">{t.materials}</h2>

            <div className="mt-6 space-y-4">
              {materials.map((m: any) => (
                <div key={m.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-bold">{m.material_name}</p>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                      {m.percentage || "-"}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {t.type}: {m.material_type || "-"} · {t.origin}: {m.origin_country || "-"}
                  </p>
                  {m.certification ? <p className="mt-1 text-sm text-slate-500">{m.certification}</p> : null}
                </div>
              ))}

              {!materials.length && <p className="text-slate-500">{t.noMaterials}</p>}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="card">
              <h2 className="text-xl font-black">{t.complianceSummary}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{t.summaryText}</p>
            </section>

            <section className="card">
              <h2 className="text-xl font-black">{t.esg}</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {esg.map((e: any) => (
                  <div key={e.id} className="rounded-2xl bg-slate-50 p-4">
                    <p>{t.carbon}: {e.carbon_footprint || "-"}</p>
                    <p>{t.water}: {e.water_usage || "-"}</p>
                    <p>{t.methodology}: {e.methodology || "-"}</p>
                  </div>
                ))}
                {!esg.length && <p>{t.noEsg}</p>}
              </div>
            </section>
          </aside>
        </div>

        <section className="card mt-8">
          <h2 className="text-2xl font-black">{t.certificates}</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {certificates.map((c: any) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-bold">{c.certificate_name}</p>
                <p className="mt-2 text-sm text-slate-500">{t.type}: {c.certificate_type || "-"}</p>
                <p className="text-sm text-slate-500">{t.issuer}: {c.issuer || "-"}</p>
                <p className="text-sm text-slate-500">{t.status}: {c.verification_status || "pending"}</p>
              </div>
            ))}

            {!certificates.length && <p className="text-slate-500">{t.noCertificates}</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
