import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDirectory = path.join(root, "supabase/bundles");
const migrations = [
  "0015_dpp_publication_foundation.sql",
  "0016_dpp_publication_review.sql",
  "0017_publication_review_function_permissions.sql",
];
const rollbacks = [
  "0017_publication_review_function_permissions.down.sql",
  "0016_dpp_publication_review.down.sql",
  "0015_dpp_publication_foundation.down.sql",
];

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function compose(directory, files, header) {
  const sections = [];
  for (const file of files) {
    const source = await readFile(path.join(root, directory, file), "utf8");
    sections.push([
      "-- ============================================================================",
      `-- SOURCE: ${directory}/${file}`,
      `-- SHA256: ${checksum(source)}`,
      "-- ============================================================================",
      source.trim(),
    ].join("\n"));
  }
  return `${header.trim()}\n\n${sections.join("\n\n")}\n`;
}

const installHeader = `
-- GREANLEAN BACKOFFICE ALIGNMENT PHASE 1 INSTALL
-- Generated file. Do not edit this bundle manually.
-- Requires migrations 0001 through 0014.
-- This additive bundle creates the publication and review foundation only.
-- It does not switch the public DPP reader or modify product business data.
-- Run the whole file, then run backoffice_alignment_phase1_verify.sql.
`;

const rollbackHeader = `
-- GREANLEAN BACKOFFICE ALIGNMENT PHASE 1 ROLLBACK
-- DESTRUCTIVE: use only on a disposable database before any publication or
-- review business data has been created. In all other cases use forward repair.
`;

await mkdir(outputDirectory, { recursive: true });
const install = await compose("supabase/migrations", migrations, installHeader);
const rollback = await compose("supabase/rollbacks", rollbacks, rollbackHeader);

await Promise.all([
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase1_install.sql"),
    install,
  ),
  writeFile(
    path.join(outputDirectory, "backoffice_alignment_phase1_rollback.sql"),
    rollback,
  ),
]);

console.info("Generated backoffice alignment phase 1 install and rollback bundles.");
