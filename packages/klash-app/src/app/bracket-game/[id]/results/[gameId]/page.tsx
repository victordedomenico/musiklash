import { notFound } from "next/navigation";
import prisma from "@klash/klash-app/lib/prisma";
import BracketGame from "@klash/klash-app/components/BracketGame";
import { isValidSize, type Vote } from "@klash/klash-app/lib/bracket";
import SectionHeader from "@klash/klash-app/components/ui/SectionHeader";

const appName = process.env.NEXT_PUBLIC_KLASH_NAME ?? "Klash";

export const metadata = {
  title: `Résultats du bracket — ${appName}`,
};

export default async function BracketGameResultsPage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;

  const game = await prisma.bracketGame.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      bracketId: true,
      winnerSeed: true,
      createdAt: true,
      votes: {
        select: { round: true, matchIndex: true, winnerSeed: true },
        orderBy: [{ round: "asc" }, { matchIndex: "asc" }],
      },
    },
  });
  if (!game || game.bracketId !== id) notFound();

  const bracket = await prisma.bracket.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      theme: true,
      size: true,
      tracks: {
        select: {
          seed: true,
          externalId: true,
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
    externalId: Number(t.externalId),
    preview_url: t.previewUrl,
    cover_url: t.coverUrl,
  }));

  const initialVotes: Vote[] = game.votes.map((v) => ({
    round: v.round,
    matchIndex: v.matchIndex,
    winnerSeed: v.winnerSeed,
  }));

  return (
    <div className="page-shell max-w-3xl py-10">
      <div className="mb-6">
        <SectionHeader
          title={bracket.title}
          subtitle={
            bracket.theme
              ? `${bracket.theme} · Partie du ${game.createdAt.toLocaleDateString("fr-FR")}`
              : `Partie du ${game.createdAt.toLocaleDateString("fr-FR")}`
          }
        />
      </div>

      <BracketGame
        bracketId={bracket.id}
        size={bracket.size}
        tracks={tracks}
        initialVotes={initialVotes}
        initialSessionId={game.id}
        readOnly
      />
    </div>
  );
}
