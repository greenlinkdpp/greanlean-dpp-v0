import { safeFingerprint } from "./connectorSecurity.ts";

export type ExternalAdapterKind = "ERP" | "MES" | "PLM";
export type ExternalRecord = {
  kind: ExternalAdapterKind;
  externalId: string;
  updatedAt: string;
  cursor?: string;
  subjectType: "MODEL" | "BATCH" | "ITEM";
  subjectId?: string;
  payload: Record<string, unknown>;
};

export interface IncrementalAdapter {
  listChanged(cursor?: string, watermark?: string): Promise<{ records: ExternalRecord[]; cursor?: string; watermark?: string }>;
  fetchByExternalId(externalId: string): Promise<ExternalRecord | null>;
}

export const ERP_CONTRACT = ["product", "material", "externalIdentifiers", "updatedAt", "cursor"] as const;
export const MES_CONTRACT = ["model", "batch", "item", "productionEvent", "manufacturingDate", "serial", "inspectionReference"] as const;
export const PLM_CONTRACT = ["productModel", "bomReference", "properties", "documentReference", "revision", "effectiveDate"] as const;

export function reconcileExternalRecord(previousHash: string | null, incoming: ExternalRecord, manualConflictFields: string[] = []) {
  const hash = safeFingerprint(JSON.stringify(incoming.payload));
  if (manualConflictFields.length) return { state: "CONFLICT" as const, hash, conflicts: manualConflictFields };
  if (!previousHash) return { state: "NEW" as const, hash, conflicts: [] };
  if (previousHash === hash) return { state: "UNCHANGED" as const, hash, conflicts: [] };
  return { state: "CHANGED" as const, hash, conflicts: [] };
}

export type ImportMappingRule = { source: string; targetFieldCode: string };

function pointerValue(record: Record<string, unknown>, pointer: string) {
  return pointer.replace(/^\//, "").split("/").filter(Boolean).reduce<unknown>((value, part) => {
    return value && typeof value === "object" ? (value as Record<string, unknown>)[part.replace(/~1/g, "/").replace(/~0/g, "~")] : undefined;
  }, record);
}

export function mappingDryRun(records: Record<string, unknown>[], rules: ImportMappingRule[]) {
  if (!rules.length) throw new Error("IMPORT_MAPPING_REQUIRED");
  const known = new Set(rules.map((rule) => rule.source.replace(/^\//, "").split("/", 1)[0]));
  const unknown = Array.from(new Set(records.flatMap((record) => Object.keys(record).filter((key) => !known.has(key))))).sort();
  const outputs = records.map((record) => Object.fromEntries(rules.flatMap((rule) => {
    const value = pointerValue(record, rule.source);
    return value === undefined ? [] : [[rule.targetFieldCode, value]];
  })));
  return { outputs, unmappedFields: unknown, status: unknown.length ? "WARNING" as const : "PASS" as const };
}

export function parseImportFile(format: "CSV" | "JSON", content: string) {
  if (format === "JSON") {
    const parsed = JSON.parse(content);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    if (!rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) throw new Error("CONNECTOR_CONFIG_INVALID");
    return rows as Record<string, unknown>[];
  }
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const parseLine = (line: string) => line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(parseLine(line).map((value, index) => [headers[index], value])));
}
