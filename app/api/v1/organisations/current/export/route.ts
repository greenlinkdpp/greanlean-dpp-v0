import { withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext } from "@/lib/server/dppAccess";
import { organisationWorkspace, p0OrganisationContext } from "@/lib/server/p0Repository";
import { createServerAuthClient, createSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/server/supabase";

export const GET = withApiRoute(async (request) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const identity = await loadIdentityContext(createServerAuthClient(accessToken), user);
  const requestedOrganisation = new URL(request.url).searchParams.get("organisationId");
  const { organisationId } = p0OrganisationContext(identity, requestedOrganisation);
  const data = await organisationWorkspace(createSupabaseAdminClient(), organisationId);
  const exportedAt = new Date().toISOString();
  return new Response(JSON.stringify({
    schema: "https://www.greanlean.com/schemas/economic-operator-profile/p0-1.0",
    exportedAt,
    organisation: data.organisation,
    economicOperatorProfile: data.profile,
    completeness: data.completeness,
  }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="economic-operator-${organisationId}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
});
