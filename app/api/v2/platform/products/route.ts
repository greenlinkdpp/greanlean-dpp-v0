import { withApiRoute } from "@/lib/server/apiRoute";
import { platformProducts } from "@/lib/server/v2/platformRepository";
import { platformPagination, requirePlatformCapability } from "@/lib/server/v2/platformSecurity";

export const GET = withApiRoute(async (request, context) => {
  const { platformContext, admin } = await requirePlatformCapability(request, context, "platform.product.view", { resourceType: "PRODUCT", operation: "platform.product.list" });
  return Response.json({ data: await platformProducts(admin, platformContext, platformPagination(request)) }, { headers: { "Cache-Control": "private, no-store" } });
});
