import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import {
  listDppAccessRequests,
  submitDppAccessRequest,
  type AccessRequestLevel,
  type AccessRequestRole,
} from "@/lib/server/dppAccess";
import { createServerAuthClient, requireAuthenticatedUser } from "@/lib/server/supabase";

export const GET = withApiRoute(async (request) => {
  const { accessToken } = await requireAuthenticatedUser(request);
  const requests = await listDppAccessRequests(createServerAuthClient(accessToken));
  return Response.json({ requests }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute(async (request) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "INVALID_JSON", "A JSON request body is required.");
  }
  const result = await submitDppAccessRequest(
    createServerAuthClient(accessToken),
    user,
    {
      identifier: String(body.identifier || ""),
      requestedLevel: String(body.requestedLevel || "") as AccessRequestLevel,
      requestedRole: String(body.requestedRole || "") as AccessRequestRole,
      organisationName: String(body.organisationName || ""),
      organisationRegistrationId: String(body.organisationRegistrationId || ""),
      organisationCountryCode: String(body.organisationCountryCode || ""),
      purpose: String(body.purpose || ""),
    },
  );
  return Response.json(result, {
    status: 201,
    headers: { "Cache-Control": "private, no-store" },
  });
});
