import { describe, expect, it } from "vitest";
import { DEFAULT_TIERS, roomTierConfig } from "./tierlist-tiers";

describe("room tier configuration", () => {
  it("keeps old rooms compatible", () => {
    expect(roomTierConfig({ "0": "A" })).toEqual(DEFAULT_TIERS);
  });
  it("restores custom tiers and rejects malformed or duplicate IDs", () => {
    const tier = { id: "tier-1", label: "Favoris", color: "#abcdef" };
    expect(roomTierConfig({ __tiers: [tier] })).toEqual([tier]);
    expect(roomTierConfig({ __tiers: [tier, tier] })).toEqual(DEFAULT_TIERS);
    expect(roomTierConfig({ __tiers: [{ ...tier, color: "red" }] })).toEqual(DEFAULT_TIERS);
  });
});
