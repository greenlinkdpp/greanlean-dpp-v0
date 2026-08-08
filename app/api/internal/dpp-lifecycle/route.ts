import { withApiRoute } from "@/lib/server/apiRoute";
import { requireDppInternalUser } from "@/lib/server/dppAccess";
import { appendDppLifecycleEvent } from "@/lib/server/dppFileRepository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

export const POST = withApiRoute(async (request) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  await requireDppInternalUser(createServerAuthClient(accessToken), user);
  const body = await request.json();
  const result = await appendDppLifecycleEvent(
    createSupabaseAdminClient(),
    user,
    body && typeof body === "object" ? body : {},
  );
  return Response.json(result, {
    status: 201,
    headers: { "Cache-Control": "private, no-store" },
  });
});
