import assert from "node:assert/strict";
import test from "node:test";

import { convertUnit, dryRunMapping, type MappingRuleInput } from "../../lib/v2/mappingEngine.ts";

const baseRule = {
  field_definition_id: "field-capacity",
  field_code: "battery.ratedCapacity",
  source_pointer: "/capacity",
  transform_type: "UNIT_CONVERT",
  source_unit: "mAh",
  canonical_unit: "Ah",
  transform_config: { conversionVersion: "units-v1", precision: 3 },
  lossiness: "LOSSLESS",
} satisfies MappingRuleInput;

test("unit conversion supports mAh/Ah, Wh/kWh, and g/kg only within dimensions", () => {
  assert.equal(convertUnit(15000, "mAh", "Ah"), 15);
  assert.equal(convertUnit(1500, "Wh", "kWh"), 1.5);
  assert.equal(convertUnit(2500, "g", "kg"), 2.5);
  assert.throws(() => convertUnit(1, "g", "Ah"), /UNIT_NOT_COMPATIBLE/);
});

test("Mapping Dry Run is replayable and reports unmapped and lossy fields", () => {
  const first = dryRunMapping({ capacity: "15,000", notes: "synthetic" }, [
    baseRule,
    {
      field_definition_id: "field-label",
      field_code: "product.label",
      source_pointer: "/capacity",
      transform_type: "CASE_NORMALIZE",
      transform_config: { case: "upper" },
      lossiness: "LOSSY",
    },
  ]);
  const second = dryRunMapping({ capacity: "15,000", notes: "synthetic" }, [baseRule]);
  assert.equal(first.fields[0].value, 15);
  assert.equal(first.fields[0].originalValue, "15,000");
  assert.equal(first.fields[0].conversionVersion, "units-v1");
  assert.deepEqual(first.unmappedFields, ["notes"]);
  assert.ok(first.warnings.some((warning) => warning.code === "MAPPING_LOSSY"));
  assert.equal(first.inputHash, second.inputHash);
});

test("Mapping Dry Run never silently drops null or invalid data", () => {
  const result = dryRunMapping({ capacity: null }, [{ ...baseRule, null_policy: "ERROR" }]);
  assert.equal(result.status, "FAILED");
  assert.equal(result.errors[0].code, "TRANSFORMATION_FAILED");
});

