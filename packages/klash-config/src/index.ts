export * from "./types";
export { defineVertical, isBattleFeatEnabled } from "./define";

import type { VerticalConfig } from "./types";
import { musiklash } from "./configs/musiklash";
import { animeklash } from "./configs/animeklash";
import { demoklash } from "./configs/demoklash";
import { movieklash } from "./configs/movieklash";
import { bookklash } from "./configs/bookklash";
import { seriesklash } from "./configs/seriesklash";
import { comicklash } from "./configs/comicklash";
import { mangaklash } from "./configs/mangaklash";
import { gameklash } from "./configs/gameklash";
import { retroklash } from "./configs/retroklash";
import { esportklash } from "./configs/esportklash";
import { cardklash } from "./configs/cardklash";
import { indieklash } from "./configs/indieklash";
import { boardklash } from "./configs/boardklash";
import { pokeklash } from "./configs/pokeklash";
import { legoklash } from "./configs/legoklash";
import { drinkklash } from "./configs/drinkklash";
import { travelklash } from "./configs/travelklash";
import { foodklash } from "./configs/foodklash";
import { petklash } from "./configs/petklash";
import { f1klash } from "./configs/f1klash";
import { basketklash } from "./configs/basketklash";
import { fitnessklash } from "./configs/fitnessklash";
import { fightklash } from "./configs/fightklash";
import { tennisklash } from "./configs/tennisklash";
import { carklash } from "./configs/carklash";
import { sportklash } from "./configs/sportklash";
import { footklash } from "./configs/footklash";
import { countryklash } from "./configs/countryklash";
import { rapklash } from "./configs/rapklash";

export {
  musiklash,
  animeklash,
  demoklash,
  movieklash,
  bookklash,
  seriesklash,
  comicklash,
  mangaklash,
  gameklash,
  retroklash,
  esportklash,
  cardklash,
  indieklash,
  boardklash,
  pokeklash,
  legoklash,
  drinkklash,
  travelklash,
  foodklash,
  petklash,
  f1klash,
  basketklash,
  fitnessklash,
  fightklash,
  tennisklash,
  carklash,
  sportklash,
  footklash,
  countryklash,
  rapklash,
};
export { VERTICAL_MANIFESTS, getVerticalManifest, type VerticalManifest } from "./manifests";
export * from "./klash-engine";

const REGISTRY: Record<string, VerticalConfig> = {
  [musiklash.slug]: musiklash,
  [animeklash.slug]: animeklash,
  [demoklash.slug]: demoklash,
  [movieklash.slug]: movieklash,
  [bookklash.slug]: bookklash,
  [seriesklash.slug]: seriesklash,
  [comicklash.slug]: comicklash,
  [mangaklash.slug]: mangaklash,
  [gameklash.slug]: gameklash,
  [retroklash.slug]: retroklash,
  [esportklash.slug]: esportklash,
  [cardklash.slug]: cardklash,
  [indieklash.slug]: indieklash,
  [boardklash.slug]: boardklash,
  [pokeklash.slug]: pokeklash,
  [legoklash.slug]: legoklash,
  [drinkklash.slug]: drinkklash,
  [travelklash.slug]: travelklash,
  [foodklash.slug]: foodklash,
  [petklash.slug]: petklash,
  [f1klash.slug]: f1klash,
  [basketklash.slug]: basketklash,
  [fitnessklash.slug]: fitnessklash,
  [fightklash.slug]: fightklash,
  [tennisklash.slug]: tennisklash,
  [carklash.slug]: carklash,
  [sportklash.slug]: sportklash,
  [footklash.slug]: footklash,
  [countryklash.slug]: countryklash,
  [rapklash.slug]: rapklash,
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
