import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getArtistById } from "@/lib/deezer";
import type { Metadata } from "next";
import { Trophy, ArrowLeft, User, Bot, Swords, Clock, Zap } from "lucide-react";
import type { FeatMove } from "@/lib/battle-feat";

export async function generateMetadata({ params }: { params: Promise<{ sessionId: string }> }): Promise<Metadata> {
  const { sessionId } = await params;
  const s = await prisma.battleFeatSoloSession.findUnique({
    where: { id: sessionId },
    select: { score: true },
  });
  return { title: s ? `Score ${s.score} pts — BattleFeat` : "BattleFeat Résultats" };
}

export default async function BattleFeatResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await prisma.battleFeatSoloSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      score: true,
      difficulty: true,
      jokersUsed: true,
      status: true,
      moves: true,
      createdAt: true,
      startingArtistId: true,
      player: { select: { username: true } },
    },
  });

  if (!session) notFound();

  const startingArtistInfo = await getArtistById(session.startingArtistId).catch(() => null);
  const startingArtist = {
    name: startingArtistInfo?.name ?? session.startingArtistId,
    pictureUrl: startingArtistInfo?.picture_medium ?? startingArtistInfo?.picture_small ?? null,
  };

  const moves = (session.moves as unknown as FeatMove[]) ?? [];
  const diffLabel: Record<number, string> = { 1: "Facile", 2: "Normal", 3: "Difficile" };
  const diffColor: Record<number, string> = {
    1: "text-green-400",
    2: "text-yellow-400",
    3: "text-red-400",
  };

  return (
    <div className="mx-auto w-full max-w-[1040px] py-6">
      <Link
        href="/battle-feat"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[color:var(--muted)] hover:text-white"
      >
        <ArrowLeft size={14} /> BattleFeat
      </Link>

      <div className="mb-6 rounded-[28px] border p-8 text-center" style={{ borderColor: "#2a3242", background: "#10141d" }}>
        <Trophy size={48} className="mx-auto text-yellow-400 mb-4" />
        <h1 className="text-5xl font-black tracking-[-0.03em]">
          {session.score} point{session.score !== 1 ? "s" : ""}
        </h1>
        <p className="mt-2 text-lg" style={{ color: "#8f93a0" }}>
          {session.player?.username ?? "Anonyme"} ·{" "}
          <span className={diffColor[session.difficulty]}>
            {diffLabel[session.difficulty]}
          </span>
        </p>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-xl font-bold">{moves.length}</p>
            <p className="text-xs text-[color:var(--muted)]">coups</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold flex items-center gap-1 justify-center">
              <Zap size={14} className="text-yellow-400" />
              {session.jokersUsed}
            </p>
            <p className="text-xs text-[color:var(--muted)]">joker{session.jokersUsed !== 1 ? "s" : ""}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold flex items-center gap-1 justify-center">
              <Clock size={14} className="text-[color:var(--muted)]" />
              {new Date(session.createdAt).toLocaleDateString("fr-FR")}
            </p>
            <p className="text-xs text-[color:var(--muted)]">date</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border p-6" style={{ borderColor: "#2a3242", background: "#10141d" }}>
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-black">
          <Swords size={16} className="text-[color:var(--accent)]" />
          Chaîne de featurings
        </h2>
        <div className="space-y-2">
          {/* Starting artist */}
          <div className="flex items-center gap-3 rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 px-4 py-2.5">
            {startingArtist.pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={startingArtist.pictureUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center shrink-0">
                <User size={16} className="text-[color:var(--muted)]" />
              </div>
            )}
            <div>
              <p className="font-semibold">{startingArtist.name}</p>
              <p className="text-xs text-[color:var(--accent)]">Départ</p>
            </div>
          </div>

          {moves.map((m, i) => {
            const isAI = i % 2 === 1;
            return (
              <div
                key={m.artistId + i}
                className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] px-4 py-2.5 bg-[color:var(--surface)]"
              >
                {m.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.pictureUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center shrink-0">
                    <User size={16} className="text-[color:var(--muted)]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{m.artistName}</p>
                  {m.trackTitle && (
                    <p className="text-xs text-[color:var(--muted)] truncate">
                      🎵 {m.trackTitle}
                    </p>
                  )}
                </div>
                {isAI ? (
                  <Bot size={16} className="text-[color:var(--accent)] shrink-0" />
                ) : (
                  <User size={16} className="text-green-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/battle-feat/solo" className="btn-primary flex-1 justify-center">
          <Swords size={16} /> Recommencer
        </Link>
        <Link
          href="/battle-feat/leaderboard"
          className="btn-ghost flex-1 justify-center"
        >
          <Trophy size={16} /> Classement
        </Link>
      </div>
    </div>
  );
}
