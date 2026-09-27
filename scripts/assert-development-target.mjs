import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";

const defaultEnvFile = ".env.development.local";
const denylistPath = new URL(
  "../config/environment/production-target-denylist.json",
  import.meta.url,
);

function parseArguments(argv) {
  const args = { envFile: defaultEnvFile, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env-file") {
      args.envFile = argv[index + 1];
      index += 1;
    } else if (argv[index] === "--json") {
      args.json = true;
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  return args;
}

function parseEnv(source) {
  const result = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function projectRefFromUrl(value) {
  const url = new URL(value);
  const suffix = ".supabase.co";
  if (!url.hostname.endsWith(suffix)) {
    throw new Error("Development Supabase URL must use a project-specific supabase.co host.");
  }
  const projectRef = url.hostname.slice(0, -suffix.length);
  if (!/^[a-z]{20}$/u.test(projectRef)) {
    throw new Error("Development Supabase URL does not contain a valid project ref.");
  }
  return { projectRef, apiHost: url.hostname };
}

const args = parseArguments(process.argv.slice(2));
const [envSource, denylistSource] = await Promise.all([
  readFile(args.envFile, "utf8"),
  readFile(denylistPath, "utf8"),
]);
const env = parseEnv(envSource);
const denylist = JSON.parse(denylistSource);

if (env.DPP_ENVIRONMENT !== "development") {
  throw new Error("REFUSED: DPP_ENVIRONMENT must be development.");
}
if (!env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("REFUSED: NEXT_PUBLIC_SUPABASE_URL is missing.");
}

const { projectRef, apiHost } = projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
if (env.DEV_SUPABASE_PROJECT_REF !== projectRef) {
  throw new Error("REFUSED: DEV_SUPABASE_PROJECT_REF does not match the URL target.");
}

const projectRefHash = sha256(projectRef);
const apiHostHash = sha256(apiHost);
if (
  denylist.projectRefSha256.includes(projectRefHash) ||
  denylist.apiHostSha256.includes(apiHostHash)
) {
  throw new Error("REFUSED: Production target detected.");
}

const requiredSecrets = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missingSecrets = requiredSecrets.filter((key) => !env[key]);
if (missingSecrets.length > 0) {
  throw new Error(`REFUSED: missing Development credentials: ${missingSecrets.join(", ")}.`);
}

const result = {
  isolated: true,
  environment: "development",
  projectRefFingerprint: projectRefHash.slice(0, 12),
  apiHostFingerprint: apiHostHash.slice(0, 12),
  credentialsPresent: true,
};

if (args.json) {
  console.log(JSON.stringify(result));
} else {
  console.log("DEVELOPMENT TARGET VERIFIED");
  console.log(`Project ref fingerprint: ${result.projectRefFingerprint}`);
  console.log(`API host fingerprint: ${result.apiHostFingerprint}`);
}
