import type { ContentEntity } from "@klash/content-adapter";
import {
  searchArtists,
  searchTracks,
  getArtistTopTracks,
} from "@klash/content-adapter";
import type { RelationGraph } from "@klash/klash-config";
import type { PrismaClient } from "@prisma/client";

// ─── Deezer feat-parsing helpers ──────────────────────────────────────────────

function slugifyForFeat(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const FEAT_PATTERNS = [
  /\(?feat\.?\s+([^)([\]–-]+)/i,
  /\(?featuring\s+([^)([\]–-]+)/i,
  /\(?ft\.?\s+([^)([\]–-]+)/i,
  /\(?avec\s+([^)([\]–-]+)/i,
  /\[feat\.?\s+([^\]]+)\]/i,
];

const SPLIT_RE = /\s*(?:,|&|\+|\/)\s*|\s+x\s+|\s+et\s+/i;

function parseFeatArtistsFromTitle(title: string): string[] {
  const names = new Set<string>();
  for (const re of FEAT_PATTERNS) {
    const m = title.match(re);
    if (m) {
      const raw = m[1].replace(/[)\]]+$/, "").trim();
      for (const part of raw.split(SPLIT_RE)) {
        const cleaned = part.trim();
        if (cleaned.length > 0) names.add(cleaned);
      }
      break;
    }
  }
  return [...names];
}

function normalizePreviewUrlForFeat(url: string | null | undefined): string | null {
  if (!url || url.length === 0) return null;
  return url.replace(/^http:\/\//i, "https://");
}

/** Deezer artist collaborations backed by the `Entity` / `EntityLink` cache tables. */
export function createDeezerRelationGraph(prisma: PrismaClient): RelationGraph {
  return {
    source: "deezer",

    async getRelatedEntities(entityId: string): Promise<ContentEntity[]> {
      const source = await prisma.entity.findUnique({
        where: { externalId: entityId },
        select: { id: true },
      });
      if (!source) return [];

      const feats = await prisma.entityLink.findMany({
        where: {
          OR: [{ entityAId: source.id }, { entityBId: source.id }],
        },
        select: {
          entityA: {
            select: {
              externalId: true,
              name: true,
              pictureUrl: true,
              fanCount: true,
            },
          },
          entityB: {
            select: {
              externalId: true,
              name: true,
              pictureUrl: true,
              fanCount: true,
            },
          },
          trackTitle: true,
        },
      });

      const byId = new Map<string, ContentEntity>();
      for (const feat of feats) {
        const candidate =
          feat.entityA.externalId === entityId ? feat.entityB : feat.entityA;
        if (!candidate.externalId || candidate.externalId === entityId) continue;

        const existing = byId.get(candidate.externalId);
        const entity: ContentEntity = {
          id: candidate.externalId,
          name: candidate.name,
          pictureUrl: candidate.pictureUrl ?? undefined,
          fanCount: candidate.fanCount,
          source: "deezer",
          metadata: feat.trackTitle ? { trackTitle: feat.trackTitle } : undefined,
        };
        if (!existing || (candidate.fanCount ?? 0) > (existing.fanCount ?? 0)) {
          byId.set(candidate.externalId, entity);
        }
      }
      return [...byId.values()];
    },

    async validateLink(fromEntityId: string, toEntityId: string) {
      if (!fromEntityId || !toEntityId || fromEntityId === toEntityId) {
        return { valid: false };
      }

      const [fromEntity, toEntity] = await Promise.all([
        prisma.entity.findUnique({ where: { externalId: fromEntityId }, select: { id: true } }),
        prisma.entity.findUnique({ where: { externalId: toEntityId }, select: { id: true } }),
      ]);
      if (!fromEntity || !toEntity) return { valid: false };

      const link = await prisma.entityLink.findFirst({
        where: {
          OR: [
            { entityAId: fromEntity.id, entityBId: toEntity.id },
            { entityAId: toEntity.id, entityBId: fromEntity.id },
          ],
        },
        select: { trackTitle: true, trackExternalId: true },
      });

      if (!link) return { valid: false };
      return {
        valid: true,
        viaItemId: link.trackTitle ?? link.trackExternalId ?? undefined,
      };
    },

    async getOptions(fromEntityId: string, options?: { limit?: number }) {
      const related = await this.getRelatedEntities(fromEntityId);
      const limit = options?.limit ?? related.length;
      return related.slice(0, limit);
    },

    /**
     * Bidirectional Deezer feat validation using live API + artist top tracks.
     * Falls back to DB `validateLink` path if this fails.
     */
    async validateWithNames(
      fromEntityId: string,
      fromEntityName: string,
      toEntityId: string,
      toEntityName: string,
    ) {
      const fromSlug = slugifyForFeat(fromEntityName);
      const toSlug = slugifyForFeat(toEntityName);

      // 1) Scan "from" artist's top tracks for "to" artist feats
      try {
        const fromTracks = await getArtistTopTracks(Number(fromEntityId), 50, {
          requirePreview: false,
        });
        for (const track of fromTracks) {
          const featSlugs = parseFeatArtistsFromTitle(track.title).map(slugifyForFeat);
          const contribSlugs = (track.contributors ?? []).map((c) =>
            slugifyForFeat(c.name),
          );
          if (featSlugs.includes(toSlug) || contribSlugs.includes(toSlug)) {
            return {
              valid: true,
              viaItemId: track.title,
              previewUrl: normalizePreviewUrlForFeat(track.preview) ?? undefined,
            };
          }
        }
      } catch {
        // ignore and try next path
      }

      // 2) Scan "to" artist's top tracks for "from" artist feats
      try {
        const toTracks = await getArtistTopTracks(Number(toEntityId), 50, {
          requirePreview: false,
        });
        for (const track of toTracks) {
          const featSlugs = parseFeatArtistsFromTitle(track.title).map(slugifyForFeat);
          const contribSlugs = (track.contributors ?? []).map((c) =>
            slugifyForFeat(c.name),
          );
          if (featSlugs.includes(fromSlug) || contribSlugs.includes(fromSlug)) {
            return {
              valid: true,
              viaItemId: track.title,
              previewUrl: normalizePreviewUrlForFeat(track.preview) ?? undefined,
            };
          }
        }
      } catch {
        // ignore and try next path
      }

      // 3) Deezer search fallback
      const queries = [
        `${fromEntityName} ${toEntityName}`,
        `${toEntityName} ${fromEntityName}`,
      ];
      for (const q of queries) {
        try {
          const tracks = await searchTracks(q, 20, { requirePreview: false });
          for (const track of tracks) {
            const mainSlug = slugifyForFeat(track.artist.name);
            const titleFeatSlugs = parseFeatArtistsFromTitle(track.title).map(slugifyForFeat);
            const contribSlugs = (track.contributors ?? []).map((c) => slugifyForFeat(c.name));
            const linkedSlugs = [...titleFeatSlugs, ...contribSlugs];
            const hasFrom = mainSlug === fromSlug || linkedSlugs.includes(fromSlug);
            const hasTo = mainSlug === toSlug || linkedSlugs.includes(toSlug);
            if (hasFrom && hasTo) {
              return {
                valid: true,
                viaItemId: track.title,
                previewUrl: normalizePreviewUrlForFeat(track.preview) ?? undefined,
              };
            }
          }
        } catch {
          // ignore
        }
      }

      return { valid: false };
    },
  };
}
