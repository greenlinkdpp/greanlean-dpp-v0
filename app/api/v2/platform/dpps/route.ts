import { withApiRoute } from "@/lib/server/apiRoute";
import { platformDpps } from "@/lib/server/v2/platformRepository";
import { platformPagination, requirePlatformCapability } from "@/lib/server/v2/platformSecurity";

export const GET = withApiRoute(async (request, context) => {
  const { platformContext, admin } = await requirePlatformCapability(request, context, "platform.dpp.view", { resourceType: "DPP", operation: "platform.dpp.list" });
  return Response.json({ data: await platformDpps(admin, platformContext, platformPagination(request)) }, { headers: { "Cache-Control": "private, no-store" } });
});
