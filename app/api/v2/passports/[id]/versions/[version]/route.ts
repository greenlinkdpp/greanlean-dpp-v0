import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { getVersion } from "@/lib/server/v2/phase4Repository";
import { requireUuid } from "@/lib/server/v2/repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute<{ params: { id: string; version: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Passport identifier");
  const version = Number(route.params.version);
  if (!Number.isSafeInteger(version) || version < 1) throw new ApiError(400, "INVALID_IDENTIFIER", "A positive Version number is required.");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "dpp.view", resourceType: "DPP_PASSPORT", resourceId: id, purpose: "passport.version.read",
  }, { passportFeature: true, publicationFeature: true });
  return Response.json({ data: await getVersion(admin, policyContext, id, version) }, { headers: { "Cache-Control": "private, no-store" } });
});

