import type { Prisma } from "@prisma/client";
import type { ContentItem } from "@klash/content-adapter";

/** Shape used by AnimePicker and create-* forms. */
export type SelectedContentItem = {
  external_id: string;
  title: string;
  subtitle?: string;
  cover_url: string | null;
  preview_url?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
};

export function inferSourceFromExternalId(externalId: string): string {
  if (externalId.startsWith("theme-")) return "animethemes";
  if (externalId.startsWith("arc-free-")) return "manual";
  if (externalId.startsWith("arc-")) return "anilist";
  if (externalId.startsWith("char-")) return "anilist";
  if (externalId.startsWith("jchar-")) return "jikan";
  if (externalId.startsWith("mchar-")) return "tmdb";
  if (externalId.startsWith("gb-")) return "googlebooks";
  if (externalId.startsWith("bseries-")) return "openlibrary";
  if (externalId.startsWith("mseries-")) return "mangadex";
  if (externalId.startsWith("tvchar-")) return "tvmaze";
  if (externalId.startsWith("ptcg-") || externalId.startsWith("ptcgset-")) return "pokemontcg";
  if (externalId.startsWith("ygo-") || externalId.startsWith("ygoset-")) return "ygoprodeck";
  if (externalId.startsWith("off-")) return "openfoodfacts";
  if (externalId.startsWith("movie-")) return "tmdb";
  if (externalId.startsWith("person-")) return "tmdb";
  // Fall back to the vertical's configured source
  if (typeof process !== "undefined") {
    const vertical = process.env.NEXT_PUBLIC_KLASH_VERTICAL;
    if (vertical === "animeklash") return "anilist";
    if (vertical === "screenklash") return "tmdb";
    if (vertical === "comicklash") return "comicvine";
    if (vertical === "gameklash") return "rawg";
  }
  return "deezer";
}

export function selectedItemToTrackFields(
  item: SelectedContentItem,
  defaultSource?: string,
) {
  const source =
    item.source ?? inferSourceFromExternalId(item.external_id) ?? defaultSource ?? "anilist";
  return {
    externalId: item.external_id,
    source,
    title: item.title,
    artist: item.subtitle ?? "",
    previewUrl: item.preview_url ?? "",
    coverUrl: item.cover_url,
    metadata: (item.metadata ?? {
      itemKind: source === "animethemes" ? "theme" : inferItemKind(item.external_id),
    }) as Prisma.InputJsonValue,
  };
}

export function inferItemKind(
  externalId: string,
): "anime" | "character" | "theme" | "arc" | "track" | "movie" | "show" | "episode" | "game" | "transformation" | "power" | "series" {
  if (externalId.startsWith("char-")) return "character";
  if (externalId.startsWith("person-")) return "character";
  if (externalId.startsWith("jchar-")) return "character";
  if (externalId.startsWith("mchar-")) return "character";
  if (externalId.startsWith("bseries-")) return "series";
  if (externalId.startsWith("mseries-")) return "series";
  if (externalId.startsWith("tvchar-")) return "character";
  if (externalId.startsWith("theme-")) return "theme";
  if (externalId.startsWith("arc-free-")) return "arc";
  if (externalId.startsWith("arc-")) return "arc";
  if (externalId.startsWith("col-")) return "movie";
  if (externalId.startsWith("ep-")) return "episode";
  if (/^\d+$/.test(externalId)) {
    const vertical = process.env.NEXT_PUBLIC_KLASH_VERTICAL;
    if (vertical === "screenklash") return "movie";
    if (vertical === "comicklash") return "movie";
    if (vertical === "gameklash") return "game";
    return "track";
  }
  return "anime";
}

export function contentItemToTrackFields(item: ContentItem, seed: number) {
  return {
    seed,
    externalId: item.id,
    source: item.source,
    title: item.title,
    artist: item.subtitle ?? "",
    previewUrl: item.previewUrl ?? "",
    coverUrl: item.coverUrl ?? null,
    metadata: (item.metadata ?? {}) as Prisma.InputJsonValue,
  };
}

export function contentItemToBlindtestTrack(item: ContentItem, position: number) {
  const base = contentItemToTrackFields(item, position);
  return {
    position,
    externalId: base.externalId,
    source: base.source,
    title: base.title,
    artist: base.artist,
    previewUrl: base.previewUrl,
    coverUrl: base.coverUrl,
    metadata: base.metadata,
  };
}

export function selectedItemToSmashPassFields(
  item: SelectedContentItem,
  defaultSource?: string,
) {
  const base = selectedItemToTrackFields(item, defaultSource);
  return {
    externalId: base.externalId,
    source: base.source,
    title: base.title,
    subtitle: item.subtitle ?? null,
    coverUrl: base.coverUrl,
    previewUrl: base.previewUrl || null,
    metadata: base.metadata,
  };
}

export function selectedItemToStreamClashTrack(
  item: SelectedContentItem,
  position: number,
  rank?: number,
  defaultSource?: string,
) {
  const base = selectedItemToTrackFields(item, defaultSource);
  const popularity =
    typeof item.metadata?.popularity === "number" ? item.metadata.popularity : rank ?? 0;
  return {
    position,
    ...base,
    rank: rank ?? popularity,
  };
}
