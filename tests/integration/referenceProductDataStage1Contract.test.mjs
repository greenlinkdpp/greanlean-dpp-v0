import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const install = await readFile(
  "supabase/bundles/reference_product_data_stage1_install.sql",
  "utf8",
);
const verify = await readFile(
  "supabase/bundles/reference_product_data_stage1_verify.sql",
  "utf8",
);

test("stage 1 data normalisation is transactional and targets only reference products", () => {
  assert.match(install, /\bbegin;/i);
  assert.match(install, /\bcommit;/i);
  for (const dppId of [
    "DPP-LMT-BAT-48V15AH",
    "DPP-GV-ESS-14K3-000001",
    "DPP-CE-EARBUDS-001",
  ]) {
    assert.match(install, new RegExp(dppId));
  }
  assert.doesNotMatch(install, /\bdelete\s+from\b/i);
});

test("industrial battery values remain explicitly unverified", () => {
  assert.match(install, /REFERENCE_DATA_UNVERIFIED/g);
  assert.match(install, /verification_status\s*=\s*'unverified'/i);
  assert.match(install, /'declared',\s*'unverified'/i);
  assert.doesNotMatch(install, /SYNTHETIC_DEMO/);
});

test("verification checks completeness, wording and false assurance claims", () => {
  assert.match(verify, /four_reference_products_passed/);
  assert.match(verify, /ess_static_data_passed/);
  assert.match(verify, /no_public_facing_test_wording_passed/);
  assert.match(verify, /no_false_ess_verification_claim_passed/);
});
