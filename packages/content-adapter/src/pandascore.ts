import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const PANDASCORE_BASE = "https://api.pandascore.co";

// ─── Raw PandaScore types (subset) ────────────────────────────────────────────

export type PandaTeam = {
  id: number;
  name: string;
  acronym?: string | null;
  image_url?: string | null;
  location?: string | null;
  slug?: string;
};

export type PandaPlayer = {
  id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  current_team?: PandaTeam | null;
};

export type PandaTournament = {
  id: number;
  name: string;
  slug?: string;
  begin_at?: string | null;
  end_at?: string | null;
  league?: { name?: string; image_url?: string | null } | null;
  serie?: { full_name?: string } | null;
  videogame?: { name?: string; slug?: string } | null;
};

export type PandaMatchOpponent = {
  type: string;
  opponent: PandaTeam | PandaPlayer;
};

export type PandaMatch = {
  id: number;
  name: string;
  status: string;
  begin_at?: string | null;
  end_at?: string | null;
  videogame?: { name?: string } | null;
  league?: { name?: string } | null;
  serie?: { full_name?: string } | null;
  opponents?: PandaMatchOpponent[];
  winner_id?: number | null;
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.PANDASCORE_API_KEY?.trim();
  if (!key) {
    throw new Error("PANDASCORE_API_KEY is not configured");
  }
  return key;
}

async function pandaGet<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(`${PANDASCORE_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (!res.ok) {
    throw new Error(`PandaScore ${path} → ${res.status}`);
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

function matchSubtitle(m: PandaMatch): string | undefined {
  const parts: string[] = [];
  const game = m.videogame?.name;
  const league = m.league?.name ?? m.serie?.full_name;
  const date = formatDate(m.begin_at);
  if (game) parts.push(game);
  if (league) parts.push(league);
  if (date) parts.push(date);
  return parts.length ? parts.join(" · ") : m.status;
}

function teamOpponents(m: PandaMatch): string | undefined {
  const teams = (m.opponents ?? [])
    .filter((o) => o.type === "Team" && o.opponent)
    .map((o) => (o.opponent as PandaTeam).acronym || (o.opponent as PandaTeam).name);
  if (teams.length >= 2) return teams.join(" vs ");
  return undefined;
}

function coverFromUrl(url?: string | null): string | undefined {
  return url?.trim() || undefined;
}

// ─── Raw API ──────────────────────────────────────────────────────────────────

export async function searchMatches(query: string, limit = 20): Promise<PandaMatch[]> {
  if (!query.trim()) return [];
  const results = await pandaGet<PandaMatch[]>("/matches", {
    "search[name]": query.trim(),
    per_page: String(Math.min(limit, 50)),
    sort: "-begin_at",
  });
  return Array.isArray(results) ? results.slice(0, limit) : [];
}

export async function searchTeams(query: string, limit = 20): Promise<PandaTeam[]> {
  if (!query.trim()) return [];
  const results = await pandaGet<PandaTeam[]>("/teams", {
    "search[name]": query.trim(),
    per_page: String(Math.min(limit, 50)),
  });
  return Array.isArray(results) ? results.slice(0, limit) : [];
}

export async function searchPlayers(query: string, limit = 20): Promise<PandaPlayer[]> {
  if (!query.trim()) return [];
  const results = await pandaGet<PandaPlayer[]>("/players", {
    "search[name]": query.trim(),
    per_page: String(Math.min(limit, 50)),
  });
  return Array.isArray(results) ? results.slice(0, limit) : [];
}

export async function searchTournaments(query: string, limit = 20): Promise<PandaTournament[]> {
  if (!query.trim()) return [];
  const results = await pandaGet<PandaTournament[]>("/tournaments", {
    "search[name]": query.trim(),
    per_page: String(Math.min(limit, 50)),
    sort: "-begin_at",
  });
  return Array.isArray(results) ? results.slice(0, limit) : [];
}

export async function getMatchById(matchId: string | number): Promise<PandaMatch | null> {
  try {
    return await pandaGet<PandaMatch>(`/matches/${matchId}`);
  } catch {
    return null;
  }
}

export async function getTeamById(teamId: string | number): Promise<PandaTeam | null> {
  try {
    return await pandaGet<PandaTeam>(`/teams/${teamId}`);
  } catch {
    return null;
  }
}

export async function getPlayerById(playerId: string | number): Promise<PandaPlayer | null> {
  try {
    return await pandaGet<PandaPlayer>(`/players/${playerId}`);
  } catch {
    return null;
  }
}

export async function getTournamentById(
  tournamentId: string | number,
): Promise<PandaTournament | null> {
  try {
    return await pandaGet<PandaTournament>(`/tournaments/${tournamentId}`);
  } catch {
    return null;
  }
}

export async function getTournamentMatches(
  tournamentId: string | number,
  limit = 50,
): Promise<PandaMatch[]> {
  const results = await pandaGet<PandaMatch[]>(`/tournaments/${tournamentId}/matches`, {
    per_page: String(Math.min(limit, 50)),
    sort: "-begin_at",
  });
  return Array.isArray(results) ? results.slice(0, limit) : [];
}

export async function getTeamMatches(
  teamId: string | number,
  limit = 50,
): Promise<PandaMatch[]> {
  const results = await pandaGet<PandaMatch[]>(`/teams/${teamId}/matches`, {
    per_page: String(Math.min(limit, 50)),
    sort: "-begin_at",
  });
  return Array.isArray(results) ? results.slice(0, limit) : [];
}

export async function getTrendingMatches(limit = 18): Promise<PandaMatch[]> {
  const [running, upcoming] = await Promise.all([
    pandaGet<PandaMatch[]>("/matches/running", { per_page: String(Math.min(limit, 50)) }),
    pandaGet<PandaMatch[]>("/matches/upcoming", {
      per_page: String(Math.min(limit, 50)),
      sort: "begin_at",
    }),
  ]);
  const merged = [...(Array.isArray(running) ? running : []), ...(Array.isArray(upcoming) ? upcoming : [])];
  const seen = new Set<number>();
  const unique: PandaMatch[] = [];
  for (const m of merged) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    unique.push(m);
    if (unique.length >= limit) break;
  }
  return unique;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function matchToItem(m: PandaMatch): ContentItem {
  const vs = teamOpponents(m);
  return {
    id: String(m.id),
    title: m.name || vs || `Match #${m.id}`,
    subtitle: vs ?? matchSubtitle(m),
    coverUrl: undefined,
    source: "pandascore",
    metadata: {
      itemKind: "match",
      status: m.status,
      beginAt: m.begin_at,
      videogame: m.videogame?.name,
      league: m.league?.name,
    },
  };
}

