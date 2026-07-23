import { withApiRoute } from "@/lib/server/apiRoute";
import { createBatteryPassLmtExport } from "@/lib/server/batteryPassRepository";
import { requireBatteryInternalUser } from "@/lib/server/batteryRepository";
import { createSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/server/supabase";

type RouteContext = { params: { productId: string } };

export const GET = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user } = await requireAuthenticatedUser(request);
  requireBatteryInternalUser(user);
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const result = await createBatteryPassLmtExport(
    createSupabaseAdminClient(),
    route.params.productId,
    baseUrl,
  );
  return new Response(`${JSON.stringify(result.payload, null, 2)}\n`, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-BatteryPass-Data-Status": "unverified-test-data",
    },
  });
});
