import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { loadAuthorizedBatteryOperatingData } from "@/lib/server/batteryOperatingAccess";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

type RouteContext = { params: { itemId: string } };
type Range = "24h" | "7d" | "30d" | "12m" | "all";

export const GET = withApiRoute<RouteContext>(async (request, context, route) => {
  const { accessToken } = await requireAuthenticatedUser(request);
  const url = new URL(request.url);
  const range = (url.searchParams.get("range") || "30d") as Range;
  if (!["24h", "7d", "30d", "12m", "all"].includes(range)) {
    throw new ApiError(400, "INVALID_HISTORY_RANGE", "The requested battery history range is not supported.");
  }
  const metricCodes = (url.searchParams.get("metrics") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 10);
  const result = await loadAuthorizedBatteryOperatingData(
    createServerAuthClient(accessToken),
    createSupabaseAdminClient(),
    route.params.itemId,
    {
      range,
      metricCodes,
      purpose: "battery operating history",
      requestPath: url.pathname,
      correlationId: context.correlationId,
      userAgent: request.headers.get("user-agent"),
    },
  );
  return Response.json({
    access: result.access,
    item: result.data.item,
    summary: result.data.summary,
    history: result.data.history,
    events: result.data.events,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
});
