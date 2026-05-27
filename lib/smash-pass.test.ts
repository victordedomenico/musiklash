import { describe, expect, it } from "vitest";
import {
  allParticipantsVoted,
  computePercentages,
  computeRoomVoteTotals,
  formatStatCount,
  normalizeSessionChoices,
} from "./smash-pass";

describe("computePercentages", () => {
  it("returns 50/50 when empty", () => {
    expect(computePercentages(0, 0)).toEqual({ smashPercent: 50, passPercent: 50 });
  });

  it("rounds smash percent", () => {
    expect(computePercentages(3, 1)).toEqual({ smashPercent: 75, passPercent: 25 });
  });
});

describe("formatStatCount", () => {
  it("formats millions", () => {
    expect(formatStatCount(1_535_749)).toBe("1.5M");
  });

  it("formats thousands", () => {
    expect(formatStatCount(404_846)).toBe("404.8K");
  });
});

describe("normalizeSessionChoices", () => {
  it("filters invalid entries", () => {
    expect(
      normalizeSessionChoices([
        { position: 0, choice: "smash" },
        { position: 1, choice: "invalid" },
        { foo: "bar" },
      ]),
    ).toEqual([{ position: 0, choice: "smash" }, { position: 1, choice: "pass" }]);
  });
});

describe("allParticipantsVoted", () => {
  it("requires every participant to vote", () => {
    const participants = [
      {
        playerId: "a",
        username: "A",
        smashCount: 0,
        passCount: 0,
        choices: { "0": "smash" as const },
        lastSeenAt: null,
        joinedAt: "",
      },
      {
        playerId: "b",
        username: "B",
        smashCount: 0,
        passCount: 0,
        choices: { "0": null },
        lastSeenAt: null,
        joinedAt: "",
      },
    ];
    expect(allParticipantsVoted(participants, 0)).toBe(false);
    participants[1].choices["0"] = "pass";
    expect(allParticipantsVoted(participants, 0)).toBe(true);
  });
});

describe("computeRoomVoteTotals", () => {
  it("counts smash and pass", () => {
    const participants = [
      {
        playerId: "a",
        username: "A",
        smashCount: 1,
        passCount: 0,
        choices: { "2": "smash" as const },
        lastSeenAt: null,
        joinedAt: "",
      },
      {
        playerId: "b",
        username: "B",
        smashCount: 0,
        passCount: 1,
        choices: { "2": "pass" as const },
        lastSeenAt: null,
        joinedAt: "",
      },
    ];
    expect(computeRoomVoteTotals(participants, 2)).toEqual({ smash: 1, pass: 1 });
  });
});
