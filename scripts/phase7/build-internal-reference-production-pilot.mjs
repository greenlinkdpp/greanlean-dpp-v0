import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertNoExternalNaturalKeyCollisions, netMutationPlan, validateManagedBackupEvidence } from "./internal-reference-safety.mjs";

const EXPECTED_PRODUCTION_REF = "lpxdbysgmdsjhxrjzhly";
const EXPECTED_PREPROD_REF = "efhiaufukjchxqhbmpvq";
const EXPECTED_FIXTURE_SHA256 = "018c60c9db81d621aa439d5f801d5aad2756d29be4762bb85d106b2735425222";
const EXPECTED_MIGRATION_HEAD = "0035";
const REFERENCE_TENANT_CODE = "greanlean-reference-mobility";
const VERIFICATION_TENANT_CODE = "greanlean-reference-write-verification";
const PRODUCTION_RESOLVER_HOST = "www.greanlean.com";
const CONFIRMATION_ARGUMENT = "--confirm-internal-reference-production-pilot";
const PREPROD_VERIFY_ARGUMENT = "--verify-confirmed-write-in-preprod";
const PREPROD_DRY_RUN_ARGUMENT = "--preprod-write-verification-dry-run";
const PREPROD_COLLISION_ARGUMENT = "--verify-collision-guards-in-preprod";
const PREPROD_ACCEPTANCE_ARGUMENT = "--verify-confirmed-write-backoffice-in-preprod";

const fixturePath = process.env.REFERENCE_FIXTURE_PATH
  || fileURLToPath(new URL("../../fixtures/internal-reference/GreanLean_Reference_Ebike_Catalog_From_EN50604.json", import.meta.url));
const corePath = fileURLToPath(new URL("./internal-reference-confirmed-write-core.mjs", import.meta.url));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/u).flatMap((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) return [];
    const at = line.indexOf("=");
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[line.slice(0, at).trim(), value]];
  }));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function enabled(value) {
  return ["1", "true", "yes", "on", "enabled"].includes(String(value || "").trim().toLowerCase());
}

function inFilter(values) {
  return `in.(${values.map((value) => `"${String(value).replaceAll('"', '\\"')}"`).join(",")})`;
}

function gitValue(argument) {
  const result = spawnSync("git", ["rev-parse", argument], { encoding: "utf8" });
  assert(result.status === 0, `REFUSED: cannot resolve Git ${argument}.`);
  return result.stdout.trim();
}

