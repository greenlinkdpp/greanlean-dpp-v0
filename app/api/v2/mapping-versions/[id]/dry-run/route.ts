import { withApiRoute } from "@/lib/server/apiRoute";
import { requireJsonObject, requireUuid } from "@/lib/server/v2/repository";
import { loadMappingDryRun } from "@/lib/server/v2/phase3Repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const POST = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Mapping version identifier");
  const input = requireJsonObject(await request.json());
  const sourceRecordId = requireUuid(String(input.source_record_id || ""), "Source Record identifier");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "import.create", resourceType: "MAPPING_VERSION", resourceId: id, purpose: "mapping.dry_run",
  }, { schemaFeature: true, canonicalFeature: true });
  const data = await loadMappingDryRun(admin, policyContext, id, sourceRecordId);
  return Response.json({ data: data.dryRun }, { headers: { "Cache-Control": "private, no-store" } });
});

