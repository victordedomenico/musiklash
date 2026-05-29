import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const CARQUERY_BASE = "https://www.carqueryapi.com/api/0.3/";
const NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";
const CARQUERY_TIMEOUT_MS = 8_000;

const POPULAR_MAKE_NAMES = [
  "BMW",
  "Ford",
  "Toyota",
  "Honda",
  "Mercedes-Benz",
  "Audi",
  "Porsche",
  "Ferrari",
  "Lamborghini",
  "Tesla",
  "Volkswagen",
  "Chevrolet",
  "Nissan",
  "Mazda",
  "Subaru",
  "Volvo",
  "Jeep",
  "Dodge",
  "Lexus",
  "Land Rover",
  "McLaren",
  "Bentley",
  "Rolls-Royce",
  "Aston Martin",
  "Maserati",
  "Alfa Romeo",
  "Peugeot",
  "Renault",
  "Citroën",
  "Fiat",
];

const BODY_TYPES: { id: string; title: string; carqueryBody: string }[] = [
  { id: "suv", title: "SUV", carqueryBody: "SUV" },
  { id: "sedan", title: "Berline", carqueryBody: "Sedan" },
  { id: "coupe", title: "Coupé", carqueryBody: "Coupe" },
  { id: "convertible", title: "Cabriolet", carqueryBody: "Convertible" },
  { id: "pickup", title: "Pick-up", carqueryBody: "Pickup" },
  { id: "wagon", title: "Break", carqueryBody: "Wagon" },
  { id: "hatchback", title: "Compacte", carqueryBody: "Hatchback" },
  { id: "van", title: "Monospace", carqueryBody: "Van" },
];

// ─── Raw types ────────────────────────────────────────────────────────────────

type NhtsaMake = { Make_ID: number; Make_Name: string };
type NhtsaModel = {
  Make_ID: number;
  Make_Name: string;
  Model_ID: number;
  Model_Name: string;
};

type NhtsaResponse<T> = {
  Count?: number;
  Results?: T[];
};

type CqMake = {
  make_id?: string;
  make_display?: string;
  make_country?: string;
};

type CqModel = {
  model_id?: string;
  model_name?: string;
  model_make_id?: string;
  model_make_display?: string;
  model_year?: string;
  model_trim?: string;
  model_body?: string;
  model_engine_fuel?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modelItemId(makeId: number | string, modelId: number | string): string {
  return `${makeId}-${modelId}`;
}

function parseModelItemId(id: string): { makeId: string; modelId: string } | null {
  const match = /^(\d+)-(\d+)$/.exec(id);
  if (!match) return null;
  return { makeId: match[1], modelId: match[2] };
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function parseCarQueryJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("?(")
    ? trimmed.slice(2).replace(/\);?\s*$/, "")
    : trimmed;
  return JSON.parse(jsonText) as Record<string, unknown>;
}

