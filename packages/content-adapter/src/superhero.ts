import type { ContentItem } from "./types";

/**
 * Akabab Superhero API — static JSON dataset on GitHub (no auth, free).
 * 563 characters from Marvel, DC, Dark Horse, Star Wars, etc. with powerstats.
 * https://github.com/akabab/superhero-api
 */
const SUPERHERO_BASE = "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api";

export type SuperheroPowerstats = {
  intelligence: number;
  strength: number;
  speed: number;
  durability: number;
  power: number;
  combat: number;
};

export type Superhero = {
  id: number;
  name: string;
  slug: string;
  powerstats: SuperheroPowerstats;
  biography: {
    fullName?: string;
    publisher?: string | null;
    alignment?: string;
  };
  appearance: { race?: string | null; gender?: string };
  work: { occupation?: string };
  images: { xs?: string; sm?: string; md?: string; lg?: string };
};

// ─── Cache (module-level, dataset is static) ──────────────────────────────────

let cache: Superhero[] | null = null;

async function loadAll(): Promise<Superhero[]> {
  if (cache) return cache;
  try {
    const res = await fetch(`${SUPERHERO_BASE}/all.json`, {
      headers: { Accept: "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 604800 } as any, // 1 week — dataset is frozen
    });
    if (!res.ok) throw new Error(`Superhero API → ${res.status}`);
    cache = (await res.json()) as Superhero[];
    return cache;
  } catch {
    return [];
  }
}

// ─── Publishers (universes) ───────────────────────────────────────────────────

export const SUPERHERO_PUBLISHERS: { slug: string; label: string; match: string[] }[] = [
  { slug: "marvel",      label: "Marvel",        match: ["Marvel Comics", "Icon Comics"] },
  { slug: "dc",          label: "DC Comics",     match: ["DC Comics"] },
  { slug: "star-wars",   label: "Star Wars",     match: ["George Lucas"] },
  { slug: "dark-horse",  label: "Dark Horse",    match: ["Dark Horse Comics"] },
  { slug: "image",       label: "Image Comics",  match: ["Image Comics"] },
  { slug: "idw",         label: "IDW Publishing",match: ["IDW Publishing"] },
  { slug: "star-trek",   label: "Star Trek",     match: ["Star Trek"] },
  { slug: "manga",       label: "Manga (Shueisha)", match: ["Shueisha"] },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchSuperheroes(query: string, limit = 30): Promise<Superhero[]> {
  const all = await loadAll();
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return all
    .filter((h) => h.name.toLowerCase().includes(q) || (h.biography.fullName ?? "").toLowerCase().includes(q))
    .slice(0, limit);
}

export async function getSuperheroesByPublisher(publisherSlug: string, limit = 60): Promise<Superhero[]> {
  const all = await loadAll();
  const pub = SUPERHERO_PUBLISHERS.find((p) => p.slug === publisherSlug);
  if (!pub) return [];
  return all
    .filter((h) => h.biography.publisher && pub.match.includes(h.biography.publisher))
    .sort((a, b) => totalPower(b.powerstats) - totalPower(a.powerstats))
    .slice(0, limit);
}

export function totalPower(s: SuperheroPowerstats): number {
  return (s.intelligence || 0) + (s.strength || 0) + (s.speed || 0) +
    (s.durability || 0) + (s.power || 0) + (s.combat || 0);
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function superheroToItem(h: Superhero): ContentItem {
  const subtitleParts = [
    h.biography.publisher,
    h.biography.fullName && h.biography.fullName !== h.name ? h.biography.fullName : undefined,
  ].filter(Boolean);

  return {
    id: `hero-${h.id}`,
    title: h.name,
    subtitle: subtitleParts.join(" · ") || undefined,
    coverUrl: h.images.md ?? h.images.sm ?? h.images.lg,
    source: "superhero",
    metadata: {
      itemKind: "character",
      publisher: h.biography.publisher,
      fullName: h.biography.fullName,
      alignment: h.biography.alignment,
      race: h.appearance.race,
      powerstats: h.powerstats,
      totalPower: totalPower(h.powerstats),
    },
  };
}
