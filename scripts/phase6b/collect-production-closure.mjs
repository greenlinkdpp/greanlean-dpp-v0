import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/u).flatMap((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) return [];
    const separator = line.indexOf("=");
    return [[line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/u, "$2")]];
  }));
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readOnlyFetch(url, options = {}) {
  const method = options.method || "GET";
  if (method !== "GET" && method !== "HEAD") throw new Error(`REFUSED: Production method ${method} is not read-only.`);
  return fetch(url, { ...options, method, signal: AbortSignal.timeout(45_000) });
}

async function count(baseUrl, headers, table) {
  const response = await readOnlyFetch(`${baseUrl}/rest/v1/${table}?select=*`, {
    method: "HEAD",
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
  });
  const range = response.headers.get("content-range") || "";
  const raw = range.includes("/") ? range.split("/").at(-1) : "";
  return { status: response.status, count: /^\d+$/u.test(raw) ? Number(raw) : null };
}

async function expectedV1Tables() {
  const files = (await readdir("supabase/migrations")).filter((name) => /^00(?:0[1-9]|1\d|2[0-6])_.*\.sql$/u.test(name)).sort();
  const tables = new Set();
  for (const file of files) {
    const sql = await readFile(resolve("supabase/migrations", file), "utf8");
    for (const match of sql.matchAll(/create table(?: if not exists)?\s+(?:public\.)?([a-z][a-z0-9_]*)/giu)) tables.add(match[1]);
  }
  return { files, tables: [...tables].sort() };
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : "docs/v2-implementation/phase-6b/evidence/production-closure.json";
  const [envSource, denylistSource] = await Promise.all([
    readFile(".env.local", "utf8"),
    readFile("config/environment/production-target-denylist.json", "utf8"),
  ]);
  const env = parseEnv(envSource);
  const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.replace(/\.supabase\.co$/u, "");
  const projectFingerprint = sha(projectRef);
  const denylist = JSON.parse(denylistSource);
  if (!denylist.projectRefSha256.includes(projectFingerprint)) throw new Error("REFUSED: target is not the denylisted Production project.");

  const serviceHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const anonHeaders = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` };
  const openApiResponse = await readOnlyFetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, { headers: { ...serviceHeaders, Accept: "application/openapi+json" } });
  if (!openApiResponse.ok) throw new Error(`Production OpenAPI inventory failed with ${openApiResponse.status}.`);
  const openApi = await openApiResponse.json();
  const definitions = Object.keys(openApi.definitions || {}).sort();
  const expected = await expectedV1Tables();
  const definitionSet = new Set(definitions);
  const protectedTables = [
    "users",
    "customers",
    "leads",
    "dpp_user_membership",
    "dpp_organisation",
    "dpp_access_request",
    "dpp_access_audit",
    "dpp_project",
    "battery_integration_credential",
  ].filter((table) => definitionSet.has(table));
  const runtime = {};
  for (const table of protectedTables) {
    runtime[table] = {
      service: await count(env.NEXT_PUBLIC_SUPABASE_URL, serviceHeaders, table),
      anonymous: await count(env.NEXT_PUBLIC_SUPABASE_URL, anonHeaders, table),
    };
  }
  const publicViews = ["dpp_public_view", "dpp_item_publication_pointer", "dpp_product_publication_pointer", "products"].filter((table) => definitionSet.has(table));
  const publicRuntime = {};
  for (const table of publicViews) publicRuntime[table] = { anonymous: await count(env.NEXT_PUBLIC_SUPABASE_URL, anonHeaders, table) };

  const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
  const dirty = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" }).stdout.trim().length > 0;
  const report = {
    generatedAt: new Date().toISOString(),
    safety: {
      productionMethods: ["GET", "HEAD"],
      productionWritesPerformed: false,
      targetFingerprint: projectFingerprint.slice(0, 12),
    },
    repository: { head, dirty, deployedRevision: null, deployedRevisionStatus: "UNKNOWN" },
    schema: {
      productionDefinitionCount: definitions.length,
      definitionFingerprint: sha(definitions.join("\n")).slice(0, 16),
      expectedV1MigrationFiles: expected.files,
      expectedV1TableCount: expected.tables.length,
      missingExpectedV1Tables: expected.tables.filter((table) => !definitionSet.has(table)),
      unexpectedDiffClassification: "PARTIAL_OPENAPI_ONLY",
    },
    rlsRuntime: {
      protectedTableProbes: runtime,
      publicViewProbes: publicRuntime,
      anonymousNegativePass: Object.values(runtime).every((probe) => probe.anonymous.count === 0 || probe.anonymous.status === 401 || probe.anonymous.status === 403),
      authenticatedTenantIsolation: "NOT_VERIFIED_NO_APPROVED_TEST_IDENTITIES",
      policyCatalogVerified: false,
      legacyProductsAnonymousVisibilityRequiresIntentConfirmation: publicRuntime.products?.anonymous.count ?? null,
    },
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

await main();
