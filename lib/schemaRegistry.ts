export const ACCESS_LEVELS = [
  "PUBLIC",
  "LEGITIMATE_INTEREST",
  "AUTHORITY_ONLY",
  "INTERNAL",
] as const;

export const REQUIREMENT_STATUSES = [
  "CONFIRMED_MANDATORY",
  "CONDITIONAL_MANDATORY",
  "DRAFT_MANDATORY",
  "VOLUNTARY",
  "NOT_APPLICABLE",
  "TBD",
] as const;

export const SCHEMA_VERSION_STATUSES = ["draft", "published", "retired"] as const;
export const FIELD_DATA_TYPES = [
  "string",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "uri",
  "object",
  "array",
] as const;
export const DATA_BEHAVIORS = ["STATIC", "DYNAMIC"] as const;
export const DATA_GRANULARITIES = ["MODEL", "BATCH", "ITEM", "MODEL_YEAR_SITE", "MODEL_SITE"] as const;

export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];
export type SchemaVersionStatus = (typeof SCHEMA_VERSION_STATUSES)[number];
export type FieldDataType = (typeof FIELD_DATA_TYPES)[number];
export type DataBehavior = (typeof DATA_BEHAVIORS)[number];
export type DataGranularity = (typeof DATA_GRANULARITIES)[number];

export type FieldDefinition = {
  fieldCode: string;
  jsonPointer?: string | null;
  labelEn: string;
  labelZh: string;
  dataType: FieldDataType;
  dataBehavior: DataBehavior;
  dataGranularity: DataGranularity;
  accessLevel: AccessLevel;
  requirementStatus: RequirementStatus;
  unitCode?: string | null;
};

export type SchemaVersionDraft = {
  schemaCode: string;
  version: string;
  sourceVersion?: string | null;
  status: SchemaVersionStatus;
  jsonSchema: Record<string, unknown>;
  fields: FieldDefinition[];
};

export type ApplicabilityOperator = "equals" | "not_equals" | "in" | "not_in" | "exists";

export type ApplicabilityCondition = {
  field: string;
  operator: ApplicabilityOperator;
  value?: unknown;
};

export type ApplicabilityRule = {
  fieldCode: string;
  conditions: ApplicabilityCondition[];
  result: RequirementStatus;
  priority?: number;
};

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

const SEMANTIC_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const STABLE_CODE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

const accessCapabilities: Record<AccessLevel, ReadonlySet<AccessLevel>> = {
  PUBLIC: new Set<AccessLevel>(["PUBLIC"]),
  LEGITIMATE_INTEREST: new Set<AccessLevel>(["PUBLIC", "LEGITIMATE_INTEREST"]),
  AUTHORITY_ONLY: new Set<AccessLevel>(["PUBLIC", "LEGITIMATE_INTEREST", "AUTHORITY_ONLY"]),
  INTERNAL: new Set<AccessLevel>(ACCESS_LEVELS),
};

export function isSemanticVersion(value: string) {
  return SEMANTIC_VERSION.test(value);
}

export function canTransitionSchemaVersion(from: SchemaVersionStatus, to: SchemaVersionStatus) {
  if (from === to) return true;
  if (from === "draft") return to === "published" || to === "retired";
  return from === "published" && to === "retired";
}

export function canReadField(viewerAccess: AccessLevel, fieldAccess: AccessLevel) {
  return accessCapabilities[viewerAccess].has(fieldAccess);
}

function conditionMatches(condition: ApplicabilityCondition, context: Record<string, unknown>) {
  const actual = context[condition.field];
  switch (condition.operator) {
    case "equals":
      return actual === condition.value;
    case "not_equals":
      return actual !== condition.value;
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case "not_in":
      return Array.isArray(condition.value) && !condition.value.includes(actual);
    case "exists":
      return condition.value === false ? actual === undefined || actual === null : actual !== undefined && actual !== null;
  }
}

export function resolveRequirementStatus(
  field: Pick<FieldDefinition, "fieldCode" | "requirementStatus">,
  rules: ApplicabilityRule[],
  context: Record<string, unknown>,
) {
  const matchingRule = rules
    .filter((rule) => rule.fieldCode === field.fieldCode)
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))
    .find((rule) => rule.conditions.every((condition) => conditionMatches(condition, context)));

  return matchingRule?.result ?? field.requirementStatus;
}

export function validateSchemaVersionDraft(draft: SchemaVersionDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!STABLE_CODE.test(draft.schemaCode)) {
    issues.push({ path: "schemaCode", code: "INVALID_SCHEMA_CODE", message: "Use a stable lowercase schema code." });
  }
  if (!isSemanticVersion(draft.version)) {
    issues.push({ path: "version", code: "INVALID_SCHEMA_VERSION", message: "Use semantic versioning such as 1.0.0." });
  }
  if (!draft.jsonSchema || Array.isArray(draft.jsonSchema) || typeof draft.jsonSchema !== "object") {
    issues.push({ path: "jsonSchema", code: "INVALID_JSON_SCHEMA", message: "JSON Schema must be an object." });
  }

  const seen = new Set<string>();
  draft.fields.forEach((field, index) => {
    const path = `fields[${index}]`;
    if (!STABLE_CODE.test(field.fieldCode)) {
      issues.push({ path: `${path}.fieldCode`, code: "INVALID_FIELD_CODE", message: "Use a stable lowercase field code." });
    }
    if (seen.has(field.fieldCode)) {
      issues.push({ path: `${path}.fieldCode`, code: "DUPLICATE_FIELD_CODE", message: "Field codes must be unique in a Schema version." });
    }
    seen.add(field.fieldCode);
    if (field.jsonPointer && !field.jsonPointer.startsWith("/")) {
      issues.push({ path: `${path}.jsonPointer`, code: "INVALID_JSON_POINTER", message: "JSON Pointer must start with /." });
    }
    if (!field.labelEn.trim() || !field.labelZh.trim()) {
      issues.push({ path, code: "MISSING_BILINGUAL_LABEL", message: "Both English and Chinese labels are required." });
    }
  });

  if (draft.status === "published" && draft.fields.length === 0) {
    issues.push({ path: "fields", code: "EMPTY_PUBLISHED_SCHEMA", message: "A published Schema version must define fields." });
  }
  return issues;
}
