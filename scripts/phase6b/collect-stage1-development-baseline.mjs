import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
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
  if (method !== "GET" && method !== "HEAD") throw new Error(`REFUSED: ${method} is not read-only.`);
  return fetch(url, { ...options, method, redirect: "manual", signal: AbortSignal.timeout(45_000) });
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

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : "docs/v2-implementation/phase-6b/evidence/stage1-development-baseline.json";
  const env = parseEnv(await readFile(".env.development.local", "utf8"));
  const projectUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const projectRef = projectUrl.hostname.replace(/\.supabase\.co$/u, "");
  const guard = spawnSync(process.execPath, ["scripts/assert-development-target.mjs", "--json"], { encoding: "utf8" });
  if (guard.status !== 0) throw new Error((guard.stderr || guard.stdout || "Development target guard failed.").trim());
  const serviceHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const anonHeaders = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };

  const [openApiResponse, ledgerResponse, storageResponse, authResponse] = await Promise.all([
    readOnlyFetch(`${projectUrl.origin}/rest/v1/`, { headers: { ...serviceHeaders, Accept: "application/openapi+json" } }),
    readOnlyFetch(`${projectUrl.origin}/rest/v1/greanlean_migration_ledger?select=migration_number,migration_name,environment,result,applied_at&order=migration_number.asc`, { headers: serviceHeaders }),
    readOnlyFetch(`${projectUrl.origin}/storage/v1/bucket`, { headers: serviceHeaders }),
    readOnlyFetch(`${projectUrl.origin}/auth/v1/settings`, { headers: anonHeaders }),
  ]);
  const openApi = openApiResponse.ok ? await openApiResponse.json() : {};
  const definitions = Object.keys(openApi.definitions || {}).sort();
  const paths = Object.keys(openApi.paths || {}).sort();
  const ledger = ledgerResponse.ok ? await ledgerResponse.json() : [];
  const buckets = storageResponse.ok ? await storageResponse.json() : [];
  const auth = authResponse.ok ? await authResponse.json() : {};
  const tables = [
    "products", "product_versions", "battery_model_profile", "battery_batch", "battery_item", "dpp_identifier_alias",
    "tenant", "organisation", "organisation_membership", "product_model", "sku", "product_batch", "product_item",
    "schema_definition", "canonical_attribute", "provenance_record", "dpp_passport", "dpp_passport_version",
    "resolver_mapping", "integration_registry", "external_connector",
  ];
  const counts = {};
  for (const table of tables) counts[table] = await count(projectUrl.origin, serviceHeaders, table);

  const bucketShape = buckets.map((bucket) => ({
    idFingerprint: sha(String(bucket.id || bucket.name || "")).slice(0, 12),
    public: Boolean(bucket.public),
    fileSizeLimit: bucket.file_size_limit ?? null,
    allowedMimeTypes: bucket.allowed_mime_types ?? null,
  })).sort((a, b) => a.idFingerprint.localeCompare(b.idFingerprint));
  const report = {
    generatedAt: new Date().toISOString(),
    development: {
      projectDisplayName: "greanlean-dpp-dev",
      projectRefFingerprint: sha(projectRef).slice(0, 12),
      projectHostFingerprint: sha(projectUrl.hostname).slice(0, 12),
      region: "ap-southeast-1",
      guard: JSON.parse(guard.stdout),
      openApi: {
        status: openApiResponse.status,
        definitionCount: definitions.length,
        rpcCount: paths.filter((path) => path.startsWith("/rpc/")).length,
        definitionNameFingerprint: sha(definitions.join("\n")).slice(0, 16),
        pathFingerprint: sha(paths.join("\n")).slice(0, 16),
      },
      migrationLedger: {
        status: ledgerResponse.status,
        rowCount: ledger.length,
        head: ledger.at(-1)?.migration_number || null,
        fingerprint: sha(JSON.stringify(ledger)).slice(0, 16),
      },
      counts,
      storage: {
        status: storageResponse.status,
        bucketCount: buckets.length,
        publicBucketCount: buckets.filter((bucket) => bucket.public === true).length,
        privateBucketCount: buckets.filter((bucket) => bucket.public !== true).length,
        inventoryFingerprint: sha(JSON.stringify(bucketShape)).slice(0, 16),
      },
      auth: {
        status: authResponse.status,
        settingsPresent: authResponse.ok,
        disableSignup: Boolean(auth.disable_signup),
        mailerAutoconfirm: Boolean(auth.mailer_autoconfirm),
        externalProviderCount: Object.values(auth.external || {}).filter(Boolean).length,
      },
    },
    safety: {
      methods: ["GET", "HEAD"],
      secretsWrittenToReport: false,
      productionRequestsPerformed: false,
    },
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

await main();
