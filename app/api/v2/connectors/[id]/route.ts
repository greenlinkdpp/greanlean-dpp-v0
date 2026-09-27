import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject, requireUuid } from "@/lib/server/v2/repository";
import { getConnector, updateConnector } from "@/lib/server/v2/phase5Routes";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Connector identifier");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.view", resourceType: "CONNECTOR", resourceId: id, purpose: "connector.read" }, { integrationFeature: true });
  return Response.json({ data: await getConnector(admin, policyContext, id) }, { headers: { "Cache-Control": "private, no-store" } });
});

export const PATCH = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Connector identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["name","environment","status","config_json","data_source_id","mapping_profile_id","rate_limit_profile","retry_profile","circuit_state"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.manage", resourceType: "CONNECTOR", resourceId: id, purpose: "connector.update" }, { integrationFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input, operation: async () => ({ status: 200, data: await updateConnector(admin, policyContext, id, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});

