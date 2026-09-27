import assert from "node:assert/strict";
import test from "node:test";

import { buildResolvedCandidate, resolveField, type ResolutionClaim, type ResolutionField } from "../../lib/v2/resolutionEngine.ts";

const generatedAt = "2026-09-25T12:00:00.000Z";
const hierarchy = { FAMILY: "family", MODEL: "model", SKU: "sku", BATCH: "batch", ITEM: "item" } as const;
const field: ResolutionField = {
  id: "field",
  fieldCode: "battery.ratedCapacity",
  subjectLevels: ["MODEL", "SKU", "BATCH", "ITEM"],
  required: true,
  canonicalUnit: "Ah",
  resolutionPolicy: "NO_AMBIGUITY_ALLOWED",
};
function claim(id: string, subjectType: ResolutionClaim["subjectType"], subjectId: string, value: unknown, resolutionState: ResolutionClaim["resolutionState"] = "OVERRIDE"): ResolutionClaim {
  return {
    id, subjectType, subjectId, fieldDefinitionId: "field", schemaVersionId: "schema",
    resolutionState, value, canonicalUnit: "Ah", provenanceId: "provenance-" + id,
    verificationStatus: "UNVERIFIED", effectiveFrom: "2026-01-01T00:00:00.000Z",
  };
}

test("resolution inherits Model, then allows SKU, Batch, and Item overrides", () => {
  assert.equal(resolveField({ field, hierarchy, generatedAt, claims: [claim("m", "MODEL", "model", 10), claim("i", "ITEM", "item", null, "INHERIT")] }).resolved?.value, 10);
  assert.equal(resolveField({ field, hierarchy, generatedAt, claims: [claim("m", "MODEL", "model", 10), claim("s", "SKU", "sku", 11)] }).resolved?.value, 11);
  assert.equal(resolveField({ field, hierarchy, generatedAt, claims: [claim("m", "MODEL", "model", 10), claim("b", "BATCH", "batch", 12)] }).resolved?.value, 12);
  assert.equal(resolveField({ field, hierarchy, generatedAt, claims: [claim("m", "MODEL", "model", 10), claim("i", "ITEM", "item", 13)] }).resolved?.value, 13);
});

test("CLEAR removes inheritance and required UNKNOWN blocks a Candidate", () => {
  const clear = resolveField({ field, hierarchy, generatedAt, claims: [claim("m", "MODEL", "model", 10), claim("i", "ITEM", "item", null, "CLEAR")] });
  assert.equal(clear.resolved?.resolutionState, "CLEAR");
  assert.equal(clear.resolved?.value, null);
  const candidate = buildResolvedCandidate({
    tenantId: "tenant", subjectType: "ITEM", subjectId: "item", schemaVersionId: "schema",
    hierarchy, fields: [field], claims: [claim("u", "ITEM", "item", null, "UNKNOWN")], generatedAt,
  });
  assert.equal(candidate.validationSummary.status, "BLOCKING");
  assert.equal(candidate.validationSummary.issues[0].code, "REQUIRED_VALUE_UNKNOWN");
  assert.equal(candidate.artifactType, "RESOLVED_PRODUCT_CANDIDATE");
});

test("SKU and Batch conflict unless an explicit policy resolves it", () => {
  const claims = [claim("s", "SKU", "sku", 11), claim("b", "BATCH", "batch", 12)];
  const conflict = resolveField({ field, hierarchy, claims, generatedAt });
  assert.equal(conflict.conflict?.code, "RESOLUTION_CONFLICT");
  const preferred = resolveField({ field: { ...field, resolutionPolicy: "BATCH_PREFERRED" }, hierarchy, claims, generatedAt });
  assert.equal(preferred.resolved?.value, 12);
  assert.equal((preferred.resolved?.warnings[0] as any).policy, "BATCH_PREFERRED");
});

test("superseded Claims remain input history but only the successor resolves", () => {
  const old = claim("old", "MODEL", "model", 10);
  const next = { ...claim("new", "MODEL", "model", 15), supersedesClaimId: "old" };
  const result = resolveField({ field, hierarchy, claims: [old, next], generatedAt });
  assert.equal(result.resolved?.claimId, "new");
  assert.equal(result.resolved?.value, 15);
});

test("Candidate hash is stable across generation time and separates Candidate from publication", () => {
  const input = { tenantId: "tenant", subjectType: "MODEL" as const, subjectId: "model", schemaVersionId: "schema", hierarchy, fields: [field], claims: [claim("m", "MODEL", "model", 10)] };
  const first = buildResolvedCandidate({ ...input, generatedAt: "2026-01-01T00:00:00.000Z" });
  const second = buildResolvedCandidate({ ...input, generatedAt: "2026-02-01T00:00:00.000Z" });
  assert.equal(first.candidateHash, second.candidateHash);
  assert.equal(first.artifactType, "RESOLVED_PRODUCT_CANDIDATE");
  assert.ok(!(first as any).publishedAt);
});

