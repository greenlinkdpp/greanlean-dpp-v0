import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { createBatteryIntegrationCredential } from "@/lib/server/batteryOperatingData";
import { requireDppInternalUser } from "@/lib/server/dppAccess";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

export const POST = withApiRoute(async (request) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  await requireDppInternalUser(createServerAuthClient(accessToken), user);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_JSON", "A JSON object request body is required.");
  }
  for (const key of [
    "organisationId",
    "productId",
    "batteryItemId",
    "deviceIdentifier",
    "sourceSystem",
  ]) {
    if (!String(body[key] || "").trim()) {
      throw new ApiError(400, "BATTERY_CREDENTIAL_INPUT_REQUIRED", `The ${key} field is required.`);
    }
  }
  const result = await createBatteryIntegrationCredential(
    createSupabaseAdminClient(),
    user,
    body,
  );
  return Response.json(result, {
    status: 201,
    headers: { "Cache-Control": "private, no-store" },
  });
});
