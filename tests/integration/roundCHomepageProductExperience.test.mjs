import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Round C gives the homepage a battery-first published-demo experience", async () => {
  const [home, navigation, header] = await Promise.all([read("app/page.tsx"), read("lib/navigation.ts"), read("components/PublicHeader.tsx")]);
  for (const copy of ["面向欧盟市场的电池数字产品护照平台", "查看电池护照 Demo", "了解实施流程", "登录平台", "View Battery Passport Demo", "See Implementation Process", "Sign in"]) assert.match(home, new RegExp(copy));
  for (const id of ["DPP-GLR-LMT-000001", "DPP-GLR-LMT-000002", "DPP-GLR-LMT-000003", "DPP-DEMO-ESS-000001"]) assert.match(home, new RegExp(id));
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
