import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import prisma from "@/lib/prisma";
import SectionHeader from "@/components/ui/SectionHeader";
import StreamClashPlayer from "./StreamClashPlayer";
import { createSession } from "./actions";
import type { StreamClashDifficulty } from "@/lib/stream-clash";

export const dynamic = "force-dynamic";

const VALID_DIFFICULTIES: StreamClashDifficulty[] = ["easy", "normal", "hard"];

export default async function StreamClashPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    difficulty?: string;
    rounds?: string;
    transient?: string;
  }>;
}) {
  const { id } = await params;
  const { difficulty: rawDiff, rounds: rawRounds, transient } = await searchParams;

  const difficulty: StreamClashDifficulty = VALID_DIFFICULTIES.includes(
    rawDiff as StreamClashDifficulty,
  )
    ? (rawDiff as StreamClashDifficulty)
    : "easy";

  const totalRounds = Math.min(
    20,
    Math.max(5, rawRounds ? parseInt(rawRounds, 10) : 10),
  );

  const sc = await prisma.streamClash.findUnique({
    where: { id },
    include: { tracks: { orderBy: { position: "asc" } } },
  });
  if (!sc) notFound();

  // Resolve player identity for session tracking
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let playerId: string | null = user?.id ?? null;
  if (!playerId) {
    const cookieGuest = await getGuestIdentityFromCookies();
    if (cookieGuest) playerId = cookieGuest.id;
  }

  if (!playerId) {
    redirect(`/api/guest/ensure?redirect=${encodeURIComponent(`/stream-clash/${id}/play`)}`);
  }

  const visibility = transient ? "private" : (sc.visibility as "private" | "public");

  const sessionResult = await createSession(id, difficulty, totalRounds, visibility);
  if (!sessionResult.ok) {
    // Continue without session — non-blocking for UX
  }
  const sessionId = sessionResult.ok ? sessionResult.sessionId : "no-session";

  const tracks = sc.tracks.map((t) => ({
    position: t.position,
    deezerTrackId: Number(t.deezerTrackId),
    title: t.title,
    artist: t.artist,
    previewUrl: t.previewUrl,
    coverUrl: t.coverUrl ?? null,
    rank: t.rank,
  }));

  return (
    <div className="page-shell max-w-2xl py-10">
      <div className="mb-6">
        <SectionHeader title={sc.title} />
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {difficulty === "easy"
            ? "Facile"
            : difficulty === "normal"
            ? "Normal"
            : "Difficile"}{" "}
          · {totalRounds} manches · Stream Clash
        </p>
      </div>
      <StreamClashPlayer
        streamClashId={id}
        sessionId={sessionId}
        tracks={tracks}
        difficulty={difficulty}
        totalRounds={totalRounds}
      />
    </div>
  );
}
