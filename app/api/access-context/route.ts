import { withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext } from "@/lib/server/dppAccess";
import { createServerAuthClient, requireAuthenticatedUser } from "@/lib/server/supabase";

export const GET = withApiRoute(async (request) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const identity = await loadIdentityContext(createServerAuthClient(accessToken), user);
  return Response.json(identity, { headers: { "Cache-Control": "no-store" } });
});
