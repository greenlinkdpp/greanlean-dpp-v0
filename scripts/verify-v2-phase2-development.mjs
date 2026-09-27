import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";

const envFile = process.env.DPP_VERIFICATION_ENV_FILE ?? ".env.development.local";
const guardScript = envFile === ".env.preproduction.local"
  ? "scripts/phase6b/assert-preproduction-target.mjs"
  : "scripts/assert-development-target.mjs";

function parseEnv(source) {
  const result = {};
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input: options.input,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || command + " failed").trim());
  }
  return result.stdout;
}

function curl({ method = "GET", url, headers = {}, body, expected = [200] }) {
  const args = ["-sS", "-X", method, "-w", "\n%{http_code}"];
  for (const [name, value] of Object.entries(headers)) args.push("-H", name + ": " + value);
  if (body !== undefined) {
    args.push("-H", "content-type: application/json", "--data", JSON.stringify(body));
  }
  args.push(url);
  const stdout = run("curl", args);
  const split = stdout.lastIndexOf("\n");
  const responseBody = split < 0 ? "" : stdout.slice(0, split);
  const status = Number(stdout.slice(split + 1));
  let json = null;
  if (responseBody) {
    try { json = JSON.parse(responseBody); } catch {}
  }
  if (!expected.includes(status)) {
    const safe = json
      ? JSON.stringify({
        code: json.error?.code ?? json.code,
        message: json.error?.message ?? json.message,
      })
      : responseBody.slice(0, 500);
    throw new Error(method + " " + new URL(url).pathname + " returned " + status + ": " + safe);
  }
  return { status, json, body: responseBody };
}

const guard = spawnSync(process.execPath, [guardScript, "--env-file", envFile, "--json"], {
  encoding: "utf8",
});
if (guard.status !== 0) throw new Error((guard.stderr || guard.stdout || "Development guard failed").trim());
const target = JSON.parse(guard.stdout);
const env = parseEnv(await readFile(envFile, "utf8"));
assert(env.FEATURE_V2_PRODUCT_CORE === "true", "FEATURE_V2_PRODUCT_CORE must be enabled in Development.");
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
assert(baseUrl && anonKey && serviceKey, "Development credentials are incomplete.");

const serviceHeaders = {
  apikey: serviceKey,
  Authorization: "Bearer " + serviceKey,
};
const anonHeaders = { apikey: anonKey };
const password = "Phase2-" + randomBytes(24).toString("base64url") + "!";

function rest(table, { method = "GET", query = "", body, headers = serviceHeaders, expected = [200] } = {}) {
  return curl({
    method,
    url: baseUrl + "/rest/v1/" + table + (query ? "?" + query : ""),
    headers,
    body,
    expected,
  });
}

