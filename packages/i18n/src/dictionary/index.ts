import type { Locale } from "../index";
import { fr, type Dictionary } from "./fr";
import { en } from "./en";

export type { Dictionary };
export { fr, en };

/** Recursive partial used by vertical i18n overrides. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Per-locale override layer a vertical applies on top of the base dictionary. */
export type DictionaryOverrides = {
  fr?: DeepPartial<Dictionary>;
  en?: DeepPartial<Dictionary>;
};

function deepMerge<T>(base: T, override?: DeepPartial<T>): T {
  if (!override) return base;
  const out = { ...base } as T;
  for (const key of Object.keys(override) as (keyof T)[]) {
    const ov = override[key];
    const bv = base[key];
    if (
      ov &&
      bv &&
      typeof ov === "object" &&
      typeof bv === "object" &&
      !Array.isArray(ov)
    ) {
      out[key] = deepMerge(bv, ov as DeepPartial<T[keyof T]>);
    } else if (ov !== undefined) {
      out[key] = ov as T[keyof T];
    }
  }
  return out;
}

/**
 * Build a vertical's dictionary for a locale by deep-merging its overrides
 * onto the shared base dictionary.
 */
export function buildDictionary(
  locale: Locale,
  overrides?: DictionaryOverrides,
): Dictionary {
  const base = locale === "en" ? en : fr;
  return deepMerge(base, overrides?.[locale]);
}
