import { withApiRoute } from "@/lib/server/apiRoute";
import { platformTenants } from "@/lib/server/v2/platformRepository";
import { platformPagination, requirePlatformCapability } from "@/lib/server/v2/platformSecurity";
import { platformTenantCollectionHandlers } from "@/lib/server/v2/platformTenantRoutes";

export const GET = withApiRoute(async (request, context) => {
  const { platformContext, admin } = await requirePlatformCapability(request, context, "platform.tenant.list", { resourceType: "TENANT", operation: "platform.tenant.list" });
  return Response.json({ data: await platformTenants(admin, platformContext, platformPagination(request)) }, { headers: { "Cache-Control": "private, no-store" } });
});
export const POST = platformTenantCollectionHandlers.POST;
