import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const queryVariants = [
  "showcase=1",
  "showcase=1&showcase=0",
  "showcase=0&showcase=1",
  "SHOWCASE=1",
  "showcase=%31",
  "showcase=true",
];

test("showcase query variants cannot select a privileged export projection", async () => {
  const route = await readFile("app/api/dpp-export/route.ts", "utf8");

  for (const query of queryVariants) {
    const params = new URLSearchParams(query);
    assert.ok(params.getAll("showcase").every((value) => typeof value === "string"));
  }

  assert.match(route, /loadBatteryProjection\([\s\S]*createSupabasePublicServerClient\(\)[\s\S]*"PUBLIC"[\s\S]*includeMissing: false/);
  assert.doesNotMatch(route, /createSupabaseAdminClient|"INTERNAL"/);
});

test("public battery route requires authentication before any non-public audience", async () => {
  const route = await readFile("app/api/battery-dpp/public/[identifier]/route.ts", "utf8");

  assert.match(route, /audience\.toLowerCase\(\)/);
  assert.match(route, /requireAuthenticatedUser\(request\)/);
  assert.match(route, /accessLevel === "PUBLIC"[\s\S]*createSupabasePublicServerClient\(\)[\s\S]*createSupabaseAdminClient\(\)/);
  assert.doesNotMatch(route, /showcase.*INTERNAL|INTERNAL.*showcase/);
});
