import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("evidence upload is product-authorised, immutable, hashed, and field-link capable", async () => {
  const route = await readFile("app/api/internal/dpp-files/route.ts", "utf8");
  const repository = await readFile("lib/server/dppFileRepository.ts", "utf8");

  assert.match(route, /requireAuthenticatedUser/);
  assert.match(route, /requireProductEditorAccess/);
  assert.match(route, /productId/);
  assert.match(repository, /createHash\("sha256"\)/);
  assert.match(repository, /upsert:\s*false/);
  assert.match(repository, /randomUUID\(\)/);
  assert.match(repository, /greanlean_append_file_version/);
  assert.match(repository, /greanlean_link_file_evidence/);
  assert.match(repository, /verification_status_value:\s*"PENDING"/);
  assert.match(repository, /listDppFileAssets/);
  assert.match(route, /export const GET/);
  assert.match(route, /fieldLinks/);
  const unsafePublicSecretName = new RegExp(
    ["NEXT", "PUBLIC", "SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
  );
  assert.doesNotMatch(route, unsafePublicSecretName);
});

test("evidence download resolves access, audits the decision, and signs briefly", async () => {
  const route = await readFile("app/api/dpp-files/[versionId]/route.ts", "utf8");
  const repository = await readFile("lib/server/dppFileRepository.ts", "utf8");

  assert.match(route, /createDppFileDownload/);
  assert.match(repository, /greanlean_product_access_level/);
  assert.match(repository, /dpp_access_audit/);
  assert.match(repository, /createSignedUrl\(version\.object_path,\s*60/);
  assert.match(repository, /productIsPublic\s*\|\|\s*grantedLevel === "INTERNAL"/);
  assert.doesNotMatch(repository, /getPublicUrl/);
});

test("backoffice evidence state comes from real file links rather than manual selectors", async () => {
  const editor = await readFile("components/ProductEditor.tsx", "utf8");
  const manager = await readFile("components/EvidenceFileManager.tsx", "utf8");
  const battery = await readFile("components/battery/BatteryDppWorkspace.tsx", "utf8");
  const repository = await readFile("lib/server/batteryRepository.ts", "utf8");
  const publication = await readFile("lib/server/dppPublicationCandidate.ts", "utf8");

  assert.match(editor, /EvidenceFileManager/);
  assert.match(manager, /SHA-256/);
  assert.match(manager, /fieldLinks/);
  assert.doesNotMatch(battery, /onChange=.*evidenceStatus/);
  assert.doesNotMatch(battery, /onChange=.*verificationStatus/);
  assert.match(repository, /applyEvidenceLinks/);
  assert.match(publication, /fileVerificationByVersion/);
  assert.doesNotMatch(
    publication,
    /verificationStatus:\s*verificationStatus\(\s*version\.checksum_sha256\s*\?\s*"VERIFIED"/,
  );
});

test("generic lifecycle writes are internal and append through the database function", async () => {
  const route = await readFile("app/api/internal/dpp-lifecycle/route.ts", "utf8");
  const repository = await readFile("lib/server/dppFileRepository.ts", "utf8");

  assert.match(route, /requireDppInternalUser/);
  assert.match(repository, /greanlean_append_lifecycle_event/);
  assert.match(repository, /previous_event_hash_value/);
});
