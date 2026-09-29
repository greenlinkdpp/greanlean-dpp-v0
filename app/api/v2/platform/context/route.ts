import { withApiRoute } from "@/lib/server/apiRoute";
import { requirePlatformCapability } from "@/lib/server/v2/platformSecurity";

export const GET = withApiRoute(async (request, context) => {
  const { platformContext } = await requirePlatformCapability(request, context, "platform.tenant.list", { resourceType: "PLATFORM", operation: "platform.context" });
  return Response.json({ data: { authorityType: "PLATFORM", authorityId: platformContext.assignmentId, roleCode: platformContext.roleCode, capabilities: platformContext.capabilities } }, { headers: { "Cache-Control": "private, no-store" } });
});
