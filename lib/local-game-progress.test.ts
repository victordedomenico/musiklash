import { describe, expect, it } from "vitest";
import { gameProgressKey, readGameProgress, writeGameProgress } from "./local-game-progress";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("local game progress", () => {
  it("keeps progress isolated by game and content id", () => {
    const local = storage();
    writeGameProgress(local, "tierlist", "a", "tracks-1", { placed: [1, 2] });

    expect(gameProgressKey("tierlist", "a")).not.toBe(gameProgressKey("blindtest", "a"));
    expect(
      readGameProgress(local, "tierlist", "a", "tracks-1", (value): value is { placed: number[] } =>
        Boolean(value && typeof value === "object" && "placed" in value),
      ),
    ).toEqual({ placed: [1, 2] });
  });

  it("rejects a draft for a changed item list", () => {
    const local = storage();
    writeGameProgress(local, "tierlist", "a", "old", { placed: [1] });

    expect(
      readGameProgress(local, "tierlist", "a", "new", (value): value is { placed: number[] } =>
        Boolean(value && typeof value === "object" && "placed" in value),
      ),
    ).toBeNull();
  });
});
