import { notFound } from "next/navigation";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import BracketGame from "@/components/BracketGame";
import { isValidSize } from "@/lib/bracket";
import SectionHeader from "@/components/ui/SectionHeader";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bracket = await prisma.bracket.findUnique({
    where: { id },
    select: { title: true, theme: true, visibility: true, coverUrl: true },
  });
  if (!bracket) return { title: "Bracket introuvable" };

  const description = bracket.theme
    ? `Jouez au bracket « ${bracket.title} » (${bracket.theme}) sur MusiKlash. Écoutez les extraits et votez pour élire le champion.`
    : `Jouez au bracket « ${bracket.title} » sur MusiKlash. Écoutez les extraits et votez pour élire le champion.`;

  return buildPageMetadata({
    title: bracket.title,
    description,
    path: `/bracket-game/${id}`,
    noIndex: bracket.visibility !== "public",
    image: bracket.coverUrl,
  });
}

export default async function BracketGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ transient?: string }>;
}) {
  const { id } = await params;
  const { transient } = await searchParams;

  const bracket = await prisma.bracket.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      theme: true,
      size: true,
      visibility: true,
      ownerId: true,
      tracks: {
        select: {
          seed: true,
          deezerTrackId: true,
          title: true,
          artist: true,
          previewUrl: true,
          coverUrl: true,
        },
        orderBy: { seed: "asc" },
      },
    },
  });

  if (!bracket) notFound();
  if (!isValidSize(bracket.size)) notFound();

  const tracks = bracket.tracks.map((t) => ({
    ...t,
    deezerTrackId: Number(t.deezerTrackId),
    preview_url: t.previewUrl,
    cover_url: t.coverUrl,
  }));

  // tracks.length may be < bracket.size when byes are in use — that's expected.
  if (tracks.length === 0) {
    return (
      <div className="page-shell max-w-3xl py-12">
        <h1 className="text-2xl font-bold">Ce bracket est vide</h1>
        <p className="mt-2 text-[color:var(--muted)]">Aucune piste trouvée.</p>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-3xl py-10">
      <div className="mb-6">
        <SectionHeader title={bracket.title} subtitle={bracket.theme ?? undefined} />
      </div>

      <BracketGame
        bracketId={bracket.id}
        size={bracket.size}
        tracks={tracks}
        transient={transient === "1"}
      />
    </div>
  );
}
