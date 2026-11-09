import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { SEED_ARTIST_IDS } from "@/lib/battle-feat";
import { processArtist } from "./processor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  // Admin only
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }

  const visited = new Set<number>();
  const stats = { artists: 0, feats: 0 };

  const uniqueSeeds = [...new Set(SEED_ARTIST_IDS)];

  for (const seedId of uniqueSeeds) {
    await processArtist(seedId, 2, visited, stats);
  }

  return NextResponse.json({
    ok: true,
    artistsUpserted: stats.artists,
    featsCreated: stats.feats,
    visited: visited.size,
  });
}
