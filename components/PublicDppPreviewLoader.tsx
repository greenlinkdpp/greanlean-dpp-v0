"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { PublicDppClient } from "@/components/PublicDppClient";

type Props = {
  identifier: string;
  lang?: string;
  view?: string;
};

async function safeSelect(supabase: ReturnType<typeof createSupabaseClient>, table: string, productId: string, orderBy = "created_at") {
  const { data } = await supabase.from(table).select("*").eq("product_id", productId).order(orderBy, { ascending: orderBy.includes("date") });
  return data || [];
}

export function PublicDppPreviewLoader({ identifier, lang, view }: Props) {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("正在加载后台预览...");

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseClient();
      const { data: productByDpp, error: dppError } = await supabase.from("products").select("*").eq("dpp_id", identifier).maybeSingle();
      if (dppError) {
        setMessage(dppError.message);
        return;
      }

      const { data: productBySlug, error: slugError } = productByDpp
        ? { data: null, error: null }
        : await supabase.from("products").select("*").eq("public_slug", identifier).maybeSingle();
      if (slugError) {
        setMessage(slugError.message);
        return;
      }

      const product = productByDpp || productBySlug;
      if (!product) {
        setMessage("没有找到这个 DPP。请确认产品已保存，并且 DPP ID / Public Slug 与链接一致。");
        return;
      }

      const [
        materials,
        certificates,
        esg,
        bom,
        traceability,
        circularity,
        consumerTransparency,
        digitalIdentity,
        documents,
        governance,
        registrySubmissions,
        registrationProofs,
        evidenceLinks,
        blockchainAnchors,
        sectorFieldValues,
      ] = await Promise.all([
        safeSelect(supabase, "product_materials", product.id),
        safeSelect(supabase, "product_certificates", product.id),
        safeSelect(supabase, "product_esg_metrics", product.id),
        safeSelect(supabase, "product_bom", product.id),
        safeSelect(supabase, "product_traceability", product.id, "event_date"),
        safeSelect(supabase, "product_circularity", product.id),
        safeSelect(supabase, "product_consumer_transparency", product.id),
        safeSelect(supabase, "product_digital_identity", product.id),
        safeSelect(supabase, "product_documents", product.id),
        safeSelect(supabase, "product_data_governance", product.id),
        safeSelect(supabase, "dpp_registry_submissions", product.id),
        safeSelect(supabase, "dpp_registration_proofs", product.id),
        safeSelect(supabase, "dpp_evidence_links", product.id),
        safeSelect(supabase, "dpp_blockchain_anchors", product.id),
        safeSelect(supabase, "product_sector_field_values", product.id),
      ]);

      setData({
        product,
        materials,
        certificates,
        esg,
        bom,
        traceability,
        circularity,
        consumerTransparency,
        digitalIdentity,
        documents,
        governance,
        registrySubmissions,
        registrationProofs,
        evidenceLinks,
        blockchainAnchors,
        sectorFieldValues,
      });
    }

    load();
  }, [identifier]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">{message}</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">后台预览需要你在当前浏览器中保持登录状态；正式公开访问仍然只显示已发布产品。</p>
        </div>
      </main>
    );
  }

  const query = new URLSearchParams();
  if (["simple", "detail", "consumer", "professional", "audit"].includes(view || "")) query.set("view", view || "");
  if (lang === "zh" || lang === "en") query.set("lang", lang);
  query.set("preview", "1");
  const publicId = encodeURIComponent(data.product.dpp_id || data.product.public_slug || identifier);
  const site = typeof window === "undefined" ? "" : window.location.origin;
  return <PublicDppClient data={data} dppUrl={`${site}/p/${publicId}?${query.toString()}`} />;
}
