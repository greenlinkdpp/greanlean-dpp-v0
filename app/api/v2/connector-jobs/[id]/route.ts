import { withApiRoute } from "@/lib/server/apiRoute";
import { requireUuid } from "@/lib/server/v2/repository";
import { getConnectorJob } from "@/lib/server/v2/phase5Routes";
import { requireV2PolicyContext } from "@/lib/server/v2/security";
export const GET = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Connector Job identifier");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.view", resourceType: "CONNECTOR_JOB", resourceId: id, purpose: "connector_job.read" }, { integrationFeature: true });
  return Response.json({ data: await getConnectorJob(admin, policyContext, id) }, { headers: { "Cache-Control": "private, no-store" } });
});

