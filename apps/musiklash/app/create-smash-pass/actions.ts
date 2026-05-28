"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlayerIdentity } from "@/lib/guest";
import { getItemSource } from "@klash/klash-app/lib/item-source";
import { createClient } from "@/lib/supabase/server";
import type { SmashPassItemType } from "@/lib/smash-pass";
import type { SmashPassParticipant } from "@/lib/smash-pass";

export type SmashPassItemInput = {
  deezer_id: number;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  preview_url: string | null;
  tags: string[];
  description: string | null;
};

export async function createSmashPass(input: {
  title: string;
  itemType: SmashPassItemType;
  visibility: "private" | "public" | "none";
  items: SmashPassItemInput[];
  mode: "solo" | "multi";
}) {
  if (!input.title.trim()) return { error: "Le titre est requis." };
  if (input.items.length < 5) return { error: "Il faut au moins 5 éléments." };
  if (input.items.length > 100) return { error: "100 éléments maximum." };

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

  if (input.mode === "multi" && input.visibility === "none") {
    return {
      error: "Le mode multijoueur nécessite un deck conservé (non publié ou publié).",
    };
  }

  const transient = input.visibility === "none";
  const storedVisibility = transient ? "private" : input.visibility;

  let smashPassId: string;
  try {
    const sp = await prisma.smashPass.create({
      data: {
        ownerId: identity.playerId,
        title: input.title.trim(),
        itemType: input.itemType,
        visibility: storedVisibility,
        items: {
          create: input.items.map((item, i) => ({
            position: i,
            externalId: String(item.deezer_id),
            source: getItemSource(),
            title: item.title,
            subtitle: item.subtitle,
            coverUrl: item.cover_url,
            previewUrl: item.preview_url,
            tags: item.tags as Prisma.InputJsonValue,
            description: item.description,
          })),
        },
      },
    });
    smashPassId = sp.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur création Smash or Pass.";
    return { error: msg };
  }

  if (input.mode === "multi") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      let roomId: string | null = null;
      try {
        const profile = await prisma.profile.findUnique({
          where: { id: user.id },
          select: { username: true },
        });
        const nowIso = new Date().toISOString();
        const hostParticipant: SmashPassParticipant = {
          playerId: user.id,
          username: profile?.username ?? "Joueur",
          smashCount: 0,
          passCount: 0,
          choices: {},
          lastSeenAt: nowIso,
          joinedAt: nowIso,
        };
        const room = await prisma.smashPassRoom.create({
          data: {
            smashPassId,
            hostId: user.id,
            visibility: storedVisibility,
            status: "waiting",
            participants: [hostParticipant] as unknown as Prisma.JsonArray,
          },
        });
        roomId = room.id;
      } catch {
        // room creation failed
      }
      if (roomId) redirect(`/smash-pass/room/${roomId}`);
    }
    redirect(`/smash-pass/${smashPassId}`);
  }

  redirect(`/smash-pass/${smashPassId}/play${transient ? "?transient=1" : ""}`);
}
