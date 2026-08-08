import { withApiRoute } from "@/lib/server/apiRoute";
import { requireProductEditorAccess } from "@/lib/server/dppAccess";
import {
  createDppFileVersion,
  listDppFileAssets,
} from "@/lib/server/dppFileRepository";
import {
  createServerAuthClient,
  createSupabaseAdminClient,
  requireAuthenticatedUser,
} from "@/lib/server/supabase";

export const GET = withApiRoute(async (request) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const productId = new URL(request.url).searchParams.get("productId") || "";
  await requireProductEditorAccess(createServerAuthClient(accessToken), user, productId);
  return Response.json(
    await listDppFileAssets(createSupabaseAdminClient(), productId),
    { headers: { "Cache-Control": "private, no-store" } },
  );
});

export const POST = withApiRoute(async (request) => {
  const { user, accessToken } = await requireAuthenticatedUser(request);
  const form = await request.formData();
  const productId = String(form.get("productId") || "");
  await requireProductEditorAccess(createServerAuthClient(accessToken), user, productId);
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({
      error: { code: "DPP_FILE_REQUIRED", message: "An evidence file is required." },
    }, { status: 400 });
  }

  const claimText = String(form.get("claimValue") || "").trim();
  let claimValue: unknown = null;
  if (claimText) {
    try {
      claimValue = JSON.parse(claimText);
    } catch {
      claimValue = claimText;
    }
  }
  const fieldLinksText = String(form.get("fieldLinks") || "").trim();
  let fieldLinks: Array<{ moduleCode: string; fieldCode: string }> = [];
  if (fieldLinksText) {
    try {
      const parsed = JSON.parse(fieldLinksText);
      if (Array.isArray(parsed)) {
        fieldLinks = parsed.flatMap((link) => (
          link
          && typeof link === "object"
          && typeof link.moduleCode === "string"
          && typeof link.fieldCode === "string"
            ? [{
              moduleCode: link.moduleCode,
              fieldCode: link.fieldCode,
            }]
            : []
        ));
      }
    } catch {
      fieldLinks = [];
    }
  }
  const result = await createDppFileVersion(createSupabaseAdminClient(), user, {
    productId,
    assetKey: String(form.get("assetKey") || ""),
    title: String(form.get("title") || ""),
    documentType: String(form.get("documentType") || ""),
    description: String(form.get("description") || ""),
    accessLevel: String(form.get("accessLevel") || "PUBLIC"),
    sourceDocumentId: String(form.get("sourceDocumentId") || "") || null,
    moduleCode: String(form.get("moduleCode") || "") || null,
    fieldCode: String(form.get("fieldCode") || "") || null,
    fieldLinks,
    claimValue,
    verificationStatus: String(form.get("verificationStatus") || "UNVERIFIED"),
    file,
  });
  return Response.json(result, {
    status: 201,
    headers: { "Cache-Control": "private, no-store" },
  });
});
