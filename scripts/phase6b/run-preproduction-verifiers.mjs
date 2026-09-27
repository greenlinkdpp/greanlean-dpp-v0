import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const scripts = [
  "scripts/verify-v2-phase1-development.mjs",
  "scripts/verify-v2-phase2-development.mjs",
  "scripts/verify-v2-phase3-development.mjs",
  "scripts/verify-v2-phase4-development.mjs",
  "scripts/verify-v2-phase5-development.mjs",
];
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-phase1-phase5-verification.json";
const results = [];

for (const script of scripts) {
  const started = performance.now();
  const result = spawnSync(process.execPath, ["--experimental-strip-types", script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DPP_VERIFICATION_ENV_FILE: ".env.preproduction.local",
      NODE_USE_ENV_PROXY: "1",
    },
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${script} failed: ${(result.stderr || result.stdout || "unknown error").slice(-4000)}`);
  }
  let output;
  try { output = JSON.parse(result.stdout.trim()); } catch { output = { rawSummary: result.stdout.trim().slice(-4000) }; }
  results.push({ script, status: "PASS", elapsedMs: Math.round(performance.now() - started), output });
  console.log(`PASS ${script}`);
}

const evidence = {
  generatedAt: new Date().toISOString(),
  environment: "preproduction",
  targetProjectRefFingerprint: "d465ccdd1809",
  results,
  summary: {
    verifierCount: results.length,
    tenantIsolation: "PASS",
    crossTenantDenial: "PASS",
    syntheticAuth: "PASS",
    productCore: "PASS",
    canonicalProvenance: "PASS",
    passportPublicationResolver: "PASS",
    integrationRegistryConnectors: "PASS",
  },
  productionWritePerformed: false,
  productionTrafficSwitched: false,
};
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log("PREPRODUCTION PHASE 1-5 VERIFICATION PASS");
