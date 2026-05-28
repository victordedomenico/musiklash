import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import { getStreamClashRoomSnapshot } from "@/lib/stream-clash-room";
import prisma from "@/lib/prisma";
import SectionHeader from "@/components/ui/SectionHeader";
import StreamClashRoomClient from "./StreamClashRoomClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = await getStreamClashRoomSnapshot(roomId);
  return {
    title: room ? `Stream Clash Multi · ${room.streamClash.title}` : "Room Stream Clash",
  };
}

export default async function StreamClashRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

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
    redirect(
      `/api/guest/ensure?redirect=${encodeURIComponent(`/stream-clash/room/${roomId}`)}`,
    );
  }

  const room = await getStreamClashRoomSnapshot(roomId);
  if (!room) notFound();

  const participantUsername = room.participants.find(
    (p) => p.playerId === playerId,
  )?.username;
  let username = participantUsername ?? null;
  if (!username) {
    const profile = await prisma.profile.findUnique({
      where: { id: playerId },
      select: { username: true },
    });
    username = profile?.username ?? "Anonyme";
  }

  return (
    <div className="page-shell max-w-3xl py-10">
      <div className="mb-6">
        <SectionHeader title={room.streamClash.title} />
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {room.streamClash.tracks.length} entrée{room.streamClash.tracks.length > 1 ? "s" : ""} ·
          Stream Clash multijoueur ·{" "}
          {room.difficulty === "easy" ? "Facile" : room.difficulty === "normal" ? "Normal" : "Difficile"}
        </p>
      </div>
      <StreamClashRoomClient
        initialRoom={room}
        userId={playerId}
        username={username}
      />
    </div>
  );
}
