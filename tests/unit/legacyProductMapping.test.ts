import assert from "node:assert/strict";
import test from "node:test";
import { classifyLegacyProductMapping } from "../../lib/v2/legacyProductMapping.ts";

test("legacy products become Model candidates without inventing SKU semantics", () => {
  assert.deepEqual(
    classifyLegacyProductMapping({ sourceType: "products" }),
    {
      status: "MAPPED",
      targetType: "MODEL",
      createSku: false,
      reason: "PRODUCT_MODEL_CANDIDATE",
    },
  );
  const ambiguous = classifyLegacyProductMapping({
    sourceType: "products",
    hasSkuValue: true,
    skuSemanticsVerified: false,
  });
  assert.equal(ambiguous.status, "REVIEW_REQUIRED");
  assert.equal(ambiguous.createSku, false);
  assert.equal(ambiguous.reason, "LEGACY_MAPPING_AMBIGUOUS");
  const verified = classifyLegacyProductMapping({
    sourceType: "products",
    hasSkuValue: true,
    skuSemanticsVerified: true,
  });
  assert.equal(verified.status, "MAPPED");
  assert.equal(verified.targetType, "SKU");
  assert.equal(verified.createSku, true);
});

test("battery legacy mapping preserves hierarchy and never invents SKU links", () => {
  assert.equal(classifyLegacyProductMapping({ sourceType: "battery_model_profile" }).targetType, "MODEL");
  const batch = classifyLegacyProductMapping({ sourceType: "battery_batch" });
  assert.equal(batch.targetType, "BATCH");
  assert.equal(batch.createSku, false);
  assert.equal(classifyLegacyProductMapping({ sourceType: "battery_item" }).targetType, "ITEM");
  assert.equal(classifyLegacyProductMapping({ sourceType: "unknown" }).status, "REJECTED");
});
