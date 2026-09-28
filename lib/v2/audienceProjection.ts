export type DppAudience = "PUBLIC" | "LEGITIMATE_INTEREST" | "AUTHORITY" | "INTERNAL";
export type FieldClassification = "PUBLIC" | "LEGITIMATE_INTEREST" | "AUTHORITY_ONLY" | "INTERNAL";

export type PublishedField = {
  fieldCode: string;
  value: unknown;
  unit?: string | null;
  accessLevel: FieldClassification;
  semanticUri?: string | null;
  vocabularyReference?: string | null;
  verificationStatus?: string | null;
  provenance?: {
    sourceStatement?: string | null;
    publicEvidenceReference?: string | null;
    rawSourceRecord?: unknown;
    internalFilePath?: string | null;
    reviewer?: string | null;
    [key: string]: unknown;
  } | null;
};

export type ImmutableDppPayload = {
  passportId: string;
  passportIdentifier: string;
  versionNumber: number;
  schemaVersionId: string;
  candidateHash: string;
  payloadHash?: string;
  publishedAt: string;
  publicationStatus: string;
  subject: { type: string; id: string };
  fields: PublishedField[];
  [key: string]: unknown;
};

export const SYNTHETIC_DEMO_NOTICES = [
  "SYNTHETIC DEMO DATA",
  "NOT CUSTOMER VERIFIED",
  "NOT FOR REGULATORY DECLARATION",
] as const;

export function isSyntheticDemoPayload(payload: ImmutableDppPayload) {
  const warning = payload.fields.find((field) => field.fieldCode === "demo.warning")?.value;
  return Boolean(warning && JSON.stringify(warning).includes("SYNTHETIC_DEMO"));
}

export function provenanceSourceStatement(verificationStatus?: string | null) {
  const status = String(verificationStatus || "UNVERIFIED").toUpperCase();
  return `Source provenance retained; verification status: ${status}.`;
}

const CLASSIFICATION_RANK: Record<FieldClassification, number> = {
  PUBLIC: 0,
  LEGITIMATE_INTEREST: 1,
  AUTHORITY_ONLY: 2,
  INTERNAL: 3,
};

const AUDIENCE_RANK: Record<DppAudience, number> = {
  PUBLIC: 0,
  LEGITIMATE_INTEREST: 1,
  AUTHORITY: 2,
  INTERNAL: 3,
};

function safeProvenance(field: PublishedField, audience: DppAudience) {
  if (!field.provenance) return undefined;
  const safe = {
    ...(field.provenance.sourceStatement ? { sourceStatement: field.provenance.sourceStatement } : {}),
    ...(field.verificationStatus ? { verificationStatus: field.verificationStatus } : {}),
    ...(field.provenance.publicEvidenceReference
      ? { publicEvidenceReference: field.provenance.publicEvidenceReference }
      : {}),
  };
  if (audience !== "INTERNAL") return Object.keys(safe).length ? safe : undefined;
  const { reviewer: _reviewer, internalFilePath: _path, rawSourceRecord: _raw, ...internalSafe } = field.provenance;
  return { ...internalSafe, ...safe };
}

export function projectImmutableDpp(payload: ImmutableDppPayload, audience: DppAudience) {
  const rank = AUDIENCE_RANK[audience];
  return {
    passportId: payload.passportId,
    passportIdentifier: payload.passportIdentifier,
    version: payload.versionNumber,
    schemaVersion: payload.schemaVersionId,
    payloadHash: payload.payloadHash || null,
    publishedAt: payload.publishedAt,
    status: payload.publicationStatus,
    subject: payload.subject,
    audience,
    projectionVersion: "phase4-projection-v1",
    fields: payload.fields
      .filter((field) => rank >= CLASSIFICATION_RANK[field.accessLevel])
      .map((field) => ({
        fieldCode: field.fieldCode,
        value: field.value,
        unit: field.unit || null,
        ...(field.semanticUri ? { semanticUri: field.semanticUri } : {}),
        ...(field.vocabularyReference ? { vocabularyReference: field.vocabularyReference } : {}),
        ...(field.verificationStatus ? { verificationStatus: field.verificationStatus } : {}),
        ...(safeProvenance(field, audience) ? { provenance: safeProvenance(field, audience) } : {}),
      })),
  };
}
