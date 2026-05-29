# Klash Monorepo

Monorepo de la famille Klash : plateformes de jeux interactifs construites sur Next.js, Supabase, Prisma et des APIs de contenu tierces.

## Verticals

| App | Port | Contenu |
|-----|------|---------|
| `musiklash` | 3000 | Musique (API Deezer) |
| `animeklash` | 3001 | Anime |
| `demoklash` | 3002 | Demo / sandbox |
| `movieklash` | 3003 | Films (API TMDB) |

Chaque vertical est un projet Next.js indépendant dans `apps/`. La logique métier et les composants sont partagés via des packages internes dans `packages/`.

## Fonctionnalités principales

- Brackets (tournois à élimination directe)
- Tierlists personnalisables
- Blindtests solo et multijoueur
- BattleFeat (solo et rooms)
- Bibliothèque personnelle et exploration de contenus publics
- Authentification Supabase (email/mot de passe et flux invité)
- Interface FR/EN + gestion des préférences utilisateur

## Stack technique

- **Next.js 16** (App Router) + **React 19** + React Compiler
- **TypeScript** + **Tailwind CSS 4**
- **Prisma 7** + PostgreSQL
- **Supabase** (Auth + DB locale via CLI)
- **Turborepo** pour l'orchestration du monorepo
- **Vitest** pour les tests unitaires

## Démarrage local

### Prérequis

- Node.js 20+
- pnpm 10+
- Docker Desktop (pour Supabase local)

### 1) Installer les dépendances

```bash
pnpm install
```

### 2) Démarrer Supabase en local

```bash
npm run db:start
```

La commande affiche les URL locales (API, DB, Studio) ainsi que les clés nécessaires.

### 3) Configurer les variables d'environnement

Créer un fichier `.env.local` dans le dossier de l'app voulue (ex: `apps/musiklash/.env.local`) :

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Optionnel :

```env
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### 4) Lancer un vertical

**Utiliser le sélecteur interactif** (recommandé) :

```bash
npm run dev
```

Un menu s'affiche pour choisir le vertical à lancer. Le script tue automatiquement tout serveur déjà actif avant d'en démarrer un nouveau — **ne jamais faire tourner deux verticals simultanément** (chaque instance réserve 6 Go de heap + workers turbopack, ce qui sature la RAM).

On peut aussi lancer un vertical directement par nom :

```bash
npm run dev animeklash
```

Studio Supabase local : [http://127.0.0.1:54323](http://127.0.0.1:54323)

## Scripts utiles

Depuis la racine du monorepo :

```bash
npm run dev                  # sélecteur interactif de vertical
npm run dev <nom>            # lancer un vertical directement
npm run build                # build de production (tous les verticals)
npm run build:musiklash      # build d'un seul vertical
npm run lint                 # ESLint (tous les packages)
npm run test                 # tests Vitest
npm run scaffold:vertical    # scaffolde un nouveau vertical
```

### Base de données

Chaque vertical a sa propre instance Supabase locale. Les commandes DB se lancent depuis le dossier de l'app concernée :

```bash
cd apps/musiklash   # ou animeklash, movieklash…

npm run db:start    # démarre la stack Supabase locale (Docker)
npm run db:stop     # arrête la stack Supabase locale
npm run db:status   # affiche les URLs et clés locales
npm run db:reset    # reset + ré-applique toutes les migrations + seed
npm run db:up       # applique les migrations en attente
npm run db:migrate  # crée un nouveau fichier de migration
npm run seed        # exécute le seed Prisma
```

Ports locaux par défaut (musiklash / bracketfight) :
- API Supabase : http://127.0.0.1:54321
- DB PostgreSQL : postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Studio : http://127.0.0.1:54323

## Structure du projet

```txt
apps/
  musiklash/       Next.js app — musique
  animeklash/      Next.js app — anime
  demoklash/       Next.js app — demo
  movieklash/      Next.js app — films
packages/
  klash-app/       Composants UI et logique partagés
  klash-config/    Config, manifests, Klash Engine catalog
  content-adapter/ Adaptateurs de contenu (Deezer, TMDB…)
scripts/
  dev.ts           Sélecteur interactif de vertical
  scaffold-klash-vertical.ts
prisma/            Schéma Prisma, migrations, seed
supabase/          Config Supabase CLI et migrations locales
```

## Données et legal

- Les extraits musicaux sont servis via l'API Deezer.
- Les données films via l'API TMDB.
- Pages légales disponibles dans chaque app (`/privacy`, `/cookies`, `/legal`, `/terms`).

## Licence

Ce projet est distribué sous licence MIT. Voir le fichier `LICENSE`.
