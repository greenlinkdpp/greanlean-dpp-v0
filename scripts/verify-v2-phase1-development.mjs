import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";

const envFile = process.env.DPP_VERIFICATION_ENV_FILE ?? ".env.development.local";
const guardScript = envFile === ".env.preproduction.local"
  ? "scripts/phase6b/assert-preproduction-target.mjs"
  : "scripts/assert-development-target.mjs";

function parseEnv(source) {
  const result = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
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
    encoding: options.encoding ?? "utf8",
    input: options.input,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return result.stdout;
}

function curl({ method = "GET", url, headers = {}, body, input, expected = [200] }) {
  const args = ["-sS", "-X", method, "-w", "\n%{http_code}"];
  for (const [name, value] of Object.entries(headers)) {
    args.push("-H", `${name}: ${value}`);
  }
  if (body !== undefined) {
    args.push("-H", "content-type: application/json", "--data", JSON.stringify(body));
  } else if (input !== undefined) {
    args.push("--data-binary", "@-");
  }
  args.push(url);
  const stdout = run("curl", args, { input });
  const split = stdout.lastIndexOf("\n");
  const responseBody = split === -1 ? "" : stdout.slice(0, split);
  const status = Number(stdout.slice(split + 1));
  if (!expected.includes(status)) {
    let safeMessage = responseBody;
    try {
      const parsed = JSON.parse(responseBody);
      safeMessage = JSON.stringify({
        code: parsed.error?.code ?? parsed.code,
        message: parsed.error?.message ?? parsed.message,
      });
    } catch {
      safeMessage = responseBody.slice(0, 500);
    }
    throw new Error(`${method} ${new URL(url).pathname} returned ${status}: ${safeMessage}`);
  }
  let json = null;
  if (responseBody) {
    try {
      json = JSON.parse(responseBody);
    } catch {
      json = null;
    }
  }
  return { status, body: responseBody, json };
}

const guard = spawnSync(process.execPath, [guardScript, "--env-file", envFile, "--json"], {
  encoding: "utf8",
});
if (guard.status !== 0) {
  throw new Error((guard.stderr || guard.stdout || "Development guard failed").trim());
}
const target = JSON.parse(guard.stdout);
const env = parseEnv(await readFile(envFile, "utf8"));
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
assert(baseUrl && anonKey && serviceKey, "Development credentials are incomplete.");

const serviceHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};
const anonHeaders = { apikey: anonKey };
const password = `Phase1-${randomBytes(24).toString("base64url")}!`;

const identities = [
  ["userA", "user-a@phase1.greanlean.invalid"],
  ["userB", "user-b@phase1.greanlean.invalid"],
  ["partnerUser", "partner-user@phase1.greanlean.invalid"],
  ["platformUser", "platform-user@phase1.greanlean.invalid"],
];

