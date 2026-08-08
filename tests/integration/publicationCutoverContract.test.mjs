import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public and authorised reads prefer the gated canonical publication", async () => {
  const repository = await readFile("lib/dpp/publicDppRepository.ts", "utf8");
  const access = await readFile("lib/server/dppAccess.ts", "utf8");
  assert.match(repository, /greanlean_public_canonical_dpp_snapshot/);
  assert.match(repository, /canonicalPublicationToLegacyDpp/);
  assert.match(access, /greanlean_authorized_canonical_dpp_snapshot/);
  assert.match(access, /greanlean_authorized_dpp_snapshot/);
});

test("publication workflow enforces candidate, validation, approval, and immutable publish", async () => {
  const workflow = await readFile("lib/server/dppPublicationWorkflow.ts", "utf8");
  const route = await readFile(
    "app/api/internal/dpp-publications/[productId]/candidate/route.ts",
    "utf8",
  );
  assert.match(workflow, /greanlean_create_publication_review/);
  assert.match(workflow, /greanlean_record_publication_validation/);
  assert.match(workflow, /greanlean_decide_publication_review/);
  assert.match(workflow, /greanlean_publish_final_approved_review/);
  assert.match(workflow, /PUBLICATION_SOURCE_CHANGED_AFTER_REVIEW/);
  assert.match(route, /submitReview/);
  assert.match(route, /decideReview/);
  assert.match(route, /publishReview/);
});

test("publication review submission is idempotent for the same candidate", async () => {
  const workflow = await readFile("lib/server/dppPublicationWorkflow.ts", "utf8");
  assert.match(workflow, /async function openReview/);
  assert.match(workflow, /reviewResult\.error\?\.code === "23505"/);
  assert.match(workflow, /existing\.source_fingerprint === candidate\.sourceFingerprint/);
  assert.match(workflow, /OPEN_PUBLICATION_REVIEW_SOURCE_CHANGED/);
});

test("Registry mappings bind new records to canonical publication ids", async () => {
  const repository = await readFile("lib/server/registryRepository.ts", "utf8");
  assert.match(repository, /dpp_product_publication_pointer/);
  assert.match(repository, /publication_id:\s*source\.publicationId/);
  assert.match(repository, /product_version_id:\s*source\.productVersionId/);
});
