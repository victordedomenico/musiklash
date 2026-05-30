import type { GameMode } from "./types";

/** Serializable per-vertical metadata safe to load from next.config (no ContentSource). */
export type VerticalManifest = {
  slug: string;
  /** Display name used in page titles and UI, e.g. "MusiKlash". */
  name: string;
  /** Singular noun for a content item, e.g. "morceau" or "entrée". */
  itemNoun: string;
  /** Plural noun for content items, e.g. "morceaux" or "entrées". */
  itemsNoun: string;
  /**
   * Override noun used specifically in blindtest cards (clips/excerpts).
   * Defaults to itemNoun/itemsNoun when omitted.
   */
  blindtestItemNoun?: string;
  blindtestItemsNoun?: string;
  /**
   * Label for the "title" guess field in the blindtest game.
   * e.g. "Titre du morceau" (music) or "Opening / ending" (anime).
   */
  blindtestTitleLabel?: string;
  /**
   * Label for the "artist" guess field in the blindtest game.
   * e.g. "Artiste" (music) or "Titre d'animé" (anime).
   */
  blindtestArtistLabel?: string;
  /**
   * Lucide icon name used in blindtest/bracket cards.
   * "music" for music verticals, "headphones" for theme/anime, "film" for movies, etc.
   */
  mediaIcon: "music" | "headphones" | "film" | "gamepad" | "star" | "dice" | "blocks";
  /**
   * Human-readable labels for SmashPass item types (e.g. { track: "Morceaux", album: "Albums" }).
   * Serialised as JSON in NEXT_PUBLIC_KLASH_SMASH_PASS_TYPES.
   */
  smashPassTypeLabels: Record<string, string>;
  /** Contact e-mail shown in the footer (e.g. "contact@musiklash.app"). */
  contactEmail: string;
  /** API credit displayed in the footer bottom bar. */
  apiCredit: { label: string; url: string };
  imageHosts: string[];
  gameModes: GameMode[];
};

