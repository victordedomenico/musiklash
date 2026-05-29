import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const BDL_BASE = "https://api.balldontlie.io/v1";

// ─── Raw BallDontLie types (subset) ─────────────────────────────────────────

export type BdlTeam = {
  id: number;
  conference: string;
  division: string;
  city: string;
  name: string;
  full_name: string;
  abbreviation: string;
};

export type BdlPlayer = {
  id: number;
  first_name: string;
  last_name: string;
  position?: string | null;
  height?: string | null;
  weight?: string | null;
  jersey_number?: string | null;
  team?: BdlTeam | null;
};

export type BdlGame = {
  id: number;
  date: string;
  season: number;
  status: string;
  period: number;
  time: string;
  postseason: boolean;
  home_team_score?: number | null;
  visitor_team_score?: number | null;
  home_team: BdlTeam;
  visitor_team: BdlTeam;
};

type BdlListResponse<T> = {
  data: T[];
  meta?: { next_cursor?: number | null; per_page?: number };
};

type BdlSingleResponse<T> = {
  data: T;
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.BALLDONTLIE_API_KEY?.trim();
  if (!key) {
    throw new Error("BALLDONTLIE_API_KEY is not configured");
  }
  return key;
}

async function bdlGet<T>(
  path: string,
  params: Record<string, string | string[]> = {},
): Promise<T> {
  const url = new URL(`${BDL_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, item);
    } else {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: getApiKey(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 } as any,
  });

  if (!res.ok) {
    throw new Error(`BallDontLie ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function formatDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return undefined;
  }
}

function gameLabel(g: BdlGame): string {
  const home = g.home_team?.abbreviation ?? g.home_team?.name ?? "?";
  const away = g.visitor_team?.abbreviation ?? g.visitor_team?.name ?? "?";
  return `${away} @ ${home}`;
}

function gameScore(g: BdlGame): string | undefined {
  if (g.home_team_score == null || g.visitor_team_score == null) return undefined;
  return `${g.visitor_team_score} – ${g.home_team_score}`;
}

function gameSubtitle(g: BdlGame): string | undefined {
  const parts: string[] = [];
  const score = gameScore(g);
  const date = formatDate(g.date);
  if (score) parts.push(score);
  if (g.status && g.status !== "Final") parts.push(g.status);
  else if (g.status === "Final") parts.push("Final");
  if (date) parts.push(date);
  if (g.postseason) parts.push("Playoffs");
  return parts.length ? parts.join(" · ") : undefined;
}

function currentNbaSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

function seasonTitle(year: number): string {
  return `Saison NBA ${year}-${String(year + 1).slice(-2)}`;
}

function listNbaSeasons(count = 12): ContentCollection[] {
  const current = currentNbaSeasonYear();
  return Array.from({ length: count }, (_, i) => {
    const year = current - i;
    return {
      id: `season-${year}`,
      title: seasonTitle(year),
      source: "balldontlie",
      metadata: { collectionKind: "season", season: year },
    };
  });
}

function parseSeasonId(collectionId: string): number | null {
  const match = /^season-(\d{4})$/.exec(collectionId);
  return match ? Number(match[1]) : null;
}

// ─── Raw API ──────────────────────────────────────────────────────────────────

let cachedTeams: BdlTeam[] | null = null;

async function getAllTeams(): Promise<BdlTeam[]> {
  if (cachedTeams) return cachedTeams;
  const res = await bdlGet<BdlListResponse<BdlTeam>>("/teams");
  cachedTeams = Array.isArray(res.data) ? res.data : [];
  return cachedTeams;
}

