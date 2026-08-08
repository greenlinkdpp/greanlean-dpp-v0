import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { decideDppAccessRequest } from "@/lib/server/dppAccess";
import { createServerAuthClient, requireAuthenticatedUser } from "@/lib/server/supabase";

type RouteContext = { params: { requestId: string } };

export const PATCH = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { accessToken } = await requireAuthenticatedUser(request);
  const body = await request.json().catch(() => null);
  if (!body || !["approved", "rejected"].includes(String(body.decision))) {
    throw new ApiError(400, "INVALID_ACCESS_DECISION", "The decision must be approved or rejected.");
  }
  const result = await decideDppAccessRequest(
    createServerAuthClient(accessToken),
    route.params.requestId,
    body.decision,
    typeof body.reason === "string" ? body.reason : undefined,
    typeof body.validUntil === "string" && body.validUntil ? body.validUntil : null,
  );
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
});
