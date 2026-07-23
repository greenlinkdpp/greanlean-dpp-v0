import { withApiRoute } from "@/lib/server/apiRoute";
import { loadBatteryProjection, viewerAccessFromUser } from "@/lib/server/batteryRepository";
import {
  createSupabaseAdminClient,
  createSupabasePublicServerClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

type RouteContext = { params: { identifier: string } };

export const GET = withApiRoute<RouteContext>(async (request, _context, route) => {
  const url = new URL(request.url);
  const audience = url.searchParams.get("audience");
  const auth = audience && audience !== "public" ? await requireAuthenticatedUser(request) : null;
  const accessLevel = viewerAccessFromUser(auth?.user || null, audience);
  const database = accessLevel === "PUBLIC"
    ? createSupabasePublicServerClient()
    : createSupabaseAdminClient();
  const result = await loadBatteryProjection(database, decodeURIComponent(route.params.identifier), accessLevel);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
});
