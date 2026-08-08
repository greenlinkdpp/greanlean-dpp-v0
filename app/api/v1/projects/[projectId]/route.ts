import { withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext } from "@/lib/server/dppAccess";
import { p0OrganisationContext, projectWorkspace, requireP0WriteRole, updateProject } from "@/lib/server/p0Repository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

type RouteContext = { params: { projectId: string } };

export const GET = withApiRoute<RouteContext>(async (request, _context, routeContext) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const identity = await loadIdentityContext(createServerAuthClient(accessToken), user);
  const requestedOrganisation = new URL(request.url).searchParams.get("organisationId");
  const { organisationId } = p0OrganisationContext(identity, requestedOrganisation);
  const data = await projectWorkspace(
    createSupabaseAdminClient(),
    organisationId,
    routeContext.params.projectId,
  );
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});

export const PATCH = withApiRoute<RouteContext>(async (request, _context, routeContext) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const identity = await loadIdentityContext(createServerAuthClient(accessToken), user);
  const input = await request.json();
  const { organisationId } = p0OrganisationContext(identity, input.organisationId || null);
  requireP0WriteRole(identity, organisationId);
  const data = await updateProject(
    createSupabaseAdminClient(),
    organisationId,
    routeContext.params.projectId,
    user.id,
    input,
  );
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});
