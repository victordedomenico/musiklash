#!/usr/bin/env tsx
/**
 * Scaffold a thin Klash vertical app from the Klash Engine catalog.
 *
 * Usage: pnpm scaffold:vertical <slug> [--port 3003]
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KLASH_ENGINE_BY_SLUG } from "../packages/klash-config/src/klash-engine/catalog";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Next unused dev port (max existing `--port` in apps/* + 1). */
function nextFreePort(): string {
  const appsDir = join(root, "apps");
  let max = 2999;
  for (const name of readdirSync(appsDir)) {
    const pkgPath = join(appsDir, name, "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { scripts?: { dev?: string } };
    const m = /--port\s+(\d+)/.exec(pkg.scripts?.dev ?? "");
    if (m) max = Math.max(max, Number.parseInt(m[1]!, 10));
  }
  return String(max + 1);
}

const slug = process.argv[2];
const portArg = process.argv.indexOf("--port");
const port = portArg >= 0 ? process.argv[portArg + 1]! : nextFreePort();

if (!slug || slug.startsWith("-")) {
  console.error("Usage: pnpm scaffold:vertical <slug> [--port 3003]");
  process.exit(1);
}

const plan = KLASH_ENGINE_BY_SLUG[slug];
if (!plan) {
  console.error(
    `Unknown slug "${slug}". Add an entry to packages/klash-config/src/klash-engine/catalog.ts first.`,
  );
  process.exit(1);
}

if (plan.status === "active" && plan.appPackage) {
  console.error(`"${slug}" is already active (apps/${plan.appPackage}).`);
  process.exit(1);
}

const appDir = join(root, "apps", slug);
if (existsSync(appDir)) {
  console.error(`apps/${slug} already exists.`);
  process.exit(1);
}

const templateDir = join(root, "apps", "demoklash");
mkdirSync(appDir, { recursive: true });

for (const file of [
  "app",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "tsconfig.json",
  "prisma.config.ts",
]) {
  cpSync(join(templateDir, file), join(appDir, file), { recursive: true });
}

const pkg = JSON.parse(readFileSync(join(templateDir, "package.json"), "utf8")) as {
  name: string;
  scripts: { dev: string };
};
pkg.name = slug;
if (pkg.scripts.dev) {
  pkg.scripts.dev = pkg.scripts.dev.replace(/--port\s+\d+/, `--port ${port}`);
}
if (typeof pkg.scripts.start === "string") {
  pkg.scripts.start = pkg.scripts.start.replace(/--port\s+\d+/, `--port ${port}`);
}
writeFileSync(join(appDir, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);

writeFileSync(
  join(appDir, "next.config.ts"),
  `import { createKlashNextConfig } from "@klash/klash-config/next";

export default createKlashNextConfig("${slug}");
`,
);

writeFileSync(
  join(appDir, "vertical.config.ts"),
  `/**
 * TODO: implement packages/klash-config/src/configs/${slug}.ts
 * and register in packages/klash-config/src/index.ts before using this app.
 */
export { demoklash as default } from "@klash/klash-config/configs/demoklash";
`,
);

const configStubPath = join(root, "packages/klash-config/src/configs", `${slug}.ts`);
if (!existsSync(configStubPath)) {
  const nouns = plan.nouns ?? { item: "item", items: "items" };
  const exportName = `${slug.charAt(0).toUpperCase()}${slug.slice(1)}Stub`;
  writeFileSync(
    configStubPath,
    `import { defineVertical } from "../define";

/**
 * ${plan.name} — stub. Wire a ContentSource in @klash/content-adapter, then:
 * - export here with defineVertical()
 * - add to REGISTRY + VERTICAL_MANIFESTS
 * - replace vertical.config.ts in apps/${slug}
 */
export const ${exportName} = {
  slug: "${slug}",
  name: "${plan.name}",
  source: "${plan.source ?? slug}",
  nouns: ${JSON.stringify(nouns, null, 2).replace(/^/gm, "  ")},
  gameModes: ["bracket", "tierlist"] as const,
};
`,
  );
}

console.log(`Scaffolded apps/${slug} (port ${port}).`);
console.log(`Config stub: packages/klash-config/src/configs/${slug}.ts`);
console.log(
  "Next: implement ContentSource, defineVertical(), REGISTRY + manifest, then fix vertical.config.ts.",
);
