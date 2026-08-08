import assert from "node:assert/strict";
import test from "node:test";
import { preflightP0Import } from "../../lib/p0/importPreflight.ts";

test("T02 BOM preflight locates material errors by row and field", () => {
  const result = preflightP0Import("BOM", [
    { componentName: "Cell module", materialName: "LFP cell", percentage: 72 },
    { componentName: "Housing", materialName: "Steel", percentage: 35 },
    { componentName: "", materialName: "Copper", percentage: -1 },
  ]);
  assert.equal(result.canCommit, false);
  assert.ok(result.errors.some((error) => error.code === "MAT-001" && error.columnName === "percentage"));
  assert.ok(result.errors.some((error) => error.code === "COMPONENT_NAME_REQUIRED" && error.rowNumber === 4));
  assert.match(result.inputHash, /^[a-f0-9]{64}$/);
});

test("battery item preflight rejects duplicate serials and non-HTTPS UPI", () => {
  const result = preflightP0Import("BATTERY_ITEMS", [
    { serialNumber: "HS-0001", upi: "https://www.greanlean.com/p/HS-0001" },
    { serialNumber: "hs-0001", upi: "http://example.com/item" },
  ]);
  assert.ok(result.errors.some((error) => error.code === "DUPLICATE_SERIAL_IN_FILE"));
  assert.ok(result.errors.some((error) => error.code === "ID-001"));
});

test("technical field preflight applies BAT-001 consistency validation", () => {
  const result = preflightP0Import("FIELD_VALUES", [{
    fieldKey: "ratedEnergyKwh",
    value: 10,
    nominalVoltageV: 48,
    ratedCapacityAh: 100,
    ratedEnergyKwh: 10,
  }]);
  assert.ok(result.errors.some((error) => error.code === "BAT-001"));
});

test("signed-off snake-case BOM fixture headers normalize without inventing source data", () => {
  const result = preflightP0Import("BOM", [{
    component_name: "LFP cells",
    component_type: "CELL",
    mass_kg: 92,
    mass_percentage: 76,
  }]);
  assert.equal(result.canCommit, true);
  assert.equal(result.totalRows, 1);
});
