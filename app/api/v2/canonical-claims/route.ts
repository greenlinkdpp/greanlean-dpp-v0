import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject } from "@/lib/server/v2/repository";
import { createManualClaim, listPhase3TenantRows } from "@/lib/server/v2/phase3Repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, context) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "product.view", resourceType: "CANONICAL_CLAIM", purpose: "canonical_claim.list",
  }, { canonicalFeature: true, provenanceFeature: true });
  return Response.json({ data: await listPhase3TenantRows(admin, policyContext, "canonical_claim") }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute(async (request, context) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), [
    "subject_type", "subject_id", "field_definition_id", "schema_version_id", "resolution_state",
    "value_json", "canonical_unit", "effective_from", "effective_to", "supersedes_claim_id",
    "applicability_reason", "evidence_references", "raw_value_reference",
  ]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "product.edit", resourceType: "CANONICAL_CLAIM", purpose: "canonical_claim.create",
  }, { canonicalFeature: true, provenanceFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
    operation: async () => ({ status: 201, data: await createManualClaim(admin, policyContext, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});

