export * from "./types";
export { defineVertical, isBattleFeatEnabled } from "./define";

import type { VerticalConfig } from "./types";
import { musiklash } from "./configs/musiklash";
import { animeklash } from "./configs/animeklash";
import { demoklash } from "./configs/demoklash";

export { musiklash, animeklash, demoklash };
export { VERTICAL_MANIFESTS, getVerticalManifest, type VerticalManifest } from "./manifests";

const REGISTRY: Record<string, VerticalConfig> = {
  [musiklash.slug]: musiklash,
  [animeklash.slug]: animeklash,
  [demoklash.slug]: demoklash,
};

/** Look up a vertical config by slug. Throws if unknown. */
export function getVertical(slug: string): VerticalConfig {
  const config = REGISTRY[slug];
  if (!config) {
    throw new Error(
      `Unknown vertical "${slug}". Known: ${Object.keys(REGISTRY).join(", ")}.`,
    );
  }
  return config;
}

/** All registered verticals. */
export function listVerticals(): VerticalConfig[] {
  return Object.values(REGISTRY);
}

/**
 * Resolve the vertical the current app runs as, from `NEXT_PUBLIC_KLASH_VERTICAL`.
 * Each thin app sets this in its next.config `env`. Used by shared klash-app code
 * (routes, server libs) that can't hardcode a single vertical.
 */
export function getCurrentVertical(): VerticalConfig {
  const slug = process.env.NEXT_PUBLIC_KLASH_VERTICAL;
  if (!slug) {
    throw new Error(
      "NEXT_PUBLIC_KLASH_VERTICAL is not set — each app must define it in next.config `env`.",
    );
  }
  return getVertical(slug);
}
