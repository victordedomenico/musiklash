/** How open a third-party API is for integration. */
export type ApiAccess = "open" | "free-key" | "scraping" | "paid";

export type KlashEngineCategory =
  | "entertainment"
  | "gaming"
  | "lifestyle"
  | "sport"
  | "tech"
  | "art-music"
  | "cross-universe";

export type VerticalLifecycleStatus =
  /** Deployed app with a registered `VerticalConfig` + ContentSource. */
  | "active"
  /** Config stub and/or partial adapter; not in `REGISTRY` yet. */
  | "stub"
  /** Catalogued roadmap entry — no app package yet. */
  | "planned";

export type ContentApiRef = {
  name: string;
  access: ApiAccess;
  /** Suggested env var when `access` is `free-key`. */
  envKey?: string;
};

/** Serializable roadmap entry for a Klash vertical (no ContentSource). */
export type KlashEngineVertical = {
  slug: string;
  name: string;
  emoji: string;
  category: KlashEngineCategory;
  status: VerticalLifecycleStatus;
  entities: string[];
  apis: ContentApiRef[];
  /** Provider tag for DB rows / adapters (when known). */
  source?: string;
  /** npm workspace package name, e.g. `musiklash` → `apps/musiklash`. */
  appPackage?: string;
  /** Default French nouns for scaffolding (`defineVertical`). */
  nouns?: {
    item: string;
    items: string;
    collection?: string;
    entity?: string;
  };
  notes?: string;
};

export const KLASH_ENGINE_CATEGORY_LABELS: Record<KlashEngineCategory, string> = {
  entertainment: "Divertissement & Pop-Culture",
  gaming: "Gaming & Communautés Geek",
  lifestyle: "Lifestyle, Société & Mode",
  sport: "Sport",
  tech: "Tech, Science & Dev",
  "art-music": "Art, Créativité & Musique",
  "cross-universe": "Histoire, Culture & Concepts Cross-Universe",
};

export const API_ACCESS_LEGEND: Record<
  ApiAccess,
  { icon: string; labelFr: string }
> = {
  open: { icon: "✅", labelFr: "Sans clé, 100 % libre" },
  "free-key": { icon: "⚠️", labelFr: "Clé gratuite (email / inscription)" },
  scraping: { icon: "🔧", labelFr: "Scraping / API non officielle" },
  paid: { icon: "💰", labelFr: "Payant — à éviter pour l'instant" },
};
