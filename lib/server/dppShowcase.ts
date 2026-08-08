import { loadPublicDppData, resolvePublicProduct } from "../dpp/publicDppRepository";
import { loadBatteryOperatingProjection } from "./batteryOperatingData";
import {
  buildBatteryShowcaseOperatingData,
  enrichBatteryShowcaseData,
} from "./batteryShowcaseData";
import {
  createSupabaseAdminClient,
  createSupabasePublicServerClient,
} from "./supabase";

export const DPP_SHOWCASE_IDENTIFIERS = new Set([
  "DPP-LMT-BAT-48V15AH",
  "DPP-GV-ESS-14K3-000001",
  "DPP-SFJK-31-1-REC",
  "DPP-CE-EARBUDS-001",
]);

export function isDppShowcaseIdentifier(identifier: string) {
  return DPP_SHOWCASE_IDENTIFIERS.has(identifier);
}

function removeInternalMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeInternalMetadata);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => ![
        "sourceRecord",
        "sourceTables",
        "generatedBy",
      ].includes(key))
      .map(([key, child]) => [key, removeInternalMetadata(child)]),
  );
}

export function sanitizeShowcaseDppData(data: any) {
  const sanitized = removeInternalMetadata(data) as any;
  return {
    ...sanitized,
    governance: [],
    registrySubmissions: [],
    registrationProofs: [],
    evidenceLinks: [],
    blockchainAnchors: [],
    showcase: {
      mode: "PUBLIC_SHOWCASE",
      dataStatus: "PUBLISHED_PRODUCT_INFORMATION",
    },
  };
}

export async function loadShowcaseDppData(identifier: string) {
  if (!isDppShowcaseIdentifier(identifier)) return null;

  const hasServerKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const client = hasServerKey
    ? createSupabaseAdminClient()
    : createSupabasePublicServerClient();
  let data = await loadPublicDppData(client, identifier, false);
  if (!data) return null;
  const sourceProduct = await resolvePublicProduct(client, identifier, false);

  if (
    data?.product?.sector_code === "battery"
    || String(data?.product?.dpp_profile_key || "").startsWith("battery.")
  ) {
    data = enrichBatteryShowcaseData(data, identifier);
    const storedBatteryOperating = hasServerKey
      ? await loadBatteryOperatingProjection(
        client,
        sourceProduct?.id,
        { range: "30d" },
      )
      : null;
    const batteryOperating = storedBatteryOperating
      || buildBatteryShowcaseOperatingData(identifier);
    if (batteryOperating) data = { ...data, batteryOperating };
  }

  return sanitizeShowcaseDppData(data);
}

export function showcaseStructuredPayload(data: any) {
  return removeInternalMetadata(data?.canonicalPublication || data);
}
