import { withApiRoute } from "@/lib/server/apiRoute";
import {
  createBatteryPassExport,
  validateBatteryPassExport,
} from "@/lib/server/batteryPassRepository";
import { requireDppInternalUser } from "@/lib/server/dppAccess";
import { createServerAuthClient, createSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/server/supabase";

type RouteContext = { params: { productId: string } };

export const GET = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  await requireDppInternalUser(createServerAuthClient(accessToken), user);
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const mode = requestUrl.searchParams.get("mode");
  const result = mode === "validate"
    ? await validateBatteryPassExport(
      createSupabaseAdminClient(),
      route.params.productId,
      baseUrl,
    )
    : await createBatteryPassExport(
      createSupabaseAdminClient(),
      route.params.productId,
      baseUrl,
    );
  if (mode === "validate") {
    return Response.json({
      valid: result.valid,
      schemaCode: result.schemaCode,
      schemaId: result.schemaId,
      errors: result.errors,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  return new Response(`${JSON.stringify(result.payload, null, 2)}\n`, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-BatteryPass-Data-Status": "unverified-product-data",
    },
  });
});
