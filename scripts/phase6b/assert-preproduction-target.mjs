import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const envPath = process.argv.includes("--env-file")
  ? process.argv[process.argv.indexOf("--env-file") + 1]
  : ".env.preproduction.local";

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/u)
      .filter((line) => line && !line.trimStart().startsWith("#") && line.includes("="))
      .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
  );
}

const env = parseEnv(await readFile(envPath, "utf8"));
const expectedRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const actualRef = url.hostname.replace(/\.supabase\.co$/u, "");

if (env.DPP_ENVIRONMENT !== "preproduction") throw new Error("REFUSED: environment is not Pre-Production.");
if (env.PREPROD_SUPABASE_PROJECT_REF !== expectedRef || actualRef !== expectedRef) {
  throw new Error("REFUSED: unexpected Pre-Production project reference.");
}
if (protectedRefs.has(actualRef)) throw new Error("REFUSED: protected Production/Development target detected.");
if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("REFUSED: Pre-Production credentials are incomplete.");
}

const result = {
  isolated: true,
  environment: "preproduction",
  projectRefFingerprint: createHash("sha256").update(actualRef).digest("hex").slice(0, 12),
  credentialsPresent: true,
  productionWritePerformed: false,
  productionTrafficSwitched: false,
};
console.log(JSON.stringify(result));
