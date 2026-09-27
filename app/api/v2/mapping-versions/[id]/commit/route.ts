import { withApiRoute } from "@/lib/server/apiRoute";
import { executeIdempotentWrite, requireIdempotencyKey, requireJsonObject, requireUuid } from "@/lib/server/v2/repository";
import { commitMapping } from "@/lib/server/v2/phase3Repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const POST = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Mapping version identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const input = requireJsonObject(await request.json());
  const payload = { ...input, mapping_version_id: id };
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "import.commit", resourceType: "MAPPING_VERSION", resourceId: id, purpose: "mapping.commit",
  }, { schemaFeature: true, canonicalFeature: true, provenanceFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload,
    operation: async () => ({ status: 201, data: await commitMapping(admin, policyContext, payload, context.correlationId) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});

