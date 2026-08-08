import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sources = [
  ["supabase/migrations/0025_p0_battery_pilot_foundation.sql", "supabase/bundles/p0_battery_pilot_install.sql"],
  ["supabase/rollbacks/0025_p0_battery_pilot_foundation.down.sql", "supabase/bundles/p0_battery_pilot_rollback.sql"],
];

for (const [source, destination] of sources) {
  const sql = await readFile(resolve(root, source), "utf8");
  const header = `-- Generated from ${source}. Do not edit this bundle directly.\n`;
  await writeFile(resolve(root, destination), `${header}${sql}`);
}
