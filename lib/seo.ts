import type { Metadata } from "next";

export const SITE_NAME = "MusiKlash";
export const SITE_TAGLINE = "Fais s'affronter tes sons";
export const SITE_DESCRIPTION =
  "Crée des tournois musicaux, vote en écoutant chaque extrait et partage tes classements. Brackets, tierlists, blindtests, BattleFeat et Stream Clash — gratuit, sans pub.";
export const SITE_KEYWORDS = [
  "tournoi musical",
  "bracket musique",
  "tierlist musique",
  "blindtest musique",
  "quiz musical",
  "classement morceaux",
  "duel musical",
  "battle feat",
  "stream clash",
  "jeu musical en ligne",
  "MusiKlash",
  "music bracket",
  "music tournament",
];

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "https://musiklash.vercel.app";
}

/** URL canonique pour sitemap / robots — jamais l’URL de preview Vercel. */
export function getSitemapBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ??
    "https://musiklash.vercel.app"
  );
}

export function absoluteUrl(path = ""): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageMetaInput = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  image?: string | null;
};

export function buildPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  noIndex = false,
  image,
}: PageMetaInput): Metadata {
  const url = path ? absoluteUrl(path) : getSiteUrl();
  const ogImage = image ?? absoluteUrl("/opengraph-image");

  return {
    title,
    description,
    alternates: path ? { canonical: url } : undefined,
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url,
      siteName: SITE_NAME,
      title: `${title} — ${SITE_NAME}`,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: getSiteUrl() }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "music",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: getSiteUrl(),
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: getSiteUrl(),
  },
  verification: {
    google:
      process.env.GOOGLE_SITE_VERIFICATION ??
      "vcwmKj3fUxcWm0jVR6SS4nxqLYgO5kNVxOff8jw2HlI",
  },
};

/** Static marketing & feature pages included in the sitemap. */
export const STATIC_SITEMAP_ROUTES: Array<{
  path: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly";
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/explore", changeFrequency: "hourly", priority: 0.9 },
  { path: "/create", changeFrequency: "weekly", priority: 0.85 },
  { path: "/create-bracket", changeFrequency: "monthly", priority: 0.8 },
  { path: "/create-tierlist", changeFrequency: "monthly", priority: 0.8 },
  { path: "/create-blindtest", changeFrequency: "monthly", priority: 0.8 },
  { path: "/create-battlefeat", changeFrequency: "monthly", priority: 0.8 },
  { path: "/create-stream-clash", changeFrequency: "monthly", priority: 0.8 },
  { path: "/battle-feat", changeFrequency: "weekly", priority: 0.85 },
  { path: "/battle-feat/solo", changeFrequency: "weekly", priority: 0.75 },
  { path: "/battle-feat/free", changeFrequency: "weekly", priority: 0.75 },
  { path: "/battle-feat/leaderboard", changeFrequency: "daily", priority: 0.7 },
  { path: "/guide", changeFrequency: "monthly", priority: 0.75 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.65 },
  { path: "/resources", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
  { path: "/legal", changeFrequency: "monthly", priority: 0.3 },
  { path: "/copyright", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy-rights", changeFrequency: "monthly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "monthly", priority: 0.3 },
];
