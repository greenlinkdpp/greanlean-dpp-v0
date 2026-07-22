import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import {
  appendBatteryLifecycleEvent,
  appendBatteryMetric,
  createBatteryItem,
  loadBatteryWorkspace,
  saveBatteryWorkspace,
} from "@/lib/server/batteryRepository";
import { createSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/server/supabase";

type RouteContext = { params: { productId: string } };

export const GET = withApiRoute<RouteContext>(async (request, _context, route) => {
  await requireAuthenticatedUser(request);
  return Response.json(await loadBatteryWorkspace(createSupabaseAdminClient(), route.params.productId), {
    headers: { "Cache-Control": "no-store" },
  });
});

export const PUT = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user } = await requireAuthenticatedUser(request);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") throw new ApiError(400, "INVALID_JSON", "A JSON request body is required.");
  const result = await saveBatteryWorkspace(createSupabaseAdminClient(), route.params.productId, user, body);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
});

export const POST = withApiRoute<RouteContext>(async (request, _context, route) => {
  await requireAuthenticatedUser(request);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") throw new ApiError(400, "INVALID_JSON", "A JSON request body is required.");
  const admin = createSupabaseAdminClient();
  let result;
  if (body.action === "createItem") result = await createBatteryItem(admin, route.params.productId, body);
  else if (body.action === "appendMetric") result = await appendBatteryMetric(admin, route.params.productId, body);
  else if (body.action === "appendLifecycleEvent") result = await appendBatteryLifecycleEvent(admin, route.params.productId, body);
  else throw new ApiError(400, "UNKNOWN_BATTERY_ACTION", "The battery operation is not supported.");
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
});
