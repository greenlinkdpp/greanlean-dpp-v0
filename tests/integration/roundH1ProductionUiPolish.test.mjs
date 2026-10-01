import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Round H1 keeps public pages neutral without changing stored publication data", async () => {
  const [home, header, catalog, cards, passport, login] = await Promise.all([
    read("app/page.tsx"),
    read("components/PublicHeader.tsx"),
    read("components/v2/demo/DemoShowcase.tsx"),
    read("components/v2/demo/HomepageDemoMix.tsx"),
    read("components/v2/ProductizedDppPage.tsx"),
    read("app/login/page.tsx"),
  ]);
  assert.match(home, /本页展示内容用于说明 GreanLean 平台的数据组织、展示与管理能力/);
  assert.match(home, /does not represent a real customer product or a formal regulatory submission/);
  assert.match(header, /cases: "产品护照"/);
  assert.match(header, /cases: "Product Passports"/);
  assert.doesNotMatch(header, /cases: "Demo"/);
  assert.match(catalog, /产品护照展厅/);
  assert.match(catalog, /Product Passport Showcase/);
  assert.match(cards, /查看全部产品护照/);
  assert.match(passport, /isPlaceholderIdentifier/);
  assert.match(passport, /NOT_APPLICABLE: "不适用"/);
  assert.match(login, /请输入账号/);
  assert.match(login, /Enter your account/);
});

test("Round H1 uses approved display-only application scenarios for all eight passports", async () => {
  const passport = await read("components/v2/ProductizedDppPage.tsx");
  for (const identifier of [
    "DPP-GLR-LMT-000001", "DPP-GLR-LMT-000002", "DPP-GLR-LMT-000003", "DPP-DEMO-ESS-000001",
    "DPP-DEMO-TEX-000001", "DPP-DEMO-CE-000001", "DPP-DEMO-BLD-000001", "DPP-DEMO-HW-000001",
  ]) assert.match(passport, new RegExp(`"${identifier}"`));
  assert.match(passport, /withPublicDisplayOverrides/);
  assert.match(passport, /sanitizePublicValue/);
  assert.match(passport, /return sanitizePublicValue\(displayProjection\)/);
  assert.match(passport, /"SYNTHETIC_DEMO", "SYNTHETIC_REFERENCE", "SYNTHETIC_FIXTURE"/);
  assert.match(passport, /"synthetic demonstration event", "recorded event"/);
  assert.match(passport, /showNeutralDisclaimer = view\.synthetic \|\| Boolean\(applicationByPassport/);
});

test("Round H1 localizes operational UI and separates current publication from next-candidate readiness", async () => {
  const [consoleSource, copy] = await Promise.all([
    read("components/v2/backoffice/BackofficeConsole.tsx"),
    read("lib/v2/backoffice.ts"),
  ]);
  assert.match(consoleSource, /CURRENT_PUBLICATION: "当前已发布"/);
  assert.match(consoleSource, /review\.status === "PUBLISHED" \? "CURRENT_PUBLICATION"/);
  assert.match(consoleSource, /下一候选与当前发布状态/);
  assert.match(consoleSource, /"resolver_mapping\.create": "创建解析映射"/);
  assert.match(consoleSource, /referenceTenant = selected\?\.tenantCode === "greanlean-reference-mobility"/);
  assert.match(copy, /synthetic: "参考数据"/);
});
