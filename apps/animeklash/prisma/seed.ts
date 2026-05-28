import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  searchAnime,
  searchCharacters,
  getAnimeThemeItems,
  getCharacterById,
  type AniListMedia,
} from "@klash/content-adapter";
import { warmCharacterGraph } from "../lib/battle-feat-server";
import { contentItemToBlindtestTrack } from "../lib/content-item";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const accounts = [
  { email: "admin@animeklash.local", password: "password123", role: "admin" },
  { email: "mod@animeklash.local", password: "password123", role: "moderator" },
  { email: "user@animeklash.local", password: "password123", role: "user" },
];

const SHONEN_QUERIES = [
  "Naruto",
  "One Piece",
  "Bleach",
  "Dragon Ball Z",
  "Hunter x Hunter",
  "My Hero Academia",
  "Attack on Titan",
  "Demon Slayer",
];

/** Fallback AniList IDs if API is unavailable during seed. */
const FALLBACK_SHONEN: Array<{ id: number; title: string }> = [
  { id: 20, title: "Naruto" },
  { id: 21, title: "One Piece" },
  { id: 269, title: "Bleach" },
  { id: 813, title: "Dragon Ball Z" },
  { id: 11061, title: "Hunter x Hunter" },
  { id: 21459, title: "My Hero Academia" },
  { id: 16498, title: "Attack on Titan" },
  { id: 101922, title: "Demon Slayer" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function animeTitle(m: AniListMedia): string {
  return m.title.english ?? m.title.romaji ?? m.title.native ?? String(m.id);
}

function bracketTrackFromAnime(m: AniListMedia, seed: number) {
  return {
    seed,
    externalId: String(m.id),
    source: "anilist",
    title: animeTitle(m),
    artist: m.genres.slice(0, 2).join(", ") || "Anime",
    previewUrl: "",
    coverUrl: m.coverImage.large ?? m.coverImage.medium ?? null,
    metadata: {
      itemKind: "anime",
      anilistId: m.id,
      idMal: m.idMal,
      popularity: m.popularity,
    },
  };
}

async function fetchShonenAnime(): Promise<AniListMedia[]> {
  const found: AniListMedia[] = [];
  for (const query of SHONEN_QUERIES) {
    try {
      const results = await searchAnime(query, 1);
      if (results[0]) found.push(results[0]);
      await sleep(400);
    } catch {
      // continue with next query
    }
  }
  return found;
}

async function seedShonenBracket(ownerId: string) {
  let animes = await fetchShonenAnime();
  if (animes.length < 3) {
    console.warn("AniList indisponible — bracket shōnen en mode fallback (IDs statiques).");
    animes = [];
    for (const fb of FALLBACK_SHONEN) {
      animes.push({
        id: fb.id,
        idMal: null,
        title: { romaji: fb.title, english: fb.title, native: null },
        coverImage: { large: null, medium: null, color: null },
        bannerImage: null,
        popularity: 0,
        averageScore: null,
        genres: ["Shōnen"],
        seasonYear: null,
        episodes: null,
        status: "FINISHED",
        description: null,
      });
    }
  }

  const tracks = animes.slice(0, 8).map((m, i) => bracketTrackFromAnime(m, i + 1));
  await prisma.bracket.create({
    data: {
      ownerId,
      title: "Top 8 Shōnen All-Time",
      theme: "Shōnen",
      size: 8,
      visibility: "public",
      coverUrl: tracks[0]?.coverUrl ?? null,
      tracks: { create: tracks },
    },
  });
  console.log(`Bracket shōnen créé (${tracks.length} animés).`);
}

async function seedNarutoBlindtest(ownerId: string) {
  let narutoId = 20;
  try {
    const results = await searchAnime("Naruto", 8);
    const naruto = results.find((a) => {
      const t = animeTitle(a).toLowerCase();
      return t.includes("naruto") && !t.includes("shippuden") && !t.includes("boruto");
    });
    if (naruto) narutoId = naruto.id;
  } catch {
    console.warn("Recherche Naruto échouée — utilisation de l’ID AniList 20.");
  }

  const themeItems = await getAnimeThemeItems(narutoId);
  const withPreview = themeItems.filter((t) => t.previewUrl);
  let ops = withPreview.filter((t) => t.metadata?.themeType === "OP");
  if (ops.length < 3) ops = withPreview.slice(0, 12);
  if (ops.length < 3) {
    console.warn("AnimeThemes indisponible — blindtest Naruto créé sans pistes audio.");
    await prisma.blindtest.create({
      data: {
        ownerId,
        title: "Best Naruto Openings",
        visibility: "public",
      },
    });
    return;
  }

  const tracks = ops.slice(0, 16).map((item, i) => contentItemToBlindtestTrack(item, i));
  await prisma.blindtest.create({
    data: {
      ownerId,
      title: "Best Naruto Openings",
      visibility: "public",
      tracks: { create: tracks },
    },
  });
  console.log(`Blindtest Naruto OP créé (${tracks.length} pistes).`);
}

async function seedOnePieceTierlist(ownerId: string) {
  const characterNames = ["Monkey D. Luffy", "Roronoa Zoro", "Nami", "Sanji", "Nico Robin", "Usopp"];
  const tracks: Array<{
    position: number;
    externalId: string;
    source: string;
    title: string;
    artist: string;
    previewUrl: string;
    coverUrl: string | null;
    metadata: object;
  }> = [];

  for (const name of characterNames) {
    try {
      const chars = await searchCharacters(name, 1);
      const c = chars[0];
      if (!c) continue;
      tracks.push({
        position: tracks.length,
        externalId: `char-${c.id}`,
        source: "anilist",
        title: c.name.full,
        artist: c.media?.nodes[0]?.title?.romaji ?? "One Piece",
        previewUrl: "",
        coverUrl: c.image.large ?? c.image.medium ?? null,
        metadata: {
          itemKind: "character",
          anilistCharacterId: c.id,
        },
      });
      await sleep(400);
    } catch {
      // skip character
    }
  }

  if (tracks.length < 2) {
    console.warn("Personnages One Piece non récupérés — tierlist non créée.");
    return;
  }

  await prisma.tierlist.create({
    data: {
      ownerId,
      title: "Mes Personnages One Piece",
      theme: "One Piece",
      visibility: "private",
      coverUrl: tracks[0]?.coverUrl ?? null,
      tracks: { create: tracks },
    },
  });
  console.log(`Tierlist One Piece créée (${tracks.length} personnages).`);
}

/** Naruto Uzumaki (AniList #17) — défi BattleClash public + graphe co-apparitions. */
const NARUTO_CHARACTER_ID = "17";

async function seedNarutoBattleClash(ownerId: string) {
  let naruto = await getCharacterById(parseInt(NARUTO_CHARACTER_ID, 10));
  if (!naruto) {
    const fallback = await searchCharacters("Naruto Uzumaki", 1);
    naruto = fallback[0] ?? null;
  }
  if (!naruto) {
    console.warn("Naruto non trouvé — BattleClash non seedé.");
    return;
  }

  const externalId = String(naruto.id);
  const warmed = await warmCharacterGraph(externalId);
  console.log(`Graphe BattleClash Naruto : ${warmed} co-apparitions en cache.`);

  const existing = await prisma.battleFeatSoloChallenge.findFirst({
    where: { ownerId, title: "Défi Naruto — co-apparitions" },
  });
  if (existing) {
    console.log("Défi BattleClash Naruto déjà présent.");
    return;
  }

  await prisma.battleFeatSoloChallenge.create({
    data: {
      ownerId,
      title: "Défi Naruto — co-apparitions",
      difficulty: 2,
      startingArtistId: externalId,
      startingArtistName: naruto.name.full,
      startingArtistPic: naruto.image.medium ?? naruto.image.large ?? null,
      visibility: "public",
    },
  });
  console.log("Défi BattleClash Naruto créé (public).");
}

async function seed() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Run db:reset or pass it explicitly.",
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Seeding users via Supabase API (GoTrue)...");

  for (const acc of accounts) {
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`Error creating ${acc.email} in Auth:`, error.message);
      continue;
    }

    if (user?.user) {
      console.log(`Auth user created: ${acc.email} (${user.user.id})`);
      try {
        await prisma.profile.update({
          where: { id: user.user.id },
          data: { role: acc.role as import("@prisma/client").AppRole },
        });
        console.log(`Role updated to ${acc.role} for ${acc.email}`);
      } catch (err) {
        console.error(`Error updating role for ${acc.email} with Prisma:`, err);
      }
    }
  }

  console.log("Seeding demo content (AniList + AnimeThemes)...");
  const adminProfile = await prisma.profile.findFirst({ where: { role: "admin" } });
  const modProfile = await prisma.profile.findFirst({ where: { role: "moderator" } });
  const userProfile = await prisma.profile.findFirst({ where: { role: "user" } });

  try {
    if (adminProfile) await seedShonenBracket(adminProfile.id);
    if (modProfile) {
      await seedNarutoBlindtest(modProfile.id);
      await seedNarutoBattleClash(modProfile.id);
    }
    if (userProfile) await seedOnePieceTierlist(userProfile.id);
  } catch (err) {
    console.error("Error seeding demo content:", err);
  }

  console.log("Seeding completed successfully!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
