import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { requireUuid } from "@/lib/server/v2/repository";
import { resolveCandidate } from "@/lib/server/v2/phase3Repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";
import type { SubjectLevel } from "@/lib/v2/resolutionEngine";

const SUBJECT_TYPES = new Set(["FAMILY", "MODEL", "SKU", "BATCH", "ITEM"]);

export const GET = withApiRoute<{ params: { subjectType: string; subjectId: string } }>(async (request, context, route) => {
  const subjectType = route.params.subjectType.toUpperCase() as SubjectLevel;
  if (!SUBJECT_TYPES.has(subjectType)) throw new ApiError(400, "FIELD_NOT_APPLICABLE", "The Product subject type is invalid.");
  const subjectId = requireUuid(route.params.subjectId, "Product subject identifier");
  const schemaVersionId = requireUuid(new URL(request.url).searchParams.get("schema_version_id") || "", "Schema version identifier");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "product.view", resourceType: subjectType, resourceId: subjectId, purpose: "resolved_data.read",
  }, { productFeature: true, canonicalFeature: true, provenanceFeature: true, resolutionFeature: true });
  return Response.json({ data: await resolveCandidate(admin, policyContext, { subjectType, subjectId, schemaVersionId }) }, { headers: { "Cache-Control": "private, no-store" } });
});