export const VERTICAL_MANIFESTS: Record<string, VerticalManifest> = {
  musiklash: {
    slug: "musiklash",
    name: "MusiKlash",
    itemNoun: "morceau",
    itemsNoun: "morceaux",
    mediaIcon: "music",
    smashPassTypeLabels: { track: "Morceaux", album: "Albums", artist: "Artistes" },
    contactEmail: "contact@musiklash.app",
    apiCredit: { label: "Deezer API", url: "https://developers.deezer.com/api" },
    imageHosts: [
      "e-cdns-images.dzcdn.net",
      "cdns-images.dzcdn.net",
      "api.deezer.com",
    ],
    gameModes: [
      "bracket",
      "tierlist",
      "blindtest",
      "smash-pass",
      "stream-clash",
      "battle-feat",
    ],
  },
  animeklash: {
    slug: "animeklash",
    name: "AnimeKlash",
    itemNoun: "entrée",
    itemsNoun: "entrées",
    blindtestItemNoun: "extrait",
    blindtestItemsNoun: "extraits",
    mediaIcon: "headphones",
    blindtestTitleLabel: "Opening / ending",
    blindtestArtistLabel: "Titre d'animé",
    smashPassTypeLabels: {
      anime: "Titres d'animé",
      character: "Persos d'animé",
      arc: "Arcs d'animé",
      track: "Openings/Endings",
      album: "Titres d'animé",
      artist: "Persos d'animé",
    },
    contactEmail: "contact@animeklash.app",
    apiCredit: { label: "AniList API", url: "https://anilist.gitbook.io/anilist-apiv2-docs/" },
    imageHosts: ["s4.anilist.co", "media.kitsu.app", "v1.animethemes.moe", "cdn.myanimelist.net"],
    gameModes: [
      "bracket",
      "tierlist",
      "blindtest",
      "smash-pass",
      "stream-clash",
      "battle-feat",
    ],
  },
  demoklash: {
    slug: "demoklash",
    name: "DemoKlash",
    itemNoun: "item",
    itemsNoun: "items",
    mediaIcon: "star",
    smashPassTypeLabels: { item: "Éléments" },
    contactEmail: "contact@demoklash.app",
    apiCredit: { label: "API", url: "#" },
    imageHosts: ["s4.anilist.co", "e-cdns-images.dzcdn.net"],
    gameModes: ["bracket", "tierlist", "blindtest"],
  },
  rapklash: {
    slug: "rapklash",
    name: "RapKlash",
    itemNoun: "morceau",
    itemsNoun: "morceaux",
    mediaIcon: "music",
    smashPassTypeLabels: { track: "Morceaux", album: "Albums", artist: "Artistes" },
    contactEmail: "contact@rapklash.app",
    apiCredit: { label: "Deezer API", url: "https://developers.deezer.com/api" },
    imageHosts: [
      "e-cdns-images.dzcdn.net",
      "cdns-images.dzcdn.net",
      "api.deezer.com",
      "images.genius.com",
      "assets.genius.com",
    ],
    gameModes: [
      "bracket",
      "tierlist",
      "blindtest",
      "smash-pass",
      "stream-clash",
      "battle-feat",
    ],
  },
  movieklash: {
    slug: "movieklash",
    name: "MovieKlash",
    itemNoun: "film",
    itemsNoun: "films",
    mediaIcon: "film",
    smashPassTypeLabels: {
      movie: "Films",
      collection: "Sagas",
      person: "Artistes",
    },
    contactEmail: "contact@movieklash.app",
    apiCredit: {
      label: "TMDB API",
      url: "https://developer.themoviedb.org/docs/getting-started",
    },
    imageHosts: ["image.tmdb.org"],
    gameModes: ["bracket", "tierlist"],
  },
  seriesklash: {
    slug: "seriesklash",
    name: "SeriesKlash",
    itemNoun: "épisode",
    itemsNoun: "épisodes",
    mediaIcon: "film",
    smashPassTypeLabels: {
      show: "Séries",
      episode: "Épisodes",
      season: "Saisons",
    },
    contactEmail: "contact@seriesklash.app",
    apiCredit: {
      label: "TVMaze API",
      url: "https://www.tvmaze.com/api",
    },
    imageHosts: ["static.tvmaze.com", "image.tmdb.org"],
    gameModes: ["bracket", "tierlist"],
  },
  fashionklash: {
    slug: "fashionklash",
    name: "FashionKlash",
    itemNoun: "pièce",
    itemsNoun: "pièces",
    mediaIcon: "star",
    smashPassTypeLabels: {
      garment: "Vêtements",
      style: "Styles",
      brand: "Marques",
      creator: "Créateurs",
    },
    contactEmail: "contact@fashionklash.app",
    apiCredit: {
      label: "Livostyle Open Data (MIT)",
      url: "https://github.com/arturayupov/womens-fashion-catalog-open-data",
    },
    imageHosts: ["cdn.shopify.com", "raw.githubusercontent.com", "upload.wikimedia.org"],
    gameModes: ["bracket", "tierlist"],
  },
  bookklash: {
    slug: "bookklash",
    name: "BookKlash",
    itemNoun: "livre",
    itemsNoun: "livres",
    mediaIcon: "star",
    smashPassTypeLabels: {
      book: "Livres",
      genre: "Genres",
      author: "Auteurs",
    },
    contactEmail: "contact@bookklash.app",
    apiCredit: {
      label: "Open Library",
      url: "https://openlibrary.org/developers/api",
    },
    imageHosts: ["covers.openlibrary.org", "books.google.com"],
    gameModes: ["bracket", "tierlist"],
  },
  comicklash: {
    slug: "comicklash",
    name: "ComicKlash",
    itemNoun: "numéro",
    itemsNoun: "numéros",
    mediaIcon: "star",
    smashPassTypeLabels: {
      issue: "Numéros",
      volume: "Séries",
      character: "Personnages",
    },
    contactEmail: "contact@comicklash.app",
    apiCredit: {
      label: "Comic Vine API",
      url: "https://comicvine.gamespot.com/api/",
    },
    imageHosts: ["comicvine.gamespot.com", "gamespot.com"],
    gameModes: ["bracket", "tierlist"],
  },
  mangaklash: {
    slug: "mangaklash",
    name: "MangaKlash",
    itemNoun: "chapitre",
    itemsNoun: "chapitres",
    mediaIcon: "star",
    smashPassTypeLabels: {
      manga: "Mangas",
      chapter: "Chapitres",
      author: "Auteurs",
      collection: "Séries",
    },
    contactEmail: "contact@mangaklash.app",
    apiCredit: {
      label: "MangaDex API",
      url: "https://api.mangadex.org/docs/",
    },
    imageHosts: ["uploads.mangadex.org"],
    gameModes: ["bracket", "tierlist"],
  },
  gameklash: {
    slug: "gameklash",
    name: "GameKlash",
    itemNoun: "jeu",
    itemsNoun: "jeux",
    mediaIcon: "gamepad",
    smashPassTypeLabels: {
      game: "Jeux",
      series: "Franchises",
      developer: "Studios",
      genre: "Genres",
    },
    contactEmail: "contact@gameklash.app",
    apiCredit: {
      label: "RAWG API",
      url: "https://rawg.io/apidocs",
    },
    imageHosts: ["media.rawg.io"],
    gameModes: ["bracket", "tierlist"],
  },
  boardklash: {
    slug: "boardklash",
    name: "BoardKlash",
    itemNoun: "jeu",
    itemsNoun: "jeux",
    mediaIcon: "dice",
    smashPassTypeLabels: {
      boardgame: "Jeux de société",
      category: "Catégories",
      mechanic: "Mécaniques",
    },
    contactEmail: "contact@boardklash.app",
    apiCredit: {
      label: "BoardGameGeek XML API",
      url: "https://boardgamegeek.com/wiki/page/BGG_XML_API2",
    },
    imageHosts: ["cf.geekdo-images.com", "boardgamegeek.com"],
    gameModes: ["bracket", "tierlist"],
  },
  retroklash: {
    slug: "retroklash",
    name: "RetroKlash",
    itemNoun: "jeu",
    itemsNoun: "jeux",
    mediaIcon: "gamepad",
    smashPassTypeLabels: {
      game: "Jeux rétro",
      platform: "Consoles",
      era: "Ères",
    },
    contactEmail: "contact@retroklash.app",
    apiCredit: {
      label: "RAWG API · Internet Archive",
      url: "https://rawg.io/apidocs",
    },
    imageHosts: ["media.rawg.io", "archive.org"],
    gameModes: ["bracket", "tierlist"],
  },
  indieklash: {
    slug: "indieklash",
    name: "IndieKlash",
    itemNoun: "jeu",
    itemsNoun: "jeux",
    mediaIcon: "gamepad",
    smashPassTypeLabels: {
      game: "Jeux indés",
      tag: "Tags",
      jam: "Game jams",
      developer: "Studios",
    },
    contactEmail: "contact@indieklash.app",
    apiCredit: {
      label: "RAWG API",
      url: "https://rawg.io/apidocs",
    },
    imageHosts: ["media.rawg.io"],
    gameModes: ["bracket", "tierlist"],
  },
  esportklash: {
    slug: "esportklash",
    name: "EsportKlash",
    itemNoun: "match",
    itemsNoun: "matchs",
    mediaIcon: "gamepad",
    smashPassTypeLabels: {
      match: "Matchs",
      team: "Équipes",
      player: "Joueurs",
      tournament: "Tournois",
    },
    contactEmail: "contact@esportklash.app",
    apiCredit: {
      label: "PandaScore API",
      url: "https://developers.pandascore.co/",
    },
    imageHosts: ["cdn.pandascore.co", "cdn-api.pandascore.co"],
    gameModes: ["bracket", "tierlist"],
  },
  footklash: {
    slug: "footklash",
    name: "FootKlash",
    itemNoun: "match",
    itemsNoun: "matchs",
    mediaIcon: "star",
    smashPassTypeLabels: {
      match: "Matchs",
      club: "Clubs",
      player: "Joueurs",
      league: "Ligues",
    },
    contactEmail: "contact@footklash.app",
    apiCredit: {
      label: "TheSportsDB",
      url: "https://www.thesportsdb.com/api.php",
    },
    imageHosts: ["www.thesportsdb.com", "r2.thesportsdb.com"],
    gameModes: ["bracket", "tierlist"],
  },
  cardklash: {
    slug: "cardklash",
    name: "CardKlash",
    itemNoun: "carte",
    itemsNoun: "cartes",
    mediaIcon: "star",
    smashPassTypeLabels: {
      card: "Cartes",
      set: "Sets",
      deck: "Decks",
    },
    contactEmail: "contact@cardklash.app",
    apiCredit: {
      label: "Scryfall API",
      url: "https://scryfall.com/docs/api",
    },
    imageHosts: ["cards.scryfall.io", "c1.scryfall.io", "c2.scryfall.io", "svgs.scryfall.io", "images.pokemontcg.io", "images.ygoprodeck.com"],
    gameModes: ["bracket", "tierlist"],
  },
  pokeklash: {
    slug: "pokeklash",
    name: "PokeKlash",
    itemNoun: "Pokémon",
    itemsNoun: "Pokémon",
    mediaIcon: "star",
    smashPassTypeLabels: {
      pokemon: "Pokémon",
      generation: "Générations",
      type: "Types",
      evolution: "Évolutions",
    },
    contactEmail: "contact@pokeklash.app",
    apiCredit: {
      label: "PokéAPI",
      url: "https://pokeapi.co/docs/v2",
    },
    imageHosts: ["raw.githubusercontent.com"],
    gameModes: ["bracket", "tierlist"],
  },
  legoklash: {
    slug: "legoklash",
    name: "LegoKlash",
    itemNoun: "set",
    itemsNoun: "sets",
    mediaIcon: "blocks",
    smashPassTypeLabels: {
      set: "Sets",
      minifig: "Minifigs",
      licence: "Licences",
    },
    contactEmail: "contact@legoklash.app",
    apiCredit: {
      label: "Rebrickable API",
      url: "https://rebrickable.com/api/v3/docs/",
    },
    imageHosts: ["cdn.rebrickable.com", "rebrickable.com"],
    gameModes: ["bracket", "tierlist"],
  },
  drinkklash: {
    slug: "drinkklash",
    name: "DrinkKlash",
    itemNoun: "boisson",
    itemsNoun: "boissons",
    mediaIcon: "star",
    smashPassTypeLabels: {
      cocktail: "Cocktails",
      category: "Catégories",
      ingredient: "Ingrédients",
    },
    contactEmail: "contact@drinkklash.app",
    apiCredit: {
      label: "TheCocktailDB API",
      url: "https://www.thecocktaildb.com/api.php",
    },
    imageHosts: ["www.thecocktaildb.com", "thecocktaildb.com", "images.openfoodfacts.org", "static.openfoodfacts.org"],
    gameModes: ["bracket", "tierlist"],
  },
  foodklash: {
    slug: "foodklash",
    name: "FoodKlash",
    itemNoun: "plat",
    itemsNoun: "plats",
    mediaIcon: "star",
    smashPassTypeLabels: {
      meal: "Plats",
      category: "Catégories",
      cuisine: "Cuisines",
    },
    contactEmail: "contact@foodklash.app",
    apiCredit: {
      label: "TheMealDB API",
      url: "https://www.themealdb.com/api.php",
    },
    imageHosts: ["www.themealdb.com", "images.openfoodfacts.org", "static.openfoodfacts.org", "logo.clearbit.com"],
    gameModes: ["bracket", "tierlist"],
  },
  sneakerklash: {
    slug: "sneakerklash",
    name: "SneakerKlash",
    itemNoun: "colorway",
    itemsNoun: "colorways",
    mediaIcon: "star",
    smashPassTypeLabels: {
      colorway: "Colorways",
      drop: "Drops",
      model: "Modèles",
    },
    contactEmail: "contact@sneakerklash.app",
    apiCredit: {
      label: "The Sneaker Database",
      url: "https://thesneakerdatabase.com/",
    },
    imageHosts: [
      "images.thesneakerdatabase.com",
      "image.goat.com",
      "cdn.shopify.com",
      "images.stockx.com",
      "stockx-assets.imgix.net",
      "logo.clearbit.com",
    ],
    gameModes: ["bracket", "tierlist"],
  },
  petklash: {
    slug: "petklash",
    name: "PetKlash",
    itemNoun: "race",
    itemsNoun: "races",
    mediaIcon: "star",
    smashPassTypeLabels: {
      breed: "Races",
      species: "Espèces",
      behavior: "Comportements",
    },
    contactEmail: "contact@petklash.app",
    apiCredit: {
      label: "Dog CEO API & TheCatAPI",
      url: "https://dog.ceo/dog-api/documentation/",
    },
    imageHosts: ["images.dog.ceo", "cdn2.thecatapi.com", "upload.wikimedia.org"],
    gameModes: ["bracket", "tierlist"],
  },
  fitnessklash: {
    slug: "fitnessklash",
    name: "FitnessKlash",
    itemNoun: "exercice",
    itemsNoun: "exercices",
    mediaIcon: "star",
    smashPassTypeLabels: {
      exercise: "Exercices",
      muscle: "Muscles",
      program: "Programmes",
    },
    contactEmail: "contact@fitnessklash.app",
    apiCredit: {
      label: "Wger API",
      url: "https://wger.de/en/software/api",
    },
    imageHosts: ["wger.de"],
    gameModes: ["bracket", "tierlist"],
  },
  sportklash: {
    slug: "sportklash",
    name: "SportKlash",
    itemNoun: "match",
    itemsNoun: "matchs",
    mediaIcon: "star",
    smashPassTypeLabels: {
      match: "Matchs",
      team: "Équipes",
      player: "Joueurs",
      league: "Ligues",
      sport: "Sports",
    },
    contactEmail: "contact@sportklash.app",
    apiCredit: {
      label: "TheSportsDB API",
      url: "https://www.thesportsdb.com/free_sports_api",
    },
    imageHosts: ["r2.thesportsdb.com", "www.thesportsdb.com"],
    gameModes: ["bracket", "tierlist"],
  },
  basketklash: {
    slug: "basketklash",
    name: "BasketKlash",
    itemNoun: "match",
    itemsNoun: "matchs",
    mediaIcon: "star",
    smashPassTypeLabels: {
      match: "Matchs",
      team: "Équipes",
      player: "Joueurs",
      season: "Saisons",
    },
    contactEmail: "contact@basketklash.app",
    apiCredit: {
      label: "BallDontLie NBA API",
      url: "https://docs.balldontlie.io/",
    },
    imageHosts: ["cdn.nba.com", "upload.wikimedia.org"],
    gameModes: ["bracket", "tierlist"],
  },
  fightklash: {
    slug: "fightklash",
    name: "FightKlash",
    itemNoun: "combat",
    itemsNoun: "combats",
    mediaIcon: "star",
    smashPassTypeLabels: {
      fight: "Combats",
      fighter: "Fighters",
      style: "Styles",
      org: "Organisations",
    },
    contactEmail: "contact@fightklash.app",
    apiCredit: {
      label: "API-Sports MMA",
      url: "https://api-sports.io/documentation/mma/v1",
    },
    imageHosts: [
      "media.api-sports.io",
      "media-1.api-sports.io",
      "media-2.api-sports.io",
      "upload.wikimedia.org",
    ],
    gameModes: ["bracket", "tierlist"],
  },
  tennisklash: {
    slug: "tennisklash",
    name: "TennisKlash",
    itemNoun: "match",
    itemsNoun: "matchs",
    mediaIcon: "star",
    smashPassTypeLabels: {
      match: "Matchs",
      player: "Joueurs",
      tournament: "Tournois",
      surface: "Surfaces",
    },
    contactEmail: "contact@tennisklash.app",
    apiCredit: {
      label: "TheSportsDB API",
      url: "https://www.thesportsdb.com/free_sports_api",
    },
    imageHosts: ["r2.thesportsdb.com", "www.thesportsdb.com"],
    gameModes: ["bracket", "tierlist"],
  },
  travelklash: {
    slug: "travelklash",
    name: "TravelKlash",
    itemNoun: "lieu",
    itemsNoun: "lieux",
    mediaIcon: "star",
    smashPassTypeLabels: {
      country: "Pays",
      region: "Régions",
      city: "Villes",
    },
    contactEmail: "contact@travelklash.app",
    apiCredit: {
      label: "RestCountries API",
      url: "https://restcountries.com",
    },
    imageHosts: ["flagcdn.com", "restcountries.com", "upload.wikimedia.org"],
    gameModes: ["bracket", "tierlist"],
  },
  characterklash: {
    slug: "characterklash",
    name: "CharacterKlash",
    itemNoun: "personnage",
    itemsNoun: "personnages",
    mediaIcon: "star",
    smashPassTypeLabels: {
      character: "Anime (AniList)",
      anime_character: "Anime (AniList)",
      person: "Cinéma (TMDB)",
      film_person: "Cinéma (TMDB)",
    },
    contactEmail: "contact@characterklash.app",
    apiCredit: {
      label: "AniList & TMDB",
      url: "https://anilist.co",
    },
    imageHosts: ["s4.anilist.co", "image.tmdb.org", "cdn.jsdelivr.net", "raw.githubusercontent.com", "static.tvmaze.com"],
    gameModes: ["bracket", "tierlist"],
  },
  powerklash: {
    slug: "powerklash",
    name: "PowerKlash",
    itemNoun: "personnage",
    itemsNoun: "personnages",
    mediaIcon: "star",
    smashPassTypeLabels: {
      character: "Personnages",
      anime: "Séries anime",
    },
    contactEmail: "contact@powerklash.app",
    apiCredit: {
      label: "AniList API",
      url: "https://anilist.gitbook.io/anilist-apiv2-docs/",
    },
    imageHosts: ["s4.anilist.co", "media.kitsu.app", "cdn.myanimelist.net", "cdn.jsdelivr.net"],
    gameModes: ["tierlist", "bracket"],
  },
  countryklash: {
    slug: "countryklash",
    name: "CountryKlash",
    itemNoun: "entrée",
    itemsNoun: "entrées",
    mediaIcon: "star",
    smashPassTypeLabels: {
      country: "Pays",
      capital: "Capitales",
      flag: "Drapeaux",
      culture: "Cultures",
      region: "Régions",
      place: "Lieux",
    },
    contactEmail: "contact@countryklash.app",
    apiCredit: {
      label: "RestCountries & Wikidata",
      url: "https://restcountries.com",
    },
    imageHosts: [
      "flagcdn.com",
      "restcountries.com",
      "upload.wikimedia.org",
      "commons.wikimedia.org",
    ],
    gameModes: ["bracket", "tierlist"],
  },
  f1klash: {
    slug: "f1klash",
    name: "F1Klash",
    itemNoun: "course",
    itemsNoun: "courses",
    mediaIcon: "star",
    smashPassTypeLabels: {
      race: "Courses",
      driver: "Pilotes",
      constructor: "Écuries",
      circuit: "Circuits",
      season: "Saisons",
    },
    contactEmail: "contact@f1klash.app",
    apiCredit: {
      label: "Ergast F1 API (Jolpica)",
      url: "https://api.jolpi.ca/ergast/f1/",
    },
    imageHosts: ["flagcdn.com", "api.jolpi.ca"],
    gameModes: ["bracket", "tierlist"],
  },
  carklash: {
    slug: "carklash",
    name: "CarKlash",
    itemNoun: "modèle",
    itemsNoun: "modèles",
    mediaIcon: "star",
    smashPassTypeLabels: {
      model: "Modèles",
      make: "Marques",
      body: "Carrosseries",
    },
    contactEmail: "contact@carklash.app",
    apiCredit: {
      label: "CarQuery & NHTSA vPIC",
      url: "https://www.carqueryapi.com/documentation/",
    },
    imageHosts: ["www.carqueryapi.com"],
    gameModes: ["bracket", "tierlist"],
  },
};

export function getVerticalManifest(slug: string): VerticalManifest {
  const manifest = VERTICAL_MANIFESTS[slug];
  if (!manifest) {
    throw new Error(
      `Unknown vertical "${slug}". Known: ${Object.keys(VERTICAL_MANIFESTS).join(", ")}.`,
    );
  }
  return manifest;
}
