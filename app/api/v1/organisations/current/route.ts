import { withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext } from "@/lib/server/dppAccess";
import {
  organisationWorkspace,
  p0OrganisationContext,
  requireP0OrganisationAdmin,
  saveEconomicOperatorProfile,
} from "@/lib/server/p0Repository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

async function identityFor(request: Request) {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const identity = await loadIdentityContext(createServerAuthClient(accessToken), user);
  const requestedOrganisation = new URL(request.url).searchParams.get("organisationId");
  const context = p0OrganisationContext(identity, requestedOrganisation);
  return { user, identity, ...context };
}

export const GET = withApiRoute(async (request) => {
  const { organisationId } = await identityFor(request);
  const data = await organisationWorkspace(createSupabaseAdminClient(), organisationId);
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});

export const PUT = withApiRoute(async (request) => {
  const { user, identity, organisationId } = await identityFor(request);
  requireP0OrganisationAdmin(identity, organisationId);
  const input = await request.json();
  const profile = await saveEconomicOperatorProfile(
    createSupabaseAdminClient(),
    organisationId,
    user.id,
    input,
  );
  return Response.json({ data: profile }, { headers: { "Cache-Control": "private, no-store" } });
});
