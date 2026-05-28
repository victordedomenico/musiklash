import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  slugifyName,
  parseFeatArtists,
  popularityTier,
  SEED_ARTIST_IDS,
} from "@/lib/battle-feat";
import {
  getAlbumTracks,
  getArtistAlbums,
  getArtistById,
  getArtistTopTracks,
  searchArtists,
} from "@/lib/deezer";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const REQUEST_DELAY_MS = 200;
const MAX_ALBUMS_PER_ARTIST = 12;

type DeezerArtistFull = NonNullable<Awaited<ReturnType<typeof getArtistById>>>;
type FeatSample = {
  name: string;
  trackTitle: string;
  trackDeezerId: number;
};

function getOrderedArtistIds(aId: string, bId: string) {
  return aId < bId ? [aId, bId] : [bId, aId];
}

async function upsertArtist(deezerArtist: DeezerArtistFull) {
  const fanCount = deezerArtist.nb_fan ?? 0;
  return prisma.rapArtist.upsert({
    where: { deezerArtistId: BigInt(deezerArtist.id) },
    update: {
      name: deezerArtist.name,
      nameSlug: slugifyName(deezerArtist.name),
      fanCount,
      popularityTier: popularityTier(fanCount),
      pictureUrl: deezerArtist.picture_medium ?? deezerArtist.picture_small ?? null,
    },
    create: {
      deezerArtistId: BigInt(deezerArtist.id),
      name: deezerArtist.name,
      nameSlug: slugifyName(deezerArtist.name),
      fanCount,
      popularityTier: popularityTier(fanCount),
      pictureUrl: deezerArtist.picture_medium ?? deezerArtist.picture_small ?? null,
    },
  });
}

async function collectFeatSamples(deezerArtistId: number, artistName: string) {
  const samples = new Map<string, FeatSample>();
  const ownSlug = slugifyName(artistName);

  try {
    const topTracks = await getArtistTopTracks(deezerArtistId, 50, {
      requirePreview: false,
    });
    for (const track of topTracks) {
      for (const featName of parseFeatArtists(track.title)) {
        const featSlug = slugifyName(featName);
        if (!featSlug || featSlug === ownSlug || samples.has(featSlug)) continue;
        samples.set(featSlug, {
          name: featName,
          trackTitle: track.title,
          trackDeezerId: track.id,
        });
      }
    }
  } catch {
    // Best effort only.
  }
  await sleep(REQUEST_DELAY_MS);

  try {
    const albums = await getArtistAlbums(deezerArtistId);
    await sleep(REQUEST_DELAY_MS);

    for (const album of albums.slice(0, MAX_ALBUMS_PER_ARTIST)) {
      try {
        const tracks = await getAlbumTracks(album.id, { requirePreview: false });
        for (const track of tracks) {
          for (const featName of parseFeatArtists(track.title)) {
            const featSlug = slugifyName(featName);
            if (!featSlug || featSlug === ownSlug || samples.has(featSlug)) continue;
            samples.set(featSlug, {
              name: featName,
              trackTitle: track.title,
              trackDeezerId: track.id,
            });
          }
        }
      } catch {
        // Ignore one album and continue the crawl.
      }
      await sleep(REQUEST_DELAY_MS);
    }
  } catch {
    // Ignore album crawl failures.
  }

  return [...samples.values()];
}

async function resolveFeatArtist(sample: FeatSample) {
  const results = await searchArtists(sample.name, 5);
  await sleep(REQUEST_DELAY_MS);
  if (results.length === 0) return null;

  const featSlug = slugifyName(sample.name);
  return results.find((artist) => slugifyName(artist.name) === featSlug) ?? results[0] ?? null;
}

export async function processArtist(
  deezerArtistId: number,
  depth: number,
  visited: Set<number>,
  stats: { artists: number; feats: number },
): Promise<void> {
  if (visited.has(deezerArtistId)) return;
  visited.add(deezerArtistId);

  const deezerArtist = await getArtistById(deezerArtistId);
  if (!deezerArtist) return;
  await sleep(REQUEST_DELAY_MS);

  const artistRecord = await upsertArtist(deezerArtist);
  stats.artists++;

  if (depth === 0) return;

  const featSamples = await collectFeatSamples(deezerArtistId, deezerArtist.name);

  for (const sample of featSamples) {
    try {
      const match = await resolveFeatArtist(sample);
      if (!match) continue;

      const featRecord = await upsertArtist({
        id: match.id,
        name: match.name,
        nb_fan: match.nb_fan ?? 0,
        picture_medium: match.picture_medium,
        picture_small: match.picture_small,
      });
      stats.artists++;

      const [artistAId, artistBId] = getOrderedArtistIds(artistRecord.id, featRecord.id);
      const trackDeezerId = BigInt(sample.trackDeezerId);

      try {
        const existing = await prisma.rapFeat.findFirst({
          where: {
            artistAId,
            artistBId,
            trackDeezerId,
          },
        });

        if (existing) {
          await prisma.rapFeat.update({
            where: { id: existing.id },
            data: { trackTitle: sample.trackTitle },
          });
        } else {
          await prisma.rapFeat.create({
            data: {
              artistAId,
              artistBId,
              trackDeezerId,
              trackTitle: sample.trackTitle,
            },
          });
        }
        stats.feats++;
      } catch {
        // Best effort idempotence.
      }

      if (depth > 1 && (match.nb_fan ?? 0) >= 50_000) {
        await processArtist(match.id, depth - 1, visited, stats);
      }
    } catch {
      // Keep seeding even if one branch fails.
    }
  }
}

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
