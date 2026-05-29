import type { ContentItem } from "./types";

const YGO_BASE = "https://db.ygoprodeck.com/api/v7";

// ─── Raw types ────────────────────────────────────────────────────────────────

export type YgoCard = {
  id: number;
  name: string;
  type: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race?: string;
  attribute?: string;
  card_sets?: { set_name: string; set_code: string; set_rarity: string }[];
  card_images: { id: number; image_url: string; image_url_small: string }[];
};

export type YgoCardSet = {
  set_name: string;
  set_code: string;
  num_of_cards: number;
  tcg_date?: string;
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function ygoGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${YGO_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 } as any,
  });
  if (!res.ok) throw new Error(`YGOPRODeck ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchYgoCards(query: string, limit = 20): Promise<YgoCard[]> {
  if (!query.trim()) return [];
  try {
    const json = await ygoGet<{ data?: YgoCard[] }>("/cardinfo.php", {
      fname: query.trim(),
      num: String(Math.min(limit, 40)),
      offset: "0",
    });
    return (json.data ?? []).slice(0, limit);
  } catch {
    return [];
  }
}

export async function searchYgoSets(query?: string, limit = 30): Promise<YgoCardSet[]> {
  try {
    const sets = await ygoGet<YgoCardSet[]>("/cardsets.php");
    if (!query?.trim()) {
      return sets
        .filter((s) => s.tcg_date)
        .sort((a, b) => (b.tcg_date ?? "").localeCompare(a.tcg_date ?? ""))
        .slice(0, limit);
    }
    const q = query.toLowerCase();
    return sets
      .filter((s) => s.set_name.toLowerCase().includes(q))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getYgoSetCards(setName: string, limit = 50): Promise<YgoCard[]> {
  try {
    const json = await ygoGet<{ data?: YgoCard[] }>("/cardinfo.php", {
      cardset: setName,
      num: String(Math.min(limit, 50)),
      offset: "0",
    });
    return (json.data ?? []).slice(0, limit);
  } catch {
    return [];
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function ygoCardToItem(card: YgoCard): ContentItem {
  const subtitle = [
    card.type,
    card.race,
    card.atk !== undefined ? `ATK ${card.atk}` : undefined,
  ].filter(Boolean).join(" · ");

  return {
    id: `ygo-${card.id}`,
    title: card.name,
    subtitle: subtitle || undefined,
    coverUrl: card.card_images[0]?.image_url_small,
    source: "ygoprodeck",
    metadata: {
      itemKind: "card",
      tcg: "yugioh",
      cardId: card.id,
      type: card.type,
      race: card.race,
      attribute: card.attribute,
      atk: card.atk,
      def: card.def,
      level: card.level,
      largeImage: card.card_images[0]?.image_url,
    },
  };
}

export function ygoSetToItem(set: YgoCardSet): ContentItem {
  return {
    id: `ygoset-${set.set_code}`,
    title: set.set_name,
    subtitle: `${set.num_of_cards} cartes${set.tcg_date ? ` · ${set.tcg_date.slice(0, 4)}` : ""}`,
    source: "ygoprodeck",
    metadata: {
      itemKind: "set",
      tcg: "yugioh",
      setCode: set.set_code,
      setName: set.set_name,
      numOfCards: set.num_of_cards,
    },
  };
}
