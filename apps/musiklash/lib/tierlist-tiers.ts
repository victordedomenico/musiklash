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
