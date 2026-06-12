// Canonical list of music genres used to tag and filter content
// (brackets, tierlists, blindtests, stream clashes, smash or pass).
// Values are stored as-is in the DB — never rename one without a migration.
export const MUSIC_GENRES = [
  { value: "rap", fr: "Rap / Hip-Hop", en: "Rap / Hip-Hop" },
  { value: "pop", fr: "Pop", en: "Pop" },
  { value: "rock", fr: "Rock", en: "Rock" },
  { value: "rnb", fr: "R&B / Soul", en: "R&B / Soul" },
  { value: "electro", fr: "Électro / Dance", en: "Electro / Dance" },
  { value: "jazz", fr: "Jazz", en: "Jazz" },
  { value: "classique", fr: "Classique", en: "Classical" },
  { value: "variete", fr: "Variété française", en: "French chanson" },
  { value: "metal", fr: "Métal", en: "Metal" },
  { value: "reggae", fr: "Reggae", en: "Reggae" },
  { value: "latino", fr: "Latino", en: "Latin" },
  { value: "kpop", fr: "K-Pop", en: "K-Pop" },
  { value: "afro", fr: "Afro", en: "Afro" },
  { value: "autre", fr: "Autre", en: "Other" },
] as const;

export type MusicGenre = (typeof MUSIC_GENRES)[number]["value"];

export function isMusicGenre(value: string): value is MusicGenre {
  return MUSIC_GENRES.some((g) => g.value === value);
}

export function genreLabel(value: string, locale: "fr" | "en" = "fr"): string {
  const genre = MUSIC_GENRES.find((g) => g.value === value);
  return genre ? genre[locale] : value;
}

/** Validates an optional genre coming from a form; returns null when absent or unknown. */
export function sanitizeGenre(value: string | null | undefined): MusicGenre | null {
  return value && isMusicGenre(value) ? value : null;
}

/** Deezer chart genre ids — cf. https://api.deezer.com/genre */
export const DEEZER_GENRE_ID: Partial<Record<MusicGenre, number>> = {
  rap: 116,
  pop: 132,
  rock: 152,
  rnb: 165,
  electro: 106,
  jazz: 129,
  classique: 98,
  variete: 52,
  metal: 464,
  reggae: 144,
  latino: 197,
  afro: 2,
};

/** Fallback browse query when Deezer has no chart id for a genre. */
export const GENRE_BROWSE_QUERY: Partial<Record<MusicGenre, string>> = {
  kpop: "k-pop",
};

export function getDeezerGenreId(genre: MusicGenre | null | undefined): number | null {
  if (!genre || genre === "autre") return null;
  return DEEZER_GENRE_ID[genre] ?? null;
}
