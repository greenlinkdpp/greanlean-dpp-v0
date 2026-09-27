import { createHash, randomBytes, randomUUID } from "node:crypto";
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", input: options.input, maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || command + " failed").trim());
  return result.stdout;
}

function curl({ method = "GET", url, headers = {}, body, expected = [200] }) {
  const args = ["-sS", "--max-time", "90", "-X", method, "-w", "\n%{http_code}"];
  for (const [name, value] of Object.entries(headers)) args.push("-H", name + ": " + value);
  if (body !== undefined) args.push("-H", "content-type: application/json", "--data", JSON.stringify(body));
  args.push(url);
  const stdout = run("curl", args);
  const split = stdout.lastIndexOf("\n");
  const responseBody = split < 0 ? "" : stdout.slice(0, split);
  const status = Number(stdout.slice(split + 1));
  let json = null;
  if (responseBody) try { json = JSON.parse(responseBody); } catch {}
  if (!expected.includes(status)) {
    const safe = json ? JSON.stringify({ code: json.error?.code ?? json.code, message: json.error?.message ?? json.message }) : responseBody.slice(0, 500);
    throw new Error(method + " " + new URL(url).pathname + " returned " + status + ": " + safe);
  }
  return { status, json, body: responseBody };
}

const guard = spawnSync(process.execPath, [guardScript, "--env-file", envFile, "--json"], { encoding: "utf8" });
if (guard.status !== 0) throw new Error((guard.stderr || guard.stdout || "Development guard failed").trim());
const target = JSON.parse(guard.stdout);
const env = parseEnv(await readFile(envFile, "utf8"));
for (const flag of ["FEATURE_V2_SCHEMA_CORE", "FEATURE_V2_CANONICAL_DATA", "FEATURE_V2_PROVENANCE", "FEATURE_V2_RESOLUTION_ENGINE"]) {
  assert(env[flag] === "true", flag + " must be enabled in Development.");
}
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
assert(baseUrl && anonKey && serviceKey, "Development credentials are incomplete.");
const serviceHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey };
const anonHeaders = { apikey: anonKey };

function rest(table, { method = "GET", query = "", body, headers = serviceHeaders, expected = [200] } = {}) {
  return curl({ method, url: baseUrl + "/rest/v1/" + table + (query ? "?" + query : ""), headers, body, expected });
}

function upsert(table, body, onConflict = "id") {
  return rest(table, { method: "POST", query: "on_conflict=" + encodeURIComponent(onConflict), body,
    headers: { ...serviceHeaders, Prefer: "resolution=merge-duplicates,return=representation" }, expected: [200, 201] }).json;
}

const requiredTables = ["data_source", "source_record", "mapping_profile", "mapping_version", "mapping_rule", "transformation_result", "provenance_record", "canonical_claim"];
for (const table of requiredTables) assert(rest(table, { query: "select=id&limit=1" }).status === 200, table + " is unavailable.");
assert(rest("schema_definition", { query: "select=id,owner_type,tenant_id&limit=1" }).status === 200, "Schema extension columns are unavailable.");
assert(rest("field_definition", { query: "select=id,semantic_name,cardinality,subject_levels,resolution_policy&limit=1" }).status === 200, "Field extension columns are unavailable.");
const ledger = rest("greanlean_migration_ledger", { query: "select=migration_number&migration_number=eq.0029" }).json;
assert(ledger?.length === 1, "Migration ledger does not contain 0029.");

