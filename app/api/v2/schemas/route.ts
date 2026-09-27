import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject } from "@/lib/server/v2/repository";
import { createTenantSchema, listSchemas } from "@/lib/server/v2/phase3Repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, requestContext) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "schema.view", resourceType: "SCHEMA", purpose: "schema.list",
  }, { schemaFeature: true });
  return Response.json({ data: await listSchemas(admin, policyContext) }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute(async (request, requestContext) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), [
    "code", "sector_code", "legal_category_code", "technical_variant_code", "source_name",
    "name_en", "name_zh", "description_en", "description_zh", "status",
  ]);
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "schema.manage", resourceType: "SCHEMA", purpose: "schema.create",
  }, { schemaFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: requestContext.path, idempotencyKey, payload: input,
    operation: async () => ({ status: 201, data: await createTenantSchema(admin, policyContext, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});

