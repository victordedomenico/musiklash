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
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = join(root, "apps");

type Bundler = "turbopack" | "webpack";
type Vertical = { name: string; dir: string; port: string; bundler: Bundler };

const verticals: Vertical[] = readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = join(appsDir, d.name);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    const devScript: string = pkg.scripts?.dev ?? "";
    const port = /--port\s+(\d+)/.exec(devScript)?.[1] ?? "3000";
    // Next 16 defaults to turbopack when no bundler flag is present.
    const bundler: Bundler = /--webpack/.test(devScript) ? "webpack" : "turbopack";
    return { name: pkg.name as string, dir, port, bundler };
  })
  .sort((a, b) => a.port.localeCompare(b.port));

/**
 * A `.next` produced by one bundler chokes the other (webpack artifacts make
 * turbopack churn forever at "Compiling /", pegging the CPU). We stamp the
 * bundler used into .next/cache and wipe the whole .next when it changes.
 */
function guardBundlerCache(v: Vertical) {
  const nextDir = join(v.dir, ".next");
  const cacheDir = join(nextDir, "cache");
  const marker = join(cacheDir, ".klash-bundler");
  if (existsSync(nextDir)) {
    const prev = existsSync(marker) ? readFileSync(marker, "utf8").trim() : "";
    if (prev !== v.bundler) {
      console.log(
        `⚠  ${v.name}: .next built with "${prev || "unknown"}" but launching with "${v.bundler}" — clearing cache`,
      );
      rmSync(nextDir, { recursive: true, force: true });
    }
  }
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(marker, v.bundler);
}

function killRunning(ports: string[]) {
  // Best-effort: ignore exit codes (1 simply means nothing matched).
  // Order matters: kill the persistent `turbo run dev` parent FIRST, otherwise
  // Turbo (dev task is `persistent: true`) respawns `next dev` after we kill it,
  // causing a respawn loop that piles up 6 GB-heap workers and saturates RAM.
  spawnSync("pkill", ["-9", "-f", "turbo run dev"]);
  spawnSync("pkill", ["-9", "-f", "next-server"]);
  spawnSync("pkill", ["-9", "-f", "next dev"]);
  // Free any process still holding the dev ports (orphaned turbopack workers).
  for (const port of ports) {
    const lsof = spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
    const pids = (lsof.stdout ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    for (const pid of pids) spawnSync("kill", ["-9", pid]);
  }
}

function launch(v: Vertical) {
  // Kill every vertical's port, not just the target's, to enforce one-at-a-time.
  killRunning(verticals.map((x) => x.port));
  // Give the OS a moment to reap processes and release the ports.
  spawnSync("sleep", ["1"]);
  // Wipe an incompatible .next (e.g. webpack cache before a turbopack run).
  guardBundlerCache(v);
  console.log(`\n▶  ${v.name} — http://localhost:${v.port}\n`);
  const child = spawn("turbo", ["run", "dev", `--filter=${v.name}`], {
    cwd: root,
    stdio: "inherit",
  });
  const cleanup = () => {
    spawnSync("pkill", ["-9", "-f", `--filter=${v.name}`]);
    spawnSync("pkill", ["-9", "-f", "next dev"]);
  };
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
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
