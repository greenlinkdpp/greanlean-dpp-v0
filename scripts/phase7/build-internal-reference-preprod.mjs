import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const corePath = fileURLToPath(new URL("./internal-reference-confirmed-write-core.mjs", import.meta.url));
const result = spawnSync(process.execPath, [corePath, "--execute-confirmed-write-core", ...process.argv.slice(2)], {
  env: { ...process.env, INTERNAL_REFERENCE_TARGET_MODE: "PREPROD_DEFAULT" },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
