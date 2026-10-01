import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedDescriptions = [
  ["DPP-GLR-LMT-000001", "A lightweight e-bike battery pack designed for urban commuting.", "GLR-P25A 为城市通勤设计的轻型电助力单车电池包。"],
  ["DPP-GLR-LMT-000002", "A high-energy-density NMC battery pack for extended urban riding.", "GLR-S36B 采用高能量密度 NMC 电芯，适用于城市长续航骑行。"],
  ["DPP-GLR-LMT-000003", "A high-load battery pack designed for cargo and fleet operations.", "GLR-X48C 面向货运与车队运营的高负载电池包。"],
  ["DPP-DEMO-ESS-000001", "A 14.3 kWh LFP energy storage module for commercial and industrial applications.", "GreenVault 工商业场景的 14.3 kWh 磷酸铁锂储能模块。"],
  ["DPP-DEMO-TEX-000001", "An organic cotton basic T-shirt made with comfortable 180 g/m² fabric.", "EcoWeave 有机棉基础款 T 恤，采用 180 g/m² 舒适面料。"],
  ["DPP-DEMO-CE-000001", "Bluetooth wireless headphones with a recycled ABS enclosure.", "LoopSound 采用再生 ABS 外壳的蓝牙无线耳机。"],
  ["DPP-DEMO-BLD-000001", "Wood-plastic composite flooring with 52% recycled content.", "TerraDeck 再生材料含量 52% 的木塑复合地板。"],
  ["DPP-DEMO-HW-000001", "A precision alloy-steel tool set with replaceable bits.", "ForgeFix 批头可更换的合金钢精密工具套装。"],
];

test("Round E.1 keeps global catalog order and localized catalog-owned descriptions", async () => {
  const [repository, seed, updater, card] = await Promise.all([
    readFile("lib/server/v2/demoShowcase.ts", "utf8"), readFile("scripts/phase7/seed-round-b1-preprod-demo.mjs", "utf8"),
    readFile("scripts/phase7/apply-round-e1-preprod-demo-copy.mjs", "utf8"), readFile("components/v2/demo/DemoShowcase.tsx", "utf8"),
  ]);
  assert.match(repository, /\.order\("sort_order"\)\.order\("id"\)/);
  assert.match(card, /entry\.summaryZh/);
  assert.match(card, /entry\.summaryEn/);
  for (const [identifier, en, zh] of expectedDescriptions) {
    assert.match(updater, new RegExp(identifier));
    assert.ok(updater.includes(en)); assert.ok(updater.includes(zh));
    assert.ok(seed.includes(en)); assert.ok(seed.includes(zh));
  }
});

test("Round E.1 keeps Production URL origin configuration explicit and PreProd-only guards isolated", async () => {
  const [page, preprod, qrPolicy] = await Promise.all([
    readFile("app/p/[slug]/page.tsx", "utf8"), readFile("scripts/phase6b/configure-preproduction-env.mjs", "utf8"), readFile("lib/v2/qrPolicy.ts", "utf8"),
  ]);
  assert.match(page, /process\.env\.NEXT_PUBLIC_SITE_URL/);
  assert.match(preprod, /PREPROD_SUPABASE_PROJECT_REF/);
  assert.match(preprod, /DPP_ENVIRONMENT", "preproduction/);
  assert.match(qrPolicy, /process\.env\.QR_APPROVED_HOSTS/);
});

test("Round E.1 migration readiness audit retains ordered dependencies and backup consumer checks", async () => {
  const [m36, m37, m38, m39, audit] = await Promise.all([
    readFile("supabase/migrations/0036_v2_platform_operator_multitenant.sql", "utf8"), readFile("supabase/migrations/0037_v2_product_organisation_relationships.sql", "utf8"),
    readFile("supabase/migrations/0038_v2_demo_showcase_catalog.sql", "utf8"), readFile("supabase/migrations/0039_round_d_security_operations_closeout.sql", "utf8"),
    readFile("scripts/phase7/audit-round-e-production-readonly.mjs", "utf8"),
  ]);
  assert.match(m36, /migration_number = '0035'/); assert.match(m37, /migration_number = '0036'/); assert.match(m38, /migration_number = '0037'/); assert.match(m39, /migration_number = '0038'/);
  assert.match(m39, /drop table if exists public\.greanlean_0012_data_backup/);
  for (const field of ["obsoleteBackupTableExists", "obsoleteBackupRows", "obsoleteBackupConsumers", "information_schema\.view_table_usage", "information_schema\.triggers"]) assert.match(audit, new RegExp(field.replaceAll(".", "\\.")));
});
