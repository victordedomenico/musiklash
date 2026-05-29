#!/usr/bin/env tsx
/**
 * Interactive dev launcher — runs ONE Klash vertical at a time.
 *
 * Running several `next dev --turbopack` servers in parallel saturates RAM
 * (each reserves a 6 GB heap on top of turbopack + Supabase Docker), so this
 * script always kills any running dev server before starting the chosen one.
 *
 * Usage:
 *   pnpm dev                # interactive menu
 *   pnpm dev animeklash     # launch directly by name
 */
import { spawn, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = join(root, "apps");

type Vertical = { name: string; port: string };

const verticals: Vertical[] = readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const pkg = JSON.parse(readFileSync(join(appsDir, d.name, "package.json"), "utf8"));
    const port = /--port\s+(\d+)/.exec(pkg.scripts?.dev ?? "")?.[1] ?? "3000";
    return { name: pkg.name as string, port };
  })
  .sort((a, b) => a.port.localeCompare(b.port));

function killRunning() {
  // Best-effort: ignore exit code (1 simply means nothing matched).
  spawnSync("pkill", ["-9", "-f", "next-server"]);
  spawnSync("pkill", ["-9", "-f", "next dev"]);
}

function launch(v: Vertical) {
  killRunning();
  console.log(`\n▶  ${v.name} — http://localhost:${v.port}\n`);
  const child = spawn("turbo", ["run", "dev", `--filter=${v.name}`], {
    cwd: root,
    stdio: "inherit",
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

const arg = process.argv[2];
if (arg) {
  const match = verticals.find((v) => v.name === arg);
  if (!match) {
    console.error(`Unknown vertical "${arg}". Available: ${verticals.map((v) => v.name).join(", ")}`);
    process.exit(1);
  }
  launch(match);
} else {
  console.log("Which vertical do you want to run? (only one at a time)\n");
  verticals.forEach((v, i) => console.log(`  ${i + 1}) ${v.name.padEnd(12)} :${v.port}`));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question("\n> ", (answer) => {
    rl.close();
    const idx = Number.parseInt(answer.trim(), 10) - 1;
    const choice = verticals[idx] ?? verticals.find((v) => v.name === answer.trim());
    if (!choice) {
      console.error("Invalid choice.");
      process.exit(1);
    }
    launch(choice);
  });
}