const password = "Phase3-" + randomBytes(24).toString("base64url") + "!";
const userList = curl({ url: baseUrl + "/auth/v1/admin/users?page=1&per_page=1000", headers: serviceHeaders }).json?.users || [];
const identities = [
  ["userA", "user-a@phase1.greanlean.invalid"],
  ["userB", "user-b@phase1.greanlean.invalid"],
  ["partnerUser", "partner-user@phase1.greanlean.invalid"],
  ["readOnlyUser", "read-only@phase2.greanlean.invalid"],
];
const users = {};
const tokens = {};
for (const [label, email] of identities) {
  const existing = userList.find((user) => user.email === email);
  const payload = { email, password, email_confirm: true, user_metadata: { synthetic: true, fixture: "v2-phase3", label } };
  const response = existing
    ? curl({ method: "PUT", url: baseUrl + "/auth/v1/admin/users/" + existing.id, headers: serviceHeaders, body: payload })
    : curl({ method: "POST", url: baseUrl + "/auth/v1/admin/users", headers: serviceHeaders, body: payload, expected: [200, 201] });
  users[label] = response.json?.id ?? existing?.id;
  const signIn = curl({ method: "POST", url: baseUrl + "/auth/v1/token?grant_type=password", headers: anonHeaders, body: { email, password } }).json;
  assert(users[label] && signIn?.access_token, "Synthetic Auth identity " + label + " is unavailable.");
  tokens[label] = signIn.access_token;
}

const ids = {
  tenantA: "11111111-1111-4111-8111-111111111111",
  tenantB: "22222222-2222-4222-8222-222222222222",
  modelA: "22000000-0000-4000-8000-000000000001",
  modelB: "22000000-0000-4000-8000-000000000003",
  skuA: "23000000-0000-4000-8000-000000000001",
  batchA: "24000000-0000-4000-8000-000000000001",
  itemA: "26000000-0000-4000-8000-000000000004",
};
for (const [table, id] of [["tenant", ids.tenantA], ["tenant", ids.tenantB], ["product_model", ids.modelA], ["product_model", ids.modelB], ["product_item", ids.itemA]]) {
  assert(rest(table, { query: "select=id&id=eq." + id }).json?.length === 1, "Phase 2 fixture is missing: " + table + ". Run verify:v2:phase2 first.");
}
const authenticatedHeaders = (label) => ({ apikey: anonKey, Authorization: "Bearer " + tokens[label] });

