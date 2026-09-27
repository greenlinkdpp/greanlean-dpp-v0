export type LegacyProductSource =
  | "products"
  | "battery_model_profile"
  | "battery_batch"
  | "battery_item";

export type LegacyMappingResult = {
  status: "MAPPED" | "REVIEW_REQUIRED" | "REJECTED";
  targetType: "MODEL" | "SKU" | "BATCH" | "ITEM" | null;
  createSku: boolean;
  reason: string;
};

export function classifyLegacyProductMapping(input: {
  sourceType: string;
  hasSkuValue?: boolean;
  skuSemanticsVerified?: boolean;
}): LegacyMappingResult {
  switch (input.sourceType as LegacyProductSource) {
    case "products":
      if (input.hasSkuValue && !input.skuSemanticsVerified) {
        return {
          status: "REVIEW_REQUIRED",
          targetType: "MODEL",
          createSku: false,
          reason: "LEGACY_MAPPING_AMBIGUOUS",
        };
      }
      return {
        status: "MAPPED",
        targetType: input.hasSkuValue ? "SKU" : "MODEL",
        createSku: Boolean(input.hasSkuValue && input.skuSemanticsVerified),
        reason: input.hasSkuValue ? "VERIFIED_SKU_SEMANTICS" : "PRODUCT_MODEL_CANDIDATE",
      };
    case "battery_model_profile":
      return {
        status: "MAPPED",
        targetType: "MODEL",
        createSku: false,
        reason: "BATTERY_MODEL_IDENTITY_ONLY",
      };
    case "battery_batch":
      return {
        status: "MAPPED",
        targetType: "BATCH",
        createSku: false,
        reason: "MODEL_OWNED_BATCH_NO_AUTOMATIC_SKU",
      };
    case "battery_item":
      return {
        status: "MAPPED",
        targetType: "ITEM",
        createSku: false,
        reason: "BATTERY_ITEM_IDENTITY_HIERARCHY_ONLY",
      };
    default:
      return {
        status: "REJECTED",
        targetType: null,
        createSku: false,
        reason: "UNSUPPORTED_LEGACY_ENTITY",
      };
  }
}
