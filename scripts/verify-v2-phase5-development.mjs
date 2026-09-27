import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}

function assert(condition, message) { if (!condition) throw new Error(message); }
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `${command} failed`).trim());
  return result.stdout;
}
function curl({ method = "GET", url, headers = {}, body, rawBody, expected = [200] }) {
  const args = ["-sS", "--max-time", "90", "-X", method, "-w", "\n%{http_code}"];
  for (const [name, value] of Object.entries(headers)) args.push("-H", `${name}: ${value}`);
  if (body !== undefined) args.push("-H", "content-type: application/json", "--data", JSON.stringify(body));
  if (rawBody !== undefined) args.push("--data-binary", rawBody);
  args.push(url);
  const stdout = run("curl", args);
  const split = stdout.lastIndexOf("\n");
  const responseBody = split < 0 ? "" : stdout.slice(0, split);
  const status = Number(stdout.slice(split + 1));
  let json = null;
  if (responseBody) try { json = JSON.parse(responseBody); } catch {}
  if (!expected.includes(status)) {
    const safe = json ? JSON.stringify({ code: json.error?.code ?? json.code, message: json.error?.message ?? json.message }) : responseBody.slice(0, 500);
    throw new Error(`${method} ${new URL(url).pathname} returned ${status}: ${safe}`);
  }
  return { status, json, body: responseBody };
}

const guard = spawnSync(process.execPath, [guardScript, "--env-file", envFile, "--json"], { encoding: "utf8" });
if (guard.status !== 0) throw new Error((guard.stderr || guard.stdout || "Development guard failed").trim());
const target = JSON.parse(guard.stdout);
const env = parseEnv(await readFile(envFile, "utf8"));
for (const flag of ["FEATURE_V2_INTEGRATION_CORE","FEATURE_V2_FILE_IMPORT","FEATURE_V2_REGISTRY_TEST","FEATURE_V2_EXTERNAL_CONNECTORS","FEATURE_V2_BMS_ADAPTER"]) {
  assert(env[flag] === "true", `${flag} must be enabled in Development.`);
}
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
assert(baseUrl && anonKey && serviceKey, "Development credentials are incomplete.");
const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
const anonHeaders = { apikey: anonKey };
function rest(table, { method = "GET", query = "", body, headers = serviceHeaders, expected = [200] } = {}) {
  return curl({ method, url: `${baseUrl}/rest/v1/${table}${query ? `?${query}` : ""}`, headers, body, expected });
}
function insert(table, body) {
  return rest(table, { method: "POST", body, headers: { ...serviceHeaders, Prefer: "return=representation" }, expected: [200, 201] }).json?.[0];
}
function upsert(table, body, onConflict = "id") {
  return rest(table, { method: "POST", query: `on_conflict=${encodeURIComponent(onConflict)}`, body, headers: { ...serviceHeaders, Prefer: "resolution=merge-duplicates,return=representation" }, expected: [200, 201] }).json;
}
function rpc(name, body) {
  return curl({ method: "POST", url: `${baseUrl}/rest/v1/rpc/${name}`, headers: serviceHeaders, body }).json;
}

for (const table of ["connector_definition","connector_instance","connector_credential_reference","connector_rate_limit_counter","connector_job","connector_attempt","connector_receipt","connector_webhook_event","connector_dead_letter","external_identifier_mapping","registry_submission_v2","connector_import_session","bms_aggregation_snapshot","connector_audit_event"]) {
  assert(rest(table, { query: "select=id&limit=1" }).status === 200, `${table} is unavailable.`);
}
assert(rest("greanlean_migration_ledger", { query: "select=migration_number&migration_number=eq.0031" }).json?.length === 1, "Migration ledger does not contain 0031.");

