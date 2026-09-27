import { withApiRoute } from "@/lib/server/apiRoute";
import { executeIdempotentWrite, requireIdempotencyKey, requireUuid } from "@/lib/server/v2/repository";
import { cancelJob } from "@/lib/server/v2/phase5Routes";
import { requireV2PolicyContext } from "@/lib/server/v2/security";
export const POST = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Connector Job identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const input = { job_id: id };
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.execute", resourceType: "CONNECTOR_JOB", resourceId: id, purpose: "connector.cancel" }, { integrationFeature: true, connectorExecutionFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input, operation: async () => ({ status: 200, data: await cancelJob(admin, policyContext, id) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});
