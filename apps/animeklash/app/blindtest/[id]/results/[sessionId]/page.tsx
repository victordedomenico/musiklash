import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Trophy, Check, X } from "lucide-react";
import type { BlindtestAnswer } from "@/components/BlindtestGame";
import { isSingleArtistBlindtest } from "@/lib/blindtest-utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id } = await params;
  const bt = await prisma.blindtest.findUnique({ where: { id }, select: { title: true } });
  return { title: bt ? `Résultats — ${bt.title}` : "Résultats Blindtest" };
}

export default async function BlindtestResultsPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;

  const session = await prisma.blindtestSession.findUnique({
    where: { id: sessionId },
    select: {
      score: true,
      maxScore: true,
      answers: true,
      createdAt: true,
      blindtest: { select: { id: true, title: true } },
    },
  });

  if (!session || session.blindtest.id !== id) notFound();

  const answers = session.answers as unknown as BlindtestAnswer[];
  const pct = session.maxScore > 0 ? Math.round((session.score / session.maxScore) * 100) : 0;
  const singleArtistSession = isSingleArtistBlindtest(
    answers.map((a) => ({ artist: a.trueArtist })),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      {/* Back link */}
      <Link
        href={`/blindtest/${id}`}
        className="text-sm text-[color:var(--muted)] hover:text-white inline-flex items-center gap-1"
      >
        ← {session.blindtest.title}
      </Link>

      {/* Score card */}
      <div className="card p-8 text-center">
        <Trophy className="mx-auto text-yellow-400" size={48} />
        <p className="mt-4 text-4xl font-black">
          {session.score}
          <span className="text-xl font-normal text-[color:var(--muted)]">
            {" "}/ {session.maxScore} pts
          </span>
        </p>
        <p className="mt-1 text-[color:var(--muted)]">
          {pct >= 80
            ? "Excellent ! 🔥"
            : pct >= 50
            ? "Pas mal du tout 👌"
            : "Continue de t'entraîner 💪"}
        </p>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          {session.createdAt.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/blindtest/${id}`} className="btn-primary">
            Recommencer
          </Link>
          <Link href="/explore?tab=blindtests" className="btn-ghost">
            Explorer
          </Link>
        </div>
      </div>

      {/* Track recap */}
      <div className="space-y-3">
        <h2 className="font-bold text-lg">Récap morceau par morceau</h2>
        {singleArtistSession ? (
          <p className="text-sm text-[color:var(--muted)]">
            Partie « un seul artiste » : les points artiste ont été donnés automatiquement.
          </p>
        ) : null}
        {answers.map((a) => (
          <div key={a.position} className="card flex gap-4 p-3 items-start">
            {a.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.coverUrl}
                alt=""
                className="h-14 w-14 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-[color:var(--surface-2)] shrink-0 flex items-center justify-center text-2xl">
                🎵
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{a.trueTitle}</p>
              <p className="text-xs text-[color:var(--muted)] truncate">{a.trueArtist}</p>
              <div className="mt-1 flex gap-3 text-xs">
                <span
                  className={`flex items-center gap-1 ${
                    a.correctTitle ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {a.correctTitle ? <Check size={11} /> : <X size={11} />}
                  Titre
                  {!a.correctTitle && a.guessTitle && (
                    <span className="text-[color:var(--muted)] line-through ml-1">
                      {a.guessTitle}
                    </span>
                  )}
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    a.correctArtist ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {a.correctArtist ? <Check size={11} /> : <X size={11} />}
                  Artiste
                  {!a.correctArtist && a.guessArtist && (
                    <span className="text-[color:var(--muted)] line-through ml-1">
                      {a.guessArtist}
                    </span>
                  )}
                </span>
              </div>
            </div>
            <p className="text-sm font-bold shrink-0 self-center">+{a.points} pts</p>
          </div>
        ))}
      </div>
    </div>
  );
}
