import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("migration 0026 installs the category catalog, provenance metadata and a reversible soft rollback", async () => {
  const migration = await readFile("supabase/migrations/0026_battery_regulatory_datapoints_v2.sql", "utf8");
  const rollback = await readFile("supabase/rollbacks/0026_battery_regulatory_datapoints_v2.down.sql", "utf8");
  const verify = await readFile("supabase/bundles/battery_regulatory_v2_verify.sql", "utf8");

  assert.match(migration, /battery_regulatory_data_point/);
  assert.match(migration, /battery_regulatory_applicability/);
  assert.match(migration, /data_status/);
  assert.match(migration, /expert_review_status/);
  assert.match(migration, /field_origin/);
  assert.match(migration, /DPP-GV-ESS-14K3-000001/);
  assert.match(migration, /legal_category_code = 'industrial'/);
  assert.match(rollback, /is_active = false/);
  assert.doesNotMatch(rollback, /drop table|drop column/i);
  assert.match(verify, /data_points_passed/);
  assert.match(verify, /category_statuses_passed/);
});

test("back office and public projections use the regulatory catalog while BatteryPass remains an adapter", async () => {
  const workspace = await readFile("components/battery/BatteryDppWorkspace.tsx", "utf8");
  const projection = await readFile("lib/battery/projection.ts", "utf8");
  const adapter = await readFile("lib/server/batteryPassRepository.ts", "utf8");
  const productEditor = await readFile("components/ProductEditor.tsx", "utf8");
  const exportRoute = await readFile("app/api/dpp-export/route.ts", "utf8");

  assert.match(workspace, /regulatoryFieldsForBattery/);
  assert.match(workspace, /expertReviewStatus/);
  assert.match(workspace, /dataStatus/);
  assert.match(projection, /regulatoryFieldsForBattery/);
  assert.match(productEditor, /allowedSteps=\{\["health", "lifecycle"\]\}/);
  assert.match(adapter, /buildBatteryPassPayload/);
  assert.match(adapter, /LMT\.json/);
  assert.match(exportRoute, /loadBatteryProjection/);
  assert.match(exportRoute, /batteryPassport/);
});

test("battery passports render one regulatory chapter structure instead of appending it to legacy sections", async () => {
  const unifiedPage = await readFile("components/UnifiedDppPage.tsx", "utf8");
  const batteryProjection = await readFile("components/battery/BatteryPublicProjection.tsx", "utf8");

  assert.equal((unifiedPage.match(/!isBatteryProduct \? \(/g) || []).length, 2);
  assert.match(unifiedPage, /<BatteryPublicProjection/);
  assert.match(batteryProjection, /battery-passport-content/);
  assert.match(batteryProjection, /battery passport sections/i);
  assert.doesNotMatch(batteryProjection, /电池护照标准字段|Battery passport standard fields/);
});

test("Chinese battery passports localize regulatory prose while retaining technical identifiers", async () => {
  const batteryProjection = await readFile("components/battery/BatteryPublicProjection.tsx", "utf8");

  for (const text of [
    "镉、铅和汞声明仍需供应商及实验室验证。",
    "采用磷酸铁锂正极、石墨负极和六氟磷酸锂电解液；供应商验证待补充。",
    "在安全距离外采用水冷降温，并遵循制造商的应急处置程序。",
    "中国广东省深圳市",
    "德国汉堡",
  ]) assert.match(batteryProjection, new RegExp(text));
  assert.match(batteryProjection, /Ohm: "Ω"/);
});

test("battery organisation objects are projected into their semantic contact fields", async () => {
  const batteryProjection = await readFile("components/battery/BatteryPublicProjection.tsx", "utf8");

  assert.match(batteryProjection, /battery\.economic_operator_information/);
  assert.match(batteryProjection, /battery\.manufacturer_information/);
  assert.match(batteryProjection, /battery\.manufacturer_postal_address/);
  assert.match(batteryProjection, /battery\.manufacturer_web_email/);
  assert.match(batteryProjection, /\["postalAddress"\]/);
  assert.match(batteryProjection, /\["webAddress", "e-mailAddress", "emailAddress"\]/);
  assert.match(batteryProjection, /fieldTextValue\(field, locale\)/);
});
