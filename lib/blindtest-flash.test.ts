import { describe, expect, it } from "vitest";
import {
  assignFlashSessionTracks,
  flashAttemptListenSeconds,
  flashDifficultyAt,
  flashNextAttempt,
  flashPerfectScore,
  flashPoints,
  isFlashDifficulty,
  isFlashListenSeconds,
  flashListenTier,
  flashAnswerPoints,
} from "./blindtest-flash";

describe("blindtest éclair", () => {
  it("classe l’écoute dans le palier encore ouvert", () => {
    expect([0, 0.1, 0.11, 0.5, 0.51, 2, 2.01, 8, 8.01, 15, 30].map(flashListenTier)).toEqual([
      0.1, 0.1, 0.5, 0.5, 2, 2, 8, 8, 15, 15, 15,
    ]);
  });

  it("suit les 5 tentatives d’un niveau", () => {
    expect([0, 1, 2, 3, 4].map(flashAttemptListenSeconds)).toEqual([0.1, 0.5, 2, 8, 15]);
    expect(flashNextAttempt(0)).toBe(1);
    expect(flashNextAttempt(3)).toBe(4);
    expect(flashNextAttempt(4)).toBeNull();
  });

  it("enchaîne un son par difficulté", () => {
    expect(FLASH_SEQUENCE()).toEqual(["easy", "medium", "hard", "expert", "impossible"]);
  });

  it("assigne Easy au plus populaire et Impossible au moins connu", () => {
    expect(
      assignFlashSessionTracks([
        { position: 2, rank: 10 },
        { position: 0, rank: 900 },
        { position: 4, rank: 1 },
        { position: 1, rank: 400 },
        { position: 3, rank: 80 },
      ]),
    ).toEqual([0, 1, 3, 2, 4]);
  });

  it("prend un morceau par quintile quand la playlist est plus longue", () => {
    const tracks = Array.from({ length: 10 }, (_, position) => ({
      position,
      rank: 1000 - position * 100,
    }));
    expect(assignFlashSessionTracks(tracks, () => 0)).toEqual([0, 2, 4, 6, 8]);
    expect(assignFlashSessionTracks(tracks, () => 0.99)).toEqual([1, 3, 5, 7, 9]);
  });

  it("calcule chaque réponse avec sa propre difficulté et sa durée", () => {
    expect(
      flashAnswerPoints(
        {
          position: 0,
          correct: true,
          skipped: false,
          points: 2400,
          difficulty: "impossible",
          listenSeconds: 0.1,
        },
        "easy",
        15,
      ),
    ).toBe(2400);
    expect(
      flashAnswerPoints(
        {
          position: 1,
          correct: false,
          skipped: true,
          points: 0,
          difficulty: "expert",
          listenSeconds: 2,
        },
        "easy",
        15,
      ),
    ).toBe(0);
    expect(
      flashAnswerPoints({ position: 2, correct: true, skipped: false, points: 80 }, "easy", 8),
    ).toBe(80);
  });

  it("récompense davantage une difficulté élevée avec une écoute courte", () => {
    expect(flashPoints("easy", 15)).toBe(40);
    expect(flashPoints("easy", 0.1)).toBe(400);
    expect(flashPoints("impossible", 0.1)).toBe(2400);
    expect(flashPoints("hard", 0.5)).toBeGreaterThan(flashPoints("medium", 2));
    expect(flashPerfectScore()).toBe(6000);
  });

  it("valide les réglages persistés", () => {
    expect(isFlashDifficulty("expert")).toBe(true);
    expect(isFlashDifficulty("normal")).toBe(false);
    expect(isFlashListenSeconds(0.1)).toBe(true);
    expect(isFlashListenSeconds(15)).toBe(true);
    expect(isFlashListenSeconds(1)).toBe(false);
  });
});

function FLASH_SEQUENCE() {
  return [0, 1, 2, 3, 4].map((index) => flashDifficultyAt(index));
}
