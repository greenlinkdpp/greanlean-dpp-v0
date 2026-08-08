import { withApiRoute } from "@/lib/server/apiRoute";
import { resolveDppAccess } from "@/lib/server/dppAccess";
import { createServerAuthClient, requireAuthenticatedUser } from "@/lib/server/supabase";

type RouteContext = { params: { identifier: string } };

export const GET = withApiRoute<RouteContext>(async (request, context, route) => {
  const { accessToken } = await requireAuthenticatedUser(request);
  const url = new URL(request.url);
  const result = await resolveDppAccess(
    createServerAuthClient(accessToken),
    decodeURIComponent(route.params.identifier),
    url.searchParams.get("audience"),
    {
      purpose: url.searchParams.get("purpose"),
      requestPath: url.pathname,
      correlationId: context.correlationId,
      userAgent: request.headers.get("user-agent"),
    },
  );
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
});
