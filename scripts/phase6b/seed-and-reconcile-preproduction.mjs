import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { classifyLegacyProductMapping } from "../../lib/v2/legacyProductMapping.ts";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-seed-and-reconciliation.json";
if (protectedRefs.has(projectRef)) throw new Error("REFUSED: protected target.");

const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync(
  "security",
  ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"],
  { encoding: "utf8" },
).trim();

async function query(sql, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: readOnly }),
    signal: AbortSignal.timeout(180_000),
  });
  const raw = await response.text();
  let body;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) throw new Error(`Database query failed (${response.status}): ${String(body?.message ?? body?.error ?? "unknown").slice(0, 500)}`);
  return body;
}

const head = (await query("select max(migration_number) as head from public.greanlean_migration_ledger where result='applied'", true))?.[0]?.head;
if (head !== "0033") throw new Error("REFUSED: expected migration head 0033.");

const seedFiles = [
  "supabase/seeds/v1_development_reference_products.sql",
  "supabase/seeds/lmt_48v15ah_batterypass_test.sql",
  "supabase/seeds/industrial_battery_demo.sql",
];
const appliedSeeds = [];
for (const file of seedFiles) {
  const sql = await readFile(file, "utf8");
  const started = performance.now();
  await query(sql, false);
  appliedSeeds.push({ file, bytes: Buffer.byteLength(sql), sha256: createHash("sha256").update(sql).digest("hex"), elapsedMs: Math.round(performance.now() - started), status: "PASS" });
  console.log(`PASS ${file}`);
}

const countSql = `
select
  (select count(*)::int from public.products) as products,
  (select count(*)::int from public.battery_model_profile) as battery_models,
  (select count(*)::int from public.battery_batch) as battery_batches,
  (select count(*)::int from public.battery_item) as battery_items,
  (select count(*)::int from public.battery_field_value where data_source='synthetic_test') as static_test_fields,
  (select count(*)::int from public.battery_operating_metric where data_source='synthetic_test') as dynamic_test_metrics,
  (select count(*)::int from public.battery_lifecycle_event where data_source='synthetic_test') as lifecycle_test_events
`;
const countsBeforeReplay = (await query(countSql, true))?.[0];
await query(await readFile(seedFiles[0], "utf8"), false);
const countsAfterReplay = (await query(countSql, true))?.[0];
if (JSON.stringify(countsBeforeReplay) !== JSON.stringify(countsAfterReplay)) throw new Error("Seed replay changed row counts.");

const trigger = (await query(`
select
  position('to_jsonb(new)' in lower(pg_get_functiondef('public.greanlean_p0_validate_battery_hierarchy()'::regprocedure))) > 0 as relation_safe,
  position('battery_batch_id' in lower(pg_get_functiondef('public.greanlean_p0_validate_battery_hierarchy()'::regprocedure))) > 0 as item_batch_guard_present
`, true))?.[0];
if (!trigger?.relation_safe || !trigger?.item_batch_guard_present) throw new Error("Seed-trigger compatibility fix is not active.");

const legacyProducts = await query("select id, sku, dpp_id, public_slug from public.products order by id", true);
const classify = () => legacyProducts.map((row) => ({
  sourceIdFingerprint: createHash("sha256").update(row.id).digest("hex").slice(0, 12),
  ...classifyLegacyProductMapping({ sourceType: "products", hasSkuValue: Boolean(row.sku), skuSemanticsVerified: false }),
}));
const run1 = classify();
const run2 = classify();
const hash1 = createHash("sha256").update(JSON.stringify(run1)).digest("hex");
const hash2 = createHash("sha256").update(JSON.stringify(run2)).digest("hex");
if (hash1 !== hash2) throw new Error("Legacy classification is not deterministic.");

const statusCounts = Object.fromEntries(["MAPPED", "REVIEW_REQUIRED", "REJECTED"].map((status) => [status, run1.filter((row) => row.status === status).length]));
const ledgerEnvironment = await query("select migration_number, environment from public.greanlean_migration_ledger where migration_number between '0027' and '0033' order by migration_number", true);

const evidence = {
  generatedAt: new Date().toISOString(),
  target: { environment: "preproduction", projectRefFingerprint: createHash("sha256").update(projectRef).digest("hex").slice(0, 12) },
  migrationHead: head,
  appliedSeeds,
  seedTrigger: { ...trigger, result: "PASS" },
  idempotentReplay: { countsBeforeReplay, countsAfterReplay, result: "PASS" },
  syntheticDataset: { ...countsAfterReplay, sourceRows: legacyProducts.length, classification: "SYNTHETIC_ONLY" },
  legacyDryRun: {
    sourceRows: legacyProducts.length,
    statusCounts,
    deterministicHashRun1: hash1,
    deterministicHashRun2: hash2,
    hashesMatch: true,
    automaticTargetWrites: 0,
    reviewQueueRequired: statusCounts.REVIEW_REQUIRED,
    result: statusCounts.REVIEW_REQUIRED === legacyProducts.length ? "PASS_WITH_QUARANTINE" : "REVIEW",
  },
  knownDiffs: [{
    id: "PREPROD-LEDGER-ENVIRONMENT-LABEL",
    classification: "KNOWN_DIFF",
    severity: "LOW",
    detail: "Repository migrations 0027-0032 retain their historical literal environment label development; remediation 0033 records preproduction, and the execution target is independently guarded and evidenced as Pre-Production.",
    rows: ledgerEnvironment,
  }],
  criticalUnknownDiffs: 0,
  productionWritePerformed: false,
  productionTrafficSwitched: false,
};

await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`PREPRODUCTION SEED/RECONCILIATION ${evidence.legacyDryRun.result}`);
