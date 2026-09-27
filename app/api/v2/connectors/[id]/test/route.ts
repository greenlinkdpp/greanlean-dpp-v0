import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, requireJsonObject, requireUuid } from "@/lib/server/v2/repository";
import { testConnector } from "@/lib/server/v2/phase5Routes";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const POST = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Connector identifier");
  const input = allowFields(requireJsonObject(await request.json()), ["url","timeout_ms"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.execute", resourceType: "CONNECTOR", resourceId: id, purpose: "connector.test" }, { integrationFeature: true, externalConnectorFeature: true, connectorExecutionFeature: true });
  return Response.json({ data: await testConnector(admin, policyContext, id, input) }, { headers: { "Cache-Control": "private, no-store" } });
});
