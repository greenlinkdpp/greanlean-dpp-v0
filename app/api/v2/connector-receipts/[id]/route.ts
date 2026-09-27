import { withApiRoute } from "@/lib/server/apiRoute";
import { requireUuid } from "@/lib/server/v2/repository";
import { getReceipt } from "@/lib/server/v2/phase5Routes";
import { requireV2PolicyContext } from "@/lib/server/v2/security";
export const GET = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Connector Receipt identifier");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.read_receipt", resourceType: "CONNECTOR_RECEIPT", resourceId: id, purpose: "connector_receipt.read" }, { integrationFeature: true });
  return Response.json({ data: await getReceipt(admin, policyContext, id) }, { headers: { "Cache-Control": "private, no-store" } });
});

