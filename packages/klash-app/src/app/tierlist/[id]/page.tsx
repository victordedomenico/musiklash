import { notFound } from "next/navigation";
import type { Metadata } from "next";
import prisma from "@klash/klash-app/lib/prisma";
import TierlistPlayer from "@klash/klash-app/app/tierlist/[id]/TierlistPlayer";
import type { TierItem } from "@klash/klash-app/components/TierlistBoard";
import SectionHeader from "@klash/klash-app/components/ui/SectionHeader";
import { getI18n } from "@klash/klash-app/lib/i18n";
import { buildPageMetadata } from "@klash/klash-app/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tl = await prisma.tierlist.findUnique({
    where: { id },
    select: { title: true, theme: true, visibility: true, coverUrl: true },
  });
  if (!tl) return { title: "Tierlist introuvable" };

  const description = tl.theme
    ? `Classez les ${process.env.NEXT_PUBLIC_KLASH_ITEMS_NOUN ?? "éléments"} de « ${tl.title} » (${tl.theme}) sur ${process.env.NEXT_PUBLIC_KLASH_NAME ?? "Klash"}.`
    : `Classez les ${process.env.NEXT_PUBLIC_KLASH_ITEMS_NOUN ?? "éléments"} de « ${tl.title} » sur ${process.env.NEXT_PUBLIC_KLASH_NAME ?? "Klash"}.`;

  return buildPageMetadata({
    title: tl.title,
    description,
    path: `/tierlist/${id}`,
    noIndex: tl.visibility !== "public",
    image: tl.coverUrl,
  });
}

export default async function TierlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ transient?: string }>;
}) {
  const { id } = await params;
  const { transient } = await searchParams;
  const { t } = await getI18n();

  const tl = await prisma.tierlist.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      theme: true,
      visibility: true,
      tracks: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          externalId: true,
          title: true,
          artist: true,
          coverUrl: true,
          previewUrl: true,
        },
      },
    },
  });

  if (!tl) notFound();

  const tracks: TierItem[] = tl.tracks.map((t) => ({
    position: t.position,
    externalId: Number(t.externalId),
    title: t.title,
    artist: t.artist,
    coverUrl: t.coverUrl,
    previewUrl: t.previewUrl,
  }));

  return (
    <div className="page-shell max-w-5xl py-10">
      <div className="mb-6">
        <SectionHeader title={tl.title} subtitle={tl.theme ?? undefined} />
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          {t.tierlistPage.helper}
        </p>
      </div>

      <TierlistPlayer
        tierlistId={tl.id}
        tracks={tracks}
        boardTexts={t.tierlistBoard}
        playerTexts={t.tierlistPlayer}
        transient={transient === "1"}
      />
    </div>
  );
}
