import { deezerContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

/**
 * Demo vertical — reuses Deezer content to prove monorepo wiring without a dedicated DB.
 * No battle-feat (no relation graph). Deploy as config-only / shared dev DB optional.
 */
export const demoklash = defineVertical({
  slug: "demoklash",
  name: "DemoKlash",
  source: "deezer",
  contentSource: deezerContentSource,
  branding: {
    tagline: "Démo du monorepo Klash",
    description:
      "Vertical de démonstration : brackets, tierlists et blindtests Deezer pour valider le monorepo (@klash/klash-app, /api/content/*).",
    keywords: ["demo", "klash", "bracket", "tierlist"],
    category: "music",
    siteUrlFallback: "http://localhost:3002",
  },
  nouns: {
    item: "morceau",
    items: "morceaux",
    collection: "album",
    entity: "artiste",
  },
  imageHosts: [
    "e-cdns-images.dzcdn.net",
    "cdns-images.dzcdn.net",
    "api.deezer.com",
    "s4.anilist.co",
  ],
  gameModes: ["bracket", "tierlist", "blindtest"],
});
