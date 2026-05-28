/** Shared BattleFeat multiplayer / solo types (vertical-agnostic field names). */

export type FeatMove = {
  artistId: string;
  artistName: string;
  pictureUrl: string | null;
  trackTitle: string | null;
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
