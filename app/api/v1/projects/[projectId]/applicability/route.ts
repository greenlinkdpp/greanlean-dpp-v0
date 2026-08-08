import { withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext } from "@/lib/server/dppAccess";
import {
  p0OrganisationContext,
  recordApplicability,
  requireP0WriteRole,
} from "@/lib/server/p0Repository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

type RouteContext = { params: { projectId: string } };

export const POST = withApiRoute<RouteContext>(async (request, _context, routeContext) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const identity = await loadIdentityContext(createServerAuthClient(accessToken), user);
  const input = await request.json();
  const { organisationId } = p0OrganisationContext(identity, input.organisationId || null);
  requireP0WriteRole(identity, organisationId);
  const data = await recordApplicability(
    createSupabaseAdminClient(),
    organisationId,
    routeContext.params.projectId,
    user.id,
    input,
  );
  return Response.json({ data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
});
