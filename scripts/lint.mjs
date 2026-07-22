import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const roots = ["app", "components", "lib", "scripts", "tests", "supabase"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".css", ".sql"]);
const ignoredDirectories = new Set(["node_modules", ".next", "coverage", "test-results"]);
const issues = [];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : sourceFiles(target);
    return extensions.has(path.extname(entry.name)) ? [target] : [];
  }));
  return nested.flat();
}

for (const file of (await Promise.all(roots.map(sourceFiles))).flat()) {
  const content = await readFile(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (/^(<<<<<<<|=======|>>>>>>>)/.test(line)) {
      issues.push(`${file}:${index + 1} contains a merge-conflict marker`);
    }
    if (/[ \t]+$/.test(line)) {
      issues.push(`${file}:${index + 1} has trailing whitespace`);
    }
    if (/NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|SECRET|PASSWORD|PRIVATE_KEY)/.test(line)) {
      issues.push(`${file}:${index + 1} exposes a server secret through NEXT_PUBLIC_`);
    }
    if (
      /console\.(log|info|warn|error)\s*\(/.test(line)
      && file !== path.join("lib", "server", "logger.ts")
      && !file.startsWith(`scripts${path.sep}`)
      && !file.startsWith(`tests${path.sep}`)
    ) {
      issues.push(`${file}:${index + 1} bypasses the structured logger`);
    }
  });
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.info("Repository hygiene checks passed.");
}
