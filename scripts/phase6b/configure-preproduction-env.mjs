import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmod, writeFile } from "node:fs/promises";
import process from "node:process";

const projectRef = "efhiaufukjchxqhbmpvq";
const productionRef = "lpxdbysgmdsjhxrjzhly";
const developmentRef = "qlrbrwrpvtnlphajvqao";
const outputPath = ".env.preproduction.local";
const nodeBin = "/Users/david/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin";

if (projectRef === productionRef || projectRef === developmentRef) {
  throw new Error("REFUSED: Pre-Production target collides with a protected project.");
}

const commandEnv = {
  ...process.env,
  PATH: `${nodeBin}:${process.env.PATH ?? ""}`,
};
const raw = execFileSync(
  "pnpm",
  [
    "dlx",
    "supabase@2.117.0",
    "--agent",
    "no",
    "projects",
    "api-keys",
    "--project-ref",
    projectRef,
    "--output",
    "json",
  ],
  { encoding: "utf8", env: commandEnv, maxBuffer: 8 * 1024 * 1024 },
);

const jsonStart = raw.indexOf("[");
const jsonEnd = raw.lastIndexOf("]");
if (jsonStart < 0 || jsonEnd < jsonStart) {
  throw new Error("Supabase CLI did not return an API key inventory.");
}
const keys = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
const byName = (name) => keys.find((item) => item.name === name)?.api_key;
const anonKey = byName("anon");
const serviceRoleKey = byName("service_role");
if (!anonKey || !serviceRoleKey) {
  throw new Error("Required legacy anon/service_role keys were not returned.");
}

const entries = new Map([
  ["DPP_ENVIRONMENT", "preproduction"],
  ["PREPROD_SUPABASE_PROJECT_REF", projectRef],
  ["NEXT_PUBLIC_SUPABASE_URL", `https://${projectRef}.supabase.co`],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
  ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ["NEXT_PUBLIC_SITE_URL", "http://localhost:3000"],
  ["FEATURE_SERVER_API_V2", "true"],
  ["FEATURE_V2_TENANT_CORE", "true"],
  ["FEATURE_V2_PARTNER", "true"],
  ["FEATURE_V2_ACCESS_POLICY", "true"],
  ["FEATURE_V2_PRODUCT_CORE", "true"],
  ["FEATURE_V2_SCHEMA_CORE", "true"],
  ["FEATURE_V2_CANONICAL_DATA", "true"],
  ["FEATURE_V2_PROVENANCE", "true"],
  ["FEATURE_V2_RESOLUTION_ENGINE", "true"],
  ["FEATURE_V2_DPP_PASSPORT", "true"],
  ["FEATURE_V2_DPP_REVIEW", "true"],
  ["FEATURE_V2_DPP_PUBLICATION", "true"],
  ["FEATURE_V2_RESOLVER", "true"],
  ["FEATURE_V2_PUBLIC_PROJECTION", "true"],
  ["FEATURE_V2_INTEGRATION_CORE", "true"],
  ["FEATURE_V2_FILE_IMPORT", "true"],
  ["FEATURE_V2_REGISTRY_TEST", "true"],
  ["FEATURE_V2_EXTERNAL_CONNECTORS", "true"],
  ["FEATURE_V2_BMS_ADAPTER", "true"],
  ["FEATURE_V2_PUBLIC_READ", "true"],
  ["FEATURE_V2_TENANT_API", "true"],
  ["FEATURE_V2_PUBLICATION_WRITE", "true"],
  ["FEATURE_V2_CONNECTOR_EXECUTION", "true"],
]);

const rendered = `${[...entries].map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
await writeFile(outputPath, rendered, { encoding: "utf8", mode: 0o600 });
await chmod(outputPath, 0o600);

const fingerprint = createHash("sha256").update(projectRef).digest("hex").slice(0, 12);
console.log(`PREPRODUCTION ENV CONFIGURED: project fingerprint ${fingerprint}; credentials written without disclosure.`);
