import assert from "node:assert/strict";
import test from "node:test";

import { PRODUCT_ERROR_CODES, productRelationshipErrorCode } from "../../lib/v2/productErrors.ts";

test("Product relationship constraints map to stable safe API errors", () => {
  assert.equal(productRelationshipErrorCode('violates "sku_model_tenant_fk"'), PRODUCT_ERROR_CODES.SKU_MODEL_MISMATCH);
  assert.equal(productRelationshipErrorCode('violates "product_batch_model_tenant_fk"'), PRODUCT_ERROR_CODES.BATCH_MODEL_MISMATCH);
  assert.equal(productRelationshipErrorCode('violates "product_item_sku_model_tenant_fk"'), PRODUCT_ERROR_CODES.ITEM_MODEL_MISMATCH);
  assert.equal(productRelationshipErrorCode('violates "batch_sku_link_sku_model_tenant_fk"'), PRODUCT_ERROR_CODES.PRODUCT_MODEL_MISMATCH);
  assert.equal(productRelationshipErrorCode("unknown relationship"), PRODUCT_ERROR_CODES.TENANT_RELATIONSHIP_MISMATCH);
});

test("Phase 2 publishes every required Product Core error code", () => {
  assert.deepEqual(Object.keys(PRODUCT_ERROR_CODES), [
    "PRODUCT_MODEL_NOT_FOUND",
    "PRODUCT_ACCESS_DENIED",
    "PRODUCT_MODEL_MISMATCH",
    "TENANT_RELATIONSHIP_MISMATCH",
    "SKU_MODEL_MISMATCH",
    "BATCH_MODEL_MISMATCH",
    "ITEM_MODEL_MISMATCH",
    "BATCH_SKU_LINK_REQUIRED",
    "IDENTIFIER_CONFLICT",
    "IDENTIFIER_INVALID",
    "LEGACY_MAPPING_AMBIGUOUS",
  ]);
});
