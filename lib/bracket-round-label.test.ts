import { describe, expect, it } from "vitest";
import { bracketRoundLabel } from "./bracket-round-label";

describe("bracketRoundLabel", () => {
  it("uses the same familiar labels from the solo bracket", () => {
    expect(bracketRoundLabel(1, 3)).toBe("Quarts de finale");
    expect(bracketRoundLabel(2, 3)).toBe("Demi-finale");
    expect(bracketRoundLabel(3, 3)).toBe("Finale");
  });

  it("keeps a clear fallback for larger early rounds", () => {
    expect(bracketRoundLabel(1, 7)).toBe("Tour 1");
  });
});
