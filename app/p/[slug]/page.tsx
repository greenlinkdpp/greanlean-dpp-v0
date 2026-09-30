import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccessAwareDppPage } from "@/components/AccessAwareDppPage";
import { ProductizedDppPage } from "@/components/v2/ProductizedDppPage";
import { loadPublicDppData } from "@/lib/dpp/publicDppRepository";
import { loadShowcaseDppData } from "@/lib/server/dppShowcase";
import { createSupabaseClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { createAudiencePreviewGrant, isPreprodAudiencePreviewHost, verifyAudiencePreviewGrant } from "@/lib/server/v2/audiencePreview";
import { resolvePublicPassport } from "@/lib/server/v2/phase4Repository";
import { projectImmutableDpp } from "@/lib/v2/audienceProjection";
import { formatValue, ROLE_TO_AUDIENCE, type PreviewRole } from "@/lib/v2/presentation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageSearchParams = {
  view?: string;
  lang?: string;
  preview?: string;
  showcase?: string;
  audience?: string;
  audienceGrant?: string;
};

const PREVIEW_ROLES = new Set<PreviewRole>(["PUBLIC", "REPAIRER", "RECYCLER", "MANUFACTURER", "AUTHORITY"]);

function requestedPreviewRole(value?: string): PreviewRole {
  const role = String(value || "PUBLIC").toUpperCase() as PreviewRole;
  return PREVIEW_ROLES.has(role) ? role : "PUBLIC";
}

function audiencePreviewHost() {
  const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  return site.hostname;
}

async function getData(identifier: string, includeDraft = false) {
  return loadPublicDppData(createSupabaseClient(), identifier, includeDraft);
}

async function getV2Data(identifier: string) {
  if (process.env.FEATURE_V2_RESOLVER !== "true" || process.env.FEATURE_V2_PUBLIC_PROJECTION !== "true") return null;
  const admin = createSupabaseAdminClient();
  const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  try {
    return await resolvePublicPassport(admin, site.hostname, identifier);
  } catch {
    const normalized = identifier.trim().toUpperCase();
    const { data: identity } = await admin.from("product_subject_identifier")
      .select("subject_id").eq("identifier_type", "DPP_ID").eq("normalized_value", normalized).eq("status", "ACTIVE").maybeSingle();
    if (identity) {
      const { data: passport } = await admin.from("dpp_passport").select("publication_source").eq("id", identity.subject_id).maybeSingle();
      if (passport?.publication_source === "V2") return { kind: "V2_UNRESOLVED" as const };
    }
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const [{ slug }, query = {}] = await Promise.all([params, searchParams]);
  const v2 = await getV2Data(decodeURIComponent(slug));
  if (v2?.kind === "PUBLISHED") {
    const locale = query.lang === "zh" ? "zh" : "en";
    const publicProjection = projectImmutableDpp(v2.payload, "PUBLIC");
    const productIdentity = publicProjection.fields.find((field) => field.fieldCode === "identity.product")?.value;
    const product = productIdentity && typeof productIdentity === "object" && !Array.isArray(productIdentity)
      ? productIdentity as Record<string, unknown>
      : {};
    return {
      title: { absolute: `${formatValue(product.productName || "Digital Product Passport", locale)} - GreanLean DPP` },
      description: `${formatValue(product.brand || "GreanLean", locale)} Digital Product Passport for ${formatValue(product.modelCode || v2.passport.passport_identifier, locale)}.`,
      robots: { index: false, follow: false },
    };
  }
  if (v2?.kind === "WITHDRAWN") return { title: `Withdrawn DPP - ${v2.tombstone.passportIdentifier}` };
  const data = await getData(
    decodeURIComponent(slug),
    query.preview === "1",
  );
  if (!data) {
    return {
      title: query.preview === "1" ? "DPP Preview" : "DPP Not Found",
    };
  }
  const product = data.product || {};
  const isZh = query.lang !== "en";
  const name = (
    isZh
      ? product.name_zh || product.name
      : product.name || product.name_zh
  ) || (isZh ? "数字产品护照" : "Digital Product Passport");
  const identifier = product.dpp_id || product.public_slug || slug;
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
  params: Promise<{ slug: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const [{ slug }, query = {}] = await Promise.all([params, searchParams]);
  const identifier = decodeURIComponent(slug);
  const isPreview = query.preview === "1";
  const v2 = await getV2Data(identifier);
  if (v2?.kind === "V2_UNRESOLVED") notFound();
  if (v2?.kind === "WITHDRAWN") {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-3xl font-semibold">Digital Product Passport withdrawn</h1>
        <dl className="mt-8 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3">
          <dt>Passport</dt><dd>{v2.tombstone.passportIdentifier}</dd>
          <dt>Status</dt><dd>{v2.tombstone.status}</dd>
          <dt>Effective date</dt><dd>{v2.tombstone.effectiveDate}</dd>
          <dt>Reason category</dt><dd>{v2.tombstone.reasonCategory}</dd>
        </dl>
      </main>
    );
  }
  if (v2?.kind === "PUBLISHED") {
    const requestedRole = requestedPreviewRole(query.audience);
    const host = audiencePreviewHost();
    const localPreview = process.env.NODE_ENV === "development";
    const signedPreview = verifyAudiencePreviewGrant({ host, identifier: v2.passport.passport_identifier, role: requestedRole, grant: query.audienceGrant });
    const previewEnabled = localPreview || signedPreview;
    const previewRole = previewEnabled ? requestedRole : "PUBLIC";
    const expiry = Math.floor(Date.now() / 1000) + 60 * 60;
    const previewGrants = !localPreview && signedPreview && isPreprodAudiencePreviewHost(host)
      ? Object.fromEntries(Array.from(PREVIEW_ROLES).map((role) => [role, createAudiencePreviewGrant(v2.passport.passport_identifier, role, expiry)]))
      : undefined;
    const projection = projectImmutableDpp(v2.payload, ROLE_TO_AUDIENCE[previewRole]);
    return <ProductizedDppPage projection={projection} locale={query.lang === "zh" ? "zh" : "en"} previewRole={previewRole} audiencePreviewEnabled={previewEnabled} previewGrants={previewGrants} />;
  }
  const showcaseData = query.showcase === "1"
    ? await loadShowcaseDppData(identifier)
    : null;
  const data = showcaseData || await getData(identifier, isPreview);
  if (!data && !isPreview) notFound();

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const locale = query.lang === "en" ? "en" : "zh";
  const publicId = encodeURIComponent(
    data?.product?.dpp_id || data?.product?.public_slug || identifier,
  );
  const dppUrl = `${site}/p/${publicId}?lang=${locale}${showcaseData ? "&showcase=1" : ""}`;

  return (
    <AccessAwareDppPage
      identifier={identifier}
      publicData={data}
      dppUrl={dppUrl}
      requestedView={query.view}
      previewRequested={isPreview}
      showcase={Boolean(showcaseData)}
    />
  );
}
