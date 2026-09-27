import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject, requireUuid } from "@/lib/server/v2/repository";
import { pollRegistrySubmission } from "@/lib/server/v2/phase5Routes";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const POST = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Registry Submission identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["fixture_mode"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "registry.submit", resourceType: "REGISTRY_SUBMISSION", resourceId: id, purpose: "registry.poll" }, { integrationFeature: true, registryTestFeature: true, connectorExecutionFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input, operation: async () => ({ status: 200, data: await pollRegistrySubmission(admin, policyContext, id, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});
