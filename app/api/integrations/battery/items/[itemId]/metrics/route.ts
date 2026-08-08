import {
  ingestBatteryMetrics,
  requireBatteryIntegrationCredential,
} from "@/lib/server/batteryOperatingData";
import { withApiRoute } from "@/lib/server/apiRoute";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

type RouteContext = { params: { itemId: string } };

export const POST = withApiRoute<RouteContext>(async (request, context, route) => {
  requireBatteryIntegrationCredential(request);
  const rawBody = await request.text();
  const result = await ingestBatteryMetrics(
    createSupabaseAdminClient(),
    request,
    rawBody,
    route.params.itemId,
    context.correlationId,
  );
  return Response.json(result, {
    status: result?.duplicate ? 200 : 202,
    headers: { "Cache-Control": "no-store" },
  });
});
