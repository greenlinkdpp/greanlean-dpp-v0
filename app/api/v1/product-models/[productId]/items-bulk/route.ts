import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext, requireProductEditorAccess } from "@/lib/server/dppAccess";
import {
  bulkCreateItems,
  p0OrganisationContext,
  requireP0WriteRole,
} from "@/lib/server/p0Repository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

type RouteContext = { params: { productId: string } };

export const POST = withApiRoute<RouteContext>(async (request, _context, routeContext) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const authClient = createServerAuthClient(accessToken);
  const identity = await loadIdentityContext(authClient, user);
  const input = await request.json();
  const { organisationId } = p0OrganisationContext(identity, input.organisationId || null);
  requireP0WriteRole(identity, organisationId);
  await requireProductEditorAccess(authClient, user, routeContext.params.productId);
  const idempotencyKey = request.headers.get("idempotency-key") || input.idempotencyKey;
  if (!idempotencyKey) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "An idempotency key is required.");
  const items = Array.isArray(input.items) ? input.items : [];
  const data = await bulkCreateItems(
    createSupabaseAdminClient(),
    organisationId,
    routeContext.params.productId,
    input.batchId || null,
    items,
    String(idempotencyKey),
    user.id,
  );
  return Response.json({ data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
});
