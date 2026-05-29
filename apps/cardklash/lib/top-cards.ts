import { getTrendingCards } from "@klash/content-adapter";

export type HomeCardCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopCards(limit = 18): Promise<HomeCardCover[]> {
  try {
    const cards = await getTrendingCards(limit);
    return cards.map((c) => ({
      id: c.id,
      title: c.name,
      coverUrl:
        c.image_uris?.normal ??
        c.image_uris?.small ??
        c.card_faces?.[0]?.image_uris?.normal ??
        null,
    }));
  } catch (err) {
    console.error("[top-cards]", err);
    return [];
  }
}
