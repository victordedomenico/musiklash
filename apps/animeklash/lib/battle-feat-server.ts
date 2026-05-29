"use server-only";
export {
  getRelatedEntitiesForBattleFeat as getCharacterCoAppearances,
  validateBattleFeatLink as validateCoAppearance,
  pickJokerMoveForBattleFeat as pickJokerMove,
  pickAiMoveForBattleFeat as pickAiMove,
  getSoloEasyOptionsForBattleFeat as getSoloEasyOptions,
} from "@klash/klash-app/lib/battle-feat/graph-helpers";
export {
  normalizeBattleFeatParticipants,
  findBattleFeatParticipant,
  nextActiveParticipant,
  canClaimTurnTimeout,
  normalizeUsedArtistIds,
} from "@klash/klash-app/lib/battle-feat/shared";
export { getBattleFeatRoomSnapshot } from "@klash/klash-app/lib/battle-feat/room-snapshot";

/** Pre-warms the AniList co-appearance graph for a character (seed only). */
export async function warmCharacterGraph(characterId: string): Promise<number> {
  void characterId;
  // Graph is warmed lazily via createAnilistRelationGraph on first query.
  // Full pre-seeding requires the anilist-cache module — call from seed script directly.
  return 0;
}
