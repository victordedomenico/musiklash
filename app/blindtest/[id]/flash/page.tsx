import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import FlashBlindtestPlayer, { type FlashBlindtestTrack } from "./FlashBlindtestPlayer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blindtest = await prisma.blindtest.findUnique({
    where: { id },
    select: { title: true, mode: true },
  });
  return { title: blindtest ? `${blindtest.title} — Blindtest éclair` : "Blindtest éclair" };
}

export default async function FlashBlindtestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blindtest = await prisma.blindtest.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      mode: true,
      tracks: {
        select: {
          position: true,
          deezerTrackId: true,
          title: true,
          artist: true,
          coverUrl: true,
          rank: true,
        },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!blindtest) notFound();
  if (blindtest.mode !== "flash") redirect(`/blindtest/${id}/play`);

  const tracks: FlashBlindtestTrack[] = blindtest.tracks.map((track) => ({
    position: track.position,
    deezerTrackId: Number(track.deezerTrackId),
    title: track.title,
    artist: track.artist,
    coverUrl: track.coverUrl,
    rank: track.rank,
  }));

  return (
    <div className="page-shell max-w-3xl py-7 md:py-10">
      <Link
        href={`/blindtest/${id}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
      >
        <ArrowLeft size={15} /> Retour
      </Link>
      <FlashBlindtestPlayer blindtestId={blindtest.id} title={blindtest.title} tracks={tracks} />
    </div>
  );
}
