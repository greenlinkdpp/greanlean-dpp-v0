import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const EXPECTED_PROJECT_REF = "lpxdbysgmdsjhxrjzhly";
const EXPECTED_FIXTURE_SHA256 = "018c60c9db81d621aa439d5f801d5aad2756d29be4762bb85d106b2735425222";
const EXPECTED_MIGRATION_HEAD = "0035";
const REFERENCE_TENANT_CODE = "greanlean-reference-mobility";
const PRODUCTION_RESOLVER_HOST = "www.greanlean.com";
const CONFIRMATION_ARGUMENT = "--confirm-internal-reference-production-pilot";

const envFile = process.env.DPP_PRODUCTION_ENV_FILE || ".env.local";
const fixturePath = process.env.REFERENCE_FIXTURE_PATH
  || fileURLToPath(new URL("../../fixtures/internal-reference/GreanLean_Reference_Ebike_Catalog_From_EN50604.json", import.meta.url));

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

const fileEnv = parseEnv(await readFile(envFile, "utf8"));
const env = { ...fileEnv, ...process.env };
const fixtureSource = await readFile(fixturePath, "utf8");
const fixture = JSON.parse(fixtureSource);
const variants = fixture.models.flatMap((model) => model.variants.map((variant) => ({ model, variant })));
const confirmationRequested = process.argv.includes(CONFIRMATION_ARGUMENT);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = new URL(supabaseUrl).hostname.replace(/\.supabase\.co$/u, "");

assert(env.DPP_ENVIRONMENT === "production", "REFUSED: DPP_ENVIRONMENT must be production.");
assert(projectRef === EXPECTED_PROJECT_REF, "REFUSED: Supabase project is not the exact approved Production project.");
assert(!env.PRODUCTION_SUPABASE_PROJECT_REF || env.PRODUCTION_SUPABASE_PROJECT_REF === EXPECTED_PROJECT_REF, "REFUSED: Production project-ref guard disagrees with the URL.");
assert(serviceKey, "REFUSED: Production read credential is unavailable.");
assert(sha256(fixtureSource) === EXPECTED_FIXTURE_SHA256, "REFUSED: reference fixture SHA-256 is not approved.");
assert(fixture.fixture_classification === "INTERNAL_SYNTHETIC_REFERENCE", "REFUSED: fixture classification changed.");
assert(fixture.customer_verified === false && fixture.registry_submission_allowed === false && fixture.regulatory_submission_allowed === false, "REFUSED: fixture safety boundary changed.");
assert(fixture.models.length === 8 && variants.length === 22, "REFUSED: fixture topology changed.");

const enabledV2OrExternalFlags = Object.entries(env)
  .filter(([key, value]) => (key.startsWith("FEATURE_V2_") || /REGISTRY|REAL_CUSTOMER_CONNECTOR/u.test(key)) && enabled(value))
  .map(([key]) => key)
  .sort();
assert(enabledV2OrExternalFlags.length === 0, `REFUSED: Production V2/Registry/connector flags are enabled: ${enabledV2OrExternalFlags.join(", ")}`);

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
    throw new Error(`Production read ${table} returned ${response.status}: ${safe}`);
  }
  if (count) {
    const range = response.headers.get("content-range") || "*/0";
    return Number(range.split("/").at(-1) || 0);
  }
  return text ? JSON.parse(text) : [];
}

const ledger = await rest("greanlean_migration_ledger", { select: "migration_number", order: "migration_number.desc", limit: 1 });
const migrationHead = ledger[0]?.migration_number || null;
assert(migrationHead === EXPECTED_MIGRATION_HEAD, `REFUSED: Production migration head is ${migrationHead || "unknown"}, expected ${EXPECTED_MIGRATION_HEAD}.`);

const productionConnectorCount = await rest("connector_instance", { environment: "eq.PRODUCTION", status: "eq.ACTIVE" }, { count: true });
const registrySubmissionCount = await rest("registry_submission_v2", {}, { count: true });
assert(productionConnectorCount === 0, "REFUSED: an active Production connector exists.");
assert(registrySubmissionCount === 0, "REFUSED: Registry is not empty/off.");

