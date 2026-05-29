import { getTrendingPowerCharacters } from "@klash/content-adapter";

export type HomeCharacterCover = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export async function getTopCharacters(limit = 18): Promise<HomeCharacterCover[]> {
  try {
    const items = await getTrendingPowerCharacters(limit);
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl ?? null,
    }));
  } catch (err) {
    console.error("[top-characters]", err);
    return [];
  }
}