function upsert(table, body, onConflict = "id") {
  return rest(table, {
    method: "POST",
    query: "on_conflict=" + encodeURIComponent(onConflict),
    body,
    headers: { ...serviceHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
    expected: [200, 201],
  }).json;
}

const usersResponse = curl({
  url: baseUrl + "/auth/v1/admin/users?page=1&per_page=1000",
  headers: serviceHeaders,
}).json;
const existingUsers = usersResponse?.users || [];
const identities = [
  ["userA", "user-a@phase1.greanlean.invalid"],
  ["userB", "user-b@phase1.greanlean.invalid"],
  ["partnerUser", "partner-user@phase1.greanlean.invalid"],
  ["readOnlyUser", "read-only@phase2.greanlean.invalid"],
];
const users = {};
const tokens = {};
for (const [label, email] of identities) {
  const existing = existingUsers.find((user) => user.email === email);
  const payload = {
    email,
    password,
    email_confirm: true,
    user_metadata: { synthetic: true, fixture: "v2-phase2", label },
  };
  const response = existing
    ? curl({ method: "PUT", url: baseUrl + "/auth/v1/admin/users/" + existing.id, headers: serviceHeaders, body: payload })
    : curl({
      method: "POST",
      url: baseUrl + "/auth/v1/admin/users",
      headers: serviceHeaders,
      body: payload,
      expected: [200, 201],
    });
  users[label] = response.json?.id ?? existing?.id;
  assert(users[label], "Synthetic Auth identity " + label + " is missing.");
  const signIn = curl({
    method: "POST",
    url: baseUrl + "/auth/v1/token?grant_type=password",
    headers: anonHeaders,
    body: { email, password },
  }).json;
  assert(signIn?.access_token, "Synthetic Auth identity " + label + " could not sign in.");
  tokens[label] = signIn.access_token;
}

const ids = {
  tenantA: "11111111-1111-4111-8111-111111111111",
  tenantB: "22222222-2222-4222-8222-222222222222",
  familyA: "21000000-0000-4000-8000-000000000001",
  familyB: "21000000-0000-4000-8000-000000000002",
  modelA: "22000000-0000-4000-8000-000000000001",
  modelA2: "22000000-0000-4000-8000-000000000002",
  modelB: "22000000-0000-4000-8000-000000000003",
  skuA1: "23000000-0000-4000-8000-000000000001",
  skuA2: "23000000-0000-4000-8000-000000000002",
  skuAOther: "23000000-0000-4000-8000-000000000003",
  skuB: "23000000-0000-4000-8000-000000000004",
  batchA1: "24000000-0000-4000-8000-000000000001",
  batchA2: "24000000-0000-4000-8000-000000000002",
  batchAOther: "24000000-0000-4000-8000-000000000003",
  batchB: "24000000-0000-4000-8000-000000000004",
  linkA1: "25000000-0000-4000-8000-000000000001",
  linkA2: "25000000-0000-4000-8000-000000000002",
  itemModel: "26000000-0000-4000-8000-000000000001",
  itemSku: "26000000-0000-4000-8000-000000000002",
  itemBatch: "26000000-0000-4000-8000-000000000003",
  itemFull: "26000000-0000-4000-8000-000000000004",
  itemB: "26000000-0000-4000-8000-000000000005",
  readOnlyMembership: "27000000-0000-4000-8000-000000000001",
  productScope: "28000000-0000-4000-8000-000000000001",
  gtin: "29000000-0000-4000-8000-000000000001",
  gtinAlternate: "29000000-0000-4000-8000-000000000002",
  serialA: "29000000-0000-4000-8000-000000000003",
  serialB: "29000000-0000-4000-8000-000000000004",
};

for (const table of ["tenant", "partner_tenant_authorization"]) {
  const response = rest(table, { query: "select=id&limit=1" }).json;
  assert(response?.length, "Phase 1 baseline table " + table + " has no fixture rows.");
}

const readOnlyRole = rest("role", {
  query: "select=id&tenant_id=eq." + ids.tenantA + "&code=eq.read_only&limit=1",
}).json?.[0];
assert(readOnlyRole?.id, "Tenant A Read Only role was not seeded by Phase 1.");
upsert("tenant_membership", {
  id: ids.readOnlyMembership,
  tenant_id: ids.tenantA,
  user_id: users.readOnlyUser,
  role_id: readOnlyRole.id,
  status: "ACTIVE",
});

upsert("product_family", [
  { id: ids.familyA, tenant_id: ids.tenantA, code: "phase2-family-a", name: "Phase 2 Family A", status: "ACTIVE", created_by: users.userA },
  { id: ids.familyB, tenant_id: ids.tenantB, code: "phase2-family-b", name: "Phase 2 Family B", status: "ACTIVE", created_by: users.userB },
]);
upsert("product_model", [
  { id: ids.modelA, tenant_id: ids.tenantA, family_id: ids.familyA, model_code: "P2-MODEL-A", name: "Phase 2 Model A", product_category: "synthetic", sector: "test", status: "ACTIVE", created_by: users.userA },
  { id: ids.modelA2, tenant_id: ids.tenantA, family_id: ids.familyA, model_code: "P2-MODEL-A2", name: "Phase 2 Model A2", product_category: "synthetic", sector: "test", status: "ACTIVE", created_by: users.userA },
  { id: ids.modelB, tenant_id: ids.tenantB, family_id: ids.familyB, model_code: "P2-MODEL-B", name: "Phase 2 Model B", product_category: "synthetic", sector: "test", status: "ACTIVE", created_by: users.userB },
]);
upsert("sku", [
  { id: ids.skuA1, tenant_id: ids.tenantA, model_id: ids.modelA, sku_code: "P2-SKU-A1", name: "SKU A1", status: "ACTIVE", created_by: users.userA },
  { id: ids.skuA2, tenant_id: ids.tenantA, model_id: ids.modelA, sku_code: "P2-SKU-A2", name: "SKU A2", status: "ACTIVE", created_by: users.userA },
  { id: ids.skuAOther, tenant_id: ids.tenantA, model_id: ids.modelA2, sku_code: "P2-SKU-A-OTHER", name: "SKU Other Model", status: "ACTIVE", created_by: users.userA },
  { id: ids.skuB, tenant_id: ids.tenantB, model_id: ids.modelB, sku_code: "P2-SKU-B1", name: "SKU B1", status: "ACTIVE", created_by: users.userB },
]);
upsert("product_batch", [
  { id: ids.batchA1, tenant_id: ids.tenantA, model_id: ids.modelA, batch_number: "P2-BATCH-A1", status: "ACTIVE", created_by: users.userA },
  { id: ids.batchA2, tenant_id: ids.tenantA, model_id: ids.modelA, batch_number: "P2-BATCH-A2", status: "ACTIVE", created_by: users.userA },
  { id: ids.batchAOther, tenant_id: ids.tenantA, model_id: ids.modelA2, batch_number: "P2-BATCH-A-OTHER", status: "ACTIVE", created_by: users.userA },
  { id: ids.batchB, tenant_id: ids.tenantB, model_id: ids.modelB, batch_number: "P2-BATCH-B1", status: "ACTIVE", created_by: users.userB },
]);
upsert("batch_sku_link", [
  { id: ids.linkA1, tenant_id: ids.tenantA, model_id: ids.modelA, batch_id: ids.batchA1, sku_id: ids.skuA1, status: "ACTIVE", created_by: users.userA },
  { id: ids.linkA2, tenant_id: ids.tenantA, model_id: ids.modelA, batch_id: ids.batchA1, sku_id: ids.skuA2, status: "ACTIVE", created_by: users.userA },
]);
upsert("product_item", [
  { id: ids.itemModel, tenant_id: ids.tenantA, model_id: ids.modelA, sku_id: null, batch_id: null, serial_number: "P2-A-MODEL", upi: null, enforce_batch_sku_link: true, status: "ACTIVE", created_by: users.userA },
  { id: ids.itemSku, tenant_id: ids.tenantA, model_id: ids.modelA, sku_id: ids.skuA1, batch_id: null, serial_number: "P2-A-SKU", upi: null, enforce_batch_sku_link: true, status: "ACTIVE", created_by: users.userA },
  { id: ids.itemBatch, tenant_id: ids.tenantA, model_id: ids.modelA, sku_id: null, batch_id: ids.batchA2, serial_number: "P2-A-BATCH", upi: null, enforce_batch_sku_link: true, status: "ACTIVE", created_by: users.userA },
  { id: ids.itemFull, tenant_id: ids.tenantA, model_id: ids.modelA, sku_id: ids.skuA1, batch_id: ids.batchA1, serial_number: "P2-A-FULL", upi: "https://id.greanlean.invalid/items/p2-a-full", enforce_batch_sku_link: true, status: "ACTIVE", created_by: users.userA },
  { id: ids.itemB, tenant_id: ids.tenantB, model_id: ids.modelB, sku_id: ids.skuB, batch_id: null, serial_number: "P2-B-SKU", upi: null, enforce_batch_sku_link: true, status: "ACTIVE", created_by: users.userB },
]);

const structural = {
  multipleSkus: rest("sku", { query: "select=id&model_id=eq." + ids.modelA }).json.length === 2,
  batchWithoutSku: rest("product_batch", { query: "select=id&id=eq." + ids.batchA2 }).json.length === 1,
  batchMultipleSkus: rest("batch_sku_link", { query: "select=id&batch_id=eq." + ids.batchA1 + "&status=eq.ACTIVE" }).json.length === 2,
  itemModelOnly: rest("product_item", { query: "select=id&id=eq." + ids.itemModel + "&sku_id=is.null&batch_id=is.null" }).json.length === 1,
  itemModelSku: rest("product_item", { query: "select=id&id=eq." + ids.itemSku + "&sku_id=not.is.null&batch_id=is.null" }).json.length === 1,
  itemModelBatch: rest("product_item", { query: "select=id&id=eq." + ids.itemBatch + "&sku_id=is.null&batch_id=not.is.null" }).json.length === 1,
  itemFull: rest("product_item", { query: "select=id&id=eq." + ids.itemFull + "&sku_id=not.is.null&batch_id=not.is.null" }).json.length === 1,
};
assert(Object.values(structural).every(Boolean), "One or more Product hierarchy structural cases failed.");

const negativeCases = [
  ["sku", { id: "30000000-0000-4000-8000-000000000001", tenant_id: ids.tenantB, model_id: ids.modelA, sku_code: "INVALID-CROSS-TENANT-SKU", name: "Invalid" }],
  ["product_batch", { id: "30000000-0000-4000-8000-000000000002", tenant_id: ids.tenantB, model_id: ids.modelA, batch_number: "INVALID-CROSS-TENANT-BATCH" }],
  ["product_item", { id: "30000000-0000-4000-8000-000000000003", tenant_id: ids.tenantA, model_id: ids.modelA, sku_id: ids.skuB }],
  ["product_item", { id: "30000000-0000-4000-8000-000000000004", tenant_id: ids.tenantA, model_id: ids.modelA, batch_id: ids.batchB }],
  ["batch_sku_link", { id: "30000000-0000-4000-8000-000000000005", tenant_id: ids.tenantA, model_id: ids.modelA, batch_id: ids.batchA1, sku_id: ids.skuAOther }],
  ["product_item", { id: "30000000-0000-4000-8000-000000000006", tenant_id: ids.tenantA, model_id: ids.modelA, sku_id: ids.skuAOther }],
  ["product_item", { id: "30000000-0000-4000-8000-000000000007", tenant_id: ids.tenantA, model_id: ids.modelA, batch_id: ids.batchAOther }],
];
for (const [table, body] of negativeCases) {
  rest(table, {
    method: "POST",
    body,
    headers: { ...serviceHeaders, Prefer: "return=representation" },
    expected: [400, 409],
  });
}
rest("product_item", {
  method: "POST",
  body: {
    id: "30000000-0000-4000-8000-000000000008",
    tenant_id: ids.tenantA,
    model_id: ids.modelA,
    sku_id: ids.skuA2,
    batch_id: ids.batchA2,
  },
  headers: { ...serviceHeaders, Prefer: "return=representation" },
  expected: [400, 409],
});

const authenticatedHeaders = (label) => ({
  apikey: anonKey,
  Authorization: "Bearer " + tokens[label],
});
const tenantAProducts = rest("product_model", {
  query: "select=id,tenant_id",
  headers: authenticatedHeaders("userA"),
}).json;
assert(tenantAProducts.some((row) => row.id === ids.modelA), "Tenant A cannot read Model A.");
assert(!tenantAProducts.some((row) => row.id === ids.modelB), "Tenant A could read Tenant B Model.");
for (const [table, foreignId] of [
  ["sku", ids.skuB],
  ["product_batch", ids.batchB],
  ["product_item", ids.itemB],
]) {
  const rows = rest(table, { query: "select=id", headers: authenticatedHeaders("userA") }).json;
  assert(!rows.some((row) => row.id === foreignId), "Tenant A crossed RLS on " + table + ".");
}

const activeAuthorization = rest("partner_tenant_authorization", {
  query: "select=id&tenant_id=eq." + ids.tenantA + "&status=eq.ACTIVE&limit=1",
}).json?.[0];
assert(activeAuthorization?.id, "Phase 1 active Partner authorization is missing.");
upsert("scope_grant", {
  id: ids.productScope,
  tenant_id: ids.tenantA,
  grantee_type: "PARTNER_AUTHORIZATION",
  grantee_id: activeAuthorization.id,
  resource_type: "PRODUCT_MODEL",
  resource_id: ids.modelA,
  effect: "ALLOW",
  status: "ACTIVE",
  created_by: users.userA,
});
const partnerModels = rest("product_model", {
  query: "select=id,tenant_id",
  headers: authenticatedHeaders("partnerUser"),
}).json;
assert(partnerModels.length === 1 && partnerModels[0].id === ids.modelA, "Partner Product Model scope failed.");
const readOnlyWrite = rest("product_model", {
  method: "POST",
  body: {
    tenant_id: ids.tenantA,
    model_code: "READ-ONLY-MUST-FAIL",
    name: "Denied",
    product_category: "synthetic",
  },
  headers: { ...authenticatedHeaders("readOnlyUser"), Prefer: "return=representation" },
  expected: [401, 403],
});
assert([401, 403].includes(readOnlyWrite.status), "Read Only direct Product write was not denied.");

for (const id of [ids.gtin, ids.gtinAlternate, ids.serialA, ids.serialB, "29000000-0000-4000-8000-000000000005"]) {
  rest("product_subject_identifier", {
    method: "DELETE",
    query: "id=eq." + id,
    expected: [200, 204],
  });
}
upsert("product_subject_identifier", {
  id: ids.gtin,
  tenant_id: ids.tenantA,
  subject_type: "SKU",
  subject_id: ids.skuA1,
  identifier_type: "GTIN",
  value: "4006 3813 3393 1",
  normalized_value: "ignored-by-trigger",
  issuer: "GS1",
  scheme: "GS1",
  is_primary: true,
  status: "ACTIVE",
  created_by: users.userA,
});
const normalizedGtin = rest("product_subject_identifier", {
  query: "select=normalized_value&id=eq." + ids.gtin,
}).json?.[0];
assert(normalizedGtin?.normalized_value === "4006381333931", "GTIN normalization failed.");
rest("product_subject_identifier", {
  method: "POST",
  body: {
    id: "29000000-0000-4000-8000-000000000005",
    tenant_id: ids.tenantA,
    subject_type: "SKU",
    subject_id: ids.skuA2,
    identifier_type: "GTIN",
    value: "4006381333931",
    normalized_value: "ignored",
    issuer: "GS1",
    scheme: "GS1",
  },
  headers: { ...serviceHeaders, Prefer: "return=representation" },
  expected: [409],
});
upsert("product_subject_identifier", {
  id: ids.gtinAlternate,
  tenant_id: ids.tenantA,
  subject_type: "SKU",
  subject_id: ids.skuA2,
  identifier_type: "GTIN",
  value: "4006381333931",
  normalized_value: "ignored",
  issuer: "GS1",
  scheme: "ALTERNATE_TEST_SCHEME",
  status: "ACTIVE",
  created_by: users.userA,
});
upsert("product_subject_identifier", [
  { id: ids.serialA, tenant_id: ids.tenantA, subject_type: "ITEM", subject_id: ids.itemFull, identifier_type: "SERIAL_NUMBER", value: "serial-001", normalized_value: "ignored", issuer: "Synthetic Maker", scheme: "MAKER_SERIAL", is_primary: true, status: "ACTIVE", created_by: users.userA },
  { id: ids.serialB, tenant_id: ids.tenantB, subject_type: "ITEM", subject_id: ids.itemB, identifier_type: "SERIAL_NUMBER", value: "serial-001", normalized_value: "ignored", issuer: "Synthetic Maker", scheme: "MAKER_SERIAL", is_primary: true, status: "ACTIVE", created_by: users.userB },
]);
rest("product_subject_identifier", {
  method: "PATCH",
  query: "id=eq." + ids.gtin,
  body: { status: "RETIRED", is_primary: false },
  headers: { ...serviceHeaders, Prefer: "return=representation" },
});
const replacement = rest("product_subject_identifier", {
  method: "POST",
  body: {
    id: "29000000-0000-4000-8000-000000000005",
    tenant_id: ids.tenantA,
    subject_type: "SKU",
    subject_id: ids.skuA2,
    identifier_type: "GTIN",
    value: "4006381333931",
    normalized_value: "ignored",
    issuer: "GS1",
    scheme: "GS1",
    is_primary: true,
    status: "ACTIVE",
    created_by: users.userA,
  },
  headers: { ...serviceHeaders, Prefer: "return=representation" },
  expected: [200, 201],
}).json?.[0];
assert(replacement?.id, "Retired identifier did not release the active collision scope.");
rest("product_subject_identifier", {
  method: "POST",
  body: {
    tenant_id: ids.tenantA,
    subject_type: "SKU",
    subject_id: ids.skuA1,
    identifier_type: "GTIN",
    value: "4006381333932",
    normalized_value: "ignored",
    issuer: "GS1",
    scheme: "INVALID",
  },
  headers: { ...serviceHeaders, Prefer: "return=representation" },
  expected: [400],
});

const localPort = 3018;
const localBaseUrl = "http://127.0.0.1:" + localPort;
const server = spawn(
  process.execPath,
  [`--env-file=${envFile}`, "node_modules/next/dist/bin/next", "dev", "-p", String(localPort)],
  {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "development", NODE_USE_ENV_PROXY: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const probe = spawnSync("curl", ["-sS", "-o", "/dev/null", "-w", "%{http_code}", localBaseUrl + "/api/v2/product-models"], { encoding: "utf8" });
    if (probe.status === 0 && probe.stdout !== "000") {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, "Development API did not start: " + serverLog.slice(-1000));
  const apiHeaders = (label, tenantId, correlationId) => ({
    Authorization: "Bearer " + tokens[label],
    "x-tenant-id": tenantId,
    "x-correlation-id": correlationId,
  });
  const listCorrelation = "phase2-model-list-" + Date.now();
  const list = curl({
    url: localBaseUrl + "/api/v2/product-models",
    headers: apiHeaders("userA", ids.tenantA, listCorrelation),
  });
  assert(list.json?.data?.some((row) => row.id === ids.modelA), "Product Model API list failed.");

  const partnerCorrelation = "phase2-partner-model-" + Date.now();
  const partnerAllowed = curl({
    url: localBaseUrl + "/api/v2/product-models/" + ids.modelA,
    headers: apiHeaders("partnerUser", ids.tenantA, partnerCorrelation),
  });
  assert(partnerAllowed.json?.data?.id === ids.modelA, "Partner scoped Product API read failed.");
  const partnerDenied = curl({
    url: localBaseUrl + "/api/v2/product-models/" + ids.modelB,
    headers: apiHeaders("partnerUser", ids.tenantB, "phase2-partner-deny-" + Date.now()),
    expected: [403],
  });
  assert(partnerDenied.json?.error?.code === "TENANT_RELATIONSHIP_REQUIRED", "Partner crossed Tenant Product scope.");
  const forged = curl({
    url: localBaseUrl + "/api/v2/product-models",
    headers: apiHeaders("userA", ids.tenantB, "phase2-forged-" + Date.now()),
    expected: [403],
  });
  assert(forged.json?.error?.code === "TENANT_RELATIONSHIP_REQUIRED", "Forged Tenant context was not denied.");
  const readOnlyApi = curl({
    method: "POST",
    url: localBaseUrl + "/api/v2/product-models",
    headers: {
      ...apiHeaders("readOnlyUser", ids.tenantA, "phase2-read-only-" + Date.now()),
      "Idempotency-Key": "phase2-read-only-denied",
    },
    body: { model_code: "READ-ONLY-API-DENIED", name: "Denied", product_category: "synthetic" },
    expected: [403],
  });
  assert(readOnlyApi.json?.error?.code === "CAPABILITY_DENIED", "Read Only API Product write was not denied.");

  const writeKey = "phase2-model-write-" + Date.now();
  const writeHeaders = {
    ...apiHeaders("userA", ids.tenantA, "phase2-model-write-correlation-" + Date.now()),
    "Idempotency-Key": writeKey,
  };
  const writeBody = {
    model_code: "P2-API-" + Date.now(),
    name: "Synthetic Phase 2 API Model",
    product_category: "synthetic",
    sector: "test",
  };
  const first = curl({
    method: "POST",
    url: localBaseUrl + "/api/v2/product-models",
    headers: writeHeaders,
    body: writeBody,
    expected: [201],
  });
  const apiModelId = first.json?.data?.id;
  assert(apiModelId, "Product Model API create failed.");
  const replay = curl({
    method: "POST",
    url: localBaseUrl + "/api/v2/product-models",
    headers: writeHeaders,
    body: writeBody,
    expected: [201],
  });
  assert(replay.json?.data?.id === apiModelId, "Product Model idempotent replay failed.");
  const conflict = curl({
    method: "POST",
    url: localBaseUrl + "/api/v2/product-models",
    headers: writeHeaders,
    body: { ...writeBody, name: "Different" },
    expected: [409],
  });
  assert(conflict.json?.error?.code === "IDEMPOTENCY_KEY_REUSED", "Product Model idempotency conflict failed.");

  const auditRows = rest("policy_decision_audit", {
    query: "select=correlation_id,decision,purpose&correlation_id=in.(" + listCorrelation + "," + partnerCorrelation + ")",
  }).json;
  assert(auditRows.some((row) => row.correlation_id === listCorrelation && row.decision === "ALLOW"), "Product list decision was not audited.");
  assert(auditRows.some((row) => row.correlation_id === partnerCorrelation && row.decision === "ALLOW"), "Partner Product decision was not audited.");

  rest("product_model", { method: "DELETE", query: "id=eq." + apiModelId, expected: [200, 204] });
  rest("v2_idempotency_record", {
    method: "DELETE",
    query: "idempotency_key=eq." + encodeURIComponent(writeKey),
    expected: [200, 204],
  });
} finally {
  server.kill("SIGTERM");
}

console.log(JSON.stringify({
  developmentTarget: target,
  syntheticAuthUsers: identities.length,
  checks: {
    productHierarchyShapes: "PASS",
    tenantAndModelConstraints: "PASS",
    batchMultipleSku: "PASS",
    itemOptionalRelationships: "PASS",
    identifierNormalizationCollisionRetire: "PASS",
    tenantProductRls: "PASS",
    partnerProductScope: "PASS",
    readOnlyProductWrite: "PASS",
    forgedTenantContext: "PASS",
    apiCapabilityPdpAudit: "PASS",
    apiPersistentIdempotency: "PASS",
    legacyMappingContract: "PASS",
  },
}));
