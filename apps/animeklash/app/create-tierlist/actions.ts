"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { getItemSource } from "@klash/klash-app/lib/item-source";
import { selectedItemToTrackFields } from "@/lib/content-item";

import type { SelectedContentItem } from "@/lib/content-item";

export async function createTierlist(input: {
  title: string;
  theme: string;
  visibility: "private" | "public" | "none";
  tracks: SelectedContentItem[];
}) {
  if (!input.title.trim()) return { error: "Le titre est requis." };
  if (input.tracks.length < 2)
    return { error: "Il faut au moins 2 éléments." };
  if (input.tracks.length > 50)
    return { error: "50 éléments maximum." };

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

  let tierlistId: string;
  const transient = input.visibility === "none";
  const storedVisibility = transient ? "private" : input.visibility;
  try {
    const tl = await prisma.tierlist.create({
      data: {
        ownerId: identity.playerId,
        title: input.title.trim(),
        theme: input.theme.trim() || null,
        visibility: storedVisibility,
        coverUrl: input.tracks[0]?.cover_url ?? null,
        tracks: {
          create: input.tracks.map((t, i) => ({
            position: i,
            ...selectedItemToTrackFields(t, getItemSource()),
          })),
        },
      },
    });
    tierlistId = tl.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur création tierlist.";
    return { error: msg };
  }

  redirect(`/tierlist/${tierlistId}${transient ? "?transient=1" : ""}`);
}
