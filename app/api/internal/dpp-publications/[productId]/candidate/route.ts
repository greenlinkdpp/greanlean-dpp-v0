import { normalizeAccessLevel } from "@/lib/dpp/canonicalPublication";
import { compareLegacyAndCanonicalPublicDpp } from "@/lib/dpp/publicationComparison";
import { loadLegacyPublicDppData } from "@/lib/dpp/publicDppRepository";
import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { requireDppInternalUser } from "@/lib/server/dppAccess";
import {
  buildDppPublicationCandidate,
  projectionForAudience,
} from "@/lib/server/dppPublicationCandidate";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";
import {
  decidePublicationReview,
  publicationWorkspace,
  publishApprovedReview,
  submitPublicationReview,
} from "@/lib/server/dppPublicationWorkflow";
import type { AccessLevel } from "@/lib/schemaRegistry";

type RouteContext = { params: { productId: string } };

const SUPPORTED_AUDIENCES = new Set<AccessLevel>([
  "PUBLIC",
  "LEGITIMATE_INTEREST",
  "AUTHORITY_ONLY",
  "INTERNAL",
]);

export const GET = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  await requireDppInternalUser(createServerAuthClient(accessToken), user);

  const url = new URL(request.url);
  const requestedAudience = String(url.searchParams.get("audience") || "INTERNAL").toUpperCase();
  if (!SUPPORTED_AUDIENCES.has(requestedAudience as AccessLevel)) {
    throw new ApiError(400, "INVALID_DPP_AUDIENCE", "The requested DPP audience is not supported.");
  }
  const audience = normalizeAccessLevel(requestedAudience);
  const batteryItemId = url.searchParams.get("batteryItemId");
  const admin = createSupabaseAdminClient();
  if (url.searchParams.get("workspace") === "1") {
    return Response.json(
      await publicationWorkspace(admin, route.params.productId, { batteryItemId }),
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const candidate = await buildDppPublicationCandidate(admin, route.params.productId, { batteryItemId });
  const projection = projectionForAudience(candidate, audience);

  let comparison;
  if (url.searchParams.get("compare") === "1") {
    const legacy = await loadLegacyPublicDppData(
      admin,
      candidate.snapshot.publication.dppId,
      true,
    );
    comparison = legacy
      ? compareLegacyAndCanonicalPublicDpp(
        legacy,
        projectionForAudience(candidate, "PUBLIC"),
      )
      : { passed: false, reason: "LEGACY_DPP_NOT_FOUND" };
  }

  return Response.json({
    productId: candidate.snapshot.publication.productId,
    dppId: candidate.snapshot.publication.dppId,
    audience,
    sourceFingerprint: candidate.sourceFingerprint,
    snapshotHash: candidate.snapshotHash,
    snapshot: projection,
    ...(audience === "INTERNAL"
      ? { canonicalPayload: candidate.canonicalPayload }
      : {}),
    ...(comparison ? { comparison } : {}),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
});

export const POST = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const authClient = createServerAuthClient(accessToken);
  await requireDppInternalUser(authClient, user);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "INVALID_JSON", "A JSON request body is required.");
  }

  const admin = createSupabaseAdminClient();
  const subject = {
    batteryItemId: body.batteryItemId ? String(body.batteryItemId) : null,
    changeReason: body.changeReason ? String(body.changeReason) : null,
  };
  if (body.action === "submitReview") {
    return Response.json(
      await submitPublicationReview(admin, route.params.productId, user, subject),
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  if (body.action === "decideReview") {
    const decision = String(body.decision || "").toUpperCase();
    if (!["APPROVED", "CHANGES_REQUESTED", "REJECTED"].includes(decision)) {
      throw new ApiError(
        400,
        "INVALID_PUBLICATION_DECISION",
        "A supported publication decision is required.",
      );
    }
    return Response.json(
      await decidePublicationReview(
        authClient,
        String(body.reviewId || ""),
        decision as "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
        body.reason ? String(body.reason) : null,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  if (body.action === "publishReview") {
    return Response.json(
      await publishApprovedReview(
        admin,
        route.params.productId,
        String(body.reviewId || ""),
        user,
        subject,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  throw new ApiError(
    400,
    "UNKNOWN_PUBLICATION_ACTION",
    "The publication operation is not supported.",
  );
});
