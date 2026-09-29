import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertNoExternalNaturalKeyCollisions, netMutationPlan, validateManagedBackupEvidence } from "../../scripts/phase7/internal-reference-safety.mjs";

const wrapper = await readFile("scripts/phase7/build-internal-reference-production-pilot.mjs", "utf8");
const core = await readFile("scripts/phase7/internal-reference-confirmed-write-core.mjs", "utf8");
const safety = await readFile("scripts/phase7/internal-reference-safety.mjs", "utf8");

test("Production writes require the one explicit confirmation argument and exact environment", () => {
  assert.match(wrapper, /--confirm-internal-reference-production-pilot/u);
  assert.match(wrapper, /DPP_ENVIRONMENT/u);
  assert.match(wrapper, /lpxdbysgmdsjhxrjzhly/u);
  assert.match(wrapper, /DPP_APPROVED_RC_COMMIT/u);
  assert.match(wrapper, /DPP_APPROVED_RC_TREE/u);
  assert.doesNotMatch(wrapper, /WRITE MODE LOCKED/u);
});

test("fresh managed backup gate is hard and checked before shared Production orchestration", () => {
  const backupAt = wrapper.indexOf("DPP_MANAGED_BACKUP_EVIDENCE_FILE");
  const runAt = wrapper.lastIndexOf('runCore("PRODUCTION_CONFIRMED")');
  assert.ok(backupAt > 0 && runAt > backupAt);
  assert.match(wrapper, /validateManagedBackupEvidence/u);
  assert.match(safety, /backup\?\.projectRef !== expectedProjectRef/u);
  assert.match(safety, /String\(backup\?\.status\)\.toUpperCase\(\) !== "COMPLETED"/u);
  assert.match(safety, /24 \* 60 \* 60 \* 1000/u);
});

test("PreProd verification invokes the same confirmed-write core in an isolated namespace", () => {
  assert.match(wrapper, /--verify-confirmed-write-in-preprod/u);
  assert.match(wrapper, /runCore\("PREPROD_WRITE_VERIFICATION"/u);
  assert.match(core, /greanlean-reference-write-verification/u);
  assert.match(core, /INTERNAL_SYNTHETIC_WRITE_VERIFICATION/u);
  assert.match(core, /--stop-after-hierarchy/u);
});

test("confirmed write uses Mapping, review, approval and publication APIs without immutable-version inserts", () => {
  assert.match(core, /mapping-versions\/\$\{mapping\.id\}\/dry-run/u);
  assert.match(core, /mapping-versions\/\$\{mapping\.id\}\/commit/u);
  assert.match(core, /passport-reviews/u);
  assert.match(core, /\/approve/u);
  assert.match(core, /\/api\/v2\/publications/u);
  assert.doesNotMatch(core, /insert\("dpp_version"/u);
  assert.doesNotMatch(core, /insert\("dpp_current_pointer"/u);
});

test("Resolver host is environment-specific and V2 Primary remains outside onboarding", () => {
  assert.match(core, /greanlean-dpp-preprod\.vercel\.app/u);
  assert.match(core, /www\.greanlean\.com/u);
  assert.match(core, /resolverHost/u);
  assert.doesNotMatch(core, /FEATURE_V2_[A-Z_]+\s*=\s*(?:"|')?true/u);
  assert.doesNotMatch(core, /registry-submissions/u);
});

test("backup, collision and net-plan guards fail closed", () => {
  const nowMs = Date.parse("2026-09-29T00:00:00.000Z");
  assert.deepEqual(validateManagedBackupEvidence({ projectRef: "prod", status: "COMPLETED", completedAt: "2026-09-28T12:00:00.000Z", reference: "backup-1" }, { expectedProjectRef: "prod", nowMs }), {
    reference: "backup-1",
    completedAt: "2026-09-28T12:00:00.000Z",
    ageMs: 12 * 60 * 60 * 1000,
  });
  assert.throws(() => validateManagedBackupEvidence({ projectRef: "prod", status: "COMPLETED", completedAt: "2026-09-27T00:00:00.000Z", reference: "stale" }, { expectedProjectRef: "prod", nowMs }), /older than 24 hours/u);
  assert.throws(() => assertNoExternalNaturalKeyCollisions({ sku: [{ tenant_id: "foreign" }] }, "reference"), /external sku collision/u);
  assert.deepEqual(netMutationPlan({ models: 8, passports: 22 }, { models: 8, passports: 0 }), { models: 0, passports: 22 });
  assert.throws(() => netMutationPlan({ models: 8 }, { models: 9 }), /exceeds the approved topology/u);
});
