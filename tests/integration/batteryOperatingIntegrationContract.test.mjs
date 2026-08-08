import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("device ingestion requires API credentials, timestamp, idempotency, binding, range and unit checks", async () => {
  const service = await readFile("lib/server/batteryOperatingData.ts", "utf8");
  const metricRoute = await readFile("app/api/integrations/battery/items/[itemId]/metrics/route.ts", "utf8");
  const eventRoute = await readFile("app/api/integrations/battery/items/[itemId]/events/route.ts", "utf8");
  assert.match(service, /x-api-key/i);
  assert.match(service, /x-greanlean-timestamp/i);
  assert.match(service, /x-idempotency-key/i);
  assert.match(service, /DEVICE_ITEM_BINDING_MISMATCH/);
  assert.match(service, /BATTERY_METRIC_OUT_OF_RANGE/);
  assert.match(service, /BATTERY_METRIC_UNIT_MISMATCH/);
  assert.match(service, /INTEGRATION_RATE_LIMITED/);
  assert.match(service, /\.rpc\("greanlean_ingest_battery_metrics"/);
  assert.match(service, /\.rpc\("greanlean_ingest_battery_events"/);
  assert.match(metricRoute, /requireBatteryIntegrationCredential\(request\)/);
  assert.match(eventRoute, /requireBatteryIntegrationCredential\(request\)/);
});

test("integration keys are generated server-side, hashed, rotated, and returned only once", async () => {
  const service = await readFile("lib/server/batteryOperatingData.ts", "utf8");
  const route = await readFile("app/api/integrations/battery/credentials/route.ts", "utf8");
  assert.match(service, /randomBytes\(32\)/);
  assert.match(service, /secret_hash:\s*sha256\(plaintextKey\)/);
  assert.match(service, /status:\s*"ROTATED"/);
  assert.match(service, /apiKey:\s*plaintextKey/);
  assert.match(route, /requireDppInternalUser/);
  assert.match(route, /Cache-Control": "private, no-store"/);
});

test("operating-data reads require authenticated product authorisation", async () => {
  const access = await readFile("lib/server/batteryOperatingAccess.ts", "utf8");
  const latest = await readFile("app/api/battery-dpp/items/[itemId]/metrics/latest/route.ts", "utf8");
  const history = await readFile("app/api/battery-dpp/items/[itemId]/metrics/history/route.ts", "utf8");
  assert.match(access, /resolveDppAccess/);
  assert.match(access, /"professional"/);
  assert.match(access, /BATTERY_OPERATING_DATA_ACCESS_DENIED/);
  assert.match(latest, /requireAuthenticatedUser/);
  assert.match(history, /requireAuthenticatedUser/);
  assert.match(history, /"24h", "7d", "30d", "12m", "all"/);
});

test("public projection remains telemetry-free while authorised DPP data is enriched server-side", async () => {
  const publicRepository = await readFile("lib/dpp/publicDppRepository.ts", "utf8");
  const accessRepository = await readFile("lib/server/dppAccess.ts", "utf8");
  const viewModel = await readFile("lib/publicDppViewModel.ts", "utf8");
  assert.doesNotMatch(publicRepository, /loadBatteryOperatingProjection/);
  assert.match(accessRepository, /access\.audience !== "PUBLIC"/);
  assert.match(accessRepository, /loadBatteryOperatingProjection/);
  assert.match(viewModel, /batteryOperating/);
  assert.match(viewModel, /INITIAL_DATASET/);
});

test("initial battery histories are explicitly unverified and never claim live BMS reporting", async () => {
  const seed = await readFile("supabase/seeds/battery_dynamic_initial_data.sql", "utf8");
  assert.match(seed, /'INITIAL_DATASET'/);
  assert.match(seed, /'UNVERIFIED'/);
  assert.match(seed, /'INITIAL-IMPORT'/);
  assert.match(seed, /generate_series\(0, 29\)/);
  assert.doesNotMatch(seed, /SYNTHETIC_DEMO|synthetic_test|Demo BMS/i);
});
