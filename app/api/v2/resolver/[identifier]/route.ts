import QRCode from "qrcode";
import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { requireV2FeatureFlags } from "@/lib/server/v2/featureFlags";
import { resolvePublicPassport } from "@/lib/server/v2/phase4Repository";
import { publicHtml, publicJson, publicJsonLd, publicPdf } from "@/lib/v2/publicFormats";
import { buildApprovedResolverUrl, normalizeResolverHost } from "@/lib/v2/resolver";

export const GET = withApiRoute<{ params: { identifier: string } }>(async (request, _context, route) => {
  const routeStartedAt = performance.now();
  requireV2FeatureFlags("FEATURE_V2_PUBLIC_READ", "FEATURE_V2_DPP_PASSPORT", "FEATURE_V2_DPP_PUBLICATION", "FEATURE_V2_RESOLVER", "FEATURE_V2_PUBLIC_PROJECTION");
  const url = new URL(request.url);
  const audience = (url.searchParams.get("audience") || "PUBLIC").toUpperCase();
  if (audience !== "PUBLIC") throw new ApiError(403, "PUBLIC_PROJECTION_DENIED", "Anonymous Resolver access is limited to the PUBLIC projection.");
  const admin = createSupabaseAdminClient();
  const result = await resolvePublicPassport(admin, url.hostname, route.params.identifier);
  const rateLimitAdmissionMs = Number(request.headers.get("x-public-rate-limit-admission-ms") || 0);
  const timingHeader = (projectionMs = 0) => [
    `rate-limit-admission;dur=${rateLimitAdmissionMs.toFixed(1)}`,
    `resolver-db-fast-path;dur=${result.timings.databaseTotalMs.toFixed(1)}`,
    `resolver-db-query-count;desc="${result.timings.databaseQueryCount}"`,
    `resolver-db-duplicate-count;desc="${result.timings.duplicateQueryCount}"`,
    `resolve-total;dur=${result.timings.resolveTotalMs.toFixed(1)}`,
    `projection;dur=${projectionMs.toFixed(1)}`,
    `route-total;dur=${(performance.now() - routeStartedAt).toFixed(1)}`,
  ].join(", ");
  if (result.kind === "WITHDRAWN") {
    return Response.json(result.tombstone, { status: 410, headers: { "Cache-Control": "public, max-age=60", "Server-Timing": timingHeader() } });
  }
  const format = (url.searchParams.get("format") || "json").toLowerCase();
  const etag = `"${result.version.payload_hash}.phase4-projection-v1.PUBLIC"`;
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
  const headers = {
    ETag: etag,
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "X-DPP-Passport-ID": result.passport.id,
    "X-DPP-Version": String(result.version.version_number),
    "X-DPP-Payload-Hash": result.version.payload_hash,
    "X-DPP-Schema-Version": result.version.schema_version_id,
    "X-DPP-Published-At": result.version.published_at,
    "X-DPP-Resolver-Query-Count": String(result.timings.databaseQueryCount),
  };
  if (format === "html") {
    const projectionStartedAt = performance.now();
    const body = publicHtml(result.payload, "PUBLIC");
    return new Response(body, { headers: { ...headers, "Content-Type": "text/html; charset=utf-8", "Server-Timing": timingHeader(performance.now() - projectionStartedAt) } });
  }
  if (format === "jsonld" || format === "json-ld") {
    const projectionStartedAt = performance.now();
    const body = JSON.stringify(publicJsonLd(result.payload, "PUBLIC"));
    return new Response(body, { headers: { ...headers, "Content-Type": "application/ld+json", "Server-Timing": timingHeader(performance.now() - projectionStartedAt) } });
  }
  if (format === "pdf") return new Response(publicPdf(result.payload, "PUBLIC"), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="dpp-${encodeURIComponent(result.passport.passport_identifier)}-v${result.version.version_number}.pdf"` } });
  if (format === "qr") {
    const { data: hosts } = await admin.from("resolver_host_allowlist").select("host").eq("status", "ACTIVE");
    const target = buildApprovedResolverUrl({
      origin: `${url.protocol}//${url.host}`,
      identifier: result.passport.passport_identifier,
      approvedHosts: (hosts || []).map((row: any) => normalizeResolverHost(row.host)),
    });
    const png = await QRCode.toBuffer(target, { type: "png", width: 320, margin: 1 });
    return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png", "X-DPP-Resolver-Target": target, "Server-Timing": timingHeader() } });
  }
  if (format !== "json" && format !== "api") throw new ApiError(400, "INVALID_FORMAT", "The requested public DPP format is not supported.");
  const projectionStartedAt = performance.now();
  const body = JSON.stringify(publicJson(result.payload, "PUBLIC"));
  return new Response(body, { headers: { ...headers, "Content-Type": "application/json", "Server-Timing": timingHeader(performance.now() - projectionStartedAt) } });
});

export const preferredRegion = "sin1";
