import { withApiRoute } from "@/lib/server/apiRoute";
import { loadBatteryProjection } from "@/lib/server/batteryRepository";
import { resolveDppAccess } from "@/lib/server/dppAccess";
import {
  createSupabaseAdminClient,
  createSupabasePublicServerClient,
  createServerAuthClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

type RouteContext = { params: { identifier: string } };

export const GET = withApiRoute<RouteContext>(async (request, context, route) => {
  const url = new URL(request.url);
  const audience = url.searchParams.get("audience");
  const decodedIdentifier = decodeURIComponent(route.params.identifier);
  const showcase = url.searchParams.get("showcase") === "1" && new Set([
    "DPP-LMT-BAT-48V15AH",
    "DPP-GV-ESS-14K3-000001",
  ]).has(decodedIdentifier);
  let accessLevel: "PUBLIC" | "LEGITIMATE_INTEREST" | "AUTHORITY_ONLY" | "INTERNAL" = "PUBLIC";
  if (showcase) {
    accessLevel = "INTERNAL";
  } else if (audience && !["public", "consumer"].includes(audience)) {
    const { accessToken } = await requireAuthenticatedUser(request);
    const result = await resolveDppAccess(
      createServerAuthClient(accessToken),
      decodedIdentifier,
      audience,
      {
        purpose: url.searchParams.get("purpose"),
        requestPath: url.pathname,
        correlationId: context.correlationId,
        userAgent: request.headers.get("user-agent"),
      },
    );
    accessLevel = result.access.audience;
  }
  const database = accessLevel === "PUBLIC"
    ? createSupabasePublicServerClient()
    : createSupabaseAdminClient();
  const result = await loadBatteryProjection(database, decodedIdentifier, accessLevel, { includeMissing: showcase });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
});
