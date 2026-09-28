import { withApiRoute } from "@/lib/server/apiRoute";
import { loadBackofficeSnapshot } from "@/lib/server/v2/backofficeRepository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, requestContext) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "tenant.view",
    resourceType: "TENANT",
    purpose: "backoffice.snapshot",
  }, {
    partnerFeature: true, productFeature: true, schemaFeature: true, canonicalFeature: true,
    provenanceFeature: true, passportFeature: true, reviewFeature: true, publicationFeature: true,
    integrationFeature: true,
  });
  const data = await loadBackofficeSnapshot(admin, policyContext);
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});
