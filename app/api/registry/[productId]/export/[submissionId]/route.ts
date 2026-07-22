import { withApiRoute } from "@/lib/server/apiRoute";
import { registryMappingDownload } from "@/lib/server/registryRepository";
import { createSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/server/supabase";

type RouteContext = { params: { productId: string; submissionId: string } };

export const GET = withApiRoute<RouteContext>(async (request, _context, route) => {
  await requireAuthenticatedUser(request);
  const result = await registryMappingDownload(createSupabaseAdminClient(), route.params.productId, route.params.submissionId);
  return new Response(`${JSON.stringify(result.payload, null, 2)}\n`, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
});
