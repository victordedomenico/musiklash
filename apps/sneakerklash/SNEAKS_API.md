# SneaksAPI — fragilité et exploitation

SneakerKlash s’appuie sur le package npm [`sneaks-api`](https://github.com/druv5319/Sneaks-API), qui **scrape** StockX, GOAT, Flight Club et Stadium Goods. Ce n’est **pas** une API officielle.

## Risques

- **Casse sans préavis** : changement de HTML, blocage IP, rate-limit côté revendeurs.
- **Pas de SLA** : latence variable, résultats incomplets ou vides.
- **Usage légal / ToS** : scraping soumis aux conditions des sites sources ; à valider avant production à grande échelle.
- **Kicks On Fire** : listé dans le catalogue Klash Engine mais **non branché** en MVP ; seul SneaksAPI est implémenté.

## Architecture Klash

- Tous les appels passent par le **serveur** (`@klash/content-adapter` → `sneaksContentSource`).
- Les routes Next réexportent `@klash/klash-app` : `/api/content/search`, `/api/content/collection/...`, etc.
- Le client ne contacte jamais StockX/GOAT directement.

## Variables d’environnement

Aucune clé API requise pour SneaksAPI en MVP.

Optionnel (futur) :

- `SNEAKS_REQUEST_TIMEOUT_MS` — non implémenté ; à ajouter si les timeouts deviennent un problème en prod.

## Pistes de durcissement

1. Cache serveur (ISR / `unstable_cache`) sur les recherches fréquentes.
2. File d’attente + retry avec backoff sur erreurs réseau.
3. Source de secours (ex. The Sneaker Database sur RapidAPI avec clé) si SneaksAPI tombe.
4. Liste statique de colorways « seed » pour la home quand le scraping échoue.
