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
  "-- GREANLEAN BACKOFFICE ALIGNMENT M3 INSTALL",
  "-- Generated file. Requires migrations 0015 through 0017.",
  "-- Does not switch the public DPP reader or create publication records.",
  "",
  await sourceSection(
    "supabase/migrations",
    "0018_canonical_publication_finalization.sql",
  ),
  "",
].join("\n");
const rollback = [
  "-- GREANLEAN BACKOFFICE ALIGNMENT M3 ROLLBACK",
  "-- Use only before canonical publication business data exists.",
  "",
  await sourceSection(
    "supabase/rollbacks",
    "0018_canonical_publication_finalization.down.sql",
  ),
  "",
].join("\n");

await Promise.all([
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase2_install.sql"),
    install,
  ),
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase2_rollback.sql"),
    rollback,
  ),
]);

console.info("Generated backoffice alignment M3 install and rollback bundles.");
