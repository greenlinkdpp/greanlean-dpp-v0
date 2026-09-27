import { withApiRoute } from "@/lib/server/apiRoute";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, requestContext) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "membership.view",
    resourceType: "CAPABILITY",
    purpose: "LIST",
  });
  const { data, error } = await admin
    .from("capability")
    .select("id,code,description,risk_class,status")
    .eq("status", "ACTIVE")
    .order("code");
  if (error) throw error;
  return Response.json(
    { data, meta: { tenant_id: policyContext.tenantId } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
