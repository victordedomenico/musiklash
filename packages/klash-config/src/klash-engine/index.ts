export * from "./types";
export {
  KLASH_ENGINE_CATALOG,
  KLASH_ENGINE_BY_SLUG,
} from "./catalog";

import type { KlashEngineCategory, KlashEngineVertical, VerticalLifecycleStatus } from "./types";
import { KLASH_ENGINE_BY_SLUG, KLASH_ENGINE_CATALOG } from "./catalog";

const _slugs = KLASH_ENGINE_CATALOG.map((v) => v.slug);
const _dupes = [...new Set(_slugs.filter((s, i) => _slugs.indexOf(s) !== i))];
if (_dupes.length > 0) {
  throw new Error(`[klash-engine] Duplicate vertical slugs: ${_dupes.join(", ")}`);
}

export function getEngineVertical(slug: string): KlashEngineVertical | undefined {
  return KLASH_ENGINE_BY_SLUG[slug];
}

export function listEngineVerticals(filter?: {
  category?: KlashEngineCategory;
  status?: VerticalLifecycleStatus;
}): KlashEngineVertical[] {
  return KLASH_ENGINE_CATALOG.filter((v) => {
    if (filter?.category && v.category !== filter.category) return false;
    if (filter?.status && v.status !== filter.status) return false;
    return true;
  });
}

export function listEngineVerticalsByCategory(): Record<
  KlashEngineCategory,
  KlashEngineVertical[]
> {
  const grouped = {} as Record<KlashEngineCategory, KlashEngineVertical[]>;
  for (const vertical of KLASH_ENGINE_CATALOG) {
    (grouped[vertical.category] ??= []).push(vertical);
  }
  return grouped;
}

/** Slugs that have a runnable Next app today (`apps/<package>`). */
export function listActiveEngineVerticals(): KlashEngineVertical[] {
  return listEngineVerticals({ status: "active" });
}

/** Roadmap entries not yet wired in `REGISTRY`. */
export function listPlannedEngineVerticals(): KlashEngineVertical[] {
  return listEngineVerticals().filter((v) => v.status !== "active");
}