async function carQueryFetch<T>(
  params: Record<string, string>,
): Promise<T | null> {
  const url = new URL(CARQUERY_BASE);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CARQUERY_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "text/javascript, application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 86400 } as any,
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    return parseCarQueryJson(text) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function nhtsaFetch<T>(path: string): Promise<T[]> {
  const url = path.startsWith("http") ? path : `${NHTSA_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 86400 } as any,
  });
  if (!res.ok) {
    throw new Error(`NHTSA ${path} → ${res.status}`);
  }
  const json = (await res.json()) as NhtsaResponse<T>;
  return json.Results ?? [];
}

function nhtsaModelToItem(model: NhtsaModel): ContentItem {
  return {
    id: modelItemId(model.Make_ID, model.Model_ID),
    title: model.Model_Name,
    subtitle: model.Make_Name,
    source: "carquery",
    metadata: {
      itemKind: "model",
      makeId: model.Make_ID,
      makeName: model.Make_Name,
      modelId: model.Model_ID,
      provider: "nhtsa",
    },
  };
}

function cqModelToItem(model: CqModel): ContentItem | null {
  const modelId = model.model_id?.trim();
  const title = model.model_name?.trim();
  if (!modelId || !title) return null;
  const make = model.model_make_display?.trim();
  const year = model.model_year?.trim();
  const trim = model.model_trim?.trim();
  const subtitleParts = [make, year, trim].filter(Boolean);
  return {
    id: `cq-${modelId}`,
    title: trim ? `${title} ${trim}` : title,
    subtitle: subtitleParts.join(" · ") || make,
    source: "carquery",
    metadata: {
      itemKind: "model",
      modelId,
      makeName: make,
      year,
      body: model.model_body,
      fuel: model.model_engine_fuel,
      provider: "carquery",
    },
  };
}

function nhtsaMakeToEntity(make: NhtsaMake): ContentEntity {
  return {
    id: String(make.Make_ID),
    name: make.Make_Name,
    source: "carquery",
    metadata: { entityKind: "make", makeId: make.Make_ID, provider: "nhtsa" },
  };
}

function bodyToCollection(body: (typeof BODY_TYPES)[number]): ContentCollection {
  return {
    id: body.id,
    title: body.title,
    source: "carquery",
    metadata: { collectionKind: "body", carqueryBody: body.carqueryBody },
  };
}

// ─── Raw API (routes / home trending) ─────────────────────────────────────────

export async function searchCarMakes(query: string, limit = 20): Promise<NhtsaMake[]> {
  const q = normalizeQuery(query);
  const makes = await nhtsaFetch<NhtsaMake>("/GetMakesForVehicleType/car?format=json");
  const filtered = q
    ? makes.filter((m) => m.Make_Name.toLowerCase().includes(q))
    : makes;
  return filtered.slice(0, limit);
}

export async function searchCarModels(query: string, limit = 20): Promise<ContentItem[]> {
  const q = normalizeQuery(query);
  if (!q) return [];

  const cqData = await carQueryFetch<{ Models?: CqModel[] }>({
    cmd: "getModels",
    model: query.trim(),
  });
  const cqItems = (cqData?.Models ?? [])
    .map(cqModelToItem)
    .filter((item): item is ContentItem => item !== null)
    .slice(0, limit);
  if (cqItems.length >= limit) return cqItems;

  const makes = await searchCarMakes(query, 8);
  const seen = new Set<string>();
  const items: ContentItem[] = [...cqItems];

  for (const make of makes) {
    if (items.length >= limit) break;
    try {
      const models = await nhtsaFetch<NhtsaModel>(
        `/GetModelsForMakeId/${make.Make_ID}?format=json`,
      );
      for (const model of models) {
        if (!model.Model_Name.toLowerCase().includes(q)) continue;
        const id = modelItemId(model.Make_ID, model.Model_ID);
        if (seen.has(id)) continue;
        seen.add(id);
        items.push(nhtsaModelToItem(model));
        if (items.length >= limit) break;
      }
    } catch {
      // skip make on error
    }
  }

  return items.slice(0, limit);
}

export async function getMakeById(makeId: string): Promise<NhtsaMake | null> {
  const id = Number(makeId);
  if (!Number.isFinite(id)) return null;
  const makes = await nhtsaFetch<NhtsaMake>("/GetMakesForVehicleType/car?format=json");
  return makes.find((m) => m.Make_ID === id) ?? null;
}

export async function getModelsForMake(makeId: string, limit = 50): Promise<ContentItem[]> {
  const id = makeId.trim();
  if (!id) return [];

  const make = await getMakeById(id);
  if (make) {
    const cqData = await carQueryFetch<{ Models?: CqModel[] }>({
      cmd: "getModels",
      make: make.Make_Name,
    });
    const cqItems = (cqData?.Models ?? [])
      .map(cqModelToItem)
      .filter((item): item is ContentItem => item !== null);
    if (cqItems.length > 0) return cqItems.slice(0, limit);
  }

  const models = await nhtsaFetch<NhtsaModel>(`/GetModelsForMakeId/${id}?format=json`);
  return models.slice(0, limit).map(nhtsaModelToItem);
}

export async function getModelsForBody(bodyId: string, limit = 50): Promise<ContentItem[]> {
  const body = BODY_TYPES.find((b) => b.id === bodyId.toLowerCase());
  if (!body) return [];

  const items: ContentItem[] = [];
  const seen = new Set<string>();

  for (const makeName of POPULAR_MAKE_NAMES.slice(0, 10)) {
    if (items.length >= limit) break;
    const cqData = await carQueryFetch<{ Models?: CqModel[] }>({
      cmd: "getModels",
      make: makeName,
      body: body.carqueryBody,
    });
    for (const model of cqData?.Models ?? []) {
      const item = cqModelToItem(model);
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
      if (items.length >= limit) break;
    }
  }

  if (items.length > 0) return items;

  for (const makeName of POPULAR_MAKE_NAMES.slice(0, 6)) {
    if (items.length >= limit) break;
    const makes = await searchCarMakes(makeName, 1);
    const make = makes[0];
    if (!make) continue;
    const models = await nhtsaFetch<NhtsaModel>(
      `/GetModelsForMakeId/${make.Make_ID}?format=json`,
    );
    for (const model of models.slice(0, 12)) {
      const id = modelItemId(model.Make_ID, model.Model_ID);
      if (seen.has(id)) continue;
      seen.add(id);
      items.push(nhtsaModelToItem(model));
      if (items.length >= limit) break;
    }
  }

  return items.slice(0, limit);
}

export async function getTrendingCars(limit = 18): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  const seen = new Set<string>();

  for (const makeName of POPULAR_MAKE_NAMES) {
    if (items.length >= limit) break;
    const makes = await searchCarMakes(makeName, 1);
    const make = makes[0];
    if (!make) continue;
    try {
      const models = await nhtsaFetch<NhtsaModel>(
        `/GetModelsForMakeId/${make.Make_ID}?format=json`,
      );
      const flagship = models.find((m) =>
        /m3|911|civic|corvette|model s|mustang|golf|a4|camry|wrangler|defender|challenger/i.test(
          m.Model_Name,
        ),
      );
      const pick = flagship ?? models[Math.floor(models.length / 3)] ?? models[0];
      if (!pick) continue;
      const id = modelItemId(pick.Make_ID, pick.Model_ID);
      if (seen.has(id)) continue;
      seen.add(id);
      items.push(nhtsaModelToItem(pick));
    } catch {
      // skip
    }
  }

  return items.slice(0, limit);
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const carQueryContentSource: ContentSource = {
  source: "carquery",

  async searchItems(query, { limit = 20 } = {}) {
    return searchCarModels(query, limit);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "model") return this.searchItems(query, { limit });
    if (kind === "make" || kind === "brand") {
      const makes = await searchCarMakes(query, limit);
      return makes.map((m) => ({
        id: String(m.Make_ID),
        title: m.Make_Name,
        subtitle: "Marque",
        source: "carquery",
        metadata: { itemKind: "make", makeId: m.Make_ID },
      }));
    }
    if (kind === "body") {
      const q = normalizeQuery(query);
      return BODY_TYPES.filter(
        (b) => !q || b.title.toLowerCase().includes(q) || b.id.includes(q),
      )
        .slice(0, limit)
        .map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: "Carrosserie",
          source: "carquery",
          metadata: { itemKind: "body", carqueryBody: b.carqueryBody },
        }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const q = normalizeQuery(query);
    return BODY_TYPES.filter(
      (b) => !q || b.title.toLowerCase().includes(q) || b.id.includes(q),
    )
      .slice(0, limit)
      .map(bodyToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const makes = await searchCarMakes(query, limit);
    return makes.map(nhtsaMakeToEntity);
  },

  async getCollectionItems(collectionId) {
    return getModelsForBody(collectionId, 50);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    return getModelsForMake(entityId, limit);
  },

  async getEntityById(entityId) {
    const make = await getMakeById(entityId);
    return make ? nhtsaMakeToEntity(make) : null;
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    void entityId;
    return BODY_TYPES.slice(0, limit).map(bodyToCollection);
  },
};

export { parseModelItemId };
