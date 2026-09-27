import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const collectionRoutes = [
  "app/api/v2/product-families/route.ts",
  "app/api/v2/product-models/route.ts",
  "app/api/v2/skus/route.ts",
  "app/api/v2/batches/route.ts",
  "app/api/v2/batch-sku-links/route.ts",
  "app/api/v2/items/route.ts",
  "app/api/v2/identifiers/route.ts",
];

const itemRoutes = [
  "app/api/v2/product-families/[id]/route.ts",
  "app/api/v2/product-models/[id]/route.ts",
  "app/api/v2/skus/[id]/route.ts",
  "app/api/v2/batches/[id]/route.ts",
  "app/api/v2/items/[id]/route.ts",
  "app/api/v2/identifiers/[id]/route.ts",
];

test("all Product Core routes use the shared capability/PDP route boundary", async () => {
  for (const path of [...collectionRoutes, ...itemRoutes]) {
    const source = await readFile(path, "utf8");
    assert.match(source, /createProduct(?:Collection|Item)Handlers/, path);
    assert.doesNotMatch(source, /createSupabaseAdminClient/, path);
  }
  for (const path of [
    "app/api/v2/batch-sku-links/[id]/deactivate/route.ts",
    "app/api/v2/identifiers/[id]/retire/route.ts",
  ]) {
    const source = await readFile(path, "utf8");
    assert.match(source, /requireV2PolicyContext/, path);
    assert.match(source, /executeIdempotentWrite/, path);
    assert.match(source, /requireIdempotencyKey/, path);
  }
});

test("Product repositories require verified policy context and persistent idempotency", async () => {
  const [repository, routes, hierarchy] = await Promise.all([
    readFile("lib/server/v2/productRepository.ts", "utf8"),
    readFile("lib/server/v2/productRoutes.ts", "utf8"),
    readFile("lib/server/v2/productHierarchyResolver.ts", "utf8"),
  ]);
  assert.match(repository, /assertVerifiedPolicyContext/);
  assert.match(hierarchy, /assertVerifiedPolicyContext/);
  assert.match(routes, /executeIdempotentWrite/);
  assert.match(routes, /productFeature: true/);
  assert.match(routes, /\.archive/);
});

test("legacy adapter explicitly preserves ambiguous products.sku for review", async () => {
  const source = await readFile("lib/v2/legacyProductMapping.ts", "utf8");
  assert.match(source, /REVIEW_REQUIRED/);
  assert.match(source, /LEGACY_MAPPING_AMBIGUOUS/);
  assert.match(source, /MODEL_OWNED_BATCH_NO_AUTOMATIC_SKU/);
});
