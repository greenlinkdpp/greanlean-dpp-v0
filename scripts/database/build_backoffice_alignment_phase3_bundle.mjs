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
  "-- GREANLEAN BACKOFFICE ALIGNMENT M4 INSTALL",
  "-- Generated file. Requires migrations 0013 and 0015 through 0018.",
  "-- Adds immutable evidence files and append-only lifecycle history.",
  "-- Does not switch the public DPP reader or backfill legacy files.",
  "",
  await sourceSection(
    "supabase/migrations",
    "0019_file_evidence_lifecycle_foundation.sql",
  ),
  "",
].join("\n");
const rollback = [
  "-- GREANLEAN BACKOFFICE ALIGNMENT M4 ROLLBACK",
  "-- Refuses rollback after M4 business data exists.",
  "",
  await sourceSection(
    "supabase/rollbacks",
    "0019_file_evidence_lifecycle_foundation.down.sql",
  ),
  "",
].join("\n");

await Promise.all([
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase3_install.sql"),
    install,
  ),
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase3_rollback.sql"),
    rollback,
  ),
]);

console.info("Generated backoffice alignment M4 install and rollback bundles.");
