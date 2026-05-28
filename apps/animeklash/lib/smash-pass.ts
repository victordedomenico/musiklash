export type SmashPassItemType = "anime" | "character";
export type SmashPassChoice = "smash" | "pass";

export type SmashPassItemData = {
  position: number;
  externalId: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
  tags: string[];
  description: string | null;
};

export type SmashPassSessionChoice = {
  position: number;
  choice: SmashPassChoice;
};

export type SmashPassItemStatsSnapshot = {
  itemType: SmashPassItemType;
  externalId: string;
  smashCount: number;
  passCount: number;
  smashPercent: number;
  passPercent: number;
};

export type SmashPassParticipant = {
  playerId: string;
  username: string;
  smashCount: number;
  passCount: number;
  choices: Record<string, SmashPassChoice | null>;
  lastSeenAt: string | null;
  joinedAt: string;
};

export function formatProgress(current: number, total: number): string {
  return `${current} / ${total}`;
}

export function formatStatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function computePercentages(smashCount: number, passCount: number): {
  smashPercent: number;
  passPercent: number;
} {
  const total = smashCount + passCount;
  if (total === 0) return { smashPercent: 50, passPercent: 50 };
  const smashPercent = Math.round((smashCount / total) * 100);
  return { smashPercent, passPercent: 100 - smashPercent };
}

export function toStatsSnapshot(
  itemType: SmashPassItemType,
  externalId: string,
  smashCount: number,
  passCount: number,
): SmashPassItemStatsSnapshot {
  const { smashPercent, passPercent } = computePercentages(smashCount, passCount);
  return {
    itemType,
    externalId,
    smashCount,
    passCount,
    smashPercent,
    passPercent,
  };
}

export function normalizeSessionChoices(value: unknown): SmashPassSessionChoice[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      position: typeof c.position === "number" ? c.position : -1,
      choice: (c.choice === "smash" || c.choice === "pass"
        ? c.choice
        : "pass") as SmashPassChoice,
    }))
    .filter((c) => c.position >= 0);
}

export function normalizeParticipants(value: unknown): SmashPassParticipant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p) => {
      const rawChoices =
        typeof p.choices === "object" && p.choices !== null && !Array.isArray(p.choices)
          ? (p.choices as Record<string, unknown>)
          : {};
      const choices: Record<string, SmashPassChoice | null> = {};
      for (const [key, val] of Object.entries(rawChoices)) {
        choices[key] = val === "smash" || val === "pass" ? val : null;
      }
      return {
        playerId: typeof p.playerId === "string" ? p.playerId : "",
        username: typeof p.username === "string" ? p.username : "Joueur",
        smashCount: typeof p.smashCount === "number" ? p.smashCount : 0,
        passCount: typeof p.passCount === "number" ? p.passCount : 0,
        choices,
        lastSeenAt: typeof p.lastSeenAt === "string" ? p.lastSeenAt : null,
        joinedAt: typeof p.joinedAt === "string" ? p.joinedAt : new Date().toISOString(),
      };
    })
    .filter((p) => p.playerId.length > 0);
}

export function findParticipant(
  participants: SmashPassParticipant[],
  playerId: string,
): SmashPassParticipant | null {
  return participants.find((p) => p.playerId === playerId) ?? null;
}

export function allParticipantsVoted(
  participants: SmashPassParticipant[],
  position: number,
): boolean {
  if (participants.length === 0) return false;
  const key = String(position);
  return participants.every((p) => p.choices[key] === "smash" || p.choices[key] === "pass");
}

export function computeRoomVoteTotals(
  participants: SmashPassParticipant[],
  position: number,
): { smash: number; pass: number } {
  const key = String(position);
  let smash = 0;
  let pass = 0;
  for (const p of participants) {
    const c = p.choices[key];
    if (c === "smash") smash++;
    else if (c === "pass") pass++;
  }
  return { smash, pass };
}

export function mapPrismaItem(
  item: {
    position: number;
    externalId: string;
    title: string;
    subtitle: string | null;
    coverUrl: string | null;
    previewUrl: string | null;
    tags: unknown;
    description: string | null;
  },
): SmashPassItemData {
  const tags = Array.isArray(item.tags)
    ? item.tags.filter((t): t is string => typeof t === "string")
    : [];
  return {
    position: item.position,
    externalId: item.externalId,
    title: item.title,
    subtitle: item.subtitle,
    coverUrl: item.coverUrl,
    previewUrl: item.previewUrl,
    tags,
    description: item.description,
  };
}
