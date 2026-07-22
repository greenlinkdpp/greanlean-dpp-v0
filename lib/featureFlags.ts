export type PublicFeatureFlag = "schemaRegistry" | "batteryDppV2";

const enabledValues = new Set(["1", "true", "yes", "on"]);

function enabled(value: string | undefined) {
  return enabledValues.has(String(value || "").toLowerCase());
}

export const publicFeatureFlags: Readonly<Record<PublicFeatureFlag, boolean>> = Object.freeze({
  schemaRegistry: enabled(process.env.NEXT_PUBLIC_FEATURE_SCHEMA_REGISTRY),
  batteryDppV2: enabled(process.env.NEXT_PUBLIC_FEATURE_BATTERY_DPP_V2),
});

export function isPublicFeatureEnabled(flag: PublicFeatureFlag) {
  return publicFeatureFlags[flag];
}
