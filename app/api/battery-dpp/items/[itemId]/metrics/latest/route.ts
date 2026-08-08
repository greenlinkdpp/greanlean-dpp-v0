import { loadAuthorizedBatteryOperatingData } from "@/lib/server/batteryOperatingAccess";
import { withApiRoute } from "@/lib/server/apiRoute";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

type RouteContext = { params: { itemId: string } };

export const GET = withApiRoute<RouteContext>(async (request, context, route) => {
  const { accessToken } = await requireAuthenticatedUser(request);
  const result = await loadAuthorizedBatteryOperatingData(
    createServerAuthClient(accessToken),
    createSupabaseAdminClient(),
    route.params.itemId,
    {
      range: "24h",
      purpose: "latest battery operating snapshot",
      requestPath: new URL(request.url).pathname,
      correlationId: context.correlationId,
      userAgent: request.headers.get("user-agent"),
    },
  );
  return Response.json({
    access: result.access,
    item: result.data.item,
    summary: result.data.summary,
    latest: result.data.latest,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
});
