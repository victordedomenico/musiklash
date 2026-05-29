import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

/** Jolpica-hosted Ergast mirror (ergast.com is deprecated). */
const ERGAST_BASE = "https://api.jolpi.ca/ergast/f1";
const FLAG_CDN = "https://flagcdn.com/w320";

const RECENT_SEASONS = ["2024", "2023", "2022", "2021", "2020"] as const;

const FAMOUS_DRIVER_IDS = [
  "hamilton",
  "verstappen",
  "schumacher",
  "senna",
  "prost",
  "vettel",
  "alonso",
  "leclerc",
  "norris",
  "russell",
  "sainz",
  "perez",
  "ricciardo",
  "raikkonen",
  "button",
  "massa",
  "barrichello",
] as const;

const NATIONALITY_FLAGS: Record<string, string> = {
  American: "us",
  Argentine: "ar",
  Australian: "au",
  Austrian: "at",
  Belgian: "be",
  Brazilian: "br",
  British: "gb",
  Canadian: "ca",
  Chilean: "cl",
  Chinese: "cn",
  Colombian: "co",
  Czech: "cz",
  Danish: "dk",
  Dutch: "nl",
  Finnish: "fi",
  French: "fr",
  German: "de",
  Hungarian: "hu",
  Indian: "in",
  Indonesian: "id",
  Irish: "ie",
  Italian: "it",
  Japanese: "jp",
  Malaysian: "my",
  Mexican: "mx",
  Monegasque: "mc",
  "New Zealander": "nz",
  Polish: "pl",
  Portuguese: "pt",
  Rhodesian: "zw",
  Russian: "ru",
  "South African": "za",
  Spanish: "es",
  Swedish: "se",
  Swiss: "ch",
  Thai: "th",
  Venezuelan: "ve",
};

// ─── Raw Ergast types (subset) ───────────────────────────────────────────────

type ErgastDriver = {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  nationality?: string;
};

type ErgastConstructor = {
  constructorId: string;
  name: string;
  nationality?: string;
};

type ErgastCircuit = {
  circuitId: string;
  circuitName: string;
  Location?: {
    locality?: string;
    country?: string;
  };
};

type ErgastRace = {
  season: string;
  round: string;
  raceName: string;
  date?: string;
  Circuit?: ErgastCircuit;
  Results?: { position?: string; Driver?: ErgastDriver; Constructor?: ErgastConstructor }[];
};

type ErgastSeason = {
  season: string;
  url?: string;
};

