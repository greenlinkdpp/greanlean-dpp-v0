import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const legacyBootstrapPath = "supabase/schema.sql";
const migrationDirectory = "supabase/migrations";
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-migration-replay.json";
const historicalFixturePaths = [
  "supabase/product_category_profiles.sql",
  "supabase/upsert_demo_products.sql",
  "supabase/seeds/v1_development_reference_products.sql",
  "supabase/seeds/industrial_battery_demo.sql",
];

if (!/^[a-z]{20}$/u.test(projectRef) || protectedRefs.has(projectRef)) {
  throw new Error("REFUSED: invalid or protected migration target.");
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex");
}

function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (process.platform !== "darwin") {
    throw new Error("SUPABASE_ACCESS_TOKEN is required outside macOS.");
  }
  return execFileSync(
    "security",
    ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"],
    { encoding: "utf8" },
  ).trim();
}

const token = accessToken();
if (!token) throw new Error("Supabase CLI access token is unavailable.");

async function query(sql, readOnly = false) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: sql, read_only: readOnly }),
      signal: AbortSignal.timeout(180_000),
    },
  );
  const raw = await response.text();
  let body;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message = body?.message ?? body?.error ?? `HTTP ${response.status}`;
    throw new Error(`Database query failed (${response.status}): ${String(message).slice(0, 500)}`);
  }
  return body;
}

const files = (await readdir(migrationDirectory))
  .filter((name) => /^\d{4}_.+\.sql$/u.test(name))
  .sort((left, right) => left.localeCompare(right));
if (files[0] !== "0001_project_migration_ledger.sql" || files.at(-1) !== "0033_v2_phase6b_future_tenant_connector_capabilities.sql") {
  throw new Error("Unexpected repository migration range.");
}

const initial = await query(
  "select to_regclass('public.greanlean_migration_ledger') is not null as ledger_exists, " +
    "to_regclass('public.products') is not null as legacy_bootstrap_exists, " +
    "(select count(*) from information_schema.tables where table_schema = 'public')::int as public_table_count",
  true,
);

let existingLedger = [];
if (initial?.[0]?.ledger_exists) {
  existingLedger = await query(
    "select migration_number, migration_name, environment, result from public.greanlean_migration_ledger order by migration_number",
    true,
  );
  const numbers = existingLedger.map((row) => row.migration_number);
  const expected = files.map((file) => file.slice(0, 4));
  if (numbers.length > expected.length || numbers.some((number, index) => number !== expected[index]) || existingLedger.some((row) => row.result !== "applied")) {
    throw new Error("REFUSED: migration ledger is not an exact applied prefix of the repository sequence.");
  }
}

let legacyBootstrap = null;
if (!initial?.[0]?.legacy_bootstrap_exists) {
  const sql = await readFile(legacyBootstrapPath, "utf8");
  const started = performance.now();
  await query(sql, false);
  legacyBootstrap = {
    file: legacyBootstrapPath,
    bytes: Buffer.byteLength(sql),
    sha256: fingerprint(sql),
    elapsedMs: Math.round(performance.now() - started),
    status: "APPLIED",
  };
  console.log(`APPLIED ${legacyBootstrapPath} (${legacyBootstrap.elapsedMs} ms)`);
}

const startedAt = new Date().toISOString();
const applied = [];
const historicalFixtures = [];
const alreadyApplied = new Set(existingLedger.map((row) => row.migration_number));
for (const file of files) {
  const migrationNumber = file.slice(0, 4);
  if (alreadyApplied.has(migrationNumber)) {
    applied.push({ file, status: "ALREADY_APPLIED" });
    console.log(`ALREADY APPLIED ${file}`);
    continue;
  }
  if (migrationNumber === "0012") {
    for (const fixturePath of historicalFixturePaths) {
      const fixtureSql = await readFile(fixturePath, "utf8");
      const fixtureStarted = performance.now();
      await query(fixtureSql, false);
      const fixture = {
        file: fixturePath,
        bytes: Buffer.byteLength(fixtureSql),
        sha256: fingerprint(fixtureSql),
        elapsedMs: Math.round(performance.now() - fixtureStarted),
        status: "APPLIED",
        classification: "SYNTHETIC_MIGRATION_PREREQUISITE",
      };
      historicalFixtures.push(fixture);
      console.log(`APPLIED ${fixturePath} (${fixture.elapsedMs} ms)`);
    }
    const caseCount = (await query(
      "select count(*)::int as count from public.products where dpp_id in " +
        "('DPP-LMT-BAT-48V15AH','DPP-GV-ESS-14K3-000001','DPP-DEMO-001','DPP-TEX-TSHIRT-001','DPP-AUDIO-DEMO-001','DPP-CE-EARBUDS-001')",
      true,
    ))?.[0]?.count;
    if (caseCount !== 4) throw new Error(`Historical fixture prerequisite expected 4 case products; found ${caseCount}.`);
  }
  const sql = await readFile(path.join(migrationDirectory, file), "utf8");
  const started = performance.now();
  await query(sql, false);
  const elapsedMs = Math.round(performance.now() - started);
  applied.push({
    file,
    bytes: Buffer.byteLength(sql),
    sha256: fingerprint(sql),
    elapsedMs,
    status: "APPLIED",
  });
  console.log(`APPLIED ${file} (${elapsedMs} ms)`);
}

const [ledger, schema] = await Promise.all([
  query(
    "select migration_number, migration_name, environment, result from public.greanlean_migration_ledger order by migration_number",
    true,
  ),
  query(
    "select count(*)::int as public_table_count from information_schema.tables where table_schema = 'public'",
    true,
  ),
]);

const evidence = {
  generatedAt: new Date().toISOString(),
  startedAt,
  target: {
    environment: "preproduction",
    projectRefFingerprint: fingerprint(projectRef).slice(0, 12),
    apiHostFingerprint: fingerprint(`${projectRef}.supabase.co`).slice(0, 12),
    protectedTarget: false,
  },
  initial,
  interruptedReplayRecovery: existingLedger.length > 0,
  legacyBootstrap,
  historicalFixtures,
  applied,
  verification: {
    migrationFileCount: files.length,
    ledgerRowCount: Array.isArray(ledger) ? ledger.length : null,
    ledgerHead: Array.isArray(ledger) ? ledger.at(-1)?.migration_number ?? null : null,
    ledger,
    publicTableCount: schema?.[0]?.public_table_count ?? null,
  },
  productionWritePerformed: false,
  productionTrafficSwitched: false,
};

await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
await chmod(evidencePath, 0o600);
console.log(`PREPRODUCTION MIGRATION REPLAY PASS: ${files.length} files; ledger head ${evidence.verification.ledgerHead}.`);
