import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Zap, Swords, User, ArrowRight, Trophy } from "lucide-react";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Facile",
  2: "Normal",
  3: "Difficile",
};

const DIFFICULTY_DESC: Record<number, string> = {
  1: "20 sec — IA mainstream, 4 propositions",
  2: "20 sec — IA élargie (673 artistes)",
  3: "10 sec — IA niche (994 artistes)",
};

const DIFFICULTY_COLOR: Record<number, string> = {
  1: "text-green-400",
  2: "text-yellow-400",
  3: "text-red-400",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}): Promise<Metadata> {
  const { challengeId } = await params;
  const challenge = await prisma.battleFeatSoloChallenge.findUnique({
    where: { id: challengeId },
    select: { title: true },
  });
  return { title: challenge ? `${challenge.title} — BattleFeat` : "BattleFeat solo" };
}

export default async function BattleFeatChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;

  const challenge = await prisma.battleFeatSoloChallenge.findUnique({
    where: { id: challengeId },
    include: { owner: { select: { id: true, username: true } } },
  });
  if (!challenge) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === challenge.ownerId;

  // For private challenges, only the owner may open the page.
  if (challenge.visibility !== "public" && !isOwner) {
    notFound();
  }

  const topSessions = await prisma.battleFeatSoloSession.findMany({
    where: { challengeId: challenge.id, status: "finished" },
    include: { player: { select: { username: true } } },
    orderBy: { score: "desc" },
    take: 5,
  });

  return (
    <div className="mx-auto w-full max-w-[1080px] px-2 py-8">
      <div className="mb-6">
        <Link href="/explore" className="text-sm text-[color:var(--muted)] hover:underline">
          ← Explorer
        </Link>
      </div>

      <div
        className="rounded-[28px] border p-6 sm:p-8"
        style={{ borderColor: "#2a3242", background: "#10141d" }}
      >
        <div className="flex flex-wrap items-start gap-4">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "rgba(255,75,125,0.12)" }}
          >
            <Zap size={22} style={{ color: "#ff4b7d" }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff4b7d]">
              BattleFeat solo
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
              {challenge.title}
            </h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Par {challenge.owner?.username ?? "Anonyme"} ·{" "}
              {challenge.visibility === "public" ? "Public" : "Privé"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              Artiste de départ
            </p>
            <div className="mt-2 flex items-center gap-3">
              {challenge.startingArtistPic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={challenge.startingArtistPic}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center shrink-0">
                  <User size={18} className="text-[color:var(--muted)]" />
                </div>
              )}
              <p className="font-semibold truncate">{challenge.startingArtistName}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              Difficulté
            </p>
            <p className={`mt-2 text-xl font-black ${DIFFICULTY_COLOR[challenge.difficulty]}`}>
              {DIFFICULTY_LABEL[challenge.difficulty] ?? "—"}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {DIFFICULTY_DESC[challenge.difficulty] ?? ""}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/battle-feat/solo?challengeId=${challenge.id}`}
            className="btn-primary flex-1 py-3 text-base sm:flex-none"
          >
            <Swords size={18} /> Jouer ce BattleFeat solo <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {topSessions.length > 0 && (
        <div
          className="mt-8 rounded-[28px] border p-6"
          style={{ borderColor: "#2a3242", background: "#10141d" }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
            <Trophy size={18} className="text-yellow-400" />
            Meilleurs scores
          </h2>
          <div className="space-y-2">
            {topSessions.map((s, i) => (
              <Link
                key={s.id}
                href={`/battle-feat/results/${s.id}`}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:bg-[color:var(--surface-2)]"
                style={{ borderColor: "#252d3c", background: "#141924" }}
              >
                <span className="w-6 text-center font-bold text-sm">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <span className="flex-1 font-medium truncate">
                  {s.player?.username ?? "Anonyme"}
                </span>
                <span className="font-bold tabular-nums text-[color:var(--accent)]">
                  {s.score} pts
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
