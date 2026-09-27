import { execFileSync } from "node:child_process";
import { chmod, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const targetPath = ".env.development.local";
const permittedClipboardKeys = new Set([
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--init-url") {
      result.initUrl = argv[index + 1];
      index += 1;
    } else if (argument === "--clipboard-key") {
      result.clipboardKey = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return result;
}

function parseEnv(source) {
  const entries = new Map();
  for (const rawLine of source.split(/\r?\n/u)) {
    if (!rawLine || rawLine.trimStart().startsWith("#")) continue;
    const separator = rawLine.indexOf("=");
    if (separator < 1) continue;
    entries.set(rawLine.slice(0, separator).trim(), rawLine.slice(separator + 1));
  }
  return entries;
}

function renderEnv(entries) {
  return `${[...entries].map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
}

function projectRefFromUrl(value) {
  const url = new URL(value);
  const match = url.hostname.match(/^([a-z]{20})\.supabase\.co$/u);
  if (!match) throw new Error("Expected a project-specific Supabase URL.");
  return match[1];
}

function clipboardValue() {
  if (process.platform !== "darwin") {
    throw new Error("Clipboard import currently requires macOS pbpaste.");
  }
  const value = execFileSync("pbpaste", { encoding: "utf8" }).trim();
  if (!value || value.includes("\n") || value.length < 24) {
    throw new Error("Clipboard does not contain one valid credential value.");
  }
  if (!/^(?:eyJ|sb_publishable_|sb_secret_)/u.test(value)) {
    throw new Error("Clipboard value is not a recognized Supabase API credential.");
  }
  return value;
}

const args = parseArguments(process.argv.slice(2));
let source = "";
try {
  source = await readFile(targetPath, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const entries = parseEnv(source);

if (args.initUrl) {
  const projectRef = projectRefFromUrl(args.initUrl);
  entries.set("DPP_ENVIRONMENT", "development");
  entries.set("DEV_SUPABASE_PROJECT_REF", projectRef);
  entries.set("NEXT_PUBLIC_SUPABASE_URL", args.initUrl);
  entries.set("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  entries.set("FEATURE_SERVER_API_V2", "true");
  entries.set("FEATURE_V2_TENANT_CORE", "true");
  entries.set("FEATURE_V2_PARTNER", "true");
  entries.set("FEATURE_V2_ACCESS_POLICY", "true");
}

if (args.clipboardKey) {
  if (!permittedClipboardKeys.has(args.clipboardKey)) {
    throw new Error(`Unsupported credential key: ${args.clipboardKey}`);
  }
  entries.set(args.clipboardKey, clipboardValue());
}

if (!args.initUrl && !args.clipboardKey) {
  throw new Error("Use --init-url or --clipboard-key.");
}

await writeFile(targetPath, renderEnv(entries), { encoding: "utf8", mode: 0o600 });
await chmod(targetPath, 0o600);
console.log(
  args.clipboardKey
    ? `Configured ${args.clipboardKey} without printing its value.`
    : "Initialized Development environment metadata.",
);