type MRData<T> = {
  MRData: {
    total?: string;
    limit?: string;
    offset?: string;
    DriverTable?: { Drivers?: ErgastDriver[] };
    ConstructorTable?: { Constructors?: ErgastConstructor[] };
    CircuitTable?: { Circuits?: ErgastCircuit[] };
    RaceTable?: { season?: string; Races?: ErgastRace[] };
    SeasonTable?: { Seasons?: ErgastSeason[] };
  } & T;
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function ergastGet<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${ERGAST_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 } as any,
  });
  if (!res.ok) {
    throw new Error(`Ergast ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesText(text: string | undefined, query: string): boolean {
  if (!query) return true;
  return (text ?? "").toLowerCase().includes(query);
}

function raceId(season: string, round: string): string {
  return `${season}-${round}`;
}

function nationalityFlag(nationality?: string): string | undefined {
  if (!nationality) return undefined;
  const code = NATIONALITY_FLAGS[nationality];
  return code ? `${FLAG_CDN}/${code}.png` : undefined;
}

function formatDate(iso?: string): string | undefined {
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

function driverFullName(d: ErgastDriver): string {
  return `${d.givenName} ${d.familyName}`.trim();
}

function raceSubtitle(r: ErgastRace): string | undefined {
  const parts: string[] = [];
  if (r.season) parts.push(`Saison ${r.season}`);
  const loc = r.Circuit?.Location;
  if (loc?.locality && loc?.country) parts.push(`${loc.locality}, ${loc.country}`);
  else if (r.Circuit?.circuitName) parts.push(r.Circuit.circuitName);
  const date = formatDate(r.date);
  if (date) parts.push(date);
  return parts.length ? parts.join(" · ") : undefined;
}

function raceWinner(r: ErgastRace): string | undefined {
  const winner = r.Results?.find((res) => res.position === "1")?.Driver;
  return winner ? driverFullName(winner) : undefined;
}

// ─── Raw API ──────────────────────────────────────────────────────────────────

async function listDrivers(limit = 1000): Promise<ErgastDriver[]> {
  const json = await ergastGet<MRData<unknown>>(
    `/drivers.json?limit=${Math.min(limit, 1000)}`,
  );
  return json.MRData.DriverTable?.Drivers ?? [];
}

async function listConstructors(limit = 200): Promise<ErgastConstructor[]> {
  const json = await ergastGet<MRData<unknown>>(
    `/constructors.json?limit=${Math.min(limit, 200)}`,
  );
  return json.MRData.ConstructorTable?.Constructors ?? [];
}

async function listCircuits(limit = 100): Promise<ErgastCircuit[]> {
  const json = await ergastGet<MRData<unknown>>(
    `/circuits.json?limit=${Math.min(limit, 100)}`,
  );
  return json.MRData.CircuitTable?.Circuits ?? [];
}

async function listSeasons(limit = 30): Promise<ErgastSeason[]> {
  const json = await ergastGet<MRData<unknown>>(
    `/seasons.json?limit=${limit}&offset=0`,
  );
  return (json.MRData.SeasonTable?.Seasons ?? []).slice().reverse();
}

async function getDriverById(driverId: string): Promise<ErgastDriver | null> {
  try {
    const json = await ergastGet<MRData<unknown>>(`/drivers/${driverId}.json`);
    return json.MRData.DriverTable?.Drivers?.[0] ?? null;
  } catch {
    return null;
  }
}

async function getConstructorById(constructorId: string): Promise<ErgastConstructor | null> {
  try {
    const json = await ergastGet<MRData<unknown>>(`/constructors/${constructorId}.json`);
    return json.MRData.ConstructorTable?.Constructors?.[0] ?? null;
  } catch {
    return null;
  }
}

async function getCircuitById(circuitId: string): Promise<ErgastCircuit | null> {
  try {
    const json = await ergastGet<MRData<unknown>>(`/circuits/${circuitId}.json`);
    return json.MRData.CircuitTable?.Circuits?.[0] ?? null;
  } catch {
    return null;
  }
}

async function getSeasonRaces(season: string, limit = 50): Promise<ErgastRace[]> {
  const json = await ergastGet<MRData<unknown>>(
    `/${season}/races.json?limit=${Math.min(limit, 50)}`,
  );
  return json.MRData.RaceTable?.Races ?? [];
}

async function searchRacesAcrossSeasons(query: string, limit = 20): Promise<ErgastRace[]> {
  const q = normalizeQuery(query);
  const batches = await Promise.all(RECENT_SEASONS.map((season) => getSeasonRaces(season)));
  const races = batches.flat();
  const filtered = q
    ? races.filter(
        (r) =>
          matchesText(r.raceName, q) ||
          matchesText(r.Circuit?.circuitName, q) ||
          matchesText(r.Circuit?.Location?.country, q),
      )
    : races;
  return filtered.slice(0, limit);
}

export async function getTrendingRaces(limit = 18): Promise<ErgastRace[]> {
  const [latestSeason] = RECENT_SEASONS;
  const races = await getSeasonRaces(latestSeason, limit);
  return races.slice(0, limit);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function raceToItem(r: ErgastRace): ContentItem {
  const winner = raceWinner(r);
  return {
    id: raceId(r.season, r.round),
    title: r.raceName,
    subtitle: winner ? `${winner} · ${raceSubtitle(r) ?? ""}`.replace(/ · $/, "") : raceSubtitle(r),
    coverUrl: undefined,
    source: "ergast",
    metadata: {
      itemKind: "race",
      season: r.season,
      round: r.round,
      circuitId: r.Circuit?.circuitId,
      circuitName: r.Circuit?.circuitName,
      date: r.date,
      winner,
    },
  };
}

function driverToItem(d: ErgastDriver): ContentItem {
  return {
    id: `driver-${d.driverId}`,
    title: driverFullName(d),
    subtitle: [d.code, d.nationality].filter(Boolean).join(" · ") || "Pilote",
    coverUrl: nationalityFlag(d.nationality),
    source: "ergast",
    metadata: { itemKind: "driver", driverId: d.driverId, code: d.code },
  };
}

function constructorToItem(c: ErgastConstructor): ContentItem {
  return {
    id: `constructor-${c.constructorId}`,
    title: c.name,
    subtitle: c.nationality ? `Écurie · ${c.nationality}` : "Écurie",
    coverUrl: nationalityFlag(c.nationality),
    source: "ergast",
    metadata: { itemKind: "constructor", constructorId: c.constructorId },
  };
}

function circuitToItem(c: ErgastCircuit): ContentItem {
  const loc = c.Location;
  return {
    id: `circuit-${c.circuitId}`,
    title: c.circuitName,
    subtitle: loc?.locality && loc?.country ? `${loc.locality}, ${loc.country}` : "Circuit",
    coverUrl: nationalityFlag(loc?.country),
    source: "ergast",
    metadata: { itemKind: "circuit", circuitId: c.circuitId },
  };
}

function seasonToCollection(s: ErgastSeason): ContentCollection {
  return {
    id: `season-${s.season}`,
    title: `Saison ${s.season}`,
    source: "ergast",
    metadata: { collectionKind: "season", season: s.season },
  };
}

function driverToEntity(d: ErgastDriver): ContentEntity {
  return {
    id: d.driverId,
    name: driverFullName(d),
    pictureUrl: nationalityFlag(d.nationality),
    source: "ergast",
    metadata: {
      entityKind: "driver",
      code: d.code,
      nationality: d.nationality,
      permanentNumber: d.permanentNumber,
    },
  };
}

function constructorToEntity(c: ErgastConstructor): ContentEntity {
  return {
    id: `constructor-${c.constructorId}`,
    name: c.name,
    pictureUrl: nationalityFlag(c.nationality),
    source: "ergast",
    metadata: { entityKind: "constructor", constructorId: c.constructorId },
  };
}

function circuitToEntity(c: ErgastCircuit): ContentEntity {
  const loc = c.Location;
  return {
    id: `circuit-${c.circuitId}`,
    name: c.circuitName,
    pictureUrl: nationalityFlag(loc?.country),
    source: "ergast",
    metadata: {
      entityKind: "circuit",
      circuitId: c.circuitId,
      locality: loc?.locality,
      country: loc?.country,
    },
  };
}

async function getEntityRaces(
  path: string,
  limit: number,
): Promise<ErgastRace[]> {
  const json = await ergastGet<MRData<unknown>>(`${path}?limit=${Math.min(limit, 50)}`);
  return json.MRData.RaceTable?.Races ?? [];
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const ergastContentSource: ContentSource = {
  source: "ergast",

  async searchItems(query, { limit = 20 } = {}) {
    const races = await searchRacesAcrossSeasons(query, limit);
    return races.map(raceToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    const q = normalizeQuery(query);
    if (kind === "race") {
      return this.searchItems(query, { limit });
    }
    if (kind === "driver") {
      const drivers = await listDrivers();
      const filtered = drivers.filter(
        (d) =>
          matchesText(driverFullName(d), q) ||
          matchesText(d.code, q) ||
          matchesText(d.driverId, q),
      );
      return (q ? filtered : drivers.filter((d) => FAMOUS_DRIVER_IDS.includes(d.driverId as (typeof FAMOUS_DRIVER_IDS)[number])))
        .slice(0, limit)
        .map(driverToItem);
    }
    if (kind === "constructor") {
      const constructors = await listConstructors();
      const filtered = constructors.filter(
        (c) => matchesText(c.name, q) || matchesText(c.constructorId, q),
      );
      return (q ? filtered : constructors.slice(0, limit)).slice(0, limit).map(constructorToItem);
    }
    if (kind === "circuit") {
      const circuits = await listCircuits();
      const filtered = circuits.filter(
        (c) =>
          matchesText(c.circuitName, q) ||
          matchesText(c.circuitId, q) ||
          matchesText(c.Location?.country, q),
      );
      return (q ? filtered : circuits.slice(0, limit)).slice(0, limit).map(circuitToItem);
    }
    if (kind === "season") {
      const seasons = await listSeasons(limit);
      const filtered = seasons.filter((s) => matchesText(s.season, q));
      return (q ? filtered : seasons).slice(0, limit).map((s) => ({
        id: `season-item-${s.season}`,
        title: `Saison ${s.season}`,
        subtitle: "Championnat F1",
        source: "ergast",
        metadata: { itemKind: "season", season: s.season },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const q = normalizeQuery(query);
    const seasons = await listSeasons(80);
    const filtered = seasons.filter((s) => matchesText(s.season, q));
    return (q ? filtered : seasons.slice(0, limit)).slice(0, limit).map(seasonToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const q = normalizeQuery(query);
    const third = Math.ceil(limit / 3);
    const [drivers, constructors, circuits] = await Promise.all([
      listDrivers(),
      listConstructors(),
      listCircuits(),
    ]);

    const driverEntities = drivers
      .filter(
        (d) =>
          matchesText(driverFullName(d), q) ||
          matchesText(d.code, q) ||
          (!q && FAMOUS_DRIVER_IDS.includes(d.driverId as (typeof FAMOUS_DRIVER_IDS)[number])),
      )
      .slice(0, third)
      .map(driverToEntity);

    const constructorEntities = constructors
      .filter((c) => matchesText(c.name, q) || matchesText(c.constructorId, q))
      .slice(0, third)
      .map(constructorToEntity);

    const circuitEntities = circuits
      .filter(
        (c) =>
          matchesText(c.circuitName, q) ||
          matchesText(c.Location?.country, q) ||
          matchesText(c.circuitId, q),
      )
      .slice(0, third)
      .map(circuitToEntity);

    return [...driverEntities, ...constructorEntities, ...circuitEntities].slice(0, limit);
  },

  async getCollectionItems(collectionId) {
    const season = collectionId.startsWith("season-")
      ? collectionId.replace(/^season-/, "")
      : collectionId;
    const races = await getSeasonRaces(season);
    return races.map(raceToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    if (entityId.startsWith("constructor-")) {
      const constructorId = entityId.replace(/^constructor-/, "");
      const races = await getEntityRaces(`/constructors/${constructorId}/results.json`, limit);
      return races.map(raceToItem);
    }
    if (entityId.startsWith("circuit-")) {
      const circuitId = entityId.replace(/^circuit-/, "");
      const races = await getEntityRaces(`/circuits/${circuitId}/results.json`, limit);
      return races.map(raceToItem);
    }
    const driverId = entityId.replace(/^driver-/, "");
    const races = await getEntityRaces(`/drivers/${driverId}/results.json`, limit);
    return races.map(raceToItem);
  },

  async getEntityById(entityId) {
    if (entityId.startsWith("constructor-")) {
      const constructorId = entityId.replace(/^constructor-/, "");
      const c = await getConstructorById(constructorId);
      return c ? constructorToEntity(c) : null;
    }
    if (entityId.startsWith("circuit-")) {
      const circuitId = entityId.replace(/^circuit-/, "");
      const c = await getCircuitById(circuitId);
      return c ? circuitToEntity(c) : null;
    }
    const driverId = entityId.replace(/^driver-/, "");
    const d = await getDriverById(driverId);
    return d ? driverToEntity(d) : null;
  },

  async getEntityCollections(entityId) {
    return [];
  },
};

export {
  listDrivers,
  listConstructors,
  listCircuits,
  listSeasons,
  getDriverById,
  getConstructorById,
  getCircuitById,
  getSeasonRaces,
  searchRacesAcrossSeasons,
};
