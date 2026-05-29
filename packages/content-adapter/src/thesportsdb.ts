import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const DEFAULT_API_KEY = "3";
const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json";

// ─── Raw TheSportsDB types (subset) ───────────────────────────────────────────

export type SportsDbEvent = {
  idEvent: string;
  strEvent: string;
  strEventAlternate?: string | null;
  strSport?: string | null;
  idLeague?: string | null;
  strLeague?: string | null;
  strLeagueBadge?: string | null;
  strSeason?: string | null;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strStatus?: string | null;
  strThumb?: string | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
};

export type SportsDbTeam = {
  idTeam: string;
  strTeam: string;
  strTeamShort?: string | null;
  strSport?: string | null;
  strLeague?: string | null;
  idLeague?: string | null;
  strCountry?: string | null;
  strBadge?: string | null;
  strLogo?: string | null;
  intFormedYear?: string | null;
};

export type SportsDbPlayer = {
  idPlayer: string;
  strPlayer: string;
  strTeam?: string | null;
  idTeam?: string | null;
  strSport?: string | null;
  strPosition?: string | null;
  strNationality?: string | null;
  strThumb?: string | null;
  strCutout?: string | null;
};

export type SportsDbLeague = {
  idLeague: string;
  strLeague: string;
  strSport?: string | null;
  strLeagueAlternate?: string | null;
  strBadge?: string | null;
  strCountry?: string | null;
};

export type SportsDbSport = {
  idSport: string;
  strSport: string;
  strSportThumb?: string | null;
  strSportIconGreen?: string | null;
};

export type TsdEvent = SportsDbEvent;
export type TsdTeam = SportsDbTeam;
export type TsdPlayer = SportsDbPlayer;
export type TsdLeague = SportsDbLeague;
export type TsdSport = SportsDbSport;

