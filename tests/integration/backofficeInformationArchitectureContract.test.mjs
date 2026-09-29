import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("backoffice exposes one product-passport entry and resolves fields by identity", async () => {
  const [manager, editor, batteryWorkspace] = await Promise.all([
    readFile("components/ProductManager.tsx", "utf8"),
    readFile("components/ProductEditor.tsx", "utf8"),
    readFile("components/battery/BatteryDppWorkspace.tsx", "utf8"),
  ]);

  for (const source of [manager, editor, batteryWorkspace]) {
    assert.doesNotMatch(source, /view=(consumer|professional|audit)/);
  }
  assert.match(manager, /viewDpp:\s*"查看产品护照"/);
  assert.match(editor, /产品护照只有一个访问入口/);
});

test("battery editor retains five operating stages and maps the ten regulatory chapters", async () => {
  const editor = await readFile("components/ProductEditor.tsx", "utf8");

  assert.match(editor, /\["阶段 01",\s*"基础身份"/);
  assert.match(editor, /\["阶段 02",\s*isBattery \? "电池法规数据"/);
  assert.match(editor, /\["阶段 03",\s*isBattery \? "运行与生命周期"/);
  assert.match(editor, /\["阶段 04",\s*"合规证据"/);
  assert.match(editor, /\["阶段 05",\s*isPlatformAdmin \? "校验与发布"/);
  assert.match(editor, /对应 DPP 模块 08–09/);
  assert.match(editor, /流程阶段 05/);
  assert.match(editor, /initialStep="health"/);
  assert.match(editor, /allowedSteps=\{\["health", "lifecycle"\]\}/);
  assert.match(editor, /initialStep="evidence"/);
  assert.match(editor, /allowedSteps=\{\["evidence"\]\}/);
});

test("dashboard uses the same five-stage operating workflow as the product editor", async () => {
  const dashboard = await readFile("app/dashboard/page.tsx", "utf8");

  assert.match(dashboard, /\[t\.identity,\s*t\.identityDesc\]/);
  assert.match(dashboard, /\[t\.data,\s*t\.dataDesc\]/);
  assert.match(dashboard, /\[t\.lifecycle,\s*t\.lifecycleDesc\]/);
  assert.match(dashboard, /\[t\.evidence,\s*t\.evidenceDesc\]/);
  assert.match(dashboard, /\[t\.publish,\s*t\.publishDesc\]/);
  assert.match(dashboard, /xl:grid-cols-5/);
});

test("partner navigation exposes V2 only when a server-authorised V2 context exists", async () => {
  const shell = await readFile("components/DashboardShell.tsx", "utf8");

  assert.match(shell, /hasV2Backoffice \? \[\[t\.v2Operations, "\/dashboard\/v2", "V2"\]\] : \[\]/);
  assert.match(shell, /fetch\("\/api\/v2\/backoffice\/context"/);
  assert.match(shell, /items:\s*\[\[t\.platformConsole, "\/dashboard\/platform", "01"\]\]/);
  assert.match(shell, /items:\s*\[\[t\.v2Operations, "\/dashboard\/v2", "02"\]\]/);
  assert.match(shell, /const navGroups = isPlatformAdmin/);
  assert.match(shell, /!identity\.isPlatformAdmin && !partnerRouteAllowed/);
});

test("Platform V2 backoffice requires an explicit verified Tenant context", async () => {
  const consoleSource = await readFile("components/v2/backoffice/BackofficeConsole.tsx", "utf8");

  assert.match(consoleSource, /const requestedContext = requestedTenant \? next\.find/);
  assert.match(consoleSource, /hasPlatformAuthority/);
  assert.match(consoleSource, /Choose a Tenant from Platform Overview/);
  assert.doesNotMatch(consoleSource, /item\.tenantCode === "greanlean-reference-mobility"/);
  assert.doesNotMatch(consoleSource, /tenantName\.toLowerCase\(\)\.includes\("soodoo"\)/i);
});

test("login accepts the Orintent username alias and shells contain the official logo on white", async () => {
  const [login, shell, logo] = await Promise.all([
    readFile("app/login/page.tsx", "utf8"),
    readFile("components/DashboardShell.tsx", "utf8"),
    readFile("components/BrandLogo.tsx", "utf8"),
  ]);

  assert.match(login, /identifier\.includes\("@"\) \? identifier : `\$\{identifier\}@greanlean\.com`/);
  assert.match(login, /name="identifier"/);
  assert.match(login, /rounded-\[14px\] bg-white/);
  assert.match(shell, /rounded-\[14px\] bg-white/);
  assert.match(logo, /object-contain/);
});
