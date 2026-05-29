# Klash Engine — Registre des verticaux

Le monorepo partage une seule codebase jeu (`@klash/klash-app`) et des apps Next.js fines par verticale. **Klash Engine** est le registre produit/API de toutes les verticaux prévus ou actifs.

## Source de vérité (code)

- Catalogue TypeScript : `packages/klash-config/src/klash-engine/catalog.ts`
- Helpers : `packages/klash-config/src/klash-engine/index.ts`
- Import : `import { KLASH_ENGINE_CATALOG, listEngineVerticals } from "@klash/klash-config"`

## État actuel

| Statut | Signification | Exemples |
|--------|---------------|----------|
| `active` | App + `VerticalConfig` + adaptateur contenu | `musiklash`, `animeklash`, `demoklash`, `movieklash` |
| `stub` | Entrée catalogue + config partielle | — |
| `planned` | Roadmap — pas encore d'app | `gameklash`, `bookklash`, … |

**4 actifs** (`musiklash`, `animeklash`, `demoklash`, `movieklash`) · **29 planifiés**.

## Légende API

| Icône | `ApiAccess` | Description |
|-------|-------------|-------------|
| ✅ | `open` | Sans clé |
| ⚠️ | `free-key` | Clé gratuite (email) |
| 🔧 | `scraping` | Non officiel / scraping |
| 💰 | `paid` | Payant — éviter |

## Activer un nouveau vertical

Ordre recommandé (du plus léger au plus lourd) :

1. **Entrée catalogue** — déjà faite pour la roadmap ; ajuster `catalog.ts` si besoin.
2. **ContentSource** — `packages/content-adapter/src/<provider>.ts` implémentant `ContentSource`.
3. **Config** — `packages/klash-config/src/configs/<slug>.ts` avec `defineVertical()`.
4. **Manifest** — entrée dans `packages/klash-config/src/manifests.ts` (métadonnées Next.js).
5. **Registry** — exporter dans `packages/klash-config/src/index.ts` (`REGISTRY`).
6. **App fine** — `apps/<slug>/` (copier `apps/demoklash` comme modèle).
7. **Scripts racine** — `dev:<slug>` / `build:<slug>` dans `package.json`.

Scaffolding rapide :

```bash
pnpm scaffold:vertical <slug>
# ex. pnpm scaffold:vertical gameklash --port 3004
```

Le script crée `apps/<slug>/` et un fichier config stub ; il ne enregistre pas encore le vertical dans `REGISTRY` (à faire après l'adaptateur API).

## Verticaux par pilier

Les listes détaillées (entités, APIs, clés) sont dans `catalog.ts`. Résumé :

### Divertissement & Pop-Culture

MovieKlash, AnimeKlash ✅, SeriesKlash, BookKlash, MangaKlash, ComicKlash

### Gaming & Geek

GameKlash, RetroKlash, EsportKlash, BoardKlash, CardKlash, IndieKlash, LegoKlash

### Lifestyle

FoodKlash, DrinkKlash, TravelKlash, FashionKlash, SneakerKlash, PetKlash

### Sport

SportKlash, FootKlash, BasketKlash, TennisKlash, F1Klash, FightKlash, FitnessKlash

### Tech

CarKlash

### Art & Musique

MusiKlash ✅, RapKlash (spécialisation rap / Genius)

### Cross-universe

CountryKlash, CharacterKlash, PowerKlash

## Priorisation suggérée

1. **MovieKlash** — actif (`TMDB_API_KEY` requis). Lancer avec `pnpm dev:movieklash` (port 3003).
2. **SeriesKlash** — TVMaze ouvert + TMDB pour affiches.
3. **GameKlash** — RAWG couvre beaucoup de modes bracket/tierlist.
4. **MangaKlash** — réutilise patterns AniList/Jikan d'AnimeKlash.
5. **SportKlash / F1Klash** — APIs ouvertes, pas de blindtest audio requis au départ.

Les verticaux **CharacterKlash** et **PowerKlash** dépendent de plusieurs adaptateurs ; les traiter après 3–4 verticaux mono-API stables.

## Variables d'environnement (clés gratuites)

Voir `envKey` sur chaque `ContentApiRef` dans le catalogue. Exemples :

- `TMDB_API_KEY` — MovieKlash, SeriesKlash, CharacterKlash
- `RAWG_API_KEY` — GameKlash, RetroKlash, IndieKlash
- `PANDASCORE_API_KEY` — EsportKlash
- `GENIUS_ACCESS_TOKEN` — RapKlash

Les apps fines ne doivent **jamais** exposer ces clés côté client : proxy via routes `app/api/content/*` comme pour Deezer/AniList.
