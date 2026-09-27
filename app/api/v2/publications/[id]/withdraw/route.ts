import { withApiRoute } from "@/lib/server/apiRoute";
import { withdrawVersion } from "@/lib/server/v2/phase4Repository";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject, requireUuid } from "@/lib/server/v2/repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const POST = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Version identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["reason_category"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "dpp.withdraw", resourceType: "DPP_VERSION", resourceId: id, purpose: "publication.withdraw",
  }, { publicationFeature: true, publicationWriteFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
    operation: async () => ({ status: 200, data: await withdrawVersion(admin, policyContext, id, String(input.reason_category || "")) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});
