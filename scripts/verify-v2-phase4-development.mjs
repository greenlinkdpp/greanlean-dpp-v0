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

function assert(condition, message) { if (!condition) throw new Error(message); }

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 24 * 1024 * 1024 });
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

async function localFetch(url, init = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

const guard = spawnSync(process.execPath, [guardScript, "--env-file", envFile, "--json"], { encoding: "utf8" });
if (guard.status !== 0) throw new Error((guard.stderr || guard.stdout || "Development guard failed").trim());
const target = JSON.parse(guard.stdout);
const env = parseEnv(await readFile(envFile, "utf8"));
for (const flag of ["FEATURE_V2_DPP_PASSPORT", "FEATURE_V2_DPP_REVIEW", "FEATURE_V2_DPP_PUBLICATION", "FEATURE_V2_RESOLVER", "FEATURE_V2_PUBLIC_PROJECTION"]) {
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
function insert(table, body) {
  return rest(table, { method: "POST", body, headers: { ...serviceHeaders, Prefer: "return=representation" }, expected: [200, 201] }).json?.[0];
}
function upsert(table, body, onConflict = "id") {
  return rest(table, { method: "POST", query: "on_conflict=" + encodeURIComponent(onConflict), body,
    headers: { ...serviceHeaders, Prefer: "resolution=merge-duplicates,return=representation" }, expected: [200, 201] }).json;
}

for (const table of ["dpp_passport", "dpp_review_task", "dpp_version", "dpp_current_pointer", "resolver_mapping", "dpp_publication_audit"]) {
  assert(rest(table, { query: "select=" + (table === "dpp_current_pointer" ? "passport_id" : "id") + "&limit=1" }).status === 200, table + " is unavailable.");
}
const ledger = rest("greanlean_migration_ledger", { query: "select=migration_number&migration_number=eq.0030" }).json;
assert(ledger?.length === 1, "Migration ledger does not contain 0030.");

const suffix = Date.now().toString(36) + randomBytes(3).toString("hex");
const ids = {
  tenantA: "11111111-1111-4111-8111-111111111111",
  tenantB: "22222222-2222-4222-8222-222222222222",
  modelA: randomUUID(),
};
insert("product_model", {
  id: ids.modelA, tenant_id: ids.tenantA, model_code: "P4-" + suffix.toUpperCase(),
  name: "Phase 4 synthetic model", product_category: "synthetic", sector: "verification", status: "ACTIVE",
});

const password = "Phase4-" + randomBytes(24).toString("base64url") + "!";
const identities = [
  ["author", "author@phase4.greanlean.invalid", ids.tenantA, "dpp_manager"],
  ["reviewer", "reviewer@phase4.greanlean.invalid", ids.tenantA, "reviewer"],
  ["publisher", "publisher@phase4.greanlean.invalid", ids.tenantA, "publisher"],
  ["readOnly", "read-only@phase4.greanlean.invalid", ids.tenantA, "read_only"],
  ["tenantB", "user-b@phase1.greanlean.invalid", ids.tenantB, "tenant_admin"],
];
const existingUsers = curl({ url: baseUrl + "/auth/v1/admin/users?page=1&per_page=1000", headers: serviceHeaders }).json?.users || [];
const users = {};
const tokens = {};
for (const [label, email] of identities) {
  const existing = existingUsers.find((user) => user.email === email);
  const payload = { email, password, email_confirm: true, user_metadata: { synthetic: true, fixture: "v2-phase4", label } };
  const response = existing
    ? curl({ method: "PUT", url: baseUrl + "/auth/v1/admin/users/" + existing.id, headers: serviceHeaders, body: payload })
    : curl({ method: "POST", url: baseUrl + "/auth/v1/admin/users", headers: serviceHeaders, body: payload, expected: [200, 201] });
  users[label] = response.json?.id ?? existing?.id;
  const signIn = curl({ method: "POST", url: baseUrl + "/auth/v1/token?grant_type=password", headers: anonHeaders, body: { email, password } }).json;
  assert(users[label] && signIn?.access_token, "Synthetic identity " + label + " is unavailable.");
  tokens[label] = signIn.access_token;
}
const roles = rest("role", { query: "select=id,tenant_id,code&tenant_id=in.(" + ids.tenantA + "," + ids.tenantB + ")" }).json;
for (let index = 0; index < identities.length; index += 1) {
  const [label, , tenantId, roleCode] = identities[index];
  const role = roles.find((row) => row.tenant_id === tenantId && row.code === roleCode);
  assert(role, "Role " + roleCode + " is missing.");
  upsert("tenant_membership", { tenant_id: tenantId, user_id: users[label], role_id: role.id, status: "ACTIVE" }, "tenant_id,user_id");
}

const schema = insert("schema_definition", {
  code: "phase4." + suffix, sector_code: "synthetic", source_name: "Phase 4 verifier",
  name_en: "Phase 4 Test Schema", name_zh: "Phase 4 Test Schema", status: "draft",
  owner_type: "TENANT_EXTENSION", tenant_id: ids.tenantA, created_by: users.author,
});
const schemaVersion = insert("schema_version", {
  schema_definition_id: schema.id, version: "1.0.0", json_schema: { type: "object" }, status: "draft", created_by: users.author,
});
const fieldSpecs = [
  ["identity.name", "PUBLIC", "https://schema.greanlean.invalid/identity/name"],
  ["commercial.cost", "LEGITIMATE_INTEREST", "https://schema.greanlean.invalid/commercial/cost"],
  ["authority.serial", "AUTHORITY_ONLY", null],
  ["internal.note", "INTERNAL", null],
];
const fields = {};
for (let index = 0; index < fieldSpecs.length; index += 1) {
  const [code, access, semanticUri] = fieldSpecs[index];
  fields[code] = insert("field_definition", {
    schema_version_id: schemaVersion.id, field_code: code, json_pointer: "/" + code.replaceAll(".", "/"),
    label_en: code, label_zh: code, data_type: access === "LEGITIMATE_INTEREST" ? "decimal" : "string",
    data_behavior: "STATIC", data_granularity: "MODEL", access_level_code: access,
    requirement_status: code === "identity.name" ? "CONFIRMED_MANDATORY" : "VOLUNTARY",
    semantic_name: semanticUri, semantic_uri: semanticUri, cardinality: "SINGLE", subject_levels: ["MODEL"],
    verification_requirement: {}, display_metadata: { order: index + 1 }, resolution_policy: "MOST_SPECIFIC",
  });
}

function claim(fieldCode, value, supersedesClaimId = null) {
  const provenance = insert("provenance_record", {
    tenant_id: ids.tenantA, subject_type: "MODEL", subject_id: ids.modelA,
    field_definition_id: fields[fieldCode].id, raw_value_reference: { value }, normalized_value_reference: { value },
    entered_by: users.author, verification_status: "SELF_DECLARED", verification_method: "SYNTHETIC_PHASE4",
    evidence_references: fieldCode === "identity.name" ? ["https://evidence.greanlean.invalid/public"] : [],
  });
  return insert("canonical_claim", {
    tenant_id: ids.tenantA, subject_type: "MODEL", subject_id: ids.modelA,
    field_definition_id: fields[fieldCode].id, schema_version_id: schemaVersion.id,
    resolution_state: "OVERRIDE", value_json: value, verification_status: "SELF_DECLARED",
    provenance_record_id: provenance.id, supersedes_claim_id: supersedesClaimId, created_by: users.author,
  });
}
let nameClaim = claim("identity.name", "Phase 4 Product A");
claim("commercial.cost", 42);
claim("authority.serial", "AUTH-001");
claim("internal.note", "Never public");

const localPort = 3030;
const localBaseUrl = "http://localhost:" + localPort;
const server = spawn(process.execPath, [`--env-file=${envFile}`, "node_modules/next/dist/bin/next", "dev", "-p", String(localPort)], {
  cwd: process.cwd(), env: { ...process.env, NODE_ENV: "development", NODE_USE_ENV_PROXY: "1" }, stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const probe = spawnSync("curl", ["-sS", "--max-time", "5", "-o", "/dev/null", "-w", "%{http_code}", localBaseUrl + "/api/v2/passports"], { encoding: "utf8" });
    if (probe.status === 0 && probe.stdout !== "000") { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, "Development API did not start: " + serverLog.slice(-1500));
  const apiHeaders = (label, tenantId = ids.tenantA, key) => ({
    Authorization: "Bearer " + tokens[label], "x-tenant-id": tenantId,
    "x-correlation-id": "phase4-" + suffix + "-" + randomUUID(), ...(key ? { "Idempotency-Key": key } : {}),
  });
  const apiPost = (path, body, key, label, expected = [201], tenantId = ids.tenantA) => curl({
    method: "POST", url: localBaseUrl + path, headers: apiHeaders(label, tenantId, key), body, expected,
  });

  const passportIdentifier = "DPP-P4-" + suffix.toUpperCase();
  const passportBody = { subject_type: "MODEL", subject_id: ids.modelA, passport_profile_code: "PRIMARY", passport_identifier: passportIdentifier, schema_definition_id: schema.id };
  const passportKey = "p4-passport-" + suffix;
  const passport = apiPost("/api/v2/passports", passportBody, passportKey, "author").json?.data;
  assert(passport?.passport_identifier === passportIdentifier && passport.publication_source === "V2", "Passport creation failed.");
  const replayPassport = apiPost("/api/v2/passports", passportBody, passportKey, "author").json?.data;
  assert(replayPassport.id === passport.id, "Passport idempotency replay failed.");
  const dppIdentifier = rest("product_subject_identifier", { query: "select=id&subject_type=eq.PASSPORT&subject_id=eq." + passport.id }).json?.[0];
  assert(dppIdentifier?.id, "Phase 2 DPP_ID was not created for the Passport.");

  const primaryMapping = apiPost("/api/v2/resolver-mappings", {
    identifier_id: dppIdentifier.id, host: "localhost", normalized_path: "/p/" + passportIdentifier,
    passport_id: passport.id, mapping_type: "PRIMARY",
  }, "p4-map-primary-" + suffix, "publisher").json?.data;
  assert(primaryMapping?.id, "Primary Resolver mapping failed.");

  const gtinBase = String(Date.now()).replace(/\D/g, "").slice(-12).padStart(12, "9");
  let total = 0;
  for (let index = 0; index < 12; index += 1) total += Number(gtinBase[index]) * ((12 - index) % 2 === 0 ? 1 : 3);
  const gtin = gtinBase + String((10 - (total % 10)) % 10);
  const upi = "https://id.greanlean.invalid/" + suffix;
  const identifierRows = [];
  for (const [type, value, scheme] of [["GTIN", gtin, "GS1"], ["UPI", upi, "HTTPS_URI"]]) {
    identifierRows.push(insert("product_subject_identifier", {
      tenant_id: ids.tenantA, subject_type: "MODEL", subject_id: ids.modelA, identifier_type: type,
      value, normalized_value: value, issuer: "Phase4", scheme, is_primary: false, created_by: users.author,
    }));
  }
  const mappingSpecs = [
    [identifierRows[0].id, "/01/" + gtin, "ALIAS", null],
    [identifierRows[1].id, "/p/upi-" + suffix, "ALIAS", null],
    [null, "/p/legacy-" + suffix, "LEGACY_REDIRECT", null],
    [null, "/p/slug-" + suffix, "ALIAS", null],
    [null, "/p/old-" + suffix, "LEGACY_REDIRECT", null],
    [null, "/p/chain-" + suffix, "ALIAS", primaryMapping.id],
  ];
  for (let index = 0; index < mappingSpecs.length; index += 1) {
    const [identifierId, path, type, targetMappingId] = mappingSpecs[index];
    const mapping = apiPost("/api/v2/resolver-mappings", {
      identifier_id: identifierId, host: "localhost", normalized_path: path,
      passport_id: targetMappingId ? null : passport.id, target_mapping_id: targetMappingId, mapping_type: type,
    }, "p4-map-" + suffix + "-" + index, "publisher").json?.data;
    assert(mapping?.id, "Resolver mapping " + path + " failed.");
  }
  const openRedirect = apiPost("/api/v2/resolver-mappings", {
    host: "evil.example", normalized_path: "/p/forbidden-" + suffix, passport_id: passport.id, mapping_type: "ALIAS",
  }, "p4-map-evil-" + suffix, "publisher", [409]);
  assert(openRedirect.json?.error?.code === "RESOLVER_OPEN_REDIRECT", "Open redirect host was not rejected.");

  const reviewBody = { passport_id: passport.id, schema_version_id: schemaVersion.id };
  const review1 = apiPost("/api/v2/passport-reviews", reviewBody, "p4-review1-" + suffix, "author").json?.data;
  assert(review1?.status === "IN_REVIEW" && review1.validation_summary.status === "PASS", "Review 1 submission failed.");
  assert(apiPost("/api/v2/passport-reviews/" + review1.id + "/approve", {}, "p4-self-approve-" + suffix, "author", [403]).status === 403, "Author unexpectedly approved a Review.");
  const approved1 = apiPost("/api/v2/passport-reviews/" + review1.id + "/approve", {}, "p4-approve1-" + suffix, "reviewer", [200]).json?.data;
  assert(approved1?.status === "APPROVED", "Review 1 approval failed.");
  assert(apiPost("/api/v2/publications", { review_task_id: review1.id }, "p4-reviewer-publish-" + suffix, "reviewer", [403]).status === 403, "Reviewer unexpectedly published.");
  const publishKey1 = "p4-publish1-" + suffix;
  const version1 = apiPost("/api/v2/publications", { review_task_id: review1.id }, publishKey1, "publisher").json?.data;
  assert(version1?.version_number === 1 && version1.publication_state === "PUBLISHED", "Version 1 publication failed.");
  const replay1 = apiPost("/api/v2/publications", { review_task_id: review1.id }, publishKey1, "publisher").json?.data;
  assert(replay1.id === version1.id, "Publish idempotency replay failed.");

  const staleReview = apiPost("/api/v2/passport-reviews", reviewBody, "p4-review-stale-" + suffix, "author").json?.data;
  apiPost("/api/v2/passport-reviews/" + staleReview.id + "/approve", {}, "p4-approve-stale-" + suffix, "reviewer", [200]);
  nameClaim = claim("identity.name", "Phase 4 Product A - revised", nameClaim.id);
  const stalePublish = apiPost("/api/v2/publications", { review_task_id: staleReview.id }, "p4-publish-stale-" + suffix, "publisher", [409]);
  assert(stalePublish.json?.error?.code === "REVIEW_APPROVAL_STALE", "Stale approval was not rejected.");

  const review2 = apiPost("/api/v2/passport-reviews", reviewBody, "p4-review2-" + suffix, "author").json?.data;
  apiPost("/api/v2/passport-reviews/" + review2.id + "/approve", {}, "p4-approve2-" + suffix, "reviewer", [200]);
  const version2 = apiPost("/api/v2/publications", { review_task_id: review2.id }, "p4-publish2-" + suffix, "publisher").json?.data;
  assert(version2?.version_number === 2 && version2.supersedes_version_id === version1.id, "Version 2 supersede failed.");
  const history = rest("dpp_version", { query: "select=id,version_number,publication_state&passport_id=eq." + passport.id + "&order=version_number.asc" }).json;
  assert(history.length === 2 && history[0].publication_state === "SUPERSEDED" && history[1].publication_state === "PUBLISHED", "Version history is incorrect.");
  const pointer = rest("dpp_current_pointer", { query: "select=current_version_id&passport_id=eq." + passport.id }).json?.[0];
  assert(pointer?.current_version_id === version2.id, "Current pointer does not reference Version 2.");

  const immutablePayload = rest("dpp_version", { method: "PATCH", query: "id=eq." + version2.id, body: { canonical_payload: { forbidden: true } }, headers: { ...serviceHeaders, Prefer: "return=representation" }, expected: [400, 409] });
  assert([400, 409].includes(immutablePayload.status), "Published payload was mutable.");
  const immutableDelete = rest("dpp_version", { method: "DELETE", query: "id=eq." + version1.id, headers: { ...serviceHeaders, Prefer: "return=representation" }, expected: [400, 409] });
  assert([400, 409].includes(immutableDelete.status), "Published Version was deletable.");

  const publicIds = [passportIdentifier, gtin, upi, "legacy-" + suffix, "slug-" + suffix, "old-" + suffix, "chain-" + suffix];
  for (const identifier of publicIds) {
    const response = await localFetch(localBaseUrl + "/api/v2/resolver/" + encodeURIComponent(identifier));
    assert(response.status === 200, "Resolver failed for " + identifier + ": " + response.status);
    const json = await response.json();
    assert(json.passportId === passport.id && json.version === 2 && json.payloadHash === version2.payload_hash, "Resolver identity mismatch for " + identifier + ".");
    assert(json.fields.length === 1 && json.fields[0].fieldCode === "identity.name", "PUBLIC projection leaked restricted fields.");
  }
  const internalAnonymous = await localFetch(localBaseUrl + "/api/v2/resolver/" + encodeURIComponent(passportIdentifier) + "?audience=INTERNAL");
  assert(internalAnonymous.status === 403, "Anonymous INTERNAL projection was not denied.");
  const formatMetadata = [];
  for (const format of ["json", "html", "jsonld", "pdf", "qr"]) {
    const response = await localFetch(localBaseUrl + "/api/v2/resolver/" + encodeURIComponent(passportIdentifier) + "?format=" + format);
    assert(response.status === 200, "Public format " + format + " failed.");
    assert(response.headers.get("x-dpp-version") === "2" && response.headers.get("x-dpp-payload-hash") === version2.payload_hash, "Public format metadata diverged for " + format + ".");
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert(bytes.length > 20, "Public format " + format + " is empty.");
    formatMetadata.push(format);
  }

  const tenantRows = rest("dpp_passport", { query: "select=id,tenant_id", headers: { apikey: anonKey, Authorization: "Bearer " + tokens.author } }).json;
  assert(tenantRows.some((row) => row.id === passport.id) && tenantRows.every((row) => row.tenant_id === ids.tenantA), "Passport RLS Tenant isolation failed.");
  const forged = curl({ url: localBaseUrl + "/api/v2/passports/" + passport.id, headers: apiHeaders("tenantB", ids.tenantB), expected: [404] });
  assert(forged.json?.error?.code === "PASSPORT_NOT_FOUND", "Cross-Tenant Passport existence leaked.");
  const readOnlySubmit = apiPost("/api/v2/passport-reviews", reviewBody, "p4-readonly-" + suffix, "readOnly", [403]);
  assert(readOnlySubmit.status === 403, "Read-only user submitted a Review.");

  const passport2 = apiPost("/api/v2/passports", { ...passportBody, passport_profile_code: "CUSTOM", passport_identifier: passportIdentifier + "-ALT" }, "p4-passport2-" + suffix, "author").json?.data;
  const badPointer = rest("dpp_current_pointer", { method: "POST", body: { passport_id: passport2.id, tenant_id: ids.tenantA, current_version_id: version2.id, updated_by: users.publisher }, headers: { ...serviceHeaders, Prefer: "return=representation" }, expected: [400, 409] });
  assert([400, 409].includes(badPointer.status), "Cross-Passport pointer was not rejected.");

  const withdrawn = apiPost("/api/v2/publications/" + version2.id + "/withdraw", { reason_category: "SAFETY_NOTICE" }, "p4-withdraw-" + suffix, "publisher", [200]).json?.data;
  assert(withdrawn?.publication_state === "WITHDRAWN", "Withdraw failed.");
  assert(rest("dpp_version", { query: "select=id&passport_id=eq." + passport.id }).json.length === 2, "Withdraw removed Version history.");
  const tombstoneResponse = await localFetch(localBaseUrl + "/api/v2/resolver/" + encodeURIComponent(passportIdentifier));
  assert(tombstoneResponse.status === 410, "Withdrawn Passport did not return a tombstone.");
  const tombstone = await tombstoneResponse.json();
  assert(tombstone.status === "WITHDRAWN" && tombstone.reasonCategory === "SAFETY_NOTICE" && !tombstone.reviewer, "Tombstone is incorrect or leaked internals.");

  const audits = rest("dpp_publication_audit", { query: "select=event_type&passport_id=eq." + passport.id }).json.map((row) => row.event_type);
  for (const event of ["passport.create", "review.submit", "review.approve", "publication.publish", "publication.supersede", "publication.withdraw", "resolver_mapping.create"]) {
    assert(audits.includes(event), "Audit event is missing: " + event);
  }

  console.log(JSON.stringify({
    status: "PASS", environment: target.projectRef, migration: "0030", passportId: passport.id,
    versions: [version1.id, version2.id], candidateHashes: [review1.candidate_hash, review2.candidate_hash],
    formats: formatMetadata, resolverInputs: publicIds.length, productionWritePerformed: false,
  }));
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!server.killed) server.kill("SIGKILL");
}
