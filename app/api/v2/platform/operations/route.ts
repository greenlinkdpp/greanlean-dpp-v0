import { withApiRoute } from "@/lib/server/apiRoute";
import { platformOperations } from "@/lib/server/v2/platformRepository";
import { platformPagination, requirePlatformCapability } from "@/lib/server/v2/platformSecurity";

export const GET = withApiRoute(async (request, context) => {
  const { platformContext, admin } = await requirePlatformCapability(request, context, "platform.operations.view", { resourceType: "OPERATIONS", operation: "platform.operations.list" });
  return Response.json({ data: await platformOperations(admin, platformContext, platformPagination(request)) }, { headers: { "Cache-Control": "private, no-store" } });
});
