import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import BlindtestPlayer from "./BlindtestPlayer";
import type { BlindtrackData } from "@/components/BlindtestGame";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bt = await prisma.blindtest.findUnique({ where: { id }, select: { title: true } });
  return { title: bt ? `${bt.title} — Solo` : "Blindtest Solo" };
}

export default async function BlindtestPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ transient?: string }>;
}) {
  const { id } = await params;
  const { transient } = await searchParams;

  const blindtest = await prisma.blindtest.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      tracks: {
        select: { position: true, deezerTrackId: true, title: true, artist: true, coverUrl: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!blindtest) notFound();

  const tracks: BlindtrackData[] = blindtest.tracks.map((t) => ({
    position: t.position,
    deezerTrackId: Number(t.deezerTrackId),
    title: t.title,
    artist: t.artist,
    coverUrl: t.coverUrl,
  }));

  return (
    <div className="page-shell max-w-3xl py-10">
      <div className="mb-6">
        <Link
          href={`/blindtest/${id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
        >
          <ArrowLeft size={14} /> Retour
        </Link>
        <h1 className="text-2xl font-black">{blindtest.title}</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {tracks.length} morceau{tracks.length > 1 ? "x" : ""} · Mode solo
        </p>
      </div>
      <BlindtestPlayer blindtestId={blindtest.id} tracks={tracks} transient={transient === "1"} />
    </div>
  );
}
