import { withApiRoute } from "@/lib/server/apiRoute";
import { getReview } from "@/lib/server/v2/phase4Repository";
import { requireUuid } from "@/lib/server/v2/repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Review identifier");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "dpp.review", resourceType: "DPP_REVIEW", resourceId: id, purpose: "review.read",
  }, { reviewFeature: true });
  return Response.json({ data: await getReview(admin, policyContext, id) }, { headers: { "Cache-Control": "private, no-store" } });
});

