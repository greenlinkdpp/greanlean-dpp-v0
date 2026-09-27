import { withApiRoute } from "@/lib/server/apiRoute";
import { requireV2FeatureFlags } from "@/lib/server/v2/featureFlags";
import { processWebhook } from "@/lib/server/v2/phase5Repository";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export const POST = withApiRoute<{ params: { connectorCode: string } }>(async (request, _context, route) => {
  requireV2FeatureFlags("FEATURE_V2_INTEGRATION_CORE", "FEATURE_V2_EXTERNAL_CONNECTORS", "FEATURE_V2_CONNECTOR_EXECUTION");
  const rawBody = await request.text();
  const result = await processWebhook(createSupabaseAdminClient(), route.params.connectorCode, request, rawBody);
  return Response.json({ data: result }, { status: result.duplicate ? 200 : 202, headers: { "Cache-Control": "no-store" } });
});
