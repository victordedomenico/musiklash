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
  if (externalId.startsWith("arc-")) return "anilist";
  if (externalId.startsWith("char-")) return "anilist";
  // Fall back to the vertical's configured source
  return typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_KLASH_VERTICAL === "animeklash" ? "anilist" : "deezer")
    : "deezer";
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

export function inferItemKind(externalId: string): "anime" | "character" | "theme" | "arc" | "track" {
  if (externalId.startsWith("char-")) return "character";
  if (externalId.startsWith("theme-")) return "theme";
  if (externalId.startsWith("arc-")) return "arc";
  if (/^\d+$/.test(externalId)) return "track"; // Deezer numeric IDs
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
