import { withApiRoute } from "@/lib/server/apiRoute";
import { listVersions } from "@/lib/server/v2/phase4Repository";
import { requireUuid } from "@/lib/server/v2/repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Passport identifier");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "dpp.view", resourceType: "DPP_PASSPORT", resourceId: id, purpose: "passport.versions",
  }, { passportFeature: true, publicationFeature: true });
  return Response.json({ data: await listVersions(admin, policyContext, id) }, { headers: { "Cache-Control": "private, no-store" } });
});

