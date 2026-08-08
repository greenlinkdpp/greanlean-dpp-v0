import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("only the four published product cases can request the public showcase projection", async () => {
  const showcase = await readFile("lib/server/dppShowcase.ts", "utf8");
  const home = await readFile("app/page.tsx", "utf8");
  const page = await readFile("app/p/[slug]/page.tsx", "utf8");

  for (const identifier of [
    "DPP-LMT-BAT-48V15AH",
    "DPP-GV-ESS-14K3-000001",
    "DPP-SFJK-31-1-REC",
    "DPP-CE-EARBUDS-001",
  ]) {
    assert.match(showcase, new RegExp(identifier));
    assert.match(home, new RegExp(identifier));
  }
  assert.doesNotMatch(showcase, /DPP-TEX-TSHIRT-001/);
  assert.doesNotMatch(home, /DPP-TEX-TSHIRT-001/);
  assert.match(showcase, /isDppShowcaseIdentifier\(identifier\)/);
  assert.match(home, /showcase=1/);
  assert.match(page, /loadShowcaseDppData\(identifier\)/);
});

test("showcase projection removes internal provenance and keeps normal access resolution intact", async () => {
  const showcase = await readFile("lib/server/dppShowcase.ts", "utf8");
  const access = await readFile("components/AccessAwareDppPage.tsx", "utf8");
  const output = await readFile("components/UnifiedDppPage.tsx", "utf8");

  assert.match(showcase, /sourceRecord/);
  assert.match(showcase, /sourceTables/);
  assert.match(showcase, /blockchainAnchors:\s*\[\]/);
  assert.match(access, /if \(showcase\)/);
  assert.match(access, /audience = "AUTHORITY_ONLY"/);
  assert.match(access, /resolveDppAccess|\/api\/dpp-access/);
  assert.match(output, /format=canonical&showcase=1/);
});

test("battery showcases provide separate category-specific BatteryPass validation files", async () => {
  const output = await readFile("components/UnifiedDppPage.tsx", "utf8");
  const route = await readFile("app/api/dpp-export/route.ts", "utf8");
  const exporter = await readFile("lib/server/batteryPassShowcase.ts", "utf8");

  assert.match(output, /format=batterypass&showcase=1/);
  assert.match(output, /下载 BatteryPass 校验 JSON/);
  assert.match(route, /buildBatteryPassShowcaseExport/);
  assert.match(route, /BatteryPass showcase export requires showcase=1/);
  assert.match(exporter, /Battery_Passport/);
  assert.match(exporter, /LMT_Guide-v1\.0/);
  assert.match(exporter, /Stationary_Industrial_2kWh_Guide-v1\.0/);
  assert.match(exporter, /industrial\/stationary battery/);
  assert.match(exporter, /ajv\.compile\(lmtSchema\)/);
  assert.match(exporter, /ajv\.compile\(stationarySchema\)/);
});

test("backoffice exposes canonical and category-specific BatteryPass validation actions", async () => {
  const panel = await readFile("components/DppOutputPanel.tsx", "utf8");
  const route = await readFile("app/api/battery-dpp/[productId]/batterypass-export/route.ts", "utf8");

  assert.match(panel, /format=canonical/);
  assert.match(panel, /mode=validate/);
  assert.match(panel, /Download BatteryPass JSON/);
  assert.match(route, /validateBatteryPassExport/);
  assert.match(route, /unverified-product-data/);
});
