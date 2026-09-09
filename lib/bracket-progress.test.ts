import { describe, expect, it } from "vitest";
import {
  makeTrackSignature,
  readBracketProgress,
  validateBracketProgress,
} from "./bracket-progress";

const tracks = Array.from({ length: 8 }, (_, index) => ({
  seed: index + 1,
  deezerTrackId: 100 + index,
}));
const trackSignature = makeTrackSignature(tracks);
const firstRoundVotes = [
  { round: 1, matchIndex: 0, winnerSeed: 1 },
  { round: 1, matchIndex: 1, winnerSeed: 4 },
  { round: 1, matchIndex: 2, winnerSeed: 2 },
];

describe("validateBracketProgress", () => {
  it("restores a valid in-progress bracket", () => {
    expect(validateBracketProgress(8, tracks.length, firstRoundVotes)).toEqual(firstRoundVotes);
  });

  it("rejects a vote for a participant not in the current duel", () => {
    expect(
      validateBracketProgress(8, tracks.length, [{ round: 1, matchIndex: 0, winnerSeed: 2 }]),
    ).toBeNull();
  });

  it("rejects a round-two vote before round one is complete", () => {
    expect(
      validateBracketProgress(8, tracks.length, [
        { round: 1, matchIndex: 0, winnerSeed: 1 },
        { round: 2, matchIndex: 0, winnerSeed: 1 },
      ]),
    ).toBeNull();
  });

  it("accepts the first saved choice of a 128-track tournament", () => {
    const largeTracks = Array.from({ length: 128 }, (_, index) => index + 1);
    expect(
      validateBracketProgress(128, largeTracks.length, [
        { round: 1, matchIndex: 0, winnerSeed: 1 },
      ]),
    ).toEqual([{ round: 1, matchIndex: 0, winnerSeed: 1 }]);
  });
});

describe("readBracketProgress", () => {
  it("rejects a saved draft from a different track list", () => {
    const raw = JSON.stringify({
      version: 1,
      bracketId: "bracket-1",
      size: 8,
      trackSignature,
      votes: firstRoundVotes,
    });

    expect(
      readBracketProgress(raw, {
        bracketId: "bracket-1",
        size: 8,
        trackCount: tracks.length,
        trackSignature: "changed",
      }),
    ).toBeNull();
  });
});
