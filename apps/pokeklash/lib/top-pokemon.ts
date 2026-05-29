import { getPokemonDisplayName, getTrendingPokemon } from "@klash/content-adapter";
import type { ContentItem } from "@klash/content-adapter";

export type HomePokemonCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopPokemon(limit = 18): Promise<HomePokemonCover[]> {
  try {
    const pokemon = await getTrendingPokemon(limit);
    return pokemon.map((p) => ({
      id: String(p.id),
      title: getPokemonDisplayName(p),
      coverUrl:
        p.sprites?.other?.["official-artwork"]?.front_default ??
        p.sprites?.front_default ??
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`,
    }));
  } catch (err) {
    console.error("[top-pokemon]", err);
    return [];
  }
}

export function toSelectedFromContentItem(item: ContentItem): {
  external_id: string;
  title: string;
  subtitle?: string;
  cover_url: string | null;
  source: string;
} {
  return {
    external_id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    cover_url: item.coverUrl ?? null,
    source: item.source,
  };
}
