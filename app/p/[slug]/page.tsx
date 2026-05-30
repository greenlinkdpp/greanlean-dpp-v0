import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { PublicDppClient } from "@/components/PublicDppClient";

async function getData(slug: string) {
  const supabase = createSupabaseClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("public_slug", slug)
    .eq("status", "published")
    .single();

  if (!product) return null;

  const [{ data: materials }, { data: esg }, { data: certificates }] =
    await Promise.all([
      supabase
        .from("product_materials")
        .select("*")
        .eq("product_id", product.id)
        .order("percentage", { ascending: false }),
      supabase
        .from("product_esg_metrics")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_certificates")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false }),
    ]);

  return {
    product,
    materials: materials || [],
    esg: esg || [],
    certificates: certificates || [],
  };
}

export default async function PublicDppPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await getData(params.slug);

  if (!data) {
    notFound();
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const dppUrl = `${site}/p/${data.product.public_slug}`;

  return (
    <PublicDppClient
      product={data.product}
      materials={data.materials}
      esg={data.esg}
      certificates={data.certificates}
      dppUrl={dppUrl}
    />
  );
}
