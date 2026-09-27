import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject } from "@/lib/server/v2/repository";
import { createSchemaVersion, listSchemaVersions } from "@/lib/server/v2/phase3Repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, context) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "schema.view", resourceType: "SCHEMA_VERSION", purpose: "schema_version.list",
  }, { schemaFeature: true });
  return Response.json({ data: await listSchemaVersions(admin, policyContext) }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute(async (request, context) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), [
    "schema_definition_id", "version", "source_version", "json_schema", "checksum_sha256",
    "effective_from", "effective_until", "status", "published_at",
  ]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "schema.manage", resourceType: "SCHEMA_VERSION", purpose: "schema_version.create",
  }, { schemaFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
    operation: async () => ({ status: 201, data: await createSchemaVersion(admin, policyContext, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});