export type TheSportsDbOptions = {
  /** When set, search/trending results are limited to this sport label (e.g. Soccer, Tennis). */
  sport?: string;
  trendingTeamIds?: string[];
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

function apiKey(): string {
  return process.env.THESPORTSDB_API_KEY?.trim() || DEFAULT_API_KEY;
}

function baseUrl(): string {
  return `${SPORTSDB_BASE}/${apiKey()}`;
}

async function tsdFetch<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(`${baseUrl()}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (!res.ok) {
    throw new Error(`TheSportsDB ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function coverFromUrl(url?: string | null): string | undefined {
  const trimmed = url?.trim();
  return trimmed || undefined;
}

function formatDate(date?: string | null, time?: string | null): string | undefined {
  if (!date) return undefined;
  try {
    const iso = time ? `${date}T${time}` : date;
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date ?? undefined;
  }
}

function eventScore(e: SportsDbEvent): string | undefined {
  const home = e.intHomeScore;
  const away = e.intAwayScore;
  if (home == null || away == null || home === "" || away === "") return undefined;
  return `${home} – ${away}`;
}

function eventSubtitle(e: SportsDbEvent): string | undefined {
  const parts: string[] = [];
  const score = eventScore(e);
  if (score) parts.push(score);
  const league = e.strLeague;
  const date = formatDate(e.dateEvent, e.strTime);
  if (league) parts.push(league);
  if (date) parts.push(date);
  if (e.strStatus && !score) parts.push(e.strStatus);
  return parts.length ? parts.join(" · ") : undefined;
}

function vsLabel(e: SportsDbEvent): string {
  const home = e.strHomeTeam?.trim();
  const away = e.strAwayTeam?.trim();
  if (home && away) return `${home} vs ${away}`;
  return e.strEvent;
}

function matchesSport<T extends { strSport?: string | null }>(row: T, sport?: string): boolean {
  if (!sport) return true;
  return (row.strSport ?? "").toLowerCase() === sport.toLowerCase();
}

// ─── Raw API ──────────────────────────────────────────────────────────────────

export async function searchEvents(
  query: string,
  limit = 20,
  sport?: string,
): Promise<SportsDbEvent[]> {
  if (!query.trim()) return [];
  const json = await tsdFetch<{ event: SportsDbEvent[] | null }>("searchevents.php", {
    e: query.trim(),
  });
  return (json.event ?? []).filter((e) => matchesSport(e, sport)).slice(0, limit);
}

export async function searchTeams(
  query: string,
  limit = 20,
  sport?: string,
): Promise<SportsDbTeam[]> {
  if (!query.trim()) return [];
  const json = await tsdFetch<{ teams: SportsDbTeam[] | null }>("searchteams.php", {
    t: query.trim(),
  });
  return (json.teams ?? []).filter((t) => matchesSport(t, sport)).slice(0, limit);
}

export async function searchPlayers(
  query: string,
  limit = 20,
  sport?: string,
): Promise<SportsDbPlayer[]> {
  if (!query.trim()) return [];
  const json = await tsdFetch<{ player: SportsDbPlayer[] | null }>("searchplayers.php", {
    p: query.trim(),
  });
  return (json.player ?? []).filter((p) => matchesSport(p, sport)).slice(0, limit);
}

export async function searchLeagues(
  query: string,
  limit = 20,
  sport?: string,
): Promise<SportsDbLeague[]> {
  if (sport) {
    const json = await tsdFetch<{ countries: SportsDbLeague[] | null }>("search_all_leagues.php", {
      s: sport,
    });
    const all = (json.countries ?? []).filter((l) => matchesSport(l, sport));
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter(
          (l) =>
            l.strLeague.toLowerCase().includes(q) ||
            (l.strLeagueAlternate ?? "").toLowerCase().includes(q),
        )
      : all;
    if (filtered.length > 0) return filtered.slice(0, limit);
  }

  if (!query.trim()) return [];
  const json = await tsdFetch<{ countries: SportsDbLeague[] | null }>("search_all_leagues.php", {
    c: query.trim(),
  });
  const fromCountry = (json.countries ?? []).filter((l) => matchesSport(l, sport));
  if (fromCountry.length > 0) return fromCountry.slice(0, limit);

  const teams = await searchTeams(query, limit, sport);
  const seen = new Set<string>();
  const leagues: SportsDbLeague[] = [];
  for (const team of teams) {
    if (!team.idLeague || seen.has(team.idLeague)) continue;
    seen.add(team.idLeague);
    leagues.push({
      idLeague: team.idLeague,
      strLeague: team.strLeague ?? "Ligue",
      strSport: team.strSport,
      strCountry: team.strCountry,
    });
    if (leagues.length >= limit) break;
  }
  return leagues;
}

export async function searchSports(query: string, limit = 20): Promise<SportsDbSport[]> {
  const json = await tsdFetch<{ sports: SportsDbSport[] | null }>("all_sports.php");
  const all = json.sports ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, limit);
  return all.filter((s) => s.strSport.toLowerCase().includes(q)).slice(0, limit);
}

export const searchSportsDbEvents = searchEvents;
export const searchSportsDbPlayers = searchPlayers;
export const searchSportsDbLeagues = searchLeagues;

export const searchSoccerEvents = (q: string, l?: number) => searchEvents(q, l, "Soccer");
export const searchSoccerTeams = (q: string, l?: number) => searchTeams(q, l, "Soccer");
export const searchSoccerPlayers = (q: string, l?: number) => searchPlayers(q, l, "Soccer");
export const searchSoccerLeagues = (q: string, l?: number) => searchLeagues(q, l, "Soccer");

export async function getEventById(eventId: string): Promise<SportsDbEvent | null> {
  try {
    const json = await tsdFetch<{ events: SportsDbEvent[] | null }>("lookupevent.php", {
      id: eventId,
    });
    return json.events?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function getTeamById(teamId: string): Promise<SportsDbTeam | null> {
  try {
    const json = await tsdFetch<{ teams: SportsDbTeam[] | null }>("lookupteam.php", { id: teamId });
    return json.teams?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function getPlayerById(playerId: string): Promise<SportsDbPlayer | null> {
  try {
    const json = await tsdFetch<{ players: SportsDbPlayer[] | null }>("lookupplayer.php", {
      id: playerId,
    });
    return json.players?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function getLeagueEvents(leagueId: string, limit = 50): Promise<SportsDbEvent[]> {
  const json = await tsdFetch<{ events: SportsDbEvent[] | null }>("eventsseason.php", {
    id: leagueId,
  });
  return (json.events ?? []).slice(0, limit);
}

export async function getTeamEvents(teamId: string, limit = 50): Promise<SportsDbEvent[]> {
  const [last, next] = await Promise.all([
    tsdFetch<{ results: SportsDbEvent[] | null }>("eventslast.php", { id: teamId }),
    tsdFetch<{ events: SportsDbEvent[] | null }>("eventsnext.php", { id: teamId }),
  ]);
  const merged = [...(last.results ?? []), ...(next.events ?? [])];
  const seen = new Set<string>();
  const unique: SportsDbEvent[] = [];
  for (const e of merged) {
    if (seen.has(e.idEvent)) continue;
    seen.add(e.idEvent);
    unique.push(e);
    if (unique.length >= limit) break;
  }
  return unique;
}

const DEFAULT_SOCCER_TEAM_IDS = [
  "133604",
  "133602",
  "133615",
  "133731",
  "133738",
  "133676",
];

const TENNIS_PLAYER_SEEDS = [
  "Djokovic",
  "Alcaraz",
  "Sinner",
  "Swiatek",
  "Gauff",
  "Nadal",
];

export async function getTrendingEvents(
  limit = 18,
  options: TheSportsDbOptions = {},
): Promise<SportsDbEvent[]> {
  const sport = options.sport ?? "Soccer";
  const today = new Date().toISOString().slice(0, 10);
  const teamIds = options.trendingTeamIds ?? DEFAULT_SOCCER_TEAM_IDS;

  const [dayEvents, teamEvents] = await Promise.all([
    tsdFetch<{ events: SportsDbEvent[] | null }>("eventsday.php", { d: today, s: sport }).catch(
      () => ({ events: null }),
    ),
    sport === "Soccer"
      ? Promise.all(
          teamIds.slice(0, 4).map((id) =>
            tsdFetch<{ events: SportsDbEvent[] | null }>("eventsnext.php", { id }).catch(() => ({
              events: null,
            })),
          ),
        )
      : Promise.resolve([]),
  ]);

  const merged = [
    ...(dayEvents.events ?? []),
    ...teamEvents.flatMap((r) => r.events ?? []),
  ].filter((e) => matchesSport(e, options.sport));

  const seen = new Set<string>();
  const unique: SportsDbEvent[] = [];
  for (const e of merged) {
    if (seen.has(e.idEvent)) continue;
    seen.add(e.idEvent);
    unique.push(e);
    if (unique.length >= limit) break;
  }
  return unique;
}

export const getTrendingSoccerEvents = (limit = 18) =>
  getTrendingEvents(limit, { sport: "Soccer" });

export const getTrendingTennisEvents = (limit = 18) =>
  getTrendingEvents(limit, { sport: "Tennis" });

export async function getTrendingTennisPlayers(limit = 18): Promise<SportsDbPlayer[]> {
  const batches = await Promise.all(
    TENNIS_PLAYER_SEEDS.map((name) => searchPlayers(name, 2, "Tennis")),
  );
  const seen = new Set<string>();
  const unique: SportsDbPlayer[] = [];
  for (const batch of batches) {
    for (const p of batch) {
      if (seen.has(p.idPlayer)) continue;
      seen.add(p.idPlayer);
      unique.push(p);
      if (unique.length >= limit) return unique;
    }
  }
  return unique;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function eventToItem(e: SportsDbEvent): ContentItem {
  return {
    id: e.idEvent,
    title: vsLabel(e),
    subtitle: eventSubtitle(e),
    coverUrl: coverFromUrl(e.strThumb) ?? coverFromUrl(e.strHomeTeamBadge),
    source: "thesportsdb",
    metadata: {
      itemKind: "match",
      sport: e.strSport,
      league: e.strLeague,
      leagueId: e.idLeague,
      status: e.strStatus,
      dateEvent: e.dateEvent,
    },
  };
}

function teamToItem(t: SportsDbTeam): ContentItem {
  return {
    id: `team-${t.idTeam}`,
    title: t.strTeam,
    subtitle: [t.strLeague, t.strCountry].filter(Boolean).join(" · ") || "Équipe",
    coverUrl: coverFromUrl(t.strBadge) ?? coverFromUrl(t.strLogo),
    source: "thesportsdb",
    metadata: { itemKind: "team", teamId: t.idTeam, sport: t.strSport },
  };
}

function playerToItem(p: SportsDbPlayer): ContentItem {
  return {
    id: `player-${p.idPlayer}`,
    title: p.strPlayer,
    subtitle: [p.strTeam, p.strPosition].filter(Boolean).join(" · ") || "Joueur",
    coverUrl: coverFromUrl(p.strCutout) ?? coverFromUrl(p.strThumb),
    source: "thesportsdb",
    metadata: {
      itemKind: "player",
      playerId: p.idPlayer,
      teamId: p.idTeam,
      sport: p.strSport,
    },
  };
}

function leagueToCollection(l: SportsDbLeague): ContentCollection {
  return {
    id: l.idLeague,
    title: l.strLeague,
    coverUrl: coverFromUrl(l.strBadge),
    source: "thesportsdb",
    metadata: {
      collectionKind: "league",
      sport: l.strSport,
      country: l.strCountry,
    },
  };
}

function teamToEntity(t: SportsDbTeam): ContentEntity {
  return {
    id: t.idTeam,
    name: t.strTeam,
    pictureUrl: coverFromUrl(t.strBadge) ?? coverFromUrl(t.strLogo),
    source: "thesportsdb",
    metadata: {
      entityKind: "team",
      sport: t.strSport,
      league: t.strLeague,
      country: t.strCountry,
    },
  };
}

function playerToEntity(p: SportsDbPlayer): ContentEntity {
  return {
    id: `player-${p.idPlayer}`,
    name: p.strPlayer,
    pictureUrl: coverFromUrl(p.strCutout) ?? coverFromUrl(p.strThumb),
    source: "thesportsdb",
    metadata: {
      entityKind: "player",
      playerId: p.idPlayer,
      teamName: p.strTeam,
      sport: p.strSport,
    },
  };
}

function sportToEntity(s: SportsDbSport): ContentEntity {
  return {
    id: `sport-${s.idSport}`,
    name: s.strSport,
    pictureUrl: coverFromUrl(s.strSportIconGreen) ?? coverFromUrl(s.strSportThumb),
    source: "thesportsdb",
    metadata: { entityKind: "sport", sportId: s.idSport },
  };
}

const TENNIS_SURFACES: ContentItem[] = [
  {
    id: "surface-clay",
    title: "Terre battue",
    subtitle: "Roland-Garros · Madrid",
    source: "thesportsdb",
    metadata: { itemKind: "surface", surface: "clay" },
  },
  {
    id: "surface-grass",
    title: "Gazon",
    subtitle: "Wimbledon · Halle",
    source: "thesportsdb",
    metadata: { itemKind: "surface", surface: "grass" },
  },
  {
    id: "surface-hard",
    title: "Dur",
    subtitle: "US Open · Australian Open",
    source: "thesportsdb",
    metadata: { itemKind: "surface", surface: "hard" },
  },
  {
    id: "surface-indoor",
    title: "Dur indoor",
    subtitle: "Paris Masters · ATP Finals",
    source: "thesportsdb",
    metadata: { itemKind: "surface", surface: "indoor-hard" },
  },
];

async function getPlayerResults(
  playerId: string,
  sport: string | undefined,
  limit = 50,
): Promise<SportsDbEvent[]> {
  type PlayerResult = {
    idEvent: string;
    strEvent: string;
    strDetail?: string | null;
    dateEvent?: string | null;
    strCountry?: string | null;
    strSport?: string | null;
  };
  const json = await tsdFetch<{ results: PlayerResult[] | null }>("playerresults.php", {
    id: playerId,
  });
  return (json.results ?? [])
    .filter((r) => matchesSport(r, sport))
    .slice(0, limit)
    .map((r) => ({
      idEvent: r.idEvent,
      strEvent: r.strEvent,
      strSport: r.strSport,
      dateEvent: r.dateEvent,
      strCountry: r.strCountry,
      strStatus: r.strDetail ?? undefined,
    }));
}

// ─── ContentSource factory ────────────────────────────────────────────────────

export function createTheSportsDbContentSource(
  options: TheSportsDbOptions = {},
): ContentSource {
  const sport = options.sport;

  return {
    source: "thesportsdb",

    async searchItems(query, { limit = 20 } = {}) {
      const events = await searchEvents(query, limit, sport);
      return events.map(eventToItem);
    },

    async searchItemsByKind(kind, query, { limit = 20 } = {}) {
      if (kind === "match") {
        return this.searchItems(query, { limit });
      }
      if (kind === "team") {
        const teams = await searchTeams(query, limit, sport);
        return teams.map(teamToItem);
      }
      if (kind === "player") {
        const players = await searchPlayers(query, limit, sport);
        return players.map(playerToItem);
      }
      if (kind === "league" || kind === "tournament") {
        const leagues = await searchLeagues(query, limit, sport);
        return leagues.map((l) => ({
          id: `league-${l.idLeague}`,
          title: l.strLeague,
          subtitle: l.strSport ?? l.strCountry ?? "Tournoi",
          coverUrl: coverFromUrl(l.strBadge),
          source: "thesportsdb",
          metadata: { itemKind: "tournament", leagueId: l.idLeague },
        }));
      }
      if (kind === "surface" && sport?.toLowerCase() === "tennis") {
        const q = query.trim().toLowerCase();
        const list = q
          ? TENNIS_SURFACES.filter(
              (s) =>
                s.title.toLowerCase().includes(q) ||
                (s.subtitle ?? "").toLowerCase().includes(q),
            )
          : TENNIS_SURFACES;
        return list.slice(0, limit);
      }
      return this.searchItems(query, { limit });
    },

    async searchCollections(query, { limit = 20 } = {}) {
      const leagues = await searchLeagues(query, limit, sport);
      return leagues.map(leagueToCollection);
    },

    async searchEntities(query, { limit = 20 } = {}) {
      if (sport?.toLowerCase() === "tennis") {
        const players = await searchPlayers(query, limit, sport);
        return players.map(playerToEntity);
      }
      const third = Math.ceil(limit / 3);
      const [sports, teams, players] = await Promise.all([
        sport ? Promise.resolve([]) : searchSports(query, third),
        searchTeams(query, third, sport),
        searchPlayers(query, third, sport),
      ]);
      return [
        ...sports.map(sportToEntity),
        ...teams.map(teamToEntity),
        ...players.map(playerToEntity),
      ].slice(0, limit);
    },

    async getCollectionItems(collectionId) {
      const leagueId = collectionId.replace(/^league-/, "");
      const events = await getLeagueEvents(leagueId);
      return events
        .filter((e) => matchesSport(e, sport))
        .map(eventToItem);
    },

    async getEntityTopItems(entityId, { limit = 50 } = {}) {
      if (entityId.startsWith("player-")) {
        const playerId = entityId.replace(/^player-/, "");
        if (sport?.toLowerCase() === "tennis") {
          const results = await getPlayerResults(playerId, sport, limit);
          return results.map(eventToItem);
        }
        const player = await getPlayerById(playerId);
        if (!player?.idTeam) return [];
        const events = await getTeamEvents(player.idTeam, limit);
        return events.filter((e) => matchesSport(e, sport)).map(eventToItem);
      }
      if (entityId.startsWith("sport-")) {
        const sportId = entityId.replace(/^sport-/, "");
        const json = await tsdFetch<{ sports: SportsDbSport[] | null }>("all_sports.php");
        const row = json.sports?.find((s) => s.idSport === sportId);
        const sportLabel = row?.strSport ?? "Soccer";
        const today = new Date().toISOString().slice(0, 10);
        const day = await tsdFetch<{ events: SportsDbEvent[] | null }>("eventsday.php", {
          d: today,
          s: sportLabel,
        });
        return (day.events ?? []).slice(0, limit).map(eventToItem);
      }
      const events = await getTeamEvents(entityId, limit);
      return events.filter((e) => matchesSport(e, sport)).map(eventToItem);
    },

    async getEntityById(entityId) {
      if (entityId.startsWith("player-")) {
        const player = await getPlayerById(entityId.replace(/^player-/, ""));
        return player ? playerToEntity(player) : null;
      }
      if (entityId.startsWith("sport-")) {
        const sportId = entityId.replace(/^sport-/, "");
        const json = await tsdFetch<{ sports: SportsDbSport[] | null }>("all_sports.php");
        const row = json.sports?.find((s) => s.idSport === sportId);
        return row ? sportToEntity(row) : null;
      }
      const team = await getTeamById(entityId);
      return team ? teamToEntity(team) : null;
    },

    async getEntityCollections(entityId) {
      if (entityId.startsWith("player-")) {
        const player = await getPlayerById(entityId.replace(/^player-/, ""));
        if (!player?.idTeam) return [];
        const team = await getTeamById(player.idTeam);
        if (!team?.idLeague) return [];
        return [
          leagueToCollection({
            idLeague: team.idLeague,
            strLeague: team.strLeague ?? "Ligue",
            strSport: team.strSport,
            strCountry: team.strCountry,
          }),
        ];
      }
      const team = await getTeamById(entityId);
      if (!team?.idLeague) return [];
      return [
        leagueToCollection({
          idLeague: team.idLeague,
          strLeague: team.strLeague ?? "Ligue",
          strSport: team.strSport,
          strCountry: team.strCountry,
        }),
      ];
    },
  };
}

export const theSportsDbContentSource = createTheSportsDbContentSource();
export const footballSportsDbContentSource = createTheSportsDbContentSource({ sport: "Soccer" });
export const tennisTheSportsDbContentSource = createTheSportsDbContentSource({ sport: "Tennis" });
/** @deprecated Use footballSportsDbContentSource */
export const sportsDbContentSource = footballSportsDbContentSource;
