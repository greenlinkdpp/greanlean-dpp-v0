export const PRODUCT_ERROR_CODES = {
  PRODUCT_MODEL_NOT_FOUND: "PRODUCT_MODEL_NOT_FOUND",
  PRODUCT_ACCESS_DENIED: "PRODUCT_ACCESS_DENIED",
  PRODUCT_MODEL_MISMATCH: "PRODUCT_MODEL_MISMATCH",
  TENANT_RELATIONSHIP_MISMATCH: "TENANT_RELATIONSHIP_MISMATCH",
  SKU_MODEL_MISMATCH: "SKU_MODEL_MISMATCH",
  BATCH_MODEL_MISMATCH: "BATCH_MODEL_MISMATCH",
  ITEM_MODEL_MISMATCH: "ITEM_MODEL_MISMATCH",
  BATCH_SKU_LINK_REQUIRED: "BATCH_SKU_LINK_REQUIRED",
  IDENTIFIER_CONFLICT: "IDENTIFIER_CONFLICT",
  IDENTIFIER_INVALID: "IDENTIFIER_INVALID",
  LEGACY_MAPPING_AMBIGUOUS: "LEGACY_MAPPING_AMBIGUOUS",
} as const;

export type ProductErrorCode = (typeof PRODUCT_ERROR_CODES)[keyof typeof PRODUCT_ERROR_CODES];

export function productRelationshipErrorCode(serverMessage: string): ProductErrorCode {
  if (
    serverMessage.includes("product_item_model_tenant_fk") ||
    serverMessage.includes("product_item_sku_model_tenant_fk") ||
    serverMessage.includes("product_item_batch_model_tenant_fk")
  ) {
    return PRODUCT_ERROR_CODES.ITEM_MODEL_MISMATCH;
  }
  if (
    serverMessage.includes("batch_sku_link_batch_model_tenant_fk") ||
    serverMessage.includes("batch_sku_link_sku_model_tenant_fk")
  ) {
    return PRODUCT_ERROR_CODES.PRODUCT_MODEL_MISMATCH;
  }
  if (serverMessage.includes("sku_model_tenant_fk")) {
    return PRODUCT_ERROR_CODES.SKU_MODEL_MISMATCH;
  }
  if (serverMessage.includes("product_batch_model_tenant_fk")) {
    return PRODUCT_ERROR_CODES.BATCH_MODEL_MISMATCH;
  }
  return PRODUCT_ERROR_CODES.TENANT_RELATIONSHIP_MISMATCH;
}