const suffix = Date.now().toString(36) + randomBytes(3).toString("hex");
const localPort = 3029;
const localBaseUrl = "http://127.0.0.1:" + localPort;
const server = spawn(process.execPath, [`--env-file=${envFile}`, "node_modules/next/dist/bin/next", "dev", "-p", String(localPort)], {
  cwd: process.cwd(), env: { ...process.env, NODE_ENV: "development", NODE_USE_ENV_PROXY: "1" }, stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const probe = spawnSync("curl", ["-sS", "-o", "/dev/null", "-w", "%{http_code}", localBaseUrl + "/api/v2/schemas"], { encoding: "utf8" });
    if (probe.status === 0 && probe.stdout !== "000") { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, "Development API did not start: " + serverLog.slice(-1200));
  const apiHeaders = (label, tenantId, correlationId, idempotencyKey) => ({
    Authorization: "Bearer " + tokens[label], "x-tenant-id": tenantId, "x-correlation-id": correlationId,
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  });
  const apiPost = (path, body, key, label = "userA", tenantId = ids.tenantA, expected = [201]) => curl({
    method: "POST", url: localBaseUrl + path,
    headers: apiHeaders(label, tenantId, "phase3-" + suffix + "-" + randomUUID(), key), body, expected,
  });

  const schemaBody = { code: "phase3." + suffix, sector_code: "synthetic", source_name: "Phase 3 verifier", name_en: "Phase 3 Test Schema", name_zh: "Phase 3 测试模式", status: "draft" };
  const schemaKey = "p3-schema-" + suffix;
  const schema = apiPost("/api/v2/schemas", schemaBody, schemaKey).json?.data;
  assert(schema?.owner_type === "TENANT_EXTENSION" && schema.tenant_id === ids.tenantA, "Tenant Schema extension creation failed.");
  const schemaReplay = apiPost("/api/v2/schemas", schemaBody, schemaKey).json?.data;
  assert(schemaReplay?.id === schema.id, "Persistent idempotent Schema replay failed.");
  const schemaConflict = apiPost("/api/v2/schemas", { ...schemaBody, name_en: "Changed" }, schemaKey, "userA", ids.tenantA, [409]);
  assert(schemaConflict.json?.error?.code === "IDEMPOTENCY_KEY_REUSED", "Idempotency conflict was not rejected.");

  const version = apiPost("/api/v2/schema-versions", {
    schema_definition_id: schema.id, version: "1.0.0", source_version: "phase3-test", json_schema: { type: "object" }, status: "draft",
  }, "p3-version-" + suffix).json?.data;
  assert(version?.id, "Schema version creation failed.");

  const fieldSpecs = [
    ["manufacturer.name", "Manufacturer name", "制造商名称", "string", null, ["MODEL"], "CONFIRMED_MANDATORY", "MOST_SPECIFIC"],
    ["battery.rated_capacity", "Rated capacity", "额定容量", "decimal", "Ah", ["MODEL", "SKU", "BATCH", "ITEM"], "CONFIRMED_MANDATORY", "NO_AMBIGUITY_ALLOWED"],
    ["manufacturing.date", "Manufacturing date", "生产日期", "date", null, ["MODEL", "BATCH", "ITEM"], "CONFIRMED_MANDATORY", "MOST_SPECIFIC"],
    ["item.serial_number", "Serial number", "序列号", "string", null, ["ITEM"], "CONFIRMED_MANDATORY", "ITEM_PREFERRED"],
    ["carbon.footprint", "Carbon footprint", "碳足迹", "decimal", "kg", ["MODEL", "SKU", "BATCH"], "VOLUNTARY", "BATCH_PREFERRED"],
  ];
  const fields = {};
  for (let index = 0; index < fieldSpecs.length; index += 1) {
    const [code, en, zh, dataType, unit, subjectLevels, requirement, policy] = fieldSpecs[index];
    const field = apiPost("/api/v2/field-definitions", {
      schema_version_id: version.id, field_code: code, json_pointer: "/" + code.replaceAll(".", "/"), label_en: en, label_zh: zh,
      data_type: dataType, unit_code: unit, data_behavior: "STATIC", data_granularity: subjectLevels.includes("ITEM") ? "ITEM" : subjectLevels.includes("BATCH") ? "BATCH" : "MODEL",
      access_level_code: code === "item.serial_number" ? "INTERNAL" : "PUBLIC", requirement_status: requirement,
      semantic_name: "https://schema.greanlean.invalid/" + code, cardinality: "SINGLE", subject_levels: subjectLevels,
      verification_requirement: {}, display_metadata: { order: index + 1 }, resolution_policy: policy,
    }, "p3-field-" + suffix + "-" + index).json?.data;
    assert(field?.id, "Field definition creation failed for " + code + ".");
    fields[code] = field;
  }

  const dataSource = apiPost("/api/v2/data-sources", {
    source_type: "JSON", name: "Phase 3 source " + suffix, system_identifier: "phase3:" + suffix, trust_level: "UNVERIFIED", status: "ACTIVE", residency_classification: "SYNTHETIC",
  }, "p3-source-" + suffix).json?.data;
  assert(dataSource?.id, "Data Source creation failed.");
  const sourcePayload = { manufacturer: "  GreanLean Test  ", capacity: "15000", ignored: "explicit dry-run warning" };
  const sourceRecord = apiPost("/api/v2/source-records", {
    data_source_id: dataSource.id, external_record_id: "phase3-" + suffix, subject_type: "MODEL", subject_id: ids.modelA,
    payload_mode: "RAW_STORED", payload_json: sourcePayload,
    payload_hash: createHash("sha256").update(JSON.stringify(sourcePayload)).digest("hex"), classification: "INTERNAL", status: "RECEIVED",
  }, "p3-record-" + suffix).json?.data;
  assert(sourceRecord?.id, "Source Record creation failed.");
  const profile = apiPost("/api/v2/mapping-profiles", {
    data_source_id: dataSource.id, target_schema_definition_id: schema.id, name: "Phase 3 mapping " + suffix, status: "ACTIVE",
  }, "p3-profile-" + suffix).json?.data;
  assert(profile?.id, "Mapping Profile creation failed.");
  const mapping = apiPost("/api/v2/mapping-versions", {
    mapping_profile_id: profile.id, version: "1.0.0", status: "ACTIVE", rules: [
      { source_pointer: "/manufacturer", target_field_definition_id: fields["manufacturer.name"].id, transform_type: "TRIM", transform_config: {}, condition_config: {}, null_policy: "ERROR", lossiness: "LOSSLESS" },
      { source_pointer: "/capacity", target_field_definition_id: fields["battery.rated_capacity"].id, source_unit: "mAh", transform_type: "UNIT_CONVERT", transform_config: { conversionVersion: "units-v1", precision: 3 }, condition_config: {}, null_policy: "ERROR", lossiness: "LOSSLESS" },
    ],
  }, "p3-mapping-" + suffix).json?.data;
  assert(mapping?.id && mapping.status === "ACTIVE", "Active Mapping version creation failed.");

  const dryRun = apiPost("/api/v2/mapping-versions/" + mapping.id + "/dry-run", { source_record_id: sourceRecord.id }, undefined, "userA", ids.tenantA, [200]).json?.data;
  assert(dryRun?.fields?.some((field) => field.fieldCode === "battery.rated_capacity" && field.value === 15), "Dry Run unit conversion failed.");
  assert(dryRun?.warnings?.some((warning) => warning.code === "MAPPING_UNMAPPED_FIELD"), "Dry Run did not report unmapped data.");

  const immutableRule = rest("mapping_rule", { method: "PATCH", query: "mapping_version_id=eq." + mapping.id,
    body: { source_pointer: "/forbidden" }, headers: { ...serviceHeaders, Prefer: "return=representation" }, expected: [400, 409] });
  assert([400, 409].includes(immutableRule.status), "Active Mapping rules were mutable.");
  const mappingV2 = apiPost("/api/v2/mapping-versions", {
    mapping_profile_id: profile.id, version: "2.0.0", status: "DRAFT", rules: [
      { source_pointer: "/manufacturer", target_field_definition_id: fields["manufacturer.name"].id, transform_type: "TRIM", transform_config: {}, condition_config: {}, null_policy: "ERROR", lossiness: "LOSSLESS" },
    ],
  }, "p3-mapping-v2-" + suffix).json?.data;
  assert(mappingV2?.status === "DRAFT", "New Mapping version could not be drafted.");

  const commitBody = { source_record_id: sourceRecord.id, subject_type: "MODEL", subject_id: ids.modelA, schema_version_id: version.id, accept_warnings: true };
  const commitKey = "p3-commit-" + suffix;
  const committed = apiPost("/api/v2/mapping-versions/" + mapping.id + "/commit", commitBody, commitKey).json?.data;
  assert(committed?.claims?.length === 2 && committed.warnings.length > 0, "Mapping commit did not persist two Claims and warnings.");
  const commitReplay = apiPost("/api/v2/mapping-versions/" + mapping.id + "/commit", commitBody, commitKey).json?.data;
  assert(commitReplay?.transformation?.id === committed.transformation.id, "Mapping commit replay created a second result.");
  const capacityProvenance = rest("provenance_record", { query: "select=normalized_value_reference&transformation_result_id=eq." + committed.transformation.id + "&field_definition_id=eq." + fields["battery.rated_capacity"].id }).json?.[0];
  assert(capacityProvenance?.normalized_value_reference?.conversionVersion === "units-v1", "Provenance omitted conversion version.");

  const manualClaim = (name, body) => apiPost("/api/v2/canonical-claims", body, "p3-claim-" + suffix + "-" + name).json?.data;
  const oldManufacturer = committed.claims.find((claim) => claim.field_definition_id === fields["manufacturer.name"].id);
  const replacementManufacturer = manualClaim("manufacturer", { subject_type: "MODEL", subject_id: ids.modelA, field_definition_id: fields["manufacturer.name"].id, schema_version_id: version.id, resolution_state: "OVERRIDE", value_json: "GreanLean Verified Test", supersedes_claim_id: oldManufacturer.id, evidence_references: [] });
  const skuCapacity = manualClaim("sku-capacity", { subject_type: "SKU", subject_id: ids.skuA, field_definition_id: fields["battery.rated_capacity"].id, schema_version_id: version.id, resolution_state: "OVERRIDE", value_json: 14, canonical_unit: "Ah" });
  const batchCapacity = manualClaim("batch-capacity", { subject_type: "BATCH", subject_id: ids.batchA, field_definition_id: fields["battery.rated_capacity"].id, schema_version_id: version.id, resolution_state: "OVERRIDE", value_json: 16, canonical_unit: "Ah" });
  manualClaim("manufacturing", { subject_type: "MODEL", subject_id: ids.modelA, field_definition_id: fields["manufacturing.date"].id, schema_version_id: version.id, resolution_state: "OVERRIDE", value_json: "2026-01-15" });
  manualClaim("serial-unknown", { subject_type: "ITEM", subject_id: ids.itemA, field_definition_id: fields["item.serial_number"].id, schema_version_id: version.id, resolution_state: "UNKNOWN", value_json: null });
  manualClaim("sku-carbon", { subject_type: "SKU", subject_id: ids.skuA, field_definition_id: fields["carbon.footprint"].id, schema_version_id: version.id, resolution_state: "OVERRIDE", value_json: 91, canonical_unit: "kg" });
  manualClaim("batch-carbon", { subject_type: "BATCH", subject_id: ids.batchA, field_definition_id: fields["carbon.footprint"].id, schema_version_id: version.id, resolution_state: "OVERRIDE", value_json: 88, canonical_unit: "kg" });
  assert(replacementManufacturer?.id && skuCapacity?.id && batchCapacity?.id, "Manual Claim creation failed.");

  const resolvedUrl = localBaseUrl + "/api/v2/products/ITEM/" + ids.itemA + "/resolved-data?schema_version_id=" + version.id;
  const resolved = curl({ url: resolvedUrl, headers: apiHeaders("userA", ids.tenantA, "p3-resolve-" + suffix) }).json?.data;
  assert(resolved?.artifactType === "RESOLVED_PRODUCT_CANDIDATE", "Resolution did not return a Candidate artifact.");
  assert(resolved?.validationSummary?.issues?.some((issue) => issue.code === "RESOLUTION_CONFLICT"), "SKU/Batch conflict was not surfaced.");
  assert(resolved?.validationSummary?.issues?.some((issue) => issue.code === "REQUIRED_VALUE_UNKNOWN"), "Required UNKNOWN value was not blocking.");
  assert(resolved?.resolvedFields?.some((field) => field.fieldCode === "carbon.footprint" && field.value === 88), "BATCH_PREFERRED policy did not resolve the conflict.");
  assert(resolved?.resolvedFields?.some((field) => field.claimId === replacementManufacturer.id), "Superseded Claim remained effective.");
  assert(resolved?.validationSummary?.status === "BLOCKING" && resolved?.dataQualitySummary?.provenanceCoverage?.percentage === 100, "Validation or provenance coverage is incorrect.");

  const tenantADataSources = rest("data_source", { query: "select=id,tenant_id", headers: authenticatedHeaders("userA") }).json;
  assert(tenantADataSources.some((row) => row.id === dataSource.id) && !tenantADataSources.some((row) => row.tenant_id === ids.tenantB), "Tenant RLS isolation failed.");
  const partnerAuthorization = rest("partner_tenant_authorization", {
    query: "select=id&tenant_id=eq." + ids.tenantA + "&status=eq.ACTIVE&limit=1",
  }).json?.[0];
  assert(partnerAuthorization?.id, "Active Partner authorization is missing.");
  rest("scope_grant", {
    method: "DELETE",
    query: "grantee_type=eq.PARTNER_AUTHORIZATION&grantee_id=eq." + partnerAuthorization.id + "&resource_type=eq.CANONICAL_CLAIM",
    headers: { ...serviceHeaders, Prefer: "return=minimal" },
    expected: [200, 204],
  });
  upsert("scope_grant", {
    id: randomUUID(), tenant_id: ids.tenantA, grantee_type: "PARTNER_AUTHORIZATION", grantee_id: partnerAuthorization.id,
    resource_type: "CANONICAL_CLAIM", resource_id: skuCapacity.id, effect: "ALLOW", status: "ACTIVE", created_by: users.userA,
  });
  const partnerClaims = rest("canonical_claim", { query: "select=id,tenant_id", headers: authenticatedHeaders("partnerUser") }).json;
  assert(partnerClaims.some((row) => row.id === skuCapacity.id) && partnerClaims.every((row) => row.id === skuCapacity.id), "Partner exact Claim scope failed.");
  const partnerProvenance = rest("provenance_record", { query: "select=id", headers: authenticatedHeaders("partnerUser") }).json;
  const partnerSources = rest("source_record", { query: "select=id", headers: authenticatedHeaders("partnerUser") }).json;
  assert(partnerProvenance.length === 0 && partnerSources.length === 0, "Claim visibility leaked Provenance or Source Records.");
  const forged = curl({ url: localBaseUrl + "/api/v2/canonical-claims", headers: apiHeaders("userA", ids.tenantB, "p3-forged-" + suffix), expected: [403] });
  assert(forged.json?.error?.code === "TENANT_RELATIONSHIP_REQUIRED", "Forged Tenant context was not denied.");
  const readOnly = apiPost("/api/v2/mapping-versions/" + mapping.id + "/commit", commitBody, "p3-read-only-" + suffix, "readOnlyUser", ids.tenantA, [403]);
  assert(readOnly.json?.error?.code === "CAPABILITY_DENIED", "Read Only actor could commit a Mapping.");

  const globalSchema = rest("schema_definition", { query: "select=id&owner_type=eq.GLOBAL&status=eq.active&limit=1" }).json?.[0]
    || rest("schema_definition", { query: "select=id&owner_type=eq.GLOBAL&limit=1" }).json?.[0];
  assert(globalSchema?.id, "A GLOBAL Schema was not found for immutability testing.");
  const globalWrite = rest("schema_definition", { method: "PATCH", query: "id=eq." + globalSchema.id, body: { name_en: "Forbidden" },
    headers: { ...authenticatedHeaders("userA"), Prefer: "return=representation" }, expected: [200] });
  assert(Array.isArray(globalWrite.json) && globalWrite.json.length === 0, "Tenant actor modified a GLOBAL Schema.");

  const publishedVersion = rest("schema_version", { query: "select=id&status=eq.published&limit=1" }).json?.[0];
  if (publishedVersion) {
    const publishedField = rest("field_definition", { query: "select=id&schema_version_id=eq." + publishedVersion.id + "&limit=1" }).json?.[0];
    if (publishedField) {
      rest("field_definition", { method: "PATCH", query: "id=eq." + publishedField.id, body: { label_en: "Forbidden" },
        headers: { ...serviceHeaders, Prefer: "return=representation" }, expected: [400, 409] });
    }
  }

  const auditPurposes = rest("policy_decision_audit", { query: "select=purpose&correlation_id=like.*" + suffix + "*" }).json || [];
  assert(auditPurposes.some((row) => row.purpose === "mapping.commit") && auditPurposes.some((row) => row.purpose === "resolved_data.read"), "Capability/PDP audit evidence is incomplete.");

  console.log(JSON.stringify({
    status: "PASS", environment: target.projectRef, migration: "0029", schemaRegistry: "REUSED_AND_EXTENDED",
    dryRun: "PASS", mappingCommit: "PASS", idempotency: "PASS", immutableVersions: "PASS",
    resolution: "PASS_WITH_EXPECTED_BLOCKERS", provenanceCoverage: resolved.dataQualitySummary.provenanceCoverage.percentage,
    rls: "PASS", productionWrites: 0,
  }, null, 2));
} finally {
  server.kill("SIGTERM");
}
