import { withApiRoute } from "@/lib/server/apiRoute";
import { platformOrganisations } from "@/lib/server/v2/platformRepository";
import { platformPagination, requirePlatformCapability } from "@/lib/server/v2/platformSecurity";

export const GET = withApiRoute(async (request, context) => {
  const { platformContext, admin } = await requirePlatformCapability(request, context, "platform.organisation.view", { resourceType: "ORGANISATION", operation: "platform.organisation.list" });
  return Response.json({ data: await platformOrganisations(admin, platformContext, platformPagination(request)) }, { headers: { "Cache-Control": "private, no-store" } });
});
