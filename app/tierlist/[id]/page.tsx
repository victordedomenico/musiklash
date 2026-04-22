import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import TierlistPlayer from "./TierlistPlayer";
import type { TierItem } from "@/components/TierlistBoard";
import SectionHeader from "@/components/ui/SectionHeader";
import { getI18n } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tl = await prisma.tierlist.findUnique({ where: { id }, select: { title: true } });
  return { title: tl ? `${tl.title} — MusiKlash` : "Tierlist — MusiKlash" };
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
          deezerTrackId: true,
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
    deezerTrackId: Number(t.deezerTrackId),
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
