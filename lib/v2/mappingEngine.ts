import { canonicalHash } from "../server/dppCanonicalization.ts";

export type TransformType =
  | "IDENTITY"
  | "TRIM"
  | "CASE_NORMALIZE"
  | "NUMBER_PARSE"
  | "DATE_PARSE"
  | "UNIT_CONVERT"
  | "ENUM_MAP"
  | "JOIN"
  | "SPLIT"
  | "REFERENCE_LOOKUP";

export type MappingRuleInput = {
  id?: string;
  source_pointer: string;
  field_code: string;
  field_definition_id: string;
  canonical_unit?: string | null;
  source_unit?: string | null;
  transform_type: TransformType;
  transform_config?: Record<string, unknown>;
  null_policy?: "SKIP" | "UNKNOWN" | "CLEAR" | "ERROR";
  lossiness?: "LOSSLESS" | "LOSSY" | "UNKNOWN";
};

export type MappingFieldResult = {
  fieldCode: string;
  fieldDefinitionId: string;
  sourcePointer: string;
  originalValue: unknown;
  sourceUnit: string | null;
  value: unknown;
  canonicalUnit: string | null;
  resolutionState: "OVERRIDE" | "UNKNOWN" | "CLEAR";
  conversionVersion: string | null;
  lossiness: "LOSSLESS" | "LOSSY" | "UNKNOWN";
};

const UNIT_CONVERSIONS: Record<string, { dimension: string; factor: number }> = {
  mah: { dimension: "capacity", factor: 0.001 },
  ah: { dimension: "capacity", factor: 1 },
  wh: { dimension: "energy", factor: 0.001 },
  kwh: { dimension: "energy", factor: 1 },
  g: { dimension: "mass", factor: 0.001 },
  kg: { dimension: "mass", factor: 1 },
};

export function readJsonPointer(payload: unknown, pointer: string): unknown {
  if (pointer === "") return payload;
  if (!pointer.startsWith("/")) throw new Error("MAPPING_POINTER_INVALID");
  return pointer.slice(1).split("/").reduce<unknown>((current, token) => {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
    return (current as Record<string, unknown>)[key];
  }, payload);
}

export function convertUnit(value: number, sourceUnit: string, canonicalUnit: string) {
  const source = UNIT_CONVERSIONS[sourceUnit.trim().toLowerCase()];
  const target = UNIT_CONVERSIONS[canonicalUnit.trim().toLowerCase()];
  if (!source || !target || source.dimension !== target.dimension) {
    throw new Error("UNIT_NOT_COMPATIBLE");
  }
  return value * source.factor / target.factor;
}

function numberValue(value: unknown) {
  const result = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(result)) throw new Error("TRANSFORMATION_FAILED");
  return result;
}

export function transformValue(rule: MappingRuleInput, originalValue: unknown): MappingFieldResult {
  const config = rule.transform_config || {};
  let value = originalValue;
  let conversionVersion: string | null = null;
  switch (rule.transform_type) {
    case "IDENTITY": break;
    case "TRIM": value = String(value).trim(); break;
    case "CASE_NORMALIZE":
      value = String(value).trim()[config.case === "lower" ? "toLowerCase" : "toUpperCase"]();
      break;
    case "NUMBER_PARSE": value = numberValue(value); break;
    case "DATE_PARSE": {
      const timestamp = Date.parse(String(value));
      if (Number.isNaN(timestamp)) throw new Error("TRANSFORMATION_FAILED");
      value = new Date(timestamp).toISOString().slice(0, 10);
      break;
    }
    case "UNIT_CONVERT":
      if (!rule.source_unit || !rule.canonical_unit) throw new Error("UNIT_NOT_COMPATIBLE");
      value = convertUnit(numberValue(value), rule.source_unit, rule.canonical_unit);
      conversionVersion = String(config.conversionVersion || "builtin-units-v1");
      if (typeof config.precision === "number") value = Number((value as number).toFixed(config.precision));
      break;
    case "ENUM_MAP": {
      const values = (config.values || {}) as Record<string, unknown>;
      if (!(String(value) in values)) throw new Error("TRANSFORMATION_FAILED");
      value = values[String(value)];
      break;
    }
    case "JOIN":
      if (!Array.isArray(value)) throw new Error("TRANSFORMATION_FAILED");
      value = value.join(String(config.separator ?? ","));
      break;
    case "SPLIT": value = String(value).split(String(config.separator ?? ",")); break;
    case "REFERENCE_LOOKUP": {
      const values = (config.values || {}) as Record<string, unknown>;
      if (!(String(value) in values)) throw new Error("TRANSFORMATION_FAILED");
      value = values[String(value)];
      break;
    }
    default: throw new Error("TRANSFORMATION_FAILED");
  }
  return {
    fieldCode: rule.field_code,
    fieldDefinitionId: rule.field_definition_id,
    sourcePointer: rule.source_pointer,
    originalValue,
    sourceUnit: rule.source_unit || null,
    value,
    canonicalUnit: rule.canonical_unit || null,
    resolutionState: "OVERRIDE",
    conversionVersion,
    lossiness: rule.lossiness || "LOSSLESS",
  };
}

export function dryRunMapping(payload: Record<string, unknown>, rules: MappingRuleInput[]) {
  const fields: MappingFieldResult[] = [];
  const warnings: Array<Record<string, unknown>> = [];
  const errors: Array<Record<string, unknown>> = [];
  const mappedTopLevel = new Set<string>();
  for (const rule of rules) {
    const topLevel = rule.source_pointer.split("/")[1]?.replace(/~1/g, "/").replace(/~0/g, "~");
    if (topLevel) mappedTopLevel.add(topLevel);
    const originalValue = readJsonPointer(payload, rule.source_pointer);
    if (originalValue === undefined || originalValue === null || originalValue === "") {
      const policy = rule.null_policy || "SKIP";
      if (policy === "SKIP") continue;
      if (policy === "ERROR") {
        errors.push({ code: "TRANSFORMATION_FAILED", sourcePointer: rule.source_pointer, reason: "NULL_NOT_ALLOWED" });
        continue;
      }
      fields.push({
        fieldCode: rule.field_code,
        fieldDefinitionId: rule.field_definition_id,
        sourcePointer: rule.source_pointer,
        originalValue,
        sourceUnit: rule.source_unit || null,
        value: null,
        canonicalUnit: rule.canonical_unit || null,
        resolutionState: policy,
        conversionVersion: null,
        lossiness: rule.lossiness || "LOSSLESS",
      });
      continue;
    }
    try {
      const result = transformValue(rule, originalValue);
      fields.push(result);
      if (result.lossiness === "LOSSY") {
        warnings.push({ code: "MAPPING_LOSSY", fieldCode: result.fieldCode, sourcePointer: result.sourcePointer });
      }
    } catch (error) {
      errors.push({
        code: error instanceof Error ? error.message : "TRANSFORMATION_FAILED",
        fieldCode: rule.field_code,
        sourcePointer: rule.source_pointer,
      });
    }
  }
  const unmappedFields = Object.keys(payload).filter((key) => !mappedTopLevel.has(key));
  if (unmappedFields.length) warnings.push({ code: "MAPPING_UNMAPPED_FIELD", fields: unmappedFields });
  const status = errors.length ? (fields.length ? "PARTIAL" : "FAILED") : "SUCCESS";
  const output = { status, fields, warnings, errors, unmappedFields };
  return { ...output, inputHash: canonicalHash(payload).hash, outputHash: canonicalHash(output).hash };
}