function teamToItem(t: PandaTeam): ContentItem {
  return {
    id: `team-${t.id}`,
    title: t.name,
    subtitle: t.acronym ? `${t.acronym}${t.location ? ` · ${t.location}` : ""}` : t.location ?? "Équipe",
    coverUrl: coverFromUrl(t.image_url),
    source: "pandascore",
    metadata: { itemKind: "team", teamId: t.id, acronym: t.acronym },
  };
}

function playerToItem(p: PandaPlayer): ContentItem {
  const teamName = p.current_team?.name;
  return {
    id: `player-${p.id}`,
    title: p.name,
    subtitle: teamName ? `${teamName}` : "Joueur",
    coverUrl: coverFromUrl(p.image_url),
    source: "pandascore",
    metadata: { itemKind: "player", playerId: p.id, teamId: p.current_team?.id },
  };
}

function tournamentToCollection(t: PandaTournament): ContentCollection {
  const game = t.videogame?.name;
  const dates =
    t.begin_at && t.end_at
      ? `${formatDate(t.begin_at)} – ${formatDate(t.end_at)}`
      : formatDate(t.begin_at);
  return {
    id: String(t.id),
    title: t.name,
    coverUrl: coverFromUrl(t.league?.image_url),
    source: "pandascore",
    metadata: {
      collectionKind: "tournament",
      videogame: game,
      league: t.league?.name,
      dates,
    },
  };
}

function teamToEntity(t: PandaTeam): ContentEntity {
  return {
    id: String(t.id),
    name: t.name,
    pictureUrl: coverFromUrl(t.image_url),
    source: "pandascore",
    metadata: { entityKind: "team", acronym: t.acronym, location: t.location },
  };
}

function playerToEntity(p: PandaPlayer): ContentEntity {
  return {
    id: `player-${p.id}`,
    name: p.name,
    pictureUrl: coverFromUrl(p.image_url),
    source: "pandascore",
    metadata: {
      entityKind: "player",
      playerId: p.id,
      teamName: p.current_team?.name,
    },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const pandascoreContentSource: ContentSource = {
  source: "pandascore",

  async searchItems(query, { limit = 20 } = {}) {
    const matches = await searchMatches(query, limit);
    return matches.map(matchToItem);
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
    if (kind === "tournament") {
      const tournaments = await searchTournaments(query, limit);
      return tournaments.map((t) => ({
        id: `tournament-${t.id}`,
        title: t.name,
        subtitle: t.videogame?.name ?? t.league?.name ?? "Tournoi",
        coverUrl: coverFromUrl(t.league?.image_url),
        source: "pandascore",
        metadata: { itemKind: "tournament", tournamentId: t.id },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const tournaments = await searchTournaments(query, limit);
    return tournaments.map(tournamentToCollection);
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
    const matches = await getTournamentMatches(collectionId);
    return matches.map(matchToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    if (entityId.startsWith("player-")) {
      const playerId = entityId.replace(/^player-/, "");
      const player = await getPlayerById(playerId);
      if (!player?.current_team?.id) return [];
      const matches = await getTeamMatches(player.current_team.id, limit);
      return matches.map(matchToItem);
    }
    const matches = await getTeamMatches(entityId, limit);
    return matches.map(matchToItem);
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

  async getEntityCollections(_entityId, _options) {
    return [];
  },
};
