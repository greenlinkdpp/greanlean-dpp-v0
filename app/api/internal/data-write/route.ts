import { withApiRoute } from "@/lib/server/apiRoute";
import {
  loadIdentityContext,
  requireProductEditorAccess,
} from "@/lib/server/dppAccess";
import { executeInternalDataWrite } from "@/lib/server/internalDataWrite";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

export const POST = withApiRoute(async (request) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const input = await request.json();
  const authClient = createServerAuthClient(accessToken);
  const identity = await loadIdentityContext(authClient, user);
  if (!identity.canManageProducts) {
    return Response.json({
      error: {
        code: "PRODUCT_EDITOR_ACCESS_REQUIRED",
        message: "Product editor access is required for this operation.",
      },
    }, { status: 403 });
  }
  if (!identity.isPlatformAdmin && input?.table === "products" && input?.operation === "insert") {
    return Response.json({
      error: {
        code: "PRODUCT_CREATE_NOT_ALLOWED",
        message: "Partner editors can update assigned products but cannot create new products.",
      },
    }, { status: 403 });
  }
  const rows = Array.isArray(input?.values) ? input.values : input?.values ? [input.values] : [];
  const filterRows = Array.isArray(input?.filters) ? input.filters : [];
  const productIds = Array.from(new Set([
    ...rows.map((row: any) => row?.product_id).filter(Boolean),
    ...(input?.table === "products"
      ? filterRows
          .filter((filter: any) => filter?.column === "id")
          .flatMap((filter: any) => Array.isArray(filter.value) ? filter.value : [filter.value])
      : filterRows
          .filter((filter: any) => filter?.column === "product_id")
          .flatMap((filter: any) => Array.isArray(filter.value) ? filter.value : [filter.value])),
  ].map(String)));
  if (!identity.isPlatformAdmin) {
    if (!productIds.length) {
      return Response.json({
        error: {
          code: "PRODUCT_SCOPE_REQUIRED",
          message: "Partner product changes must include an authorised product identifier.",
        },
      }, { status: 400 });
    }
    await Promise.all(productIds.map((productId) => (
      requireProductEditorAccess(authClient, user, productId)
    )));
  }
  const data = await executeInternalDataWrite(
    createSupabaseAdminClient(),
    user,
    input,
    identity.isPlatformAdmin ? "platform_admin" : "partner_editor",
  );
  return Response.json({ data }, {
    headers: { "Cache-Control": "private, no-store" },
  });
});
