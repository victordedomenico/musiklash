"use server";

import { redirect } from "next/navigation";
import { isValidSize, effectiveBracketSize } from "@/lib/bracket";
import { resolvePlayerIdentity } from "@/lib/guest";
import type { SelectedItem } from "@/components/AnimePicker";

export type { SelectedItem };

export async function createBracket(input: {
  title: string;
  theme: string;
  size: number;
  visibility: "private" | "public" | "none";
  items: SelectedItem[];
}) {
  if (!isValidSize(input.size)) {
    return { error: "Taille de bracket invalide." };
  }
  if (input.items.length < 3) {
    return { error: "Il faut au moins 3 éléments." };
  }
  if (input.items.length > input.size) {
    return {
      error: `Maximum ${input.size} éléments pour un bracket de taille ${input.size}.`,
    };
  }
  if (!input.title.trim()) {
    return { error: "Le titre est requis." };
  }

  const storedSize = effectiveBracketSize(input.items.length);

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
        coverUrl: input.items[0]?.cover_url ?? null,
        tracks: {
          create: input.items.map((item, i) => ({
            seed: i + 1,
            externalId: item.external_id,
            title: item.title,
            artist: item.subtitle ?? "",
            previewUrl: item.preview_url ?? "",
            coverUrl: item.cover_url,
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
