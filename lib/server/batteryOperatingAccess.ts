import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./apiRoute";
import { resolveDppAccess } from "./dppAccess";
import { loadBatteryOperatingProjection } from "./batteryOperatingData";

type Client = SupabaseClient<any, "public", any>;

export async function loadAuthorizedBatteryOperatingData(
  authClient: Client,
  admin: Client,
  batteryItemId: string,
  options: {
    range?: "24h" | "7d" | "30d" | "12m" | "all";
    metricCodes?: string[];
    purpose?: string;
    requestPath?: string;
    correlationId?: string;
    userAgent?: string | null;
  } = {},
) {
  const { data: item, error } = await admin
    .from("battery_item")
    .select(`
      id,
      product_id,
      product:products!inner(dpp_id,public_slug,status)
    `)
    .eq("id", batteryItemId)
    .maybeSingle();
  if (error) {
    throw new ApiError(500, "BATTERY_ITEM_LOOKUP_FAILED", "The battery item could not be checked.");
  }
  const product = Array.isArray(item?.product) ? item?.product[0] : item?.product;
  if (!item || !product) {
    throw new ApiError(404, "BATTERY_ITEM_NOT_FOUND", "The battery item was not found.");
  }
  const identifier = product.dpp_id || product.public_slug;
  if (!identifier) {
    throw new ApiError(409, "BATTERY_DPP_IDENTIFIER_MISSING", "The battery item is not linked to a DPP identifier.");
  }
  const { access } = await resolveDppAccess(
    authClient,
    identifier,
    "professional",
    {
      purpose: options.purpose || "battery operating data",
      requestPath: options.requestPath,
      correlationId: options.correlationId,
      userAgent: options.userAgent,
    },
  );
  if (!["LEGITIMATE_INTEREST", "AUTHORITY_ONLY", "INTERNAL"].includes(access.grantedLevel)) {
    throw new ApiError(403, "BATTERY_OPERATING_DATA_ACCESS_DENIED", "The account is not authorised to read battery operating data.");
  }
  const data = await loadBatteryOperatingProjection(admin, item.product_id, {
    batteryItemId,
    range: options.range,
    metricCodes: options.metricCodes,
  });
  if (!data) throw new ApiError(404, "BATTERY_OPERATING_DATA_NOT_FOUND", "No battery operating data is available for this item.");
  return { access, data };
}
