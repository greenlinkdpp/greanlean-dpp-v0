import assert from "node:assert/strict";
import test from "node:test";

import { classifyLegacyFieldSource } from "../../lib/v2/legacyFieldAdapter.ts";

test("legacy field sources converge through a read-only adapter without invented provenance", () => {
  for (const source of ["products_fixed_columns", "product_sector_field_values", "battery_field_value"]) {
    const result = classifyLegacyFieldSource(source);
    assert.equal(result.status, "SOURCE_RECORD_CANDIDATE");
    assert.equal(result.sourceDisclosure, "LEGACY_SOURCE_UNKNOWN");
  }
  assert.equal(classifyLegacyFieldSource("dpp_field_templates").status, "FIELD_MAPPING_CANDIDATE");
  assert.equal(classifyLegacyFieldSource("unknown").status, "REJECTED");
});

