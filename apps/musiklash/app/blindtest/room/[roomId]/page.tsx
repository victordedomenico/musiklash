import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import { getBlindtestRoomSnapshot } from "@/lib/blindtest-room";
import prisma from "@/lib/prisma";
import BlindtestRoomClient from "./BlindtestRoomClient";
import SectionHeader from "@/components/ui/SectionHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = await getBlindtestRoomSnapshot(roomId);
  return {
    title: room ? `Blindtest Multi · ${room.blindtest.title}` : "Room Blindtest",
  };
}

export default async function BlindtestRoomPage({
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
    // No session yet — bootstrap an anonymous guest session via a route handler
    // (Server Components cannot set cookies, but route handlers can).
    redirect(`/api/guest/ensure?redirect=${encodeURIComponent(`/blindtest/room/${roomId}`)}`);
  }

  const room = await getBlindtestRoomSnapshot(roomId);
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
        <SectionHeader title={room.blindtest.title} />
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {room.blindtest.tracks.length} morceau{room.blindtest.tracks.length > 1 ? "x" : ""} ·
          Blindtest multijoueur
        </p>
      </div>
      <BlindtestRoomClient
        initialRoom={room}
        userId={playerId}
        username={username}
      />
    </div>
  );
}
