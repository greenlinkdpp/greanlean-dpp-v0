import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(await readFile("config/battery/battery-pass-ready-longlist-v1.3.json", "utf8"));

function decodePointer(segment) {
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

function dereference(root, node) {
  let current = node;
  while (current?.$ref?.startsWith("#/")) {
    current = current.$ref.slice(2).split("/").map(decodePointer).reduce((value, key) => value?.[key], root);
  }
  return current;
}

function resolvesInstancePath(schema, pointer) {
  let node = schema;
  for (const segment of pointer.slice(1).split("/")) {
    node = dereference(schema, node);
    const key = decodePointer(segment);
    node = node?.properties?.[key] ?? node?.items?.properties?.[key];
  }
  return dereference(schema, node) !== undefined;
}

test("BatteryPass-Ready v1.3 catalog preserves all 100 source attributes", () => {
  assert.equal(catalog.catalogVersion, "1.3.0");
  assert.equal(catalog.fields.length, 100);
  assert.equal(catalog.fields.filter((field) => field.dataBehavior === "STATIC").length, 78);
  assert.equal(catalog.fields.filter((field) => field.dataBehavior === "DYNAMIC").length, 22);
  assert.equal(new Set(catalog.fields.map((field) => field.fieldCode)).size, 100);
  assert.ok(catalog.fields.every((field) => field.labelEn && field.labelZh && field.instructionZh && field.workflowStep));
});

test("the five imported JSON Schemas retain their source hashes and pointer mappings", async () => {
  for (const [profileCode, source] of Object.entries(catalog.schemaSources)) {
    const bytes = await readFile(`config/battery/schemas/${source.file}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), source.sha256, `${source.file} hash changed`);
    const schema = JSON.parse(bytes.toString("utf8"));
    const pointers = catalog.fields.map((field) => field.jsonPointers[profileCode]).filter(Boolean);
    assert.ok(pointers.length > 0, `${profileCode} has no mapped fields`);
    for (const pointer of pointers) {
      assert.ok(resolvesInstancePath(schema, pointer), `${profileCode} does not resolve ${pointer}`);
    }
  }
});

test("portable and SLI applicability stays explicitly undecided in the reference longlist", () => {
  for (const field of catalog.fields) {
    assert.equal(field.categoryRequirementStatus["battery.portable"], "TBD");
    assert.equal(field.categoryRequirementStatus["battery.sli"], "TBD");
  }
});

test("public DPP rendering cannot return item operating telemetry", async () => {
  const page = await readFile("app/p/[slug]/page.tsx", "utf8");
  const publicRepository = await readFile("lib/dpp/publicDppRepository.ts", "utf8");
  assert.doesNotMatch(page, /battery_operating_metric/);
  assert.doesNotMatch(publicRepository, /battery_operating_metric/);
  assert.match(publicRepository, /\["state_of_health", "state_of_charge"\]/);
  assert.match(publicRepository, /sectorFieldValues\.filter/);

  const publicClient = await readFile("components/PublicDppClient.tsx", "utf8");
  assert.match(publicClient, /returns no item telemetry or operating values/);
  assert.match(publicClient, /不返回任何单体遥测或运行数值/);
});

test("legacy battery templates keep SoH and SoC outside public visibility", async () => {
  const manager = await readFile("components/SectorFieldManager.tsx", "utf8");
  for (const fieldKey of ["state_of_health", "state_of_charge"]) {
    const definition = manager.match(new RegExp(`field_key: "${fieldKey}"[^\\n]+`))?.[0] || "";
    assert.match(definition, /visibility_level: "professional"/);
    assert.match(definition, /legitimate-interest users only/);
  }
});

test("battery workspaces require product-scoped editor access and exports remain platform-controlled", async () => {
  const accessRepository = await readFile("lib/server/dppAccess.ts", "utf8");
  assert.match(accessRepository, /requireDppInternalUser/);
  assert.match(accessRepository, /requireProductEditorAccess/);
  assert.match(accessRepository, /DPP_INTERNAL_ACCESS_REQUIRED/);
  assert.match(accessRepository, /greanlean_get_my_identity/);

  const workspaceRoute = await readFile("app/api/battery-dpp/[productId]/route.ts", "utf8");
  assert.match(workspaceRoute, /requireProductEditorAccess/);
  assert.match(workspaceRoute, /route\.params\.productId/);
  assert.match(workspaceRoute, /createServerAuthClient\(accessToken\)/);

  const exportRoute = await readFile("app/api/battery-dpp/[productId]/batterypass-export/route.ts", "utf8");
  assert.match(exportRoute, /requireDppInternalUser/);
  assert.match(exportRoute, /createServerAuthClient\(accessToken\)/);
});

test("BatteryPass export is offered only to categories with imported validation Schemas", async () => {
  const workspace = await readFile("components/battery/BatteryDppWorkspace.tsx", "utf8");
  const registryWorkbench = await readFile("components/battery/RegistryWorkbench.tsx", "utf8");
  const repository = await readFile("lib/server/batteryPassRepository.ts", "utf8");

  assert.match(workspace, /hasBatteryPassSchema=\{\["ev", "lmt", "industrial"\]\.includes\(category\)\}/);
  assert.match(registryWorkbench, /hasBatteryPassSchema \? <button[\s\S]*downloadBatteryPass/);
  for (const schema of [
    "EV.json",
    "LMT.json",
    "Industrial_Without_BMS.json",
    "Other_Industrial_Above_2kWh.json",
    "Stationary_Industrial_Above_2kWh.json",
  ]) {
    assert.match(repository, new RegExp(schema.replace(".", "\\.")));
  }
});
