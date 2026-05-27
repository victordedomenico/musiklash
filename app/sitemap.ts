import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { STATIC_SITEMAP_ROUTES, absoluteUrl } from "@/lib/seo";

const PUBLIC_CONTENT_LIMIT = 500;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_SITEMAP_ROUTES.map(
    ({ path, changeFrequency, priority }) => ({
      url: absoluteUrl(path === "/" ? "" : path),
      lastModified: new Date(),
      changeFrequency,
      priority,
    }),
  );

  try {
    const [brackets, tierlists, blindtests, battleFeatChallenges, streamClashes] =
      await Promise.all([
        prisma.bracket.findMany({
          where: { visibility: "public" },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: PUBLIC_CONTENT_LIMIT,
        }),
        prisma.tierlist.findMany({
          where: { visibility: "public" },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: PUBLIC_CONTENT_LIMIT,
        }),
        prisma.blindtest.findMany({
          where: { visibility: "public" },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: PUBLIC_CONTENT_LIMIT,
        }),
        prisma.battleFeatSoloChallenge.findMany({
          where: { visibility: "public" },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: PUBLIC_CONTENT_LIMIT,
        }),
        prisma.streamClash.findMany({
          where: { visibility: "public" },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: PUBLIC_CONTENT_LIMIT,
        }),
      ]);

    const dynamicEntries: MetadataRoute.Sitemap = [
      ...brackets.map((b) => ({
        url: absoluteUrl(`/bracket-game/${b.id}`),
        lastModified: b.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...tierlists.map((t) => ({
        url: absoluteUrl(`/tierlist/${t.id}`),
        lastModified: t.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...blindtests.map((b) => ({
        url: absoluteUrl(`/blindtest/${b.id}`),
        lastModified: b.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...battleFeatChallenges.map((c) => ({
        url: absoluteUrl(`/battle-feat/${c.id}`),
        lastModified: c.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.55,
      })),
      ...streamClashes.map((s) => ({
        url: absoluteUrl(`/stream-clash/${s.id}`),
        lastModified: s.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.55,
      })),
    ];

    return [...staticEntries, ...dynamicEntries];
  } catch {
    return staticEntries;
  }
}
