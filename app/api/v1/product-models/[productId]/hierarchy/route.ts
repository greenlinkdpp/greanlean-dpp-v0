import { withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext, requireProductEditorAccess } from "@/lib/server/dppAccess";
import {
  assignProductModel,
  p0OrganisationContext,
  productHierarchy,
  requireP0WriteRole,
} from "@/lib/server/p0Repository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

async function contextFor(request: Request, productId: string) {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const authClient = createServerAuthClient(accessToken);
  const identity = await loadIdentityContext(authClient, user);
  const requestedOrganisation = new URL(request.url).searchParams.get("organisationId");
  return { user, authClient, identity, ...p0OrganisationContext(identity, requestedOrganisation), productId };
}

type RouteContext = { params: { productId: string } };

export const GET = withApiRoute<RouteContext>(async (request, _context, routeContext) => {
  const context = await contextFor(request, routeContext.params.productId);
  await requireProductEditorAccess(context.authClient, context.user, routeContext.params.productId);
  const data = await productHierarchy(
    createSupabaseAdminClient(),
    context.organisationId,
    routeContext.params.productId,
  );
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute<RouteContext>(async (request, _context, routeContext) => {
  const context = await contextFor(request, routeContext.params.productId);
  requireP0WriteRole(context.identity, context.organisationId);
  await requireProductEditorAccess(context.authClient, context.user, routeContext.params.productId);
  const input = await request.json();
  const data = await assignProductModel(
    createSupabaseAdminClient(),
    context.organisationId,
    input.projectId || null,
    routeContext.params.productId,
    context.user.id,
  );
  return Response.json({ data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
});
