import { withApiRoute } from "@/lib/server/apiRoute";
import { requireUuid } from "@/lib/server/v2/repository";
import { getRegistrySubmission } from "@/lib/server/v2/phase5Routes";
import { requireV2PolicyContext } from "@/lib/server/v2/security";
export const GET = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Registry Submission identifier");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "registry.view", resourceType: "REGISTRY_SUBMISSION", resourceId: id, purpose: "registry.view" }, { integrationFeature: true, registryTestFeature: true });
  return Response.json({ data: await getRegistrySubmission(admin, policyContext, id) }, { headers: { "Cache-Control": "private, no-store" } });
});

