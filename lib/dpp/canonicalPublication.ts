import type { AccessLevel } from "../schemaRegistry.ts";

export const CANONICAL_MODULE_CODES = [
  "identity",
  "materials",
  "environment",
  "performance",
  "sector",
  "traceability",
  "evidence",
  "circularity",
  "lifecycle",
] as const;

export type CanonicalModuleCode = (typeof CANONICAL_MODULE_CODES)[number];
export type CanonicalApplicability = "APPLICABLE" | "NOT_APPLICABLE" | "TO_BE_CONFIRMED";
export type CanonicalVerificationStatus =
  | "MISSING"
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "DEVICE_REPORTED"
  | "MANUALLY_VERIFIED";

export type LocalizedText = {
  zh?: string | null;
  en?: string | null;
};

export type CanonicalSourceRecord = {
  table: string;
  id?: string | null;
  column?: string | null;
};

export type CanonicalField = {
  code: string;
  value: unknown;
  unit?: string | null;
  display?: LocalizedText;
  label: LocalizedText;
  accessLevel: AccessLevel;
  applicability: CanonicalApplicability;
  verificationStatus: CanonicalVerificationStatus;
  sourceType: string;
  sourceRecord?: CanonicalSourceRecord;
  evidenceIds: string[];
  observedAt?: string | null;
  updatedAt?: string | null;
};

export type CanonicalRecord = {
  id: string;
  recordType: string;
  accessLevel: AccessLevel;
  fields: CanonicalField[];
};

export type CanonicalModule = {
  code: CanonicalModuleCode;
  fields: CanonicalField[];
  records: CanonicalRecord[];
};

export type CanonicalEvidence = {
  id: string;
  evidenceType: string;
  title: LocalizedText;
  accessLevel: AccessLevel;
  verificationStatus: CanonicalVerificationStatus;
  fileVersionId?: string | null;
  fileVersion?: string | null;
  hash?: string | null;
  hashAlgorithm?: string | null;
  url?: string | null;
  sourceRecord?: CanonicalSourceRecord;
};

export type CanonicalPublicationSnapshot = {
  schema: string;
  schemaVersion: string;
  publication: {
    publicationId: string | null;
    productId: string;
    dppId: string;
    version: number | null;
    status: "DRAFT" | "IN_REVIEW" | "PUBLISHED";
    publishedAt: string | null;
    publishedBy: string | null;
    supersedesPublicationId: string | null;
    languageCoverage: Array<"zh" | "en">;
    subjectType?: "PRODUCT" | "BATTERY_ITEM";
    subjectPublicKey?: string | null;
  };
  classification: {
    sectorCode: string;
    profileKey: string;
    profileVersion: string;
    productGranularity: string;
  };
  modules: Record<CanonicalModuleCode, CanonicalModule>;
  evidenceIndex: CanonicalEvidence[];
  audienceManifest: Record<AccessLevel, {
    fieldCount: number;
    evidenceCount: number;
  }>;
  governance: {
    sourceFingerprint: string;
    generatedAt: string;
    generatedBy?: string | null;
    sourceTables?: string[];
    dynamicDataPolicy: {
      includedInSnapshot: false;
      projection: "AUTHORIZED_RUNTIME";
      applicable: boolean;
    };
  };
  integrity: {
    algorithm: "SHA-256";
    canonicalization: "JCS";
    digest: string;
    generatedAt: string;
    anchorStatus: "NOT_CONFIGURED";
  };
};

const ACCESS_RANK: Record<AccessLevel, number> = {
  PUBLIC: 0,
  LEGITIMATE_INTEREST: 1,
  AUTHORITY_ONLY: 2,
  INTERNAL: 3,
};

export function normalizeAccessLevel(value: unknown): AccessLevel {
  const normalized = String(value || "PUBLIC").trim().toUpperCase();
  if (normalized === "PROFESSIONAL" || normalized === "RESTRICTED") {
    return "LEGITIMATE_INTEREST";
  }
  if (normalized === "AUTHORITY") return "AUTHORITY_ONLY";
  if (normalized in ACCESS_RANK) return normalized as AccessLevel;
  return "PUBLIC";
}

export function canProjectAccess(viewer: AccessLevel, required: AccessLevel) {
  return ACCESS_RANK[viewer] >= ACCESS_RANK[required];
}

function projectField(
  field: CanonicalField,
  audience: AccessLevel,
): CanonicalField | null {
  if (!canProjectAccess(audience, field.accessLevel)) return null;
  if (audience === "INTERNAL" || audience === "AUTHORITY_ONLY") return field;
  const { sourceRecord: _sourceRecord, ...projected } = field;
  return projected;
}

function projectModule(
  module: CanonicalModule,
  audience: AccessLevel,
): CanonicalModule {
  return {
    ...module,
    fields: module.fields.flatMap((field) => {
      const projected = projectField(field, audience);
      return projected ? [projected] : [];
    }),
    records: module.records.flatMap((record) => {
      if (!canProjectAccess(audience, record.accessLevel)) return [];
      const fields = record.fields.flatMap((field) => {
        const projected = projectField(field, audience);
        return projected ? [projected] : [];
      });
      if (!fields.length) return [];
      return [{ ...record, fields }];
    }),
  };
}

export function projectCanonicalPublication(
  snapshot: CanonicalPublicationSnapshot,
  audience: AccessLevel,
): CanonicalPublicationSnapshot {
  const modules = Object.fromEntries(
    CANONICAL_MODULE_CODES.map((code) => [
      code,
      projectModule(snapshot.modules[code], audience),
    ]),
  ) as Record<CanonicalModuleCode, CanonicalModule>;

  const evidenceIndex = snapshot.evidenceIndex
    .filter((evidence) => canProjectAccess(audience, evidence.accessLevel))
    .map((evidence) => {
      if (audience === "INTERNAL" || audience === "AUTHORITY_ONLY") return evidence;
      const { sourceRecord: _sourceRecord, ...projected } = evidence;
      return projected;
    });
  const {
    generatedBy: _generatedBy,
    sourceTables: _sourceTables,
    ...publicGovernance
  } = snapshot.governance;

  return {
    ...snapshot,
    modules,
    evidenceIndex,
    audienceManifest: {
      [audience]: snapshot.audienceManifest[audience],
    } as CanonicalPublicationSnapshot["audienceManifest"],
    governance: audience === "INTERNAL"
      ? snapshot.governance
      : publicGovernance,
  };
}

export function countProjectionContent(
  modules: Record<CanonicalModuleCode, CanonicalModule>,
  evidenceIndex: CanonicalEvidence[],
) {
  const fieldCount = CANONICAL_MODULE_CODES.reduce((total, code) => {
    const module = modules[code];
    return total
      + module.fields.length
      + module.records.reduce((recordTotal, record) => recordTotal + record.fields.length, 0);
  }, 0);
  return { fieldCount, evidenceCount: evidenceIndex.length };
}
