import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = JSON.parse(await readFile("docs/schemas/greanlean-dpp.schema.json", "utf8"));
const example = JSON.parse(await readFile("docs/schemas/greanlean-dpp.example.json", "utf8"));

test("published example keeps every required top-level DPP contract key", () => {
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.ok(Array.isArray(schema.required));
  for (const key of schema.required) {
    assert.ok(Object.hasOwn(example, key), `Example is missing required key: ${key}`);
  }
});

test("DPP contract keeps identity, evidence, registry, and integrity projections", () => {
  const required = new Set(schema.required);
  for (const key of ["product", "identity", "sector_profile", "documents", "registry", "evidence_links", "blockchain_anchors"]) {
    assert.ok(required.has(key), `Schema contract is missing ${key}`);
  }
});
