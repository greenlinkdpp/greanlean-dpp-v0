import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const seed = await readFile("supabase/seeds/industrial_battery_demo.sql", "utf8");
const rollback = await readFile("supabase/seeds/industrial_battery_demo.rollback.sql", "utf8");

test("industrial battery seed is transactional and prerequisite-aware", () => {
  assert.match(seed, /^--[\s\S]*\nbegin;/i);
  assert.match(seed, /to_regclass\('public\.battery_model_profile'\)/i);
  assert.match(seed, /to_regclass\('public\.battery_operating_metric'\)/i);
  assert.match(seed, /commit;/i);
});

test("industrial battery seed uses stable identifiers and the stationary profile", () => {
  for (const expected of [
    "DPP-GV-ESS-14K3-000001",
    "green-vault-ess-14-3-demo-000001",
    "GV-ESS-14K3-2026",
    "BATCH-202606-DEMO",
    "GV14K3-DEMO-000001",
    "battery.industrial.stationary_above_2kwh.v1",
    "battery.industrial.stationary",
  ]) {
    assert.ok(seed.includes(expected), `Missing seed identifier: ${expected}`);
  }
});

test("synthetic operating data is append-only and idempotent", () => {
  assert.match(seed, /insert into public\.battery_operating_metric/i);
  assert.match(seed, /ingestion_key/i);
  assert.match(seed, /on conflict \(ingestion_key\) do nothing/i);
  assert.doesNotMatch(seed, /(update|delete from)\s+public\.battery_operating_metric/i);
  assert.match(seed, /SYNTHETIC_DEMO/g);
});

test("rollback only targets the GreenVault demo", () => {
  assert.match(rollback, /where dpp_id = 'DPP-GV-ESS-14K3-000001'/i);
  assert.doesNotMatch(rollback, /DPP-LMT|DPP-DEMO-001|truncate/i);
});
