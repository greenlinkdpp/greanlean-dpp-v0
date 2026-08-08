import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccessAwareDppPage } from "@/components/AccessAwareDppPage";
import { loadPublicDppData } from "@/lib/dpp/publicDppRepository";
import { loadShowcaseDppData } from "@/lib/server/dppShowcase";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageSearchParams = {
  view?: string;
  lang?: string;
  preview?: string;
  showcase?: string;
};

async function getData(identifier: string, includeDraft = false) {
  return loadPublicDppData(createSupabaseClient(), identifier, includeDraft);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: PageSearchParams;
}): Promise<Metadata> {
  const data = await getData(
    decodeURIComponent(params.slug),
    searchParams?.preview === "1",
  );
  if (!data) {
    return {
      title: searchParams?.preview === "1" ? "DPP Preview" : "DPP Not Found",
    };
  }
  const product = data.product || {};
  const isZh = searchParams?.lang !== "en";
  const name = (
    isZh
      ? product.name_zh || product.name
      : product.name || product.name_zh
  ) || (isZh ? "数字产品护照" : "Digital Product Passport");
  const identifier = product.dpp_id || product.public_slug || params.slug;
  const description = (
    isZh
      ? product.description_zh || product.description
      : product.description || product.description_zh
  ) || (
    isZh
      ? "GREANLEAN 数字产品护照。"
      : "GREANLEAN digital product passport."
  );
  return {
    title: `${name} - ${identifier}`,
    description,
  };
}

export default async function PublicDppPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: PageSearchParams;
}) {
  const identifier = decodeURIComponent(params.slug);
  const isPreview = searchParams?.preview === "1";
  const showcaseData = searchParams?.showcase === "1"
    ? await loadShowcaseDppData(identifier)
    : null;
  const data = showcaseData || await getData(identifier, isPreview);
  if (!data && !isPreview) notFound();

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const locale = searchParams?.lang === "en" ? "en" : "zh";
  const publicId = encodeURIComponent(
    data?.product?.dpp_id || data?.product?.public_slug || identifier,
  );
  const dppUrl = `${site}/p/${publicId}?lang=${locale}${showcaseData ? "&showcase=1" : ""}`;

  return (
    <AccessAwareDppPage
      identifier={identifier}
      publicData={data}
      dppUrl={dppUrl}
      requestedView={searchParams?.view}
      previewRequested={isPreview}
      showcase={Boolean(showcaseData)}
    />
  );
}
