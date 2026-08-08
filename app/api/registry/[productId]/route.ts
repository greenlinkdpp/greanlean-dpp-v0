import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { generateRegistryMapping, loadRegistryWorkspace, recordRegistryTestResult } from "@/lib/server/registryRepository";
import { requireDppInternalUser } from "@/lib/server/dppAccess";
import { createServerAuthClient, createSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/server/supabase";

type RouteContext = { params: { productId: string } };

export const GET = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  await requireDppInternalUser(createServerAuthClient(accessToken), user);
  return Response.json(await loadRegistryWorkspace(createSupabaseAdminClient(), route.params.productId), {
    headers: { "Cache-Control": "no-store" },
  });
});

export const POST = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  await requireDppInternalUser(createServerAuthClient(accessToken), user);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") throw new ApiError(400, "INVALID_JSON", "A JSON request body is required.");
  const admin = createSupabaseAdminClient();
  if (body.action === "generateMapping") {
    return Response.json(await generateRegistryMapping(admin, route.params.productId, user, body.retryOfSubmissionId || null));
  }
  if (body.action === "recordTestResult") {
    return Response.json(await recordRegistryTestResult(admin, route.params.productId, body));
  }
  throw new ApiError(400, "UNKNOWN_REGISTRY_ACTION", "The Registry operation is not supported.");
});
