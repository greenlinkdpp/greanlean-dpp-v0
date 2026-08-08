import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDirectory = path.join(root, "supabase/bundles");

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sourceSection(directory, file) {
  const source = await readFile(path.join(root, directory, file), "utf8");
  return [
    "-- ============================================================================",
    `-- SOURCE: ${directory}/${file}`,
    `-- SHA256: ${checksum(source)}`,
    "-- ============================================================================",
    source.trim(),
  ].join("\n");
}

await mkdir(outputDirectory, { recursive: true });
const install = [
  "-- GREANLEAN BACKOFFICE ALIGNMENT M5 INSTALL",
  "-- Generated file. Requires migrations 0013, 0014, 0015, and 0019.",
  "-- Moves browser writes behind server authorization and protects system records.",
  "-- Does not switch the public DPP reader or modify existing product data.",
  "",
  await sourceSection(
    "supabase/migrations",
    "0020_system_operation_security_boundary.sql",
  ),
  "",
].join("\n");
const rollback = [
  "-- GREANLEAN BACKOFFICE ALIGNMENT M5 ROLLBACK",
  "-- Refuses rollback after blockchain connector, request, or receipt data exists.",
  "",
  await sourceSection(
    "supabase/rollbacks",
    "0020_system_operation_security_boundary.down.sql",
  ),
  "",
].join("\n");

await Promise.all([
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase4_install.sql"),
    install,
  ),
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase4_rollback.sql"),
    rollback,
  ),
]);

const generatedInstall = await readFile(
  path.join(outputDirectory, "backoffice_alignment_phase4_install.sql"),
  "utf8",
);
if (
  generatedInstall !== install ||
  !generatedInstall.includes(
    "create table if not exists public.dpp_blockchain_connector (",
  )
) {
  throw new Error("Generated M5 install bundle failed integrity validation.");
}

console.info("Generated backoffice alignment M5 install and rollback bundles.");
