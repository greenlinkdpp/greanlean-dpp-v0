import { ApiError, withApiRoute } from "@/lib/server/apiRoute";
import { loadIdentityContext, requireProductEditorAccess } from "@/lib/server/dppAccess";
import { commitBomImport, p0OrganisationContext, requireP0WriteRole } from "@/lib/server/p0Repository";
import { createServerAuthClient, createSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/server/supabase";

type RouteContext = { params: { jobId: string } };

export const POST = withApiRoute<RouteContext>(async (request, _context, route) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const authClient = createServerAuthClient(accessToken);
  const identity = await loadIdentityContext(authClient, user);
  const input = await request.json();
  const { organisationId } = p0OrganisationContext(identity, input.organisationId || null);
  requireP0WriteRole(identity, organisationId);
  const productId = String(input.productId || "");
  if (!productId) throw new ApiError(400, "IMPORT_PRODUCT_REQUIRED", "A target product is required.");
  await requireProductEditorAccess(authClient, user, productId);
  if (String(input.type || "BOM") !== "BOM") {
    throw new ApiError(400, "IMPORT_COMMIT_TYPE_UNSUPPORTED", "P0 commit currently supports BOM imports only.");
  }
  const rows = Array.isArray(input.rows) ? input.rows : [];
  const data = await commitBomImport(
    createSupabaseAdminClient(),
    organisationId,
    route.params.jobId,
    productId,
    user.id,
    rows,
  );
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});