function runCore(targetMode, extraArguments = []) {
  const result = spawnSync(process.execPath, [corePath, "--execute-confirmed-write-core", ...extraArguments], {
    env: { ...process.env, INTERNAL_REFERENCE_TARGET_MODE: targetMode },
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const confirmationRequested = process.argv.includes(CONFIRMATION_ARGUMENT);
const preprodWriteVerification = process.argv.includes(PREPROD_VERIFY_ARGUMENT);
const preprodVerificationDryRun = process.argv.includes(PREPROD_DRY_RUN_ARGUMENT);
const preprodCollisionVerification = process.argv.includes(PREPROD_COLLISION_ARGUMENT);
const preprodAcceptanceVerification = process.argv.includes(PREPROD_ACCEPTANCE_ARGUMENT);
const preprodMode = preprodWriteVerification || preprodVerificationDryRun || preprodCollisionVerification || preprodAcceptanceVerification;
assert([confirmationRequested, preprodWriteVerification, preprodVerificationDryRun, preprodCollisionVerification, preprodAcceptanceVerification].filter(Boolean).length <= 1, "REFUSED: select exactly one execution mode.");

const envFile = preprodMode
  ? (process.env.DPP_PREPROD_ENV_FILE || ".env.preproduction.local")
  : (process.env.DPP_PRODUCTION_ENV_FILE || ".env.local");
const fileEnv = parseEnv(await readFile(envFile, "utf8"));
const env = { ...fileEnv, ...process.env };
const fixtureSource = await readFile(fixturePath, "utf8");
const fixture = JSON.parse(fixtureSource);
const variants = fixture.models.flatMap((model) => model.variants.map((variant) => ({ model, variant })));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = new URL(supabaseUrl).hostname.replace(/\.supabase\.co$/u, "");
const expectedRef = preprodMode ? EXPECTED_PREPROD_REF : EXPECTED_PRODUCTION_REF;

assert(projectRef === expectedRef, `REFUSED: unexpected ${preprodMode ? "PreProd" : "Production"} project.`);
assert(env.DPP_ENVIRONMENT === (preprodMode ? "preproduction" : "production"), "REFUSED: DPP_ENVIRONMENT does not match the selected mode.");
assert(serviceKey, "REFUSED: service credential is unavailable.");
assert(sha256(fixtureSource) === EXPECTED_FIXTURE_SHA256, "REFUSED: reference fixture SHA-256 is not approved.");
assert(fixture.fixture_classification === "INTERNAL_SYNTHETIC_REFERENCE", "REFUSED: fixture classification changed.");
assert(fixture.customer_verified === false && fixture.registry_submission_allowed === false && fixture.regulatory_submission_allowed === false, "REFUSED: fixture safety boundary changed.");
assert(fixture.models.length === 8 && variants.length === 22, "REFUSED: fixture topology changed.");

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
async function rest(table, params = {}, { count = false } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) query.set(key, String(value));
  if (count) {
    query.set("select", params.select || "id");
    query.set("limit", "1");
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: "GET",
    headers: { ...headers, ...(count ? { Prefer: "count=exact" } : {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) {
    let safe = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text);
      safe = JSON.stringify({ code: parsed.code, message: parsed.message });
    } catch {}
    throw new Error(`Read ${table} returned ${response.status}: ${safe}`);
  }
  if (count) {
    const range = response.headers.get("content-range") || "*/0";
    return Number(range.split("/").at(-1) || 0);
  }
  return text ? JSON.parse(text) : [];
}

const ledger = await rest("greanlean_migration_ledger", { select: "migration_number", order: "migration_number.desc", limit: 1 });
const migrationHead = ledger[0]?.migration_number || null;
assert(migrationHead === EXPECTED_MIGRATION_HEAD, `REFUSED: migration head is ${migrationHead || "unknown"}, expected ${EXPECTED_MIGRATION_HEAD}.`);

if (preprodCollisionVerification) {
  const collisionSets = {
    dppId: await rest("dpp_passport", { select: "id", passport_identifier: inFilter(variants.map(({ variant }) => variant.synthetic_dpp_id)) }),
    serial: await rest("product_item", { select: "id", serial_number: inFilter(variants.map(({ variant }) => variant.synthetic_serial)) }),
    sku: await rest("sku", { select: "id", sku_code: inFilter(variants.map(({ variant }) => variant.synthetic_sku)) }),
    modelCode: await rest("product_model", { select: "id", model_code: inFilter(fixture.models.map((model) => model.synthetic_model_code)) }),
  };
  assert(Object.values(collisionSets).every((rows) => rows.length > 0), "Collision fixture was not present; fail-closed test is inconclusive.");
  console.log(JSON.stringify({ status: "PASS", collisionFailClosed: true, writesPerformed: false, collisions: Object.fromEntries(Object.entries(collisionSets).map(([key, rows]) => [key, rows.length])) }, null, 2));
  process.exit(0);
}

if (preprodWriteVerification) {
  const args = process.argv.includes("--stop-after-hierarchy") ? ["--stop-after-hierarchy"] : [];
  const status = runCore("PREPROD_WRITE_VERIFICATION", args);
  if (status === 75 && args.length) process.exit(75);
  process.exit(status);
}

if (preprodAcceptanceVerification) process.exit(runCore("PREPROD_WRITE_VERIFICATION", ["--acceptance-only"]));

const tenantCode = preprodVerificationDryRun ? VERIFICATION_TENANT_CODE : REFERENCE_TENANT_CODE;
const referenceTenants = await rest("tenant", { select: "id,code,name,status,residency_policy", code: `eq.${tenantCode}` });
assert(referenceTenants.length <= 1, "UNEXPECTED_REFERENCE_STATE: duplicate Reference Tenants exist.");
const referenceTenant = referenceTenants[0] || null;
if (referenceTenant && !preprodVerificationDryRun) {
  assert(referenceTenant.name === "GreanLean Reference Mobility", "UNEXPECTED_REFERENCE_STATE: Production Reference Tenant name mismatch.");
  assert(referenceTenant.residency_policy?.classification === "INTERNAL_SYNTHETIC_REFERENCE", "UNEXPECTED_REFERENCE_STATE: Production Reference Tenant classification mismatch.");
  assert(referenceTenant.residency_policy?.sourceFixtureSha256 === EXPECTED_FIXTURE_SHA256, "UNEXPECTED_REFERENCE_STATE: Production Reference Tenant fixture mismatch.");
}

async function tenantCount(table, select = "id") {
  if (!referenceTenant) return 0;
  return rest(table, { select, tenant_id: `eq.${referenceTenant.id}` }, { count: true });
}

const current = {
  tenants: referenceTenants.length,
  organisations: await tenantCount("organisation_v2"),
  families: await tenantCount("product_family"),
  models: await tenantCount("product_model"),
  skus: await tenantCount("sku"),
  batches: await tenantCount("product_batch"),
  batchSkuLinks: await tenantCount("batch_sku_link"),
  individuals: await tenantCount("product_item"),
  dataSources: await tenantCount("data_source"),
  sourceRecords: await tenantCount("source_record"),
  transformations: await tenantCount("transformation_result"),
  canonicalClaims: await tenantCount("canonical_claim"),
  provenanceRecords: await tenantCount("provenance_record"),
  passports: await tenantCount("dpp_passport"),
  reviews: await tenantCount("dpp_review_task"),
  immutableVersions: await tenantCount("dpp_version"),
  currentPointers: await tenantCount("dpp_current_pointer", "passport_id"),
  resolverMappings: await tenantCount("resolver_mapping"),
  bmsSnapshots: await tenantCount("bms_aggregation_snapshot"),
};

const expected = {
  tenants: 1, organisations: 1, families: 1, models: 8, skus: 22, batches: 8, batchSkuLinks: 22,
  individuals: 22, dataSources: 1, sourceRecords: 22, transformations: 22, canonicalClaims: 374,
  provenanceRecords: 374, passports: 22, reviews: 22, immutableVersions: 22, currentPointers: 22,
  resolverMappings: 22, bmsSnapshots: 22,
};
const proposedMutations = netMutationPlan(expected, current);

const plannedIdentifiers = preprodVerificationDryRun
  ? {
    dppIds: variants.map((_, index) => `DPP-GLW-WRITE-${String(index + 1).padStart(6, "0")}`),
    serials: variants.map((_, index) => `GLW-WRITE-${String(index + 1).padStart(6, "0")}`),
    skuCodes: variants.map(({ variant }) => variant.synthetic_sku.replace(/^GLR-/u, "GLW-")),
    modelCodes: fixture.models.map((model) => model.synthetic_model_code.replace(/^GLR-/u, "GLW-")),
  }
  : {
    dppIds: variants.map(({ variant }) => variant.synthetic_dpp_id),
    serials: variants.map(({ variant }) => variant.synthetic_serial),
    skuCodes: variants.map(({ variant }) => variant.synthetic_sku),
    modelCodes: fixture.models.map((model) => model.synthetic_model_code),
  };
const dppRows = await rest("dpp_passport", { select: "id,tenant_id,passport_identifier", passport_identifier: inFilter(plannedIdentifiers.dppIds) });
const serialRows = await rest("product_item", { select: "id,tenant_id,serial_number", serial_number: inFilter(plannedIdentifiers.serials) });
const skuRows = await rest("sku", { select: "id,tenant_id,sku_code", sku_code: inFilter(plannedIdentifiers.skuCodes) });
const modelRows = await rest("product_model", { select: "id,tenant_id,model_code", model_code: inFilter(plannedIdentifiers.modelCodes) });
const collisionRows = { dppId: dppRows, serial: serialRows, sku: skuRows, modelCode: modelRows };
assertNoExternalNaturalKeyCollisions(collisionRows, referenceTenant?.id);
const collisions = Object.fromEntries(Object.entries(collisionRows).map(([key, rows]) => [key, rows.length]));

const productionConnectorCount = preprodVerificationDryRun ? 0 : await rest("connector_instance", { environment: "eq.PRODUCTION", status: "eq.ACTIVE" }, { count: true });
const registrySubmissionCount = await rest("registry_submission_v2", {}, { count: true });
if (!preprodVerificationDryRun) {
  const enabledV2OrExternalFlags = Object.entries(env)
    .filter(([key, value]) => (key.startsWith("FEATURE_V2_") || /REGISTRY|REAL_CUSTOMER_CONNECTOR/u.test(key)) && enabled(value))
    .map(([key]) => key)
    .sort();
  assert(enabledV2OrExternalFlags.length === 0, `REFUSED: Production V2/Registry/connector flags are enabled: ${enabledV2OrExternalFlags.join(", ")}`);
  assert(productionConnectorCount === 0, "REFUSED: an active real Production connector exists.");
  assert(registrySubmissionCount === 0, "REFUSED: Registry is not off.");
}

const result = {
  status: "PASS",
  generatedAt: new Date().toISOString(),
  environment: preprodVerificationDryRun ? "PREPROD_WRITE_VERIFICATION" : "production",
  projectRefFingerprint: sha256(projectRef).slice(0, 12),
  migrationHead,
  fixture: { path: "fixtures/internal-reference/GreanLean_Reference_Ebike_Catalog_From_EN50604.json", sha256: sha256(fixtureSource) },
  currentReferenceState: current,
  proposedMutations,
  collisions,
  resolverHost: preprodVerificationDryRun ? "greanlean-dpp-preprod.vercel.app" : PRODUCTION_RESOLVER_HOST,
  safetyGates: {
    globalV2Primary: false,
    registry: preprodVerificationDryRun ? "NOT_APPLICABLE_TO_ISOLATED_VERIFICATION_TENANT" : (registrySubmissionCount === 0 ? "OFF" : "UNEXPECTED"),
    realCustomerConnectors: productionConnectorCount === 0 ? "OFF" : "UNEXPECTED",
  },
  dryRunOnly: true,
  productionWriteAllowed: false,
  productionWritePerformed: false,
};

if (preprodVerificationDryRun || !confirmationRequested) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const approvedCommit = process.env.DPP_APPROVED_RC_COMMIT;
const approvedTree = process.env.DPP_APPROVED_RC_TREE;
assert(approvedCommit && approvedTree, "FRESH RC GATE FAIL: DPP_APPROVED_RC_COMMIT and DPP_APPROVED_RC_TREE are required.");
assert(gitValue("HEAD") === approvedCommit, "REFUSED: current commit is not the explicitly approved RC.");
assert(gitValue("HEAD^{tree}") === approvedTree, "REFUSED: current tree is not the explicitly approved RC tree.");

const backupEvidencePath = process.env.DPP_MANAGED_BACKUP_EVIDENCE_FILE;
assert(backupEvidencePath, "FRESH_BACKUP_GATE = FAIL: DPP_MANAGED_BACKUP_EVIDENCE_FILE is required.");
const backup = JSON.parse(await readFile(backupEvidencePath, "utf8"));
validateManagedBackupEvidence(backup, { expectedProjectRef: EXPECTED_PRODUCTION_REF });

console.log(JSON.stringify({ ...result, dryRunOnly: false, productionWriteAllowed: true, freshBackupGate: "PASS", backupReference: backup.reference, approvedCommit, approvedTree }, null, 2));
const coreStatus = runCore("PRODUCTION_CONFIRMED");
process.exit(coreStatus);
