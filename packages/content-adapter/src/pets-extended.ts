import type { ContentItem } from "./types";

const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary";

// ─── Species catalog ──────────────────────────────────────────────────────────
// [French name, Wikipedia page slug, emoji]

export const PET_RABBITS: [string, string][] = [
  ["Holland Lop", "Holland_Lop"],
  ["Rex", "Rex_rabbit"],
  ["Angora", "Angora_rabbit"],
  ["Lionhead", "Lionhead_rabbit"],
  ["Mini Rex", "Mini_Rex"],
  ["Lapin des Flandres", "Flemish_Giant_rabbit"],
  ["Hollandais (Dutch)", "Dutch_rabbit"],
  ["Lapin nain", "Dwarf_rabbit"],
  ["Bélier français", "French_Lop"],
  ["Lapin Californien", "Californian_rabbit"],
  ["Lapin New-Zélandais", "New_Zealand_rabbit"],
  ["Lapin de Bourgogne", "Burgundy_Yellow_rabbit"],
];

export const PET_BIRDS: [string, string][] = [
  ["Perruche ondulée", "Budgerigar"],
  ["Canari", "Domestic_canary"],
  ["Cockatiel", "Cockatiel"],
  ["Inséparable (Lovebird)", "Lovebird"],
  ["Perroquet gris du Gabon", "African_grey_parrot"],
  ["Amazone", "Amazon_parrot"],
  ["Ara", "Macaw"],
  ["Cacatoès", "Cockatoo"],
  ["Perroquet conure", "Conure"],
  ["Mandarin (Zebra Finch)", "Zebra_finch"],
  ["Bengalèse (Bengalese Finch)", "Bengalese_finch"],
  ["Calopsite huppée", "Cockatiel"],
];

export const PET_RODENTS: [string, string][] = [
  ["Hamster doré", "Golden_hamster"],
  ["Hamster nain Roborovski", "Roborovski_dwarf_hamster"],
  ["Hamster nain Campbell", "Campbell's_dwarf_hamster"],
  ["Cochon d'Inde", "Guinea_pig"],
  ["Gerbille de Mongolie", "Mongolian_gerbil"],
  ["Rat domestique", "Fancy_rat"],
  ["Souris domestique", "House_mouse"],
  ["Chinchilla", "Chinchilla"],
  ["Écureuil de Sibérie", "Siberian_chipmunk"],
  ["Dègue", "Degu"],
  ["Octodon", "Degu"],
];

export const PET_REPTILES: [string, string][] = [
  ["Gecko léopard", "Leopard_gecko"],
  ["Dragon barbu", "Pogona"],
  ["Tortue Hermann", "Hermann's_tortoise"],
  ["Iguane vert", "Green_iguana"],
  ["Caméléon voilé", "Veiled_chameleon"],
  ["Serpent des blés", "Corn_snake"],
  ["Python royal", "Ball_python"],
  ["Couleuvre à collier", "Grass_snake"],
  ["Gecko bleu (Phelsuma)", "Phelsuma"],
  ["Scinque à cinq lignes", "Five-lined_skink"],
  ["Tortue de Floride", "Red-eared_slider"],
];

export const PET_FISH: [string, string][] = [
  ["Poisson rouge", "Goldfish"],
  ["Betta (Poisson combattant)", "Siamese_fighting_fish"],
  ["Guppy", "Guppy"],
  ["Poisson-clown", "Clownfish"],
  ["Koi", "Koi"],
  ["Néon bleu (Tetra)", "Neon_tetra"],
  ["Poisson ange", "Freshwater_angelfish"],
  ["Molly", "Molly_(fish)"],
  ["Platy", "Platy_(fish)"],
  ["Discus", "Discus_(fish)"],
  ["Corydoras", "Corydoras"],
  ["Cornu (Bristlenose Pleco)", "Ancistrus"],
];

export const PET_HORSES: [string, string][] = [
  ["Pur-sang anglais", "Thoroughbred"],
  ["Quarter Horse", "American_Quarter_Horse"],
  ["Haflinger", "Haflinger"],
  ["Percheron", "Percheron"],
  ["Shetland", "Shetland_pony"],
  ["Appaloosa", "Appaloosa"],
  ["Arabe (Arabian)", "Arabian_horse"],
  ["Frison", "Friesian_horse"],
  ["Lipizzan", "Lipizzan"],
  ["Andalou", "Andalusian_horse"],
  ["Camargue", "Camargue_horse"],
  ["Shire", "Shire_horse"],
];

export const PET_SPECIES_TABS = [
  { key: "rabbit", label: "Lapins 🐇", list: PET_RABBITS },
  { key: "bird",   label: "Oiseaux 🐦", list: PET_BIRDS },
  { key: "rodent", label: "Rongeurs 🐹", list: PET_RODENTS },
  { key: "reptile",label: "Reptiles 🦎", list: PET_REPTILES },
  { key: "fish",   label: "Poissons 🐠", list: PET_FISH },
  { key: "horse",  label: "Chevaux 🐴", list: PET_HORSES },
] as const;

// ─── Fetch + mapper ───────────────────────────────────────────────────────────

const imageCache = new Map<string, string | null>();

async function wikiImage(pageSlug: string): Promise<string | undefined> {
  if (imageCache.has(pageSlug)) return imageCache.get(pageSlug) ?? undefined;
  try {
    const res = await fetch(`${WIKI_API}/${encodeURIComponent(pageSlug)}`, {
      headers: { Accept: "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 86400 } as any,
    });
    if (!res.ok) { imageCache.set(pageSlug, null); return undefined; }
    const json = await res.json() as { thumbnail?: { source?: string } };
    const url = json.thumbnail?.source ?? null;
    imageCache.set(pageSlug, url);
    return url ?? undefined;
  } catch {
    imageCache.set(pageSlug, null);
    return undefined;
  }
}

export async function getPetsBySpecies(
  species: string,
  query?: string,
): Promise<ContentItem[]> {
  const tab = PET_SPECIES_TABS.find((t) => t.key === species);
  if (!tab) return [];

  const list = query?.trim()
    ? tab.list.filter(([fr]) => fr.toLowerCase().includes(query.toLowerCase()))
    : tab.list;

  const items = await Promise.all(
    list.map(async ([frName, wikiSlug]) => {
      const coverUrl = await wikiImage(wikiSlug);
      return {
        id: `pet-${species}-${wikiSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: frName,
        subtitle: undefined,
        coverUrl,
        source: "wikipedia",
        metadata: { itemKind: "breed", species, wikiSlug },
      } satisfies ContentItem;
    }),
  );
  return items;
}
