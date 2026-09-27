import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject } from "@/lib/server/v2/repository";
import { createFieldDefinition, listFieldDefinitions } from "@/lib/server/v2/phase3Repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, context) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "schema.view", resourceType: "FIELD_DEFINITION", purpose: "field_definition.list",
  }, { schemaFeature: true });
  return Response.json({ data: await listFieldDefinitions(admin, policyContext) }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute(async (request, context) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), [
    "schema_version_id", "field_code", "json_pointer", "storage_path", "label_en", "label_zh",
    "description_en", "description_zh", "data_type", "unit_code", "codelist_id", "data_behavior",
    "data_granularity", "access_level_code", "requirement_status", "evidence_requirement", "sort_order",
    "semantic_name", "cardinality", "subject_levels", "semantic_uri", "vocabulary_reference",
    "verification_requirement", "display_metadata", "deprecated_by", "resolution_policy",
  ]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "schema.manage", resourceType: "FIELD_DEFINITION", purpose: "field_definition.create",
  }, { schemaFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
    operation: async () => ({ status: 201, data: await createFieldDefinition(admin, policyContext, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});