const referenceTenants = await rest("tenant", { select: "id,code,name,status", code: `eq.${REFERENCE_TENANT_CODE}` });
assert(referenceTenants.length <= 1, "REFUSED: duplicate Reference Tenants exist.");
const referenceTenant = referenceTenants[0] || null;
const referenceModels = referenceTenant
  ? await rest("product_model", { tenant_id: `eq.${referenceTenant.id}` }, { count: true })
  : 0;
const referencePassports = referenceTenant
  ? await rest("dpp_passport", { tenant_id: `eq.${referenceTenant.id}` }, { count: true })
  : 0;
const v1Counts = {
  organisations: await rest("dpp_organisation", {}, { count: true }),
  projects: await rest("dpp_project", {}, { count: true }),
  products: await rest("products", {}, { count: true }),
  productVersions: await rest("product_versions", {}, { count: true }),
  identifierAliases: await rest("dpp_identifier_alias", { select: "alias" }, { count: true }),
};

const dppIds = variants.map(({ variant }) => variant.synthetic_dpp_id);
const serials = variants.map(({ variant }) => variant.synthetic_serial);
const skuCodes = variants.map(({ variant }) => variant.synthetic_sku);
const modelCodes = fixture.models.map((model) => model.synthetic_model_code);
const collisions = {
  dppId: await rest("dpp_passport", { passport_identifier: inFilter(dppIds) }, { count: true }),
  serial: await rest("product_item", { serial_number: inFilter(serials) }, { count: true }),
  sku: await rest("sku", { sku_code: inFilter(skuCodes) }, { count: true }),
  modelCode: await rest("product_model", { model_code: inFilter(modelCodes) }, { count: true }),
};
assert(Object.values(collisions).every((value) => value === 0), `REFUSED: natural-key collision found: ${JSON.stringify(collisions)}`);

const resolverMappings = dppIds.map((dppId) => ({
  dppId,
  host: PRODUCTION_RESOLVER_HOST,
  normalizedPath: `/p/${dppId}`,
  target: `https://${PRODUCTION_RESOLVER_HOST}/p/${dppId}`,
}));

const result = {
  status: "PASS",
  generatedAt: new Date().toISOString(),
  environment: "production",
  projectRefFingerprint: sha256(projectRef).slice(0, 12),
  migrationHead,
  fixture: {
    path: "fixtures/internal-reference/GreanLean_Reference_Ebike_Catalog_From_EN50604.json",
    sha256: sha256(fixtureSource),
    classification: fixture.fixture_classification,
  },
  safetyGates: {
    globalV2Primary: false,
    registry: "OFF",
    realCustomerConnectors: "OFF",
    enabledV2OrExternalFlags,
    productionConnectorCount,
    registrySubmissionCount,
  },
  currentReferenceState: {
    tenants: referenceTenants.length,
    models: referenceModels,
    passports: referencePassports,
  },
  v1Counts,
  collisions: {
    dppId: collisions.dppId,
    serial: collisions.serial,
    sku: collisions.sku,
    modelCode: collisions.modelCode,
  },
  idempotencyNaturalKeys: [
    "tenant code", "organisation legal name", "family code", "model code", "SKU code", "batch number",
    "serial number", "passport_identifier", "fixture hash / source identifier", "mapping profile + version", "schema code + version",
  ],
  proposedMutations: {
    tenants: 1, organisations: 1, families: 1, models: 8, skus: 22, batches: 8,
    batchSkuLinks: 22, individuals: 22, dataSources: 1, sourceRecords: 22, transformations: 22,
    canonicalClaims: 374, provenanceRecords: 374, passports: 22, reviews: 22, immutableVersions: 22,
    currentPointers: 22, resolverMappings: 22, bmsSnapshots: 22,
  },
  proposedResolverMappings: resolverMappings,
  productionWriteAllowed: confirmationRequested,
  dryRunOnly: !confirmationRequested,
  productionWritePerformed: false,
};

console.log(JSON.stringify(result, null, 2));

if (confirmationRequested) {
  throw new Error("WRITE MODE LOCKED: this preparation RC validates the explicit confirmation gate, but the current instruction does not authorize Production onboarding execution.");
}
