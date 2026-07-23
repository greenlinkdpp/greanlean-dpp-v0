import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile("supabase/seeds/lmt_48v15ah_batterypass_test.sql", "utf8");
const fixture = JSON.parse(await readFile("config/battery/demo/lmt-48v15ah-batterypass-test.json", "utf8"));

test("LMT seed is test-only, idempotent and protects verified values", () => {
  assert.match(sql, /TEST DATA ONLY/);
  assert.match(sql, /data_source = 'synthetic_test'|\\s'synthetic_test'/);
  assert.match(sql, /on conflict \(ingestion_key\) do nothing/);
  assert.match(sql, /verification_status <> 'verified'/);
  assert.doesNotMatch(sql, /verification_status\\s*=\\s*'verified'/);
});

test("LMT fixture carries item identity and all seven BatteryPass groups", () => {
  const passport = fixture.Battery_Passport;
  assert.equal(passport.IdentifiersAndProductData.BatteryCategory.batteryCategoryValue, "LMT battery");
  assert.equal(passport.IdentifiersAndProductData.BatterySerialNumber, "LMT-48V15AH-TEST-001");
  assert.equal(Object.keys(passport).length, 7);
});
