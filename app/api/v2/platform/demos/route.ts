import { withApiRoute } from "@/lib/server/apiRoute";
import { demoShowcaseCollectionHandlers } from "@/lib/server/v2/demoShowcaseRoutes";
import { platformPagination, requirePlatformCapability } from "@/lib/server/v2/platformSecurity";

export const GET = withApiRoute(async (request, context) => {
  const { admin } = await requirePlatformCapability(request, context, "platform.demo.view", { resourceType: "DEMO_SHOWCASE", operation: "platform.demo.list" });
  const range = platformPagination(request);
  const { data, error, count } = await admin.from("demo_showcase_entry")
    .select("id,tenant_id,passport_id,category_code,title_en,title_zh,brand,summary_en,summary_zh,key_parameters,cover_style,sort_order,is_featured,is_public,created_at,updated_at", { count: "exact" })
    .order("category_code").order("sort_order").range(range.from, range.to);
  if (error) throw new Error("Platform Demo Showcase inventory failed.");
  return Response.json({ data: { rows: data || [], pagination: { total: count || 0, from: range.from, to: range.to } } }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = demoShowcaseCollectionHandlers.POST;
