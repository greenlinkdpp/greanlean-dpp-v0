import { withApiRoute } from "@/lib/server/apiRoute";
import { publishReview } from "@/lib/server/v2/phase4Repository";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject } from "@/lib/server/v2/repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const POST = withApiRoute(async (request, context) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["review_task_id"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "dpp.publish", resourceType: "DPP_PUBLICATION", purpose: "publication.publish",
  }, { publicationFeature: true, reviewFeature: true, passportFeature: true, productFeature: true, canonicalFeature: true, provenanceFeature: true, resolutionFeature: true, publicationWriteFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
    operation: async () => ({ status: 201, data: await publishReview(admin, policyContext, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});
