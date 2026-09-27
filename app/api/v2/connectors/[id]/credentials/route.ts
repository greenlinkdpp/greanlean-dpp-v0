import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject, requireUuid } from "@/lib/server/v2/repository";
import { configureCredential } from "@/lib/server/v2/phase5Routes";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const POST = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Connector identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["secret_provider","secret_reference","credential_type","owner_reference","scope","rotation_metadata"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.manage", resourceType: "CONNECTOR", resourceId: id, purpose: "credential.configure" }, { integrationFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input, operation: async () => ({ status: 201, data: await configureCredential(admin, policyContext, id, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});

