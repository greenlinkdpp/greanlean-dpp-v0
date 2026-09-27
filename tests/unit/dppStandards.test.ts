import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { EU_DPP_STANDARDS_BASELINE, dppStandardsReadiness } from "../../lib/dppStandards.ts";

test("tracks all six harmonised DPP standards from Decision 2026/1736", () => {
  assert.equal(EU_DPP_STANDARDS_BASELINE.standards.length, 6);
  assert.deepEqual(
    EU_DPP_STANDARDS_BASELINE.standards.map((standard) => standard.reference),
    ["EN 18216:2026", "EN 18219:2026", "EN 18220:2026", "EN 18221:2026", "EN 18222:2026", "EN 18223:2026"],
  );
  assert.equal(new Set(EU_DPP_STANDARDS_BASELINE.standards.map((standard) => standard.reference)).size, 6);
});

test("does not permit a standards-conformity claim while reviews and gaps remain open", () => {
  const readiness = dppStandardsReadiness();
  assert.deepEqual(readiness, {
    total: 6,
    verified: 0,
    partial: 6,
    notAssessed: 0,
    openGaps: 18,
    conformityClaimAllowed: false,
  });
});

test("every standards assessment points to inspectable repository evidence", async () => {
  for (const standard of EU_DPP_STANDARDS_BASELINE.standards) {
    assert.ok(standard.evidence.length > 0);
    assert.ok(standard.gaps.length > 0);
    for (const evidencePath of standard.evidence) await access(evidencePath);
  }
});
