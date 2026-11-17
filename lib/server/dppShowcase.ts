import { loadPublicDppData } from "../dpp/publicDppRepository";
import { createSupabasePublicServerClient } from "./supabase";

export const DPP_SHOWCASE_IDENTIFIERS = new Set([
  "DPP-LMT-BAT-48V15AH",
  "DPP-GV-ESS-14K3-000001",
  "DPP-SFJK-31-1-REC",
  "DPP-CE-EARBUDS-001",
  "DPP-GLR-LMT-000001",
  "DPP-GLR-LMT-000002",
  "DPP-GLR-LMT-000003",
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

  // A showcase flag is presentation-only. Anonymous callers must stay on the
  // public client and PUBLIC/RLS-projected data path.
  const client = createSupabasePublicServerClient();
  const data = await loadPublicDppData(client, identifier, false);
  if (!data) return null;

  return sanitizeShowcaseDppData(data);
}

export function showcaseStructuredPayload(data: any) {
  return removeInternalMetadata(data?.canonicalPublication || data);
}
