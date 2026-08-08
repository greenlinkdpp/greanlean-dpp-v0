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
  "-- GREANLEAN BACKOFFICE ALIGNMENT M6 FOUNDATION INSTALL",
  "-- Generated file. Requires migrations 0013 through 0020.",
  "-- Adds canonical-read projection, migration tracking, and Registry publication links.",
  "-- Read mode remains LEGACY until four canonical publications pass cutover gates.",
  "",
  await sourceSection(
    "supabase/migrations",
    "0021_publication_backfill_and_read_cutover.sql",
  ),
  "",
].join("\n");
const rollback = [
  "-- GREANLEAN BACKOFFICE ALIGNMENT M6 LOGICAL ROLLBACK",
  "-- Restores LEGACY read mode and deliberately preserves migration evidence.",
  "",
  await sourceSection(
    "supabase/rollbacks",
    "0021_publication_backfill_and_read_cutover.down.sql",
  ),
  "",
].join("\n");

await Promise.all([
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase5_install.sql"),
    install,
  ),
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase5_rollback.sql"),
    rollback,
  ),
]);

const generatedInstall = await readFile(
  path.join(outputDirectory, "backoffice_alignment_phase5_install.sql"),
  "utf8",
);
if (
  generatedInstall !== install
  || !generatedInstall.includes("create table if not exists public.dpp_publication_read_control")
) {
  throw new Error("Generated M6 install bundle failed integrity validation.");
}

console.info("Generated backoffice alignment M6 install and rollback bundles.");
