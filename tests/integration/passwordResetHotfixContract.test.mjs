import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("login exposes bilingual password reset entry and reset flow uses Supabase", async () => {
  const [login, forgot, reset] = await Promise.all([
    read("app/login/page.tsx"),
    read("app/forgot-password/page.tsx"),
    read("app/reset-password/page.tsx"),
  ]);
  assert.match(login, /Forgot password\?/);
  assert.match(login, /忘记密码/);
  assert.match(forgot, /resetPasswordForEmail/);
  assert.match(forgot, /window\.location\.origin.*\/reset-password/);
  assert.match(forgot, /If this email belongs to a valid account/);
  assert.match(forgot, /如果该邮箱对应有效账户/);
  assert.match(reset, /auth\.getSession/);
  assert.match(reset, /auth\.updateUser\(\{ password \}\)/);
  assert.match(reset, /password !== confirmation/);
  assert.doesNotMatch(forgot, /console\.(log|error)/);
  assert.doesNotMatch(reset, /console\.(log|error)/);
});

test("password reset success and login return paths remain same-origin", async () => {
  const [login, forgot, reset] = await Promise.all([
    read("app/login/page.tsx"),
    read("app/forgot-password/page.tsx"),
    read("app/reset-password/page.tsx"),
  ]);
  assert.match(login, /forgot-password\?lang=/);
  assert.match(reset, /\/login\?lang=\$\{locale\}&reset=success/);
  assert.doesNotMatch(forgot, /next=|redirect=/);
  assert.doesNotMatch(reset, /next=|redirect=/);
});