export async function searchTeams(query: string, limit = 20): Promise<BdlTeam[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const teams = await getAllTeams();
  return teams
    .filter(
      (t) =>
        t.full_name.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.abbreviation.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

export async function searchPlayers(query: string, limit = 20): Promise<BdlPlayer[]> {
  if (!query.trim()) return [];
  const res = await bdlGet<BdlListResponse<BdlPlayer>>("/players", {
    search: query.trim(),
    per_page: String(Math.min(limit, 100)),
  });
  return Array.isArray(res.data) ? res.data.slice(0, limit) : [];
}

export async function getTeamById(teamId: string | number): Promise<BdlTeam | null> {
  try {
    const res = await bdlGet<BdlSingleResponse<BdlTeam>>(`/teams/${teamId}`);
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function getPlayerById(playerId: string | number): Promise<BdlPlayer | null> {
  try {
    const res = await bdlGet<BdlSingleResponse<BdlPlayer>>(`/players/${playerId}`);
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function getGames(params: Record<string, string | string[]>, limit = 50): Promise<BdlGame[]> {
  const res = await bdlGet<BdlListResponse<BdlGame>>("/games", {
    per_page: String(Math.min(limit, 100)),
    ...params,
  });
  return Array.isArray(res.data) ? res.data.slice(0, limit) : [];
}

export async function getTeamGames(teamId: string | number, limit = 50): Promise<BdlGame[]> {
  return getGames({ "team_ids[]": [String(teamId)] }, limit);
}

export async function getSeasonGames(season: number, limit = 50): Promise<BdlGame[]> {
  return getGames({ "seasons[]": [String(season)] }, limit);
}

export function getRecentDates(limit = 5): string[] {
  const dates: string[] = [];
  const d = new Date();
  for (let i = 0; i < limit; i++) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() - 1);
  }
  return dates;
}

export async function getTrendingGames(limit = 18): Promise<BdlGame[]> {
  const dates = await getRecentDates(7);
  const games = await getGames({ "dates[]": dates }, limit * 2);
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<number>();
  const unique: BdlGame[] = [];
  for (const g of sorted) {
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    unique.push(g);
    if (unique.length >= limit) break;
  }
  return unique;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function gameToItem(g: BdlGame): ContentItem {
  return {
    id: String(g.id),
    title: gameLabel(g),
    subtitle: gameSubtitle(g),
    source: "balldontlie",
    metadata: {
      itemKind: "match",
      season: g.season,
      status: g.status,
      date: g.date,
      postseason: g.postseason,
      homeTeamId: g.home_team?.id,
      visitorTeamId: g.visitor_team?.id,
    },
  };
}

function teamToItem(t: BdlTeam): ContentItem {
  return {
    id: `team-${t.id}`,
    title: t.full_name,
    subtitle: `${t.abbreviation} · ${t.conference} ${t.division}`,
    source: "balldontlie",
    metadata: { itemKind: "team", teamId: t.id, abbreviation: t.abbreviation },
  };
}

function playerToItem(p: BdlPlayer): ContentItem {
  const name = `${p.first_name} ${p.last_name}`.trim();
  const teamName = p.team?.full_name;
  return {
    id: `player-${p.id}`,
    title: name,
    subtitle: teamName
      ? `${teamName}${p.position ? ` · ${p.position}` : ""}`
      : p.position ?? "Joueur NBA",
    source: "balldontlie",
    metadata: { itemKind: "player", playerId: p.id, teamId: p.team?.id },
  };
}

function teamToEntity(t: BdlTeam): ContentEntity {
  return {
    id: String(t.id),
    name: t.full_name,
    source: "balldontlie",
    metadata: {
      entityKind: "team",
      abbreviation: t.abbreviation,
      conference: t.conference,
      division: t.division,
    },
  };
}

function playerToEntity(p: BdlPlayer): ContentEntity {
  return {
    id: `player-${p.id}`,
    name: `${p.first_name} ${p.last_name}`.trim(),
    source: "balldontlie",
    metadata: {
      entityKind: "player",
      playerId: p.id,
      teamName: p.team?.full_name,
      position: p.position,
    },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const balldontlieContentSource: ContentSource = {
  source: "balldontlie",

  async searchItems(query, { limit = 20 } = {}) {
    const q = query.trim();
    if (!q) {
      const games = await getTrendingGames(limit);
      return games.map(gameToItem);
    }

    const teams = await searchTeams(q, 5);
    if (teams.length > 0) {
      const games = (
        await Promise.all(teams.slice(0, 3).map((t) => getTeamGames(t.id, limit)))
      ).flat();
      if (games.length > 0) return games.slice(0, limit).map(gameToItem);
    }

    const players = await searchPlayers(q, 5);
    if (players.length > 0) {
      const withTeam = players.find((p) => p.team?.id);
      if (withTeam?.team?.id) {
        const games = await getTeamGames(withTeam.team.id, limit);
        if (games.length > 0) return games.slice(0, limit).map(gameToItem);
      }
      return players.slice(0, limit).map(playerToItem);
    }

    return [];
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "match") {
      return this.searchItems(query, { limit });
    }
    if (kind === "team") {
      const teams = await searchTeams(query, limit);
      return teams.map(teamToItem);
    }
    if (kind === "player") {
      const players = await searchPlayers(query, limit);
      return players.map(playerToItem);
    }
    if (kind === "season") {
      const q = query.trim().toLowerCase();
      const seasons = listNbaSeasons(20).filter((s) =>
        q ? s.title.toLowerCase().includes(q) : true,
      );
      return seasons.slice(0, limit).map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: "Saison NBA",
        source: "balldontlie",
        metadata: { itemKind: "season", season: s.metadata?.season },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const q = query.trim().toLowerCase();
    const seasons = listNbaSeasons(20).filter((s) =>
      q ? s.title.toLowerCase().includes(q) || s.id.includes(q) : true,
    );
    return seasons.slice(0, limit);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const half = Math.ceil(limit / 2);
    const [teams, players] = await Promise.all([
      searchTeams(query, half),
      searchPlayers(query, half),
    ]);
    return [...teams.map(teamToEntity), ...players.map(playerToEntity)].slice(0, limit);
  },

  async getCollectionItems(collectionId) {
    const season = parseSeasonId(collectionId);
    if (season == null) return [];
    const games = await getSeasonGames(season, 50);
    return games.map(gameToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    if (entityId.startsWith("player-")) {
      const playerId = entityId.replace(/^player-/, "");
      const player = await getPlayerById(playerId);
      if (!player?.team?.id) return [];
      const games = await getTeamGames(player.team.id, limit);
      return games.map(gameToItem);
    }
    const games = await getTeamGames(entityId, limit);
    return games.map(gameToItem);
  },

  async getEntityById(entityId) {
    if (entityId.startsWith("player-")) {
      const playerId = entityId.replace(/^player-/, "");
      const player = await getPlayerById(playerId);
      return player ? playerToEntity(player) : null;
    }
    const team = await getTeamById(entityId);
    return team ? teamToEntity(team) : null;
  },

  async getEntityCollections(entityId) {
    if (entityId.startsWith("player-")) return [];
    return listNbaSeasons(6);
  },
};
