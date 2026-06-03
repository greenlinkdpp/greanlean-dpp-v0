import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { PublicDppClient } from "@/components/PublicDppClient";

async function safeSelect(supabase: ReturnType<typeof createSupabaseClient>, table: string, productId: string, orderBy = "created_at") {
  try {
    const { data } = await supabase.from(table).select("*").eq("product_id", productId).order(orderBy, { ascending: orderBy.includes("date") });
    return data || [];
  } catch {
    return [];
  }
}

async function getData(slug: string) {
  const supabase = createSupabaseClient();
  const { data: product } = await supabase.from("products").select("*").eq("public_slug", slug).eq("status", "published").single();
  if (!product) return null;
  const [materials, certificates, esg, bom, traceability, circularity, consumerTransparency, digitalIdentity, documents, governance] = await Promise.all([
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
  ]);
  return { product, materials, certificates, esg, bom, traceability, circularity, consumerTransparency, digitalIdentity, documents, governance };
}

export default async function PublicDppPage({ params }: { params: { slug: string } }) {
  const data = await getData(params.slug);
  if (!data) notFound();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const dppUrl = `${site}/p/${data.product.public_slug}`;
  return <PublicDppClient data={data} dppUrl={dppUrl} />;
}
