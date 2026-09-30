import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("homepage and footer use the canonical Reference Demo and localized login", async () => {
  const [home, routes] = await Promise.all([read("app/page.tsx"), read("lib/navigation.ts")]);
  assert.match(routes, /PRIMARY_V2_DEMO_PATH = "\/p\/DPP-GLR-EBIKE-000001"/);
  assert.match(home, /View DPP Demo/);
  assert.match(home, /查看 DPP Demo/);
  assert.match(home, /Platform Login/);
  assert.match(home, /平台登录/);
  assert.match(home, /footerLogin, `\/login\?lang=\$\{locale\}`/);
});

test("login and unauthenticated dashboard preserve a safe V2 return target", async () => {
  const [login, shell, routes] = await Promise.all([
    read("app/login/page.tsx"),
    read("components/DashboardShell.tsx"),
    read("lib/navigation.ts"),
  ]);
  assert.match(login, /safeLoginReturnPath/);
  assert.match(routes, /V2_BACKOFFICE_PATH = "\/dashboard\/v2"/);
  assert.match(routes, /requested\.includes\("\\\\"\)/);
  assert.match(shell, /next=\$\{encodeURIComponent\(returnTo\)\}/);
});

test("Backoffice removes redundant header escapes while public DPP retains its safe utility links", async () => {
  const [backoffice, dpp] = await Promise.all([
    read("components/v2/backoffice/BackofficeConsole.tsx"),
    read("components/v2/ProductizedDppPage.tsx"),
  ]);
  assert.doesNotMatch(backoffice, /Back to website/);
  assert.doesNotMatch(backoffice, /View public Demo/);
  assert.doesNotMatch(backoffice, /\/p\/\$\{selected\.tenantId\}/);
  assert.match(dpp, /GreanLean Home/);
  assert.match(dpp, /Platform Login/);
  assert.match(dpp, /`\/login\?lang=\$\{locale\}`/);
});
