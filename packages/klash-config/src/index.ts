export * from "./types";
export { defineVertical, isBattleFeatEnabled } from "./define";

import type { VerticalConfig } from "./types";
import { musiklash } from "./configs/musiklash";
import { animeklash } from "./configs/animeklash";
import { demoklash } from "./configs/demoklash";
import { screenklash } from "./configs/screenklash";
import { bookklash } from "./configs/bookklash";
import { comicklash } from "./configs/comicklash";
import { mangaklash } from "./configs/mangaklash";
import { gameklash } from "./configs/gameklash";
import { esportklash } from "./configs/esportklash";
import { cardklash } from "./configs/cardklash";
import { boardklash } from "./configs/boardklash";
import { pokeklash } from "./configs/pokeklash";
import { legoklash } from "./configs/legoklash";
import { tasteklash } from "./configs/tasteklash";
import { worldklash } from "./configs/worldklash";
import { petklash } from "./configs/petklash";
import { sportklash } from "./configs/sportklash";
import { rapklash } from "./configs/rapklash";
import { islamklash } from "./configs/islamklash";

export {
  musiklash,
  animeklash,
  demoklash,
  screenklash,
  bookklash,
  comicklash,
  mangaklash,
  gameklash,
  esportklash,
  cardklash,
  boardklash,
  pokeklash,
  legoklash,
  tasteklash,
  worldklash,
  petklash,
  sportklash,
  rapklash,
  islamklash,
};
export { VERTICAL_MANIFESTS, getVerticalManifest, type VerticalManifest } from "./manifests";
export * from "./klash-engine";

const REGISTRY: Record<string, VerticalConfig> = {
  [musiklash.slug]: musiklash,
  [animeklash.slug]: animeklash,
  [demoklash.slug]: demoklash,
  [screenklash.slug]: screenklash,
  [bookklash.slug]: bookklash,
  [comicklash.slug]: comicklash,
  [mangaklash.slug]: mangaklash,
  [gameklash.slug]: gameklash,
  [esportklash.slug]: esportklash,
  [cardklash.slug]: cardklash,
  [boardklash.slug]: boardklash,
  [pokeklash.slug]: pokeklash,
  [legoklash.slug]: legoklash,
  [tasteklash.slug]: tasteklash,
  [worldklash.slug]: worldklash,
  [petklash.slug]: petklash,
  [sportklash.slug]: sportklash,
  [rapklash.slug]: rapklash,
  [islamklash.slug]: islamklash,
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
