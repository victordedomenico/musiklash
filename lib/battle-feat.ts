// ─── Name helpers ─────────────────────────────────────────────────────────────

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// ─── Featured artist name extraction ─────────────────────────────────────────
// Parses "feat.", "ft.", "avec", "&" / "x" patterns from Deezer track titles.

const FEAT_PATTERNS = [
  /\(?feat\.?\s+([^)([\]–-]+)/i,
  /\(?featuring\s+([^)([\]–-]+)/i,
  /\(?ft\.?\s+([^)([\]–-]+)/i,
  /\(?avec\s+([^)([\]–-]+)/i,
  /\[feat\.?\s+([^\]]+)\]/i,
];

const SPLIT_RE = /\s*(?:,|&|\+|\/)\s*|\s+x\s+|\s+et\s+/i;

export function parseFeatArtists(title: string): string[] {
  const names = new Set<string>();

  for (const re of FEAT_PATTERNS) {
    const m = title.match(re);
    if (m) {
      const raw = m[1].replace(/[)\]]+$/, "").trim();
      for (const part of raw.split(SPLIT_RE)) {
        const cleaned = part.trim();
        if (cleaned.length > 0) names.add(cleaned);
      }
      break;
    }
  }

  return [...names];
}

// ─── Popularity tier ──────────────────────────────────────────────────────────

export function popularityTier(fanCount: number): number {
  if (fanCount >= 500_000) return 1;
  if (fanCount >= 50_000) return 2;
  return 3;
}

// ─── Solo game types ──────────────────────────────────────────────────────────

export type FeatMove = {
  artistId: string;
  artistName: string;
  pictureUrl: string | null;
  trackTitle: string | null;
  previewUrl?: string | null;
  ts: number;
  isAi?: boolean;
};

export type ArtistResult = {
  id: string;
  name: string;
  nameSlug: string;
  fanCount: number;
  popularityTier: number;
  pictureUrl: string | null;
};

export type BattleFeatParticipant = {
  playerId: string;
  username: string;
  score: number;
  jokers: number;
  eliminated: boolean;
  position: number; // turn order (stable, lower = earlier)
  lastSeenAt: string | null;
  joinedAt: string;
};

export type BattleFeatRoomSnapshot = {
  id: string;
  hostId: string;
  hostUsername: string;
  status: string;
  startingArtistId: string | null;
  startingArtistName: string | null;
  startingArtistPic: string | null;
  currentArtistId: string | null;
  currentArtistName: string | null;
  currentArtistPic: string | null;
  currentTurnId: string | null;
  usedArtistIds: string[];
  moves: FeatMove[];
  participants: BattleFeatParticipant[];
  winnerId: string | null;
  updatedAt: string;
};

// ─── Room event types (Supabase Realtime broadcast) ───────────────────────────

export type RoomEvent =
  | { type: "player-joined"; playerId: string; username: string }
  | { type: "player-left"; playerId: string }
  | {
      type: "game-start";
      startingArtistId: string;
      startingArtistName: string;
      startingArtistPic: string | null;
      firstTurnId: string;
    }
  | {
      type: "move";
      artistId: string;
      artistName: string;
      artistPic: string | null;
      trackTitle: string | null;
      nextTurnId: string;
      usedIds: string[];
    }
  | {
      type: "joker-used";
      playerId: string;
      artistId: string;
      artistName: string;
      artistPic: string | null;
    }
  | { type: "eliminated"; loserId: string; winnerId: string | null }
  | { type: "rematch" };

export type RoomBroadcastPayload = {
  room: BattleFeatRoomSnapshot;
  event?: RoomEvent;
};

// ─── Seed artists (Deezer IDs of well-known French rap artists) ───────────────

export const SEED_ARTIST_IDS: number[] = [
  // Tier A - mega acts
  4050205,   // Jul
  456444,    // Booba
  13276954,  // Ninho
  4050205,   // (already Jul)
  13615905,  // SCH
  10139803,  // Nekfeu
  4059643,   // Damso
  14614107,  // Heuss L'Enfoiré
  12246,     // Rohff
  9635624,   // Kaaris
  13520898,  // Niska
  14809751,  // Hamza
  3537126,   // PNL (group but ok to seed)
  1283615,   // Orelsan
  5313552,   // Bigflo & Oli (group)
  12536898,  // Lomepal
  13697479,  // Koba LaD
  14777569,  // Tiakola
  15226076,  // Gazo
  12553283,  // Freeze Corleone
  3548529,   // Lacrim
  12802538,  // Maes
  13507048,  // Lorenzo
  12494122,  // Vegedream
  9779606,   // Dadju
  4244661,   // Aya Nakamura
  13218626,  // Naps
  13507048,  // (already Lorenzo)
  14058278,  // Soolking
  11671065,  // Dinos
  13649386,  // Moha la Squale
  14021717,  // Kekra
  11063741,  // Vald
  5339217,   // Disiz
  14100489,  // PLK
  13521009,  // Alonzo
  14800765,  // Bekar
  14808706,  // Fif
  11998321,  // Kalash Criminel
  9618891,   // La Fouine
  5313552,   // (already PNL)
  12253718,  // Leto
  14800763,  // SDM
  14808705,  // Guy2bezbar
  11609989,  // MHD
];
