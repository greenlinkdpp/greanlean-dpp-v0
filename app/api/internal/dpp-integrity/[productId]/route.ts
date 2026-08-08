import { withApiRoute } from "@/lib/server/apiRoute";
import { requireDppInternalUser } from "@/lib/server/dppAccess";
import {
  loadDppIntegrityWorkspace,
  requestDppBlockchainAnchor,
} from "@/lib/server/dppIntegrityRepository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

type RouteContext = { params: { productId: string } };

export const GET = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  await requireDppInternalUser(createServerAuthClient(accessToken), user);
  return Response.json(
    await loadDppIntegrityWorkspace(
      createSupabaseAdminClient(),
      route.params.productId,
    ),
    { headers: { "Cache-Control": "private, no-store" } },
  );
});

export const POST = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  await requireDppInternalUser(createServerAuthClient(accessToken), user);
  const body = await request.json().catch(() => null);
  if (body?.action !== "requestBlockchainAnchor") {
    return Response.json({
      error: {
        code: "UNKNOWN_INTEGRITY_ACTION",
        message: "The requested integrity operation is not supported.",
      },
    }, { status: 400 });
  }
  return Response.json(
    await requestDppBlockchainAnchor(
      createSupabaseAdminClient(),
      route.params.productId,
      user,
    ),
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
