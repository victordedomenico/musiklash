import { describe, expect, it } from "vitest";
import {
  availableFlashTrackCounts,
  flashPoints,
  isFlashDifficulty,
  isFlashListenSeconds,
} from "./blindtest-flash";

describe("blindtest éclair", () => {
  it("récompense davantage une difficulté élevée avec une écoute courte", () => {
    expect(flashPoints("easy", 8)).toBe(80);
    expect(flashPoints("impossible", 0.1)).toBe(2400);
    expect(flashPoints("hard", 0.5)).toBeGreaterThan(flashPoints("medium", 2));
  });

  it("ne propose que les tailles réalisables", () => {
    expect(availableFlashTrackCounts(3)).toEqual([]);
    expect(availableFlashTrackCounts(12)).toEqual([5, 10]);
    expect(availableFlashTrackCounts(21)).toEqual([5, 10, 15, 20]);
  });

  it("valide les réglages persistés", () => {
    expect(isFlashDifficulty("expert")).toBe(true);
    expect(isFlashDifficulty("normal")).toBe(false);
    expect(isFlashListenSeconds(0.1)).toBe(true);
    expect(isFlashListenSeconds(1)).toBe(false);
  });
});
