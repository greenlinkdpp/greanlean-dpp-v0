import assert from "node:assert/strict";
import test from "node:test";
import {
  canReadField,
  canTransitionSchemaVersion,
  resolveRequirementStatus,
  validateSchemaVersionDraft,
  type FieldDefinition,
  type SchemaVersionDraft,
} from "../../lib/schemaRegistry.ts";

const ratedCapacity: FieldDefinition = {
  fieldCode: "battery.rated_capacity",
  jsonPointer: "/performance/ratedCapacity",
  labelEn: "Rated capacity",
  labelZh: "额定容量",
  dataType: "decimal",
  dataBehavior: "STATIC",
  dataGranularity: "MODEL",
  accessLevel: "PUBLIC",
  requirementStatus: "CONFIRMED_MANDATORY",
  unitCode: "Ah",
};

const draft: SchemaVersionDraft = {
  schemaCode: "battery.lmt",
  version: "1.0.0",
  sourceVersion: "BatteryPass-Ready 1.0",
  status: "draft",
  jsonSchema: { type: "object" },
  fields: [ratedCapacity],
};

test("validates a bilingual, versioned Schema draft", () => {
  assert.deepEqual(validateSchemaVersionDraft(draft), []);
});

test("rejects duplicate field codes and invalid versions", () => {
  const issues = validateSchemaVersionDraft({
    ...draft,
    version: "v1",
    fields: [ratedCapacity, ratedCapacity],
  });
  assert.ok(issues.some((issue) => issue.code === "INVALID_SCHEMA_VERSION"));
  assert.ok(issues.some((issue) => issue.code === "DUPLICATE_FIELD_CODE"));
});

test("allows only forward Schema lifecycle transitions", () => {
  assert.equal(canTransitionSchemaVersion("draft", "published"), true);
  assert.equal(canTransitionSchemaVersion("published", "retired"), true);
  assert.equal(canTransitionSchemaVersion("retired", "draft"), false);
  assert.equal(canTransitionSchemaVersion("published", "draft"), false);
});

test("projects fields by audience access level", () => {
  assert.equal(canReadField("PUBLIC", "LEGITIMATE_INTEREST"), false);
  assert.equal(canReadField("AUTHORITY_ONLY", "LEGITIMATE_INTEREST"), true);
  assert.equal(canReadField("INTERNAL", "AUTHORITY_ONLY"), true);
});

test("resolves the highest-priority matching applicability rule", () => {
  const status = resolveRequirementStatus(
    ratedCapacity,
    [
      {
        fieldCode: ratedCapacity.fieldCode,
        conditions: [{ field: "category", operator: "equals", value: "portable" }],
        result: "NOT_APPLICABLE",
        priority: 10,
      },
      {
        fieldCode: ratedCapacity.fieldCode,
        conditions: [{ field: "category", operator: "in", value: ["lmt", "ev"] }],
        result: "CONFIRMED_MANDATORY",
        priority: 20,
      },
    ],
    { category: "lmt" },
  );
  assert.equal(status, "CONFIRMED_MANDATORY");
});
