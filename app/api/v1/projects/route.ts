import { withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext } from "@/lib/server/dppAccess";
import {
  createProject,
  listProjects,
  p0OrganisationContext,
  requireP0WriteRole,
} from "@/lib/server/p0Repository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

async function requestContext(request: Request) {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const identity = await loadIdentityContext(createServerAuthClient(accessToken), user);
  const requestedOrganisation = new URL(request.url).searchParams.get("organisationId");
  return { user, identity, ...p0OrganisationContext(identity, requestedOrganisation) };
}

export const GET = withApiRoute(async (request) => {
  const { organisationId } = await requestContext(request);
  const data = await listProjects(createSupabaseAdminClient(), organisationId);
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute(async (request) => {
  const { user, identity, organisationId } = await requestContext(request);
  requireP0WriteRole(identity, organisationId);
  const data = await createProject(
    createSupabaseAdminClient(),
    organisationId,
    user.id,
    await request.json(),
  );
  return Response.json({ data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
});
