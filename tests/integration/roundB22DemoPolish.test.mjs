import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const seed = await readFile(new URL("../../scripts/phase7/seed-round-b1-preprod-demo.mjs", import.meta.url), "utf8");
const showcase = await readFile(new URL("../../components/v2/demo/DemoShowcase.tsx", import.meta.url), "utf8");
const demoPage = await readFile(new URL("../../app/demo/page.tsx", import.meta.url), "utf8");
const publicPage = await readFile(new URL("../../app/p/[slug]/page.tsx", import.meta.url), "utf8");

test("Round B2.2 keeps the exact differentiated LMT carbon profiles", () => {
  for (const expected of [
    /31\.8.*renewable: 34.*materials: 16\.5.*manufacturing: 8\.2.*transport: 4\.0.*packaging: 1\.6.*other: 1\.5/,
    /48\.6.*renewable: 42.*materials: 26\.1.*manufacturing: 12\.7.*transport: 5\.4.*packaging: 2\.2.*other: 2\.2/,
    /62\.4.*renewable: 47.*materials: 34\.8.*manufacturing: 15\.4.*transport: 6\.5.*packaging: 2\.8.*other: 2\.9/,
  ]) assert.match(seed, expected);
});

test("Round B2.2 assigns category-specific recyclers and semantics", () => {
  for (const value of [
    "EcoWeave Textile Recycling Partner",
    "LoopSound Electronics Recovery Partner",
    "TerraDeck Materials Recovery Partner",
    "ForgeFix Metal Recycling Partner",
    "防潮、防污染，避免长期挤压",
    "按 WEEE / 电子废弃物分类回收",
    "平放运输，避免弯折、重压和表面划伤",
    "主体金属优先进入金属回收体系",
  ]) assert.match(seed, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(seed, /delete from public\.product_organisation_relation[\s\S]*relation_type='RECYCLER'/);
});

test("Round B2.2 lifecycle catalogs are differentiated by DPP", () => {
  for (const value of ["通勤使用", "长续航骑行", "车队运营", "并网投运", "染整", "电子废弃物回收", "挤出成型", "金属回收"]) {
    assert.match(seed, new RegExp(value));
  }
  assert.match(seed, /const lifecycle = lifecycleNames\.map/);
});

test("Round B2.2 showcase localizes values and supplies display units", () => {
  for (const unit of ["V", "Ah", "Wh", "kWh", "kg", "g\/m²", "mm", "°C", "%", "kg CO₂e"]) assert.match(showcase, new RegExp(unit));
  for (const value of ["木塑地板", "消费电子", "再生 ABS", "合金钢", "可更换批头", "手动工具", "工业储能", "锂离子", "电动自行车电池包", "纺织品", "有机棉"]) assert.match(showcase, new RegExp(value));
  assert.doesNotMatch(showcase, /<dd[^>]*>\{String\(value\)\}<\/dd>/);
});

test("Round B2.2 uses the approved localized absolute titles", () => {
  assert.match(demoPage, /GreanLean 数字产品护照演示展厅/);
  assert.match(publicPage, /GreanLean DPP/);
  assert.match(demoPage, /title:\s*\{\s*absolute:/);
  assert.match(publicPage, /title:\s*\{\s*absolute:/);
});
