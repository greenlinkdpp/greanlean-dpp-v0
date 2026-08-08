import { withApiRoute } from "@/lib/server/apiRoute";
import { createDppFileDownload } from "@/lib/server/dppFileRepository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

type RouteContext = { params: { versionId: string } };

export const GET = withApiRoute<RouteContext>(async (request, context, route) => {
  const authorization = request.headers.get("authorization");
  let authClient = null;
  let user = null;
  if (authorization) {
    const authenticated = await requireAuthenticatedUser(request);
    authClient = createServerAuthClient(authenticated.accessToken);
    user = authenticated.user;
  }
  const url = new URL(request.url);
  const download = await createDppFileDownload(
    createSupabaseAdminClient(),
    authClient,
    user,
    route.params.versionId,
    {
      purpose: url.searchParams.get("purpose"),
      requestPath: url.pathname,
      correlationId: context.correlationId,
      userAgent: request.headers.get("user-agent"),
    },
  );
  return Response.redirect(download.signedUrl, 302);
});