const usersResponse = curl({
  url: `${baseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
  headers: serviceHeaders,
}).json;
const existingUsers = usersResponse?.users ?? [];
const users = {};
const tokens = {};

for (const [label, email] of identities) {
  const existing = existingUsers.find((user) => user.email === email);
  const payload = {
    email,
    password,
    email_confirm: true,
    user_metadata: { synthetic: true, fixture: "v2-phase1", label },
  };
  const response = existing
    ? curl({ method: "PUT", url: `${baseUrl}/auth/v1/admin/users/${existing.id}`, headers: serviceHeaders, body: payload })
    : curl({ method: "POST", url: `${baseUrl}/auth/v1/admin/users`, headers: serviceHeaders, body: payload, expected: [200, 201] });
  users[label] = response.json?.id ?? existing?.id;
  assert(users[label], `Synthetic Auth identity ${label} was not created.`);
  const signIn = curl({
    method: "POST",
    url: `${baseUrl}/auth/v1/token?grant_type=password`,
    headers: anonHeaders,
    body: { email, password },
  }).json;
  assert(signIn?.access_token, `Synthetic Auth identity ${label} could not sign in.`);
  tokens[label] = signIn.access_token;
}

function rest(table, { method = "GET", query = "", body, headers = serviceHeaders, expected = [200] } = {}) {
  return curl({
    method,
    url: `${baseUrl}/rest/v1/${table}${query ? `?${query}` : ""}`,
    headers,
    body,
    expected,
  });
}

function upsert(table, body, onConflict = "id") {
  return rest(table, {
    method: "POST",
    query: `on_conflict=${encodeURIComponent(onConflict)}`,
    body,
    headers: {
      ...serviceHeaders,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    expected: [200, 201],
  }).json;
}

const ids = {
  tenantA: "11111111-1111-4111-8111-111111111111",
  tenantB: "22222222-2222-4222-8222-222222222222",
  partner: "33333333-3333-4333-8333-333333333333",
  authActive: "44444444-4444-4444-8444-444444444444",
  authExpired: "55555555-5555-4555-8555-555555555555",
  authRevoked: "66666666-6666-4666-8666-666666666666",
  scopeAllow: "77777777-7777-4777-8777-777777777777",
  orgA1: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  orgA2: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  orgB1: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  membershipA: "a1111111-1111-4111-8111-111111111111",
  membershipB: "b2222222-2222-4222-8222-222222222222",
};

upsert("tenant", [
  { id: ids.tenantA, code: "phase1-tenant-a", name: "Phase 1 Synthetic Tenant A", status: "ACTIVE" },
  { id: ids.tenantB, code: "phase1-tenant-b", name: "Phase 1 Synthetic Tenant B", status: "ACTIVE" },
]);

const roles = rest("role", {
  query: `select=id,tenant_id,code,role_class&tenant_id=in.(${ids.tenantA},${ids.tenantB})`,
}).json;
const roleFor = (tenantId, code) => roles.find((role) => role.tenant_id === tenantId && role.code === code)?.id;
const tenantAdminA = roleFor(ids.tenantA, "tenant_admin");
const tenantAdminB = roleFor(ids.tenantB, "tenant_admin");
assert(tenantAdminA && tenantAdminB, "Tenant role templates were not seeded by the database trigger.");

upsert("organisation_v2", [
  { id: ids.orgA1, tenant_id: ids.tenantA, organisation_type: "LEGAL_ENTITY", legal_name: "Synthetic Organisation A1", country: "DE" },
  { id: ids.orgA2, tenant_id: ids.tenantA, organisation_type: "FACILITY", legal_name: "Synthetic Organisation A2 Out of Scope", country: "DE" },
  { id: ids.orgB1, tenant_id: ids.tenantB, organisation_type: "LEGAL_ENTITY", legal_name: "Synthetic Organisation B1", country: "NL" },
]);
upsert("partner", {
  id: ids.partner,
  legal_name: "Synthetic Partner P",
  trading_name: "Phase 1 Partner P",
  registration_identifier: "SYNTHETIC-P-001",
  country: "BE",
  partner_type: "CONSULTANT",
  status: "ACTIVE",
});
upsert("tenant_membership", [
  { id: ids.membershipA, tenant_id: ids.tenantA, user_id: users.userA, role_id: tenantAdminA, status: "ACTIVE" },
  { id: ids.membershipB, tenant_id: ids.tenantB, user_id: users.userB, role_id: tenantAdminB, status: "ACTIVE" },
]);
upsert("partner_user_link", {
  partner_id: ids.partner,
  user_id: users.partnerUser,
  status: "ACTIVE",
}, "partner_id,user_id");

const profile = rest("permission_profile", {
  query: "select=id,code&code=eq.PARTNER_CONSULTANT&limit=1",
}).json?.[0];
assert(profile?.id, "PARTNER_CONSULTANT permission profile is missing.");

upsert("partner_tenant_authorization", {
  id: ids.authActive,
  partner_id: ids.partner,
  tenant_id: ids.tenantA,
  permission_profile_id: profile.id,
  scope: { fixture: "v2-phase1", resourceType: "ORGANISATION", resourceId: ids.orgA1 },
  status: "ACTIVE",
  requested_by: users.userA,
  approved_by: users.userA,
  approved_at: "2026-09-24T12:00:00Z",
  approval_evidence_reference: "synthetic://phase1/approval",
});
upsert("scope_grant", {
  id: ids.scopeAllow,
  tenant_id: ids.tenantA,
  grantee_type: "PARTNER_AUTHORIZATION",
  grantee_id: ids.authActive,
  resource_type: "ORGANISATION",
  resource_id: ids.orgA1,
  effect: "ALLOW",
  status: "ACTIVE",
  created_by: users.userA,
});

const authenticatedHeaders = (label, extra = {}) => ({
  apikey: anonKey,
  Authorization: `Bearer ${tokens[label]}`,
  ...extra,
});
const readOrganisations = (label, extraHeaders = {}) => rest("organisation_v2", {
  query: "select=id,tenant_id,legal_name&order=id.asc",
  headers: authenticatedHeaders(label, extraHeaders),
}).json;

const userAOrganisations = readOrganisations("userA");
assert(userAOrganisations.some((row) => row.id === ids.orgA1), "Tenant A admin cannot read Organisation A1.");
assert(userAOrganisations.some((row) => row.id === ids.orgA2), "Tenant A admin cannot read Organisation A2.");
assert(!userAOrganisations.some((row) => row.id === ids.orgB1), "Tenant A admin could read Tenant B Organisation.");

const userBOrganisations = readOrganisations("userB");
assert(userBOrganisations.length === 1 && userBOrganisations[0].id === ids.orgB1, "Tenant B RLS boundary failed.");

const partnerOrganisations = readOrganisations("partnerUser");
assert(partnerOrganisations.length === 1 && partnerOrganisations[0].id === ids.orgA1, "Partner resource scope boundary failed.");

const forged = readOrganisations("userA", { "x-tenant-id": ids.tenantB });
assert(!forged.some((row) => row.id === ids.orgB1), "Forged x-tenant-id changed RLS authority.");

const anonymousTenants = rest("tenant", {
  query: "select=id",
  headers: anonHeaders,
  expected: [200, 401, 403],
});
if (anonymousTenants.status === 200) {
  assert(Array.isArray(anonymousTenants.json) && anonymousTenants.json.length === 0, "Anonymous tenant access was not denied.");
}

const invalidMembership = {
  id: "c3333333-3333-4333-8333-333333333333",
  tenant_id: ids.tenantA,
  user_id: users.platformUser,
  role_id: tenantAdminB,
  status: "ACTIVE",
};
const crossTenantReject = rest("tenant_membership", {
  method: "POST",
  body: invalidMembership,
  headers: { ...serviceHeaders, Prefer: "return=representation" },
  expected: [400, 409],
});
assert([400, 409].includes(crossTenantReject.status), "Cross-tenant membership role was not rejected.");

const platformRole = rest("role", {
  query: "select=id&role_class=eq.PARTNER&limit=1",
}).json?.[0];
assert(platformRole?.id, "Platform-level Partner role is missing.");
const platformRoleReject = rest("tenant_membership", {
  method: "POST",
  body: { ...invalidMembership, id: "d4444444-4444-4444-8444-444444444444", role_id: platformRole.id },
  headers: { ...serviceHeaders, Prefer: "return=representation" },
  expected: [400, 409],
});
assert([400, 409].includes(platformRoleReject.status), "Tenant membership accepted a platform-level role.");

for (const authorization of [
  {
    id: ids.authExpired,
    status: "EXPIRED",
    valid_from: "2025-01-01T00:00:00Z",
    valid_until: "2026-01-01T00:00:00Z",
  },
  {
    id: ids.authRevoked,
    status: "REVOKED",
    valid_from: "2026-01-01T00:00:00Z",
    valid_until: "2027-01-01T00:00:00Z",
  },
]) {
  upsert("partner_tenant_authorization", {
    ...authorization,
    partner_id: ids.partner,
    tenant_id: ids.tenantB,
    permission_profile_id: profile.id,
    requested_by: users.userB,
  });
}
const partnerWithInactiveBindings = readOrganisations("partnerUser");
assert(!partnerWithInactiveBindings.some((row) => row.id === ids.orgB1), "Expired or revoked Partner authorization granted access.");
rest("partner_tenant_authorization", {
  method: "DELETE",
  query: `id=in.(${ids.authExpired},${ids.authRevoked})`,
  headers: serviceHeaders,
  expected: [200, 204],
});

const auditId = "99999999-9999-4999-8999-999999999999";
const existingAudit = rest("policy_decision_audit", {
  query: `select=id&id=eq.${auditId}`,
}).json;
if (!existingAudit?.length) {
  rest("policy_decision_audit", {
    method: "POST",
    body: {
      id: auditId,
      tenant_id: ids.tenantA,
      actor_user_id: users.userA,
      actor_type: "TENANT",
      capability_code: "organisation.view",
      resource_type: "ORGANISATION",
      resource_id: ids.orgA1,
      decision: "ALLOW",
      reason_code: "SYNTHETIC_FIXTURE_ALLOWED",
      effective_scope: { fixture: true },
      policy_version: "v2-phase1",
      correlation_id: "phase1-fixture-audit",
      request_path: "/verification/v2-phase1",
    },
    headers: { ...serviceHeaders, Prefer: "return=representation" },
    expected: [200, 201],
  });
}
const auditMutation = rest("policy_decision_audit", {
  method: "PATCH",
  query: `id=eq.${auditId}`,
  body: { reason_code: "MUTATION_SHOULD_FAIL" },
  headers: { ...serviceHeaders, Prefer: "return=representation" },
  expected: [400, 409],
});
assert([400, 409].includes(auditMutation.status), "Policy decision audit was mutable.");

const smokeKey = `smoke-${Date.now()}`;
rest("v2_idempotency_record", {
  method: "POST",
  body: {
    tenant_id: ids.tenantA,
    actor_user_id: users.userA,
    request_path: "/verification/smoke",
    idempotency_key: smokeKey,
    request_hash: "a".repeat(64),
    response_status: 200,
    response_body: { synthetic: true },
  },
  headers: { ...serviceHeaders, Prefer: "return=representation" },
  expected: [200, 201],
});
const smokeRead = rest("v2_idempotency_record", {
  query: `select=idempotency_key&idempotency_key=eq.${encodeURIComponent(smokeKey)}`,
}).json;
assert(smokeRead.length === 1, "Development smoke record could not be read.");
rest("v2_idempotency_record", {
  method: "DELETE",
  query: `idempotency_key=eq.${encodeURIComponent(smokeKey)}`,
  headers: serviceHeaders,
  expected: [200, 204],
});
const smokeDeleted = rest("v2_idempotency_record", {
  query: `select=idempotency_key&idempotency_key=eq.${encodeURIComponent(smokeKey)}`,
}).json;
assert(smokeDeleted.length === 0, "Development smoke record was not deleted.");

const bucket = curl({
  url: `${baseUrl}/storage/v1/bucket/dpp-evidence`,
  headers: serviceHeaders,
  expected: [200],
}).json;
assert(bucket?.public === false, "Development dpp-evidence bucket is not private.");
const objectPath = `phase1-verification/${Date.now()}-synthetic.txt`;
const objectContent = "GreanLean Phase 1 synthetic storage verification\n";
curl({
  method: "POST",
  url: `${baseUrl}/storage/v1/object/dpp-evidence/${objectPath}`,
  headers: { ...serviceHeaders, "content-type": "text/plain", "x-upsert": "true" },
  input: objectContent,
  expected: [200, 201],
});
const publicObject = curl({
  url: `${baseUrl}/storage/v1/object/public/dpp-evidence/${objectPath}`,
  headers: anonHeaders,
  expected: [400, 401, 403, 404],
});
assert(publicObject.status !== 200, "Private Development storage object was publicly readable.");
const signed = curl({
  method: "POST",
  url: `${baseUrl}/storage/v1/object/sign/dpp-evidence/${objectPath}`,
  headers: serviceHeaders,
  body: { expiresIn: 60 },
  expected: [200],
}).json;
assert(signed?.signedURL, "Signed URL was not created for the private Development object.");
const signedRead = curl({
  url: `${baseUrl}/storage/v1${signed.signedURL}`,
  expected: [200],
});
assert(signedRead.body === objectContent, "Signed URL content did not match the synthetic test object.");
curl({
  method: "DELETE",
  url: `${baseUrl}/storage/v1/object/dpp-evidence/${objectPath}`,
  headers: serviceHeaders,
  expected: [200, 204],
});

const localPort = 3017;
const localBaseUrl = `http://127.0.0.1:${localPort}`;
const server = spawn(
  process.execPath,
  [`--env-file=${envFile}`, "node_modules/next/dist/bin/next", "dev", "-p", String(localPort)],
  {
    cwd: process.cwd(),
    // The Codex/local shell reaches Supabase through the configured HTTPS
    // proxy. Node fetch only honors that proxy when this flag is enabled.
    env: { ...process.env, NODE_ENV: "development", NODE_USE_ENV_PROXY: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const probe = spawnSync("curl", ["-sS", "-o", "/dev/null", "-w", "%{http_code}", `${localBaseUrl}/api/v2/tenants`], {
      encoding: "utf8",
    });
    if (probe.status === 0 && probe.stdout !== "000") {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, `Development API did not start: ${serverLog.slice(-1000)}`);

  const anonymousApi = curl({
    url: `${localBaseUrl}/api/v2/tenants`,
    headers: { "x-tenant-id": ids.tenantA },
    expected: [401],
  });
  assert(anonymousApi.json?.error?.code === "AUTH_REQUIRED", "Anonymous Tenant API request was not safely denied.");

  const apiHeaders = (label, tenantId, correlationId) => ({
    Authorization: `Bearer ${tokens[label]}`,
    "x-tenant-id": tenantId,
    "x-correlation-id": correlationId,
  });
  const allowedCorrelation = `phase1-api-allow-${Date.now()}`;
  const allowedApi = curl({
    url: `${localBaseUrl}/api/v2/organisations`,
    headers: apiHeaders("userA", ids.tenantA, allowedCorrelation),
    expected: [200],
  });
  assert(allowedApi.json?.data?.some((row) => row.id === ids.orgA1), "Tenant API did not return its own Organisation.");

  const forgedCorrelation = `phase1-api-forged-${Date.now()}`;
  const forgedApi = curl({
    url: `${localBaseUrl}/api/v2/organisations`,
    headers: apiHeaders("userA", ids.tenantB, forgedCorrelation),
    expected: [403],
  });
  assert(forgedApi.json?.error?.code === "TENANT_RELATIONSHIP_REQUIRED", "Forged Tenant API context was not denied by the PDP.");

  const partnerScopeCorrelation = `phase1-api-partner-scope-${Date.now()}`;
  const partnerListApi = curl({
    url: `${localBaseUrl}/api/v2/organisations`,
    headers: apiHeaders("partnerUser", ids.tenantA, partnerScopeCorrelation),
    expected: [403],
  });
  assert(partnerListApi.json?.error?.code === "RESOURCE_OUT_OF_SCOPE", "Partner list request escaped its resource scope.");

  const writeKey = `phase1-write-${Date.now()}`;
  const writeBody = {
    organisation_type: "FACILITY",
    legal_name: "Synthetic API Idempotency Organisation",
    country: "DE",
  };
  const writeHeaders = {
    ...apiHeaders("userA", ids.tenantA, `phase1-api-write-${Date.now()}`),
    "Idempotency-Key": writeKey,
  };
  const firstWrite = curl({
    method: "POST",
    url: `${localBaseUrl}/api/v2/organisations`,
    headers: writeHeaders,
    body: writeBody,
    expected: [201],
  });
  const createdOrganisationId = firstWrite.json?.data?.id;
  assert(createdOrganisationId, "API write did not return the created Organisation.");
  const replayWrite = curl({
    method: "POST",
    url: `${localBaseUrl}/api/v2/organisations`,
    headers: writeHeaders,
    body: writeBody,
    expected: [201],
  });
  assert(replayWrite.json?.data?.id === createdOrganisationId, "Idempotent replay did not return the original result.");
  const conflictWrite = curl({
    method: "POST",
    url: `${localBaseUrl}/api/v2/organisations`,
    headers: writeHeaders,
    body: { ...writeBody, legal_name: "Different payload" },
    expected: [409],
  });
  assert(conflictWrite.json?.error?.code === "IDEMPOTENCY_KEY_REUSED", "Idempotency key reuse did not conflict.");

  const auditRows = rest("policy_decision_audit", {
    query: `select=correlation_id,decision,reason_code&correlation_id=in.(${allowedCorrelation},${forgedCorrelation},${partnerScopeCorrelation})`,
  }).json;
  assert(auditRows.some((row) => row.correlation_id === allowedCorrelation && row.decision === "ALLOW"), "Allowed API decision was not audited.");
  assert(auditRows.some((row) => row.correlation_id === forgedCorrelation && row.decision === "DENY"), "Forged Tenant denial was not audited.");
  assert(auditRows.some((row) => row.correlation_id === partnerScopeCorrelation && row.decision === "DENY"), "Partner scope denial was not audited.");

  rest("organisation_v2", {
    method: "DELETE",
    query: `id=eq.${createdOrganisationId}`,
    headers: serviceHeaders,
    expected: [200, 204],
  });
  rest("v2_idempotency_record", {
    method: "DELETE",
    query: `idempotency_key=eq.${encodeURIComponent(writeKey)}`,
    headers: serviceHeaders,
    expected: [200, 204],
  });
} finally {
  server.kill("SIGTERM");
}

console.log(JSON.stringify({
  developmentTarget: target,
  syntheticAuthUsers: identities.length,
  tenantFixture: {
    tenants: 2,
    organisations: 3,
    activePartnerAuthorizations: 1,
    inactivePartnerAuthorizationsAfterCleanup: 0,
  },
  checks: {
    tenantIsolation: "PASS",
    forgedTenantHeader: "PASS",
    membershipRoleConstraints: "PASS",
    partnerMissingExpiredRevoked: "PASS",
    partnerResourceScope: "PASS",
    anonymousTenantAccess: "PASS",
    auditAppendOnly: "PASS",
    apiAuthenticationCapabilityPdpAudit: "PASS",
    apiIdempotency: "PASS",
    developmentWriteReadDelete: "PASS",
    privateStorageSignedUrlCleanup: "PASS",
  },
}, null, 2));
