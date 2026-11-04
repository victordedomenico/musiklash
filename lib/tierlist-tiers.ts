export type TierConfig = {
  id: string;
  label: string;
  color: string;
};

export type TierlistSavePayload = {
  tiers: TierConfig[];
  placements: Record<string, number[]>;
};

export const DEFAULT_TIERS: TierConfig[] = [
  { id: "S+", label: "S+", color: "#ff7f7f" },
  { id: "S", label: "S", color: "#ffbf7f" },
  { id: "A", label: "A", color: "#ffdf7f" },
  { id: "B", label: "B", color: "#ffff7f" },
  { id: "C", label: "C", color: "#bfff7f" },
  { id: "D", label: "D", color: "#7fbfff" },
  { id: "F", label: "F", color: "#bf7fff" },
];

const EXTRA_TIER_COLORS = [
  "#ff8fb1",
  "#f7a66a",
  "#f7d96a",
  "#7de09a",
  "#6fd6cf",
  "#7eb8ff",
  "#b694ff",
  "#e197ff",
];

export function getNextTierColor(index: number) {
  return EXTRA_TIER_COLORS[index % EXTRA_TIER_COLORS.length];
}

// Room configuration is stored alongside numeric placement keys, preserving
// compatibility with existing rooms without changing their database schema.
export function roomTierConfig(value: unknown): TierConfig[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_TIERS;
  const tiers = (value as Record<string, unknown>).__tiers;
  if (!Array.isArray(tiers) || tiers.length < 1 || tiers.length > 30) return DEFAULT_TIERS;
  const ids = new Set<string>();
  for (const tier of tiers) {
    if (!tier || typeof tier !== "object" || Array.isArray(tier)) return DEFAULT_TIERS;
    const { id, label, color } = tier as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      !/^[\w+\-]{1,64}$/.test(id) ||
      ids.has(id) ||
      typeof label !== "string" ||
      label.length > 40 ||
      typeof color !== "string" ||
      !/^#[\da-f]{6}$/i.test(color)
    )
      return DEFAULT_TIERS;
    ids.add(id);
  }
  return tiers as TierConfig[];
}