const suffix = `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const password = `Phase5-${randomBytes(24).toString("base64url")}!`;
const identities = [
  ["admin", "admin@phase5.greanlean.invalid", tenantA, "tenant_admin"],
  ["author", "author@phase4.greanlean.invalid", tenantA, "dpp_manager"],
  ["reviewer", "reviewer@phase4.greanlean.invalid", tenantA, "reviewer"],
  ["publisher", "publisher@phase4.greanlean.invalid", tenantA, "publisher"],
  ["readOnly", "read-only@phase5.greanlean.invalid", tenantA, "read_only"],
  ["tenantB", "admin-b@phase5.greanlean.invalid", tenantB, "tenant_admin"],
];
const existingUsers = curl({ url: `${baseUrl}/auth/v1/admin/users?page=1&per_page=1000`, headers: serviceHeaders }).json?.users || [];
const users = {};
const tokens = {};
for (const [label, email] of identities) {
  const existing = existingUsers.find((user) => user.email === email);
  const payload = { email, password, email_confirm: true, user_metadata: { synthetic: true, fixture: "v2-phase5", label } };
  const response = existing
    ? curl({ method: "PUT", url: `${baseUrl}/auth/v1/admin/users/${existing.id}`, headers: serviceHeaders, body: payload })
    : curl({ method: "POST", url: `${baseUrl}/auth/v1/admin/users`, headers: serviceHeaders, body: payload, expected: [200, 201] });
  users[label] = response.json?.id ?? existing?.id;
  const signIn = curl({ method: "POST", url: `${baseUrl}/auth/v1/token?grant_type=password`, headers: anonHeaders, body: { email, password } }).json;
  assert(users[label] && signIn?.access_token, `Synthetic identity ${label} is unavailable.`);
  tokens[label] = signIn.access_token;
}
const roles = rest("role", { query: `select=id,tenant_id,code&tenant_id=in.(${tenantA},${tenantB})` }).json;
for (const [label, , tenantId, roleCode] of identities) {
  const role = roles.find((row) => row.tenant_id === tenantId && row.code === roleCode);
  assert(role, `Role ${roleCode} is missing.`);
  upsert("tenant_membership", { tenant_id: tenantId, user_id: users[label], role_id: role.id, status: "ACTIVE" }, "tenant_id,user_id");
}

const definitions = rest("connector_definition", { query: "select=id,code,connector_type,version" }).json;
for (const code of ["REGISTRY_TEST","GENERIC_REST","GENERIC_FILE_IMPORT","ERP_ADAPTER","MES_ADAPTER","PLM_ADAPTER","BMS_AGGREGATION"]) assert(definitions.some((row) => row.code === code), `Definition ${code} is missing.`);

const schema = insert("schema_definition", {
  code: `phase5.${suffix}`, sector_code: "synthetic", source_name: "Phase 5 verifier",
  name_en: "Phase 5 Integration Schema", name_zh: "Phase 5 Integration Schema", status: "draft",
  owner_type: "TENANT_EXTENSION", tenant_id: tenantA, created_by: users.admin,
});
const schemaVersion = insert("schema_version", { schema_definition_id: schema.id, version: "1.0.0", json_schema: { type: "object" }, status: "draft", created_by: users.admin });
const field = insert("field_definition", {
  schema_version_id: schemaVersion.id, field_code: `integration.metric.${suffix}`, json_pointer: `/integration/metric/${suffix}`,
  label_en: "Synthetic integration metric", label_zh: "Synthetic integration metric", data_type: "string",
  data_behavior: "STATIC", data_granularity: "MODEL", access_level_code: "INTERNAL", requirement_status: "VOLUNTARY",
  semantic_name: `phase5:${suffix}`, cardinality: "SINGLE", subject_levels: ["MODEL"], verification_requirement: {}, display_metadata: {}, resolution_policy: "MOST_SPECIFIC",
});
const dataSource = insert("data_source", { tenant_id: tenantA, source_type: "API", name: `Phase5 source ${suffix}`, trust_level: "SYSTEM_CONTROLLED", status: "ACTIVE", created_by: users.admin });
const mappingProfile = insert("mapping_profile", { tenant_id: tenantA, data_source_id: dataSource.id, target_schema_definition_id: schema.id, name: `Phase5 mapping ${suffix}`, status: "ACTIVE", created_by: users.admin });
const mappingVersion = insert("mapping_version", { tenant_id: tenantA, mapping_profile_id: mappingProfile.id, version: "1.0.0", status: "DRAFT", content_hash: sha(`phase5-mapping-${suffix}`), created_by: users.admin });
insert("mapping_rule", { tenant_id: tenantA, mapping_version_id: mappingVersion.id, source_pointer: "/metric", target_field_definition_id: field.id, transform_type: "IDENTITY", null_policy: "ERROR", lossiness: "LOSSLESS" });
rest("mapping_version", { method: "PATCH", query: `id=eq.${mappingVersion.id}`, body: { status: "ACTIVE", activated_at: new Date().toISOString() }, headers: { ...serviceHeaders, Prefer: "return=minimal" }, expected: [204] });

const models = {};
for (const kind of ["erp","mes","plm","bms"]) {
  models[kind] = insert("product_model", { tenant_id: tenantA, model_code: `P5-${kind}-${suffix}`.toUpperCase(), name: `Phase 5 ${kind.toUpperCase()} model`, product_category: "synthetic", sector: "verification", status: "ACTIVE", created_by: users.admin });
}
const item = insert("product_item", { tenant_id: tenantA, model_id: models.bms.id, serial_number: `A001-${suffix}`, status: "ACTIVE", created_by: users.admin });

const primaryResolver = rest("resolver_mapping", { query: `select=passport_id&tenant_id=eq.${tenantA}&mapping_type=eq.PRIMARY&status=eq.ACTIVE&order=created_at.desc&limit=1` }).json?.[0];
const passport = primaryResolver ? rest("dpp_passport", { query: `select=id,passport_identifier,schema_definition_id,subject_type,subject_id&id=eq.${primaryResolver.passport_id}` }).json?.[0] : null;
const priorVersion = passport ? rest("dpp_version", { query: `select=id,schema_version_id,publication_state&tenant_id=eq.${tenantA}&passport_id=eq.${passport.id}&order=created_at.desc&limit=1` }).json?.[0] : null;
assert(passport && priorVersion, "Phase 4 baseline Passport is unavailable.");

const localPort = 3031;
const localBaseUrl = `http://localhost:${localPort}`;
const webhookSecret = `phase5-webhook-${randomBytes(16).toString("hex")}`;
const server = spawn(process.execPath, [`--env-file=${envFile}`, "node_modules/next/dist/bin/next", "dev", "-p", String(localPort)], {
  cwd: process.cwd(), env: { ...process.env, NODE_ENV: "development", NODE_USE_ENV_PROXY: "1", PHASE5_WEBHOOK_SECRET: webhookSecret }, stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const probe = spawnSync("curl", ["-sS", "-o", "/dev/null", "-w", "%{http_code}", `${localBaseUrl}/api/v2/connectors`], { encoding: "utf8" });
    if (probe.status === 0 && probe.stdout !== "000") { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, `Development API did not start: ${serverLog.slice(-1500)}`);
  const apiHeaders = (label, tenantId = tenantA, key) => ({ Authorization: `Bearer ${tokens[label]}`, "x-tenant-id": tenantId, "x-correlation-id": `phase5-${suffix}-${randomUUID()}`, ...(key ? { "Idempotency-Key": key } : {}) });
  const api = (method, path, body, key, label = "admin", expected = [200], tenantId = tenantA, extraHeaders = {}) => curl({ method, url: localBaseUrl + path, headers: { ...apiHeaders(label, tenantId, key), ...extraHeaders }, body, expected });
  const post = (path, body, key, label = "admin", expected = [201], tenantId = tenantA) => api("POST", path, body, key, label, expected, tenantId);

  const review = post("/api/v2/passport-reviews", { passport_id: passport.id, schema_version_id: priorVersion.schema_version_id }, `p5-review-${suffix}`, "author").json?.data;
  assert(review?.status === "IN_REVIEW", "Phase 4 review baseline could not be resumed.");
  assert(post(`/api/v2/passport-reviews/${review.id}/approve`, {}, `p5-approve-${suffix}`, "reviewer", [200]).json?.data?.status === "APPROVED", "Review approval failed.");
  const version = post("/api/v2/publications", { review_task_id: review.id }, `p5-publish-${suffix}`, "publisher").json?.data;
  assert(version?.publication_state === "PUBLISHED", "A published immutable Version was not prepared for Registry testing.");
  const publicBefore = curl({ url: `${localBaseUrl}/api/v2/resolver/${encodeURIComponent(passport.passport_identifier)}?format=json` });
  assert(publicBefore.json?.payloadHash === version.payload_hash, "Resolver baseline is not bound to the current published Version.");

  const connectorIds = {};
  const createConnector = (definitionCode, name, extra = {}, expected = [201], label = "admin", tenantId = tenantA) => post("/api/v2/connectors", { definition_code: definitionCode, name: `${name} ${suffix}`, environment: "DEVELOPMENT", status: "ACTIVE", config_json: {}, ...extra }, `p5-connector-${name}-${suffix}`, label, expected, tenantId).json?.data;
  const productionReject = post("/api/v2/connectors", { definition_code: "GENERIC_REST", name: `Forbidden ${suffix}`, environment: "PRODUCTION", status: "ACTIVE" }, `p5-production-${suffix}`, "admin", [409]);
  assert(productionReject.json?.error?.code === "CONNECTOR_CONFIG_INVALID", "Production Connector was not rejected.");
  assert(post("/api/v2/connectors", { definition_code: "GENERIC_REST", name: `Readonly ${suffix}`, environment: "DEVELOPMENT" }, `p5-readonly-${suffix}`, "readOnly", [403]).status === 403, "Read-only user created a Connector.");

  connectorIds.rest = createConnector("GENERIC_REST", "REST", { config_json: { hostAllowlist: ["169.254.169.254", "localhost"] } }).id;
  assert(post(`/api/v2/connectors/${connectorIds.rest}/test`, {}, undefined, "admin", [200]).json?.data?.destructiveWritePerformed === false, "Connector test performed a destructive write.");
  assert(post(`/api/v2/connectors/${connectorIds.rest}/test`, { url: "http://169.254.169.254/latest/meta-data" }, undefined, "admin", [400]).json?.error?.code === "CONNECTOR_HOST_NOT_ALLOWED", "Metadata SSRF target was not rejected.");
  assert(post(`/api/v2/connectors/${connectorIds.rest}/test`, { url: "file:///etc/passwd" }, undefined, "admin", [400]).json?.error?.code === "CONNECTOR_HOST_NOT_ALLOWED", "file:// SSRF target was not rejected.");

  connectorIds.rateLimit = createConnector("GENERIC_REST", "RATE-LIMIT", { rate_limit_profile: { perMinute: 1, burst: 1 } }).id;
  const consumed = rpc("v2_phase5_consume_rate_limit", {
    p_tenant_id: tenantA, p_connector_instance_id: connectorIds.rateLimit,
    p_credential_reference_id: null, p_route_key: "connectors.test",
  });
  assert(consumed?.[0]?.allowed === true, "The first atomic rate-limit token was not granted.");
  let limited = post(`/api/v2/connectors/${connectorIds.rateLimit}/test`, {}, undefined, "admin", [200, 429]);
  if (limited.status === 200) limited = post(`/api/v2/connectors/${connectorIds.rateLimit}/test`, {}, undefined, "admin", [429]);
  assert(limited.json?.error?.code === "CONNECTOR_RATE_LIMITED", "Per Connector/Tenant/credential-scope/route limit was not enforced.");

  const credential = post(`/api/v2/connectors/${connectorIds.rest}/credentials`, { secret_provider: "DEVELOPMENT_SECRET_MANAGER", secret_reference: "dev-secret://phase5/rest", credential_type: "API_KEY", owner_reference: "fixture" }, `p5-credential-${suffix}`).json?.data;
  assert(credential?.configured === true && !Object.hasOwn(credential, "secret_reference"), "Credential metadata leaked a secret reference.");
  const tokenHeaders = { apikey: anonKey, Authorization: `Bearer ${tokens.admin}` };
  const rawCredentialRead = rest("connector_credential_reference", { query: "select=secret_reference&limit=1", headers: tokenHeaders, expected: [401, 403] });
  assert([401, 403].includes(rawCredentialRead.status), "Authenticated SQL API exposed credential reference internals.");

  const queued = post(`/api/v2/connectors/${connectorIds.rest}/jobs`, { job_type: "REST_SYNC", direction: "OUTBOUND", operation_snapshot: { method: "GET", path: "/safe" } }, `p5-job-cancel-${suffix}`, "admin", [202]).json?.data;
  assert(post(`/api/v2/connector-jobs/${queued.id}/cancel`, {}, `p5-cancel-${suffix}`, "admin", [200]).json?.data?.status === "CANCELLED", "Queued Job cancellation failed.");
  const retryable = post(`/api/v2/connectors/${connectorIds.rest}/jobs`, { job_type: "REST_SYNC", direction: "OUTBOUND" }, `p5-job-retry-${suffix}`, "admin", [202]).json?.data;
  rest("connector_job", { method: "PATCH", query: `id=eq.${retryable.id}`, body: { status: "FAILED", finished_at: new Date().toISOString() }, headers: { ...serviceHeaders, Prefer: "return=minimal" }, expected: [204] });
  assert(post(`/api/v2/connector-jobs/${retryable.id}/retry`, {}, `p5-retry-${suffix}`, "admin", [202]).json?.data?.status === "QUEUED", "Retry did not requeue the Job.");

  connectorIds.file = createConnector("GENERIC_FILE_IMPORT", "FILE", { data_source_id: dataSource.id, mapping_profile_id: mappingProfile.id }).id;
  const preflight = post("/api/v2/imports", { connector_instance_id: connectorIds.file, mapping_version_id: mappingVersion.id, file_format: "CSV", content: "metric,unknown\nalpha,drift", action: "PREFLIGHT" }, `p5-preflight-${suffix}`, "admin", [200]).json?.data;
  assert(preflight?.dryRun?.unmappedFields?.includes("unknown"), "File Import preflight did not report schema drift.");
  const dryRun = post("/api/v2/imports", { connector_instance_id: connectorIds.file, mapping_version_id: mappingVersion.id, file_format: "JSON", content: '[{"metric":"alpha"}]', action: "DRY_RUN" }, `p5-dryrun-${suffix}`, "admin", [200]).json?.data;
  assert(dryRun?.dryRun?.status === "PASS", "File Import Dry Run failed.");

  for (const [kind, definitionCode] of [["erp","ERP_ADAPTER"],["mes","MES_ADAPTER"],["plm","PLM_ADAPTER"]]) {
    const connector = createConnector(definitionCode, kind.toUpperCase(), { data_source_id: dataSource.id, mapping_profile_id: mappingProfile.id });
    connectorIds[kind] = connector.id;
    const result = post("/api/v2/imports", { connector_instance_id: connector.id, mapping_version_id: mappingVersion.id, file_format: "JSON", content: JSON.stringify([{ metric: `${kind}-${suffix}` }]), action: "COMMIT", subject_type: "MODEL", subject_id: models[kind].id }, `p5-import-${kind}-${suffix}`, "admin", [201]).json?.data;
    assert(result?.canonicalClaimsCreated === 1, `${kind.toUpperCase()} did not produce a traceable Canonical Claim.`);
  }
  const importedClaims = rest("canonical_claim", { query: `select=id,subject_id,provenance_record_id&tenant_id=eq.${tenantA}&field_definition_id=eq.${field.id}` }).json;
  assert(importedClaims.length === 3 && importedClaims.every((claim) => claim.provenance_record_id), "ERP/MES/PLM provenance chain is incomplete.");

  connectorIds.registryAccepted = createConnector("REGISTRY_TEST", "REGISTRY-ACCEPT").id;
  const acceptedKey = `p5-registry-accepted-${suffix}`;
  const accepted = post("/api/v2/registry-submissions", { connector_instance_id: connectorIds.registryAccepted, version_id: version.id, registry_profile: "TEST_GENERIC_V1", fixture_mode: "ACCEPTED" }, acceptedKey, "admin").json?.data;
  assert(accepted?.submission?.state === "ACCEPTED" && accepted.externalIdentifierMapping?.external_identifier_type === "REGISTRY_ID", "Accepted Registry submission or external ID mapping failed.");
  const acceptedReplay = post("/api/v2/registry-submissions", { connector_instance_id: connectorIds.registryAccepted, version_id: version.id, registry_profile: "TEST_GENERIC_V1", fixture_mode: "ACCEPTED" }, acceptedKey, "admin").json?.data;
  assert(acceptedReplay.submission.id === accepted.submission.id, "Registry idempotency replay failed.");
  const draftReject = post("/api/v2/registry-submissions", { connector_instance_id: connectorIds.registryAccepted, version_id: priorVersion.id, fixture_mode: "ACCEPTED" }, `p5-registry-draft-${suffix}`, "admin", [409]);
  assert(draftReject.json?.error?.code === "REGISTRY_VERSION_NOT_PUBLISHED", "Non-published Version was submitted to Registry.");

  connectorIds.registryRejected = createConnector("REGISTRY_TEST", "REGISTRY-REJECT").id;
  const rejected = post("/api/v2/registry-submissions", { connector_instance_id: connectorIds.registryRejected, version_id: version.id, fixture_mode: "REJECTED" }, `p5-registry-rejected-${suffix}`, "admin").json?.data;
  assert(rejected?.submission?.state === "REJECTED", "Registry rejection was not retained separately.");
  const stillPublished = rest("dpp_version", { query: `select=publication_state&id=eq.${version.id}` }).json?.[0];
  assert(stillPublished?.publication_state === "PUBLISHED", "Registry rejection changed local publication state.");
  assert(curl({ url: `${localBaseUrl}/api/v2/resolver/${encodeURIComponent(passport.passport_identifier)}?format=json` }).status === 200, "Registry rejection broke Resolver/Public DPP.");

  connectorIds.registryTimeout = createConnector("REGISTRY_TEST", "REGISTRY-TIMEOUT").id;
  const pending = post("/api/v2/registry-submissions", { connector_instance_id: connectorIds.registryTimeout, version_id: version.id, fixture_mode: "TIMEOUT" }, `p5-registry-timeout-${suffix}`, "admin").json?.data;
  assert(pending?.submission?.state === "SUBMITTED" && pending.submission.externalStatus === "PENDING", "Registry timeout did not enter bounded polling state.");
  const polled = post(`/api/v2/registry-submissions/${pending.submission.id}/poll`, { fixture_mode: "ACCEPTED" }, `p5-registry-poll-${suffix}`, "admin", [200]).json?.data;
  assert(polled?.submission?.state === "ACCEPTED", "Registry polling did not reach ACCEPTED.");
  assert(curl({ url: `${localBaseUrl}/api/v2/resolver/${encodeURIComponent(passport.passport_identifier)}?format=json` }).status === 200, "Registry timeout/polling broke Resolver/Public DPP.");

  connectorIds.bms = createConnector("BMS_AGGREGATION", "BMS", { config_json: { webhookKey: `bms-${suffix}` }, rate_limit_profile: { perMinute: 60, burst: 10 }, retry_profile: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000, backoffMode: "EXPONENTIAL" } }).id;
  const baseTime = Date.now() - 60_000;
  const samples = [
    { eventId: `bms-1-${suffix}`, deviceId: "Device-A", itemId: item.id, timestamp: new Date(baseTime).toISOString(), soc: 80, temperature: 20, voltage: 48, current: 2 },
    { eventId: `bms-2-${suffix}`, deviceId: "Device-A", itemId: item.id, timestamp: new Date(baseTime + 30_000).toISOString(), soc: 70, soh: 96, temperature: 55, voltage: 47, current: 3 },
  ];
  const bms = post("/api/v2/bms/aggregate", { connector_instance_id: connectorIds.bms, device_id: "Device-A", item_id: item.id, samples, thresholds: { temperature: { max: 50 } }, claim_rule: { enabled: false, metric: "soc", fieldDefinitionId: field.id, schemaVersionId: schemaVersion.id } }, `p5-bms-${suffix}`).json?.data;
  assert(bms?.snapshot?.sample_count === 2 && bms.claimCreated === false, "BMS aggregation did not preserve the telemetry boundary.");
  assert(post("/api/v2/bms/aggregate", { connector_instance_id: connectorIds.bms, device_id: "Device-A", item_id: item.id, samples: [{ ...samples[0], itemId: randomUUID() }] }, `p5-bms-invalid-${suffix}`, "admin", [409]).json?.error?.code === "BMS_DEVICE_BINDING_INVALID", "Invalid BMS item binding was not rejected.");
  const bmsReplay = post("/api/v2/bms/aggregate", { connector_instance_id: connectorIds.bms, device_id: "Device-A", item_id: item.id, samples }, `p5-bms-idempotent-${suffix}`).json?.data;
  assert(bmsReplay?.idempotent === true, "Duplicate BMS aggregate was not idempotent.");

  const hmacCredential = post(`/api/v2/connectors/${connectorIds.bms}/credentials`, { secret_provider: "ENVIRONMENT", secret_reference: "env://PHASE5_WEBHOOK_SECRET", credential_type: "HMAC", owner_reference: "webhook" }, `p5-webhook-credential-${suffix}`).json?.data;
  rest("connector_credential_reference", { method: "PATCH", query: `id=eq.${hmacCredential.id}`, body: { status: "VERIFIED", last_verified_at: new Date().toISOString() }, headers: { ...serviceHeaders, Prefer: "return=minimal" }, expected: [204] });
  const webhookBody = JSON.stringify({ eventId: `evt-${suffix}`, externalRequestId: accepted.submission.id, status: "ACCEPTED" });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", webhookSecret).update(`${timestamp}.${webhookBody}`).digest("hex");
  const webhookHeaders = { "content-type": "application/json", "x-webhook-key": `bms-${suffix}`, "x-event-id": `evt-${suffix}`, "x-timestamp": timestamp, "x-signature": `sha256=${signature}` };
  const webhook = curl({ method: "POST", url: `${localBaseUrl}/api/v2/webhooks/BMS_AGGREGATION`, headers: webhookHeaders, rawBody: webhookBody, expected: [202] });
  assert(webhook.json?.data?.accepted === true, "Valid webhook signature was rejected.");
  assert(curl({ method: "POST", url: `${localBaseUrl}/api/v2/webhooks/BMS_AGGREGATION`, headers: webhookHeaders, rawBody: webhookBody, expected: [200] }).json?.data?.duplicate === true, "Duplicate webhook was not idempotent.");
  assert(curl({ method: "POST", url: `${localBaseUrl}/api/v2/webhooks/BMS_AGGREGATION`, headers: { ...webhookHeaders, "x-event-id": `bad-${suffix}`, "x-signature": `sha256=${"0".repeat(64)}` }, rawBody: webhookBody, expected: [401] }).json?.error?.code === "WEBHOOK_SIGNATURE_INVALID", "Invalid webhook signature was accepted.");
  const expiredTimestamp = String(Number(timestamp) - 1000);
  const expiredSignature = createHmac("sha256", webhookSecret).update(`${expiredTimestamp}.${webhookBody}`).digest("hex");
  assert(curl({ method: "POST", url: `${localBaseUrl}/api/v2/webhooks/BMS_AGGREGATION`, headers: { ...webhookHeaders, "x-event-id": `expired-${suffix}`, "x-timestamp": expiredTimestamp, "x-signature": `sha256=${expiredSignature}` }, rawBody: webhookBody, expected: [401] }).json?.error?.code === "WEBHOOK_REPLAY_DETECTED", "Expired webhook timestamp was accepted.");

  const definitionRest = definitions.find((row) => row.code === "GENERIC_REST");
  const foreignConnector = insert("connector_instance", { tenant_id: tenantB, connector_definition_id: definitionRest.id, name: `Foreign ${suffix}`, environment: "DEVELOPMENT", status: "ACTIVE", config_json: {}, created_by: users.tenantB });
  const crossTenant = api("GET", `/api/v2/connectors/${foreignConnector.id}`, undefined, undefined, "admin", [404], tenantA);
  assert(crossTenant.status === 404, "Tenant A discovered Tenant B Connector.");

  const observability = rest("connector_observability", { query: `select=connector_instance_id,job_count,retry_count,dead_letter_count,rate_limited_count,webhook_reject_count,bms_sample_count&tenant_id=eq.${tenantA}` }).json;
  assert(observability.length > 0, "Connector observability view is empty.");
  assert(observability.some((row) => row.connector_instance_id === connectorIds.rateLimit && Number(row.rate_limited_count) >= 1), "Rate-limit observability did not record the rejection.");
  const auditEvents = rest("connector_audit_event", { query: `select=event_type&tenant_id=eq.${tenantA}` }).json.map((row) => row.event_type);
  for (const event of ["connector.create","connector.execute","connector.retry","connector.cancel","credential.configure","registry.submit","registry.status-change"]) assert(auditEvents.includes(event), `Audit event ${event} is missing.`);

  console.log(JSON.stringify({
    status: "PASS", migration: "0031", projectRefFingerprint: target.projectRefFingerprint,
    connectors: Object.keys(connectorIds).length, registryStates: [accepted.submission.state, rejected.submission.state, polled.submission.state],
    importAdapters: ["ERP","MES","PLM"], bmsSamplesAggregated: samples.length,
    webhook: "signature/replay/idempotency PASS", resolverIsolation: "PASS", productionWritePerformed: false,
  }));
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!server.killed) server.kill("SIGKILL");
}
