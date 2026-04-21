# MusiKlash (BracketFight)

Plateforme de jeux musicaux construite avec Next.js, Supabase, Prisma et l'API Deezer.

## Fonctionnalités principales

- Brackets musicaux (tournois a elimination directe)
- Tierlists personnalisables
- Blindtests solo et multijoueur
- BattleFeat (solo et rooms)
- Bibliotheque personnelle et exploration de contenus publics
- Authentification Supabase (email/mot de passe et flux invite)
- Interface FR/EN + gestion des preferences utilisateur

## Stack technique

- Next.js 16 (App Router) + React 19
- TypeScript + Tailwind CSS 4
- Prisma 7 + PostgreSQL
- Supabase (Auth + DB locale via CLI)
- Vitest pour les tests unitaires

## Demarrage local

### Prerequis

- Node.js 20+
- npm
- Docker Desktop (ou alternative compatible)
- Supabase CLI

### 1) Installer les dependances

```bash
npm install
```

### 2) Demarrer Supabase en local

```bash
npm run db:start
```

La commande affiche notamment les URL locales (API, DB, Studio) ainsi que les cles necessaires.

### 3) Configurer les variables d'environnement

Creer un fichier `.env.local` a la racine avec au minimum:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Optionnel (seed/admin):

```env
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Optionnel (top albums de la home):

```env
HOME_TOP_ALBUMS_COUNTRY=FR
```

### 4) Lancer l'application

```bash
npm run dev
```

Application: [http://localhost:3000](http://localhost:3000)  
Studio Supabase local: [http://127.0.0.1:54323](http://127.0.0.1:54323)

## Scripts utiles

- `npm run dev` - lance le serveur de developpement
- `npm run build` - build de production
- `npm run start` - demarre l'app en mode production
- `npm run lint` - lance ESLint
- `npm run test` - lance les tests Vitest
- `npm run test:watch` - tests en mode watch
- `npm run db:start` - demarre la stack Supabase locale
- `npm run db:stop` - arrete la stack Supabase locale
- `npm run db:status` - affiche l'etat de la stack locale
- `npm run db:reset` - reset complet de la base locale
- `npm run db:up` - applique les migrations locales
- `npm run db:migrate` - cree un nouveau fichier de migration

## Structure du projet (simplifiee)

```txt
app/                 Pages App Router + routes API
components/          Composants UI et metier
lib/                 Helpers (i18n, cookies, Supabase, Prisma, etc.)
prisma/              Schema Prisma, migrations, seed
```

## Donnees et legal

- Les extraits musicaux sont servis via l'API Deezer.
- Les pages legales sont disponibles dans l'application:
  - `/privacy`
  - `/cookies`
  - `/legal`
  - `/terms`
  - `/privacy-rights`

## Licence

Ce projet est distribue sous licence MIT. Voir le fichier `LICENSE`.
