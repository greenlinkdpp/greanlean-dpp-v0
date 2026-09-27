import { ApiError } from "../apiRoute";
import { findDisabledV2Flags, type V2FeatureFlag } from "../../v2/featureSwitches";

const requiredFlags = [
  "FEATURE_SERVER_API_V2",
  "FEATURE_V2_TENANT_API",
  "FEATURE_V2_TENANT_CORE",
  "FEATURE_V2_ACCESS_POLICY",
] as const;

export function requireV2FeatureFlags(
  ...extraFlags: V2FeatureFlag[]
) {
  const flags = [...requiredFlags, ...extraFlags];
  const disabled = findDisabledV2Flags(process.env, flags);
  if (disabled.length > 0) {
    throw new ApiError(404, "V2_FEATURE_DISABLED", "The V2 API is not enabled in this environment.");
  }
}
