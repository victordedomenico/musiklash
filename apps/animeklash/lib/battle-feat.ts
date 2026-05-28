export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function popularityTier(favourites: number): number {
  if (favourites >= 50_000) return 1;
  if (favourites >= 5_000) return 2;
  return 3;
}

// ─── Game types ───────────────────────────────────────────────────────────────

export type CharacterResult = {
  id: string;
  name: string;
  nameSlug: string;
  favourites: number;
  popularityTier: number;
  pictureUrl: string | null;
};

export type FeatMove = {
  artistId: string;
  artistName: string;
  pictureUrl: string | null;
  trackTitle: string | null; // anime where they co-appeared
  previewUrl?: string | null;
  ts: number;
  isAi?: boolean;
};

export type BattleFeatParticipant = {
  playerId: string;
  username: string;
  score: number;
  jokers: number;
  eliminated: boolean;
  position: number;
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

// ─── Seed character IDs (AniList) ─────────────────────────────────────────────

export const SEED_CHARACTER_IDS: number[] = [
  // Attack on Titan
  40882, // Levi Ackerman
  40881, // Eren Yeager
  40880, // Mikasa Ackerman
  40885, // Erwin Smith
  40883, // Armin Arlert
  // Naruto
  17,    // Naruto Uzumaki
  13,    // Sasuke Uchiha
  85,    // Kakashi Hatake
  141,   // Itachi Uchiha
  1297,  // Gaara
  // One Piece
  40,    // Monkey D. Luffy
  41,    // Roronoa Zoro
  42,    // Nami
  43,    // Usopp
  44,    // Sanji
  // Dragon Ball
  246,   // Son Goku
  1253,  // Vegeta
  247,   // Son Gohan
  // Bleach
  5,     // Ichigo Kurosaki
  6,     // Rukia Kuchiki
  // FMA Brotherhood
  11,    // Edward Elric
  51,    // Roy Mustang
  // Death Note
  80,    // Light Yagami
  9,     // L Lawliet
  // Demon Slayer
  131939, // Tanjiro Kamado
  131940, // Nezuko Kamado
  // My Hero Academia
  131117, // Izuku Midoriya
  131118, // Katsuki Bakugo
];
