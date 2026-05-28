import type { NextConfig } from "next";
import { getVerticalManifest } from "./manifests";

const KLASH_TRANSPILE_PACKAGES = [
  "@klash/game-engine",
  "@klash/content-adapter",
  "@klash/auth",
  "@klash/i18n",
  "@klash/klash-config",
  "@klash/klash-app",
  "@klash/relation-graph",
] as const;

/**
 * Shared Next.js config for thin vertical apps.
 * Pass the vertical slug only — avoids loading ContentSource adapters at config compile time.
 */
export function createKlashNextConfig(slug: string): NextConfig {
  const {
    imageHosts, name, itemNoun, itemsNoun,
    blindtestItemNoun, blindtestItemsNoun,
    blindtestTitleLabel, blindtestArtistLabel,
    mediaIcon, smashPassTypeLabels,
    contactEmail, apiCredit,
  } = getVerticalManifest(slug);

  return {
    env: {
      NEXT_PUBLIC_KLASH_VERTICAL: slug,
      NEXT_PUBLIC_KLASH_NAME: name,
      NEXT_PUBLIC_KLASH_ITEM_NOUN: itemNoun,
      NEXT_PUBLIC_KLASH_ITEMS_NOUN: itemsNoun,
      NEXT_PUBLIC_KLASH_BLINDTEST_ITEM_NOUN: blindtestItemNoun ?? itemNoun,
      NEXT_PUBLIC_KLASH_BLINDTEST_ITEMS_NOUN: blindtestItemsNoun ?? itemsNoun,
      NEXT_PUBLIC_KLASH_BLINDTEST_TITLE_LABEL: blindtestTitleLabel ?? "Titre",
      NEXT_PUBLIC_KLASH_BLINDTEST_ARTIST_LABEL: blindtestArtistLabel ?? "Artiste",
      NEXT_PUBLIC_KLASH_MEDIA_ICON: mediaIcon,
      NEXT_PUBLIC_KLASH_SMASH_PASS_TYPES: JSON.stringify(smashPassTypeLabels),
      NEXT_PUBLIC_KLASH_CONTACT_EMAIL: contactEmail,
      NEXT_PUBLIC_KLASH_API_CREDIT_LABEL: apiCredit.label,
      NEXT_PUBLIC_KLASH_API_CREDIT_URL: apiCredit.url,
    },
    transpilePackages: [...KLASH_TRANSPILE_PACKAGES],
    reactCompiler: process.env.NODE_ENV === "production",
    images: {
      remotePatterns: imageHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
      })),
    },
  };
}
