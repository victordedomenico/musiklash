export const MAX_CONSECUTIVE_MISSED_ROOM_VOTES = 3;

type Participant = { playerId: string; username: string };
type Ballot = { playerId: string };

/** A skip is a ballot; only a player with no response at all is absent. */
export function resolveCollaborativeRoomAfkParticipants(
  participants: Participant[],
  ballots: Ballot[],
  missedVoteCounts: Record<string, number>,
) {
  const ballotPlayerIds = new Set(ballots.map((ballot) => ballot.playerId));
  const nextMissedVoteCounts: Record<string, number> = {};
  const removedPlayerIds: string[] = [];

  for (const participant of participants) {
    if (ballotPlayerIds.has(participant.playerId)) continue;

    const missedVotes = (missedVoteCounts[participant.playerId] ?? 0) + 1;
    if (missedVotes >= MAX_CONSECUTIVE_MISSED_ROOM_VOTES) {
      removedPlayerIds.push(participant.playerId);
    } else {
      nextMissedVoteCounts[participant.playerId] = missedVotes;
    }
  }

  return {
    participants: participants.filter(
      (participant) => !removedPlayerIds.includes(participant.playerId),
    ),
    missedVoteCounts: nextMissedVoteCounts,
    removedPlayerIds,
  };
}
