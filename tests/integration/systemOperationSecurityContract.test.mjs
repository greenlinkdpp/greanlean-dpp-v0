import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const managedEditors = [
  "components/ProductEditor.tsx",
  "components/ProductManager.tsx",
  "components/ProductRelatedManager.tsx",
  "components/SectorFieldManager.tsx",
  "components/SimpleInsertManager.tsx",
  "components/SupplierProductManager.tsx",
  "components/DppImportManager.tsx",
];

test("backoffice product editors use the authenticated server write boundary", async () => {
  for (const file of managedEditors) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /\.from\([^)]*\)\s*\.(insert|update|delete|upsert)\s*\(/,
      `${file} still writes directly with the browser Supabase client`,
    );
  }

  const route = await readFile("app/api/internal/data-write/route.ts", "utf8");
  const repository = await readFile("lib/server/internalDataWrite.ts", "utf8");
  assert.match(route, /requireAuthenticatedUser/);
  assert.match(route, /requireProductEditorAccess/);
  assert.match(route, /PRODUCT_SCOPE_REQUIRED/);
  assert.match(repository, /PRODUCT_SYSTEM_FIELD_NOT_WRITABLE/);
  assert.match(repository, /dpp_audit_logs/);
  assert.doesNotMatch(
    repository,
    /ALLOWED_TABLES[\s\S]{0,1200}dpp_(registry_submissions|registration_proofs|audit_logs|blockchain_anchors)/,
  );
});

test("draft saving cannot create publication history or editable system receipts", async () => {
  const editor = await readFile("components/ProductEditor.tsx", "utf8");
  assert.match(editor, /operation:\s*"update"/);
  assert.doesNotMatch(editor, /\.from\("product_versions"\)\.upsert/);
  assert.doesNotMatch(editor, /table="dpp_registry_submissions"/);
  assert.doesNotMatch(editor, /table="dpp_registration_proofs"/);
  assert.doesNotMatch(editor, /table="dpp_audit_logs"/);
  assert.doesNotMatch(editor, /table="dpp_blockchain_anchors"/);
  assert.doesNotMatch(editor, /transaction_hash\s*\|\|\s*`0x/);
});

test("Registry TEST adapter cannot record an accepted production result", async () => {
  const repository = await readFile("lib/server/registryRepository.ts", "utf8");
  assert.match(repository, /\["SUBMITTED",\s*"REJECTED",\s*"FAILED"\]/);
  assert.match(repository, /productionEnabled:\s*false/);
  assert.doesNotMatch(repository, /\["SUBMITTED",\s*"ACCEPTED"/);
});

test("blockchain anchoring requires a current publication and verified connector", async () => {
  const route = await readFile(
    "app/api/internal/dpp-integrity/[productId]/route.ts",
    "utf8",
  );
  const repository = await readFile("lib/server/dppIntegrityRepository.ts", "utf8");
  const manager = await readFile("components/DppIntegrationManager.tsx", "utf8");

  assert.match(route, /requireAuthenticatedUser/);
  assert.match(route, /requireDppInternalUser/);
  assert.match(repository, /PUBLISHED_DPP_REQUIRED/);
  assert.match(repository, /BLOCKCHAIN_CONNECTOR_NOT_CONFIGURED/);
  assert.match(repository, /greanlean_request_blockchain_anchor/);
  assert.doesNotMatch(repository, /randomUUID|transactionHash:\s*`?0x/);
  assert.match(manager, /!workspace\?\.activeConnector/);
  assert.match(manager, /锚定操作已禁用/);
});
