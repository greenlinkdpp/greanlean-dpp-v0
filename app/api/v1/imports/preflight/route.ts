import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext } from "@/lib/server/dppAccess";
import { p0OrganisationContext, preflightImport, requireP0WriteRole } from "@/lib/server/p0Repository";
import { createServerAuthClient, createSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/server/supabase";
import type { P0ImportType } from "@/lib/p0/importPreflight";

export const POST = withApiRoute(async (request) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const identity = await loadIdentityContext(createServerAuthClient(accessToken), user);
  const input = await request.json();
  const { organisationId } = p0OrganisationContext(identity, input.organisationId || null);
  requireP0WriteRole(identity, organisationId);
  const idempotencyKey = request.headers.get("idempotency-key") || input.idempotencyKey;
  if (!idempotencyKey) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "An idempotency key is required.");
  const rows = Array.isArray(input.rows) ? input.rows : [];
  const data = await preflightImport(
    createSupabaseAdminClient(),
    organisationId,
    input.projectId || null,
    user.id,
    String(input.type || "") as P0ImportType,
    rows,
    String(idempotencyKey),
  );
  return Response.json({ data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
});
