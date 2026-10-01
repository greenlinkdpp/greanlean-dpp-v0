import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Round C.1 gives the homepage a DPP-platform position with a published multi-category demo mix", async () => {
  const [home, mix, navigation, header] = await Promise.all([read("app/page.tsx"), read("components/v2/demo/HomepageDemoMix.tsx"), read("lib/navigation.ts"), read("components/PublicHeader.tsx")]);
  for (const copy of ["面向欧盟市场的数字产品护照平台", "查看 DPP", "了解实施流程", "登录平台", "Digital Product Passport Platform for the EU Market", "View DPP", "See Implementation Process", "Sign in"]) assert.match(home, new RegExp(copy));
  for (const id of ["DPP-GLR-LMT-000002", "DPP-DEMO-ESS-000001", "DPP-DEMO-TEX-000001", "DPP-DEMO-CE-000001"]) assert.match(mix, new RegExp(id));
  assert.match(navigation, /PRIMARY_V2_DEMO_PATH = "\/demo"/);
  assert.match(header, /`\/demo\?lang=\$\{locale\}`/);
});

test("Round C carries localized public-demo corrections through the shared display paths", async () => {
  const [seed, showcase, presentation] = await Promise.all([read("scripts/phase7/seed-round-b1-preprod-demo.mjs"), read("components/v2/demo/DemoShowcase.tsx"), read("lib/v2/presentation.ts")]);
  assert.match(seed, /dimensions_mm: "140 × 25 × 2200 mm"/);
  assert.match(seed, /rated_power_kw: 7\.2/);
  assert.match(showcase, /String\(value\) === "Bluetooth" \? "蓝牙"/);
  assert.match(presentation, /"0°C to 45°C": "0°C 至 45°C"/);
});
