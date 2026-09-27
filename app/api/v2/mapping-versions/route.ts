import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject } from "@/lib/server/v2/repository";
import { createMappingVersionWithRules, listPhase3TenantRows } from "@/lib/server/v2/phase3Repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, context) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "schema.view", resourceType: "MAPPING_VERSION", purpose: "mapping_version.list",
  }, { schemaFeature: true, canonicalFeature: true });
  return Response.json({ data: await listPhase3TenantRows(admin, policyContext, "mapping_version") }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute(async (request, context) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["mapping_profile_id", "version", "status", "rules"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "import.create", resourceType: "MAPPING_VERSION", purpose: "mapping_version.create",
  }, { schemaFeature: true, canonicalFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
    operation: async () => ({ status: 201, data: await createMappingVersionWithRules(admin, policyContext, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});

