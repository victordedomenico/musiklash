"use server";

import { redirect } from "next/navigation";
import { isValidSize, effectiveBracketSize } from "@klash/klash-app/lib/bracket";
import { resolvePlayerIdentity } from "@klash/klash-app/lib/guest";
import { getItemSource } from "@klash/klash-app/lib/item-source";

import type { SelectedContentItem } from "@klash/klash-app/lib/content-item";
import { selectedItemToTrackFields } from "@klash/klash-app/lib/content-item";
export type SelectedTrack = SelectedContentItem;

export async function createBracket(input: {
  title: string;
  theme: string;
  size: number;
  visibility: "private" | "public" | "none";
  tracks: SelectedContentItem[];
}) {
  if (!isValidSize(input.size)) {
    return { error: "Taille de bracket invalide." };
  }
  if (input.tracks.length < 3) {
    return { error: "Il faut au moins 3 éléments." };
  }
  if (input.tracks.length > input.size) {
    return {
      error: `Maximum ${input.size} éléments.`,
    };
  }
  if (!input.title.trim()) {
    return { error: "Le titre est requis." };
  }

  // The stored size is the smallest power-of-2 that fits the actual track count.
  // This may be smaller than `input.size` (the user's chosen max), which is fine.
  const storedSize = effectiveBracketSize(input.tracks.length);

  const prisma = (await import("@/lib/prisma")).default;
  let identity: { playerId: string };
  try {
    identity = await resolvePlayerIdentity();
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Impossible de créer une session invitée pour le moment.";
    return { error: msg };
  }

  let bracketId: string;
  const transient = input.visibility === "none";
  const storedVisibility = transient ? "private" : input.visibility;

  try {
    const bracket = await prisma.bracket.create({
      data: {
        ownerId: identity.playerId,
        title: input.title.trim(),
        theme: input.theme.trim() || null,
        size: storedSize,
        visibility: storedVisibility,
        coverUrl: input.tracks[0]?.cover_url ?? null,
        tracks: {
          create: input.tracks.map((t, i) => ({
            seed: i + 1,
            ...selectedItemToTrackFields(t, getItemSource()),
          })),
        },
      },
    });

    bracketId = bracket.id;
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Erreur à la création du bracket.";
    return { error: msg };
  }

  redirect(`/bracket-game/${bracketId}${transient ? "?transient=1" : ""}`);
}
