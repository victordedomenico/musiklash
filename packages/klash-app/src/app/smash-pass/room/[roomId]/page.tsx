import { notFound, redirect } from "next/navigation";
import { createClient } from "@klash/klash-app/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@klash/klash-app/lib/guest";
import { getSmashPassRoomSnapshot } from "@klash/klash-app/lib/smash-pass-room";
import prisma from "@klash/klash-app/lib/prisma";
import SectionHeader from "@klash/klash-app/components/ui/SectionHeader";
import SmashPassRoomClient from "./SmashPassRoomClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = await getSmashPassRoomSnapshot(roomId);
  return {
    title: room
      ? `Smash or Pass · ${room.smashPass.title}`
      : "Room Smash or Pass",
  };
}

export default async function SmashPassRoomPage({
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
      `/api/guest/ensure?redirect=${encodeURIComponent(`/smash-pass/room/${roomId}`)}`,
    );
  }

  const room = await getSmashPassRoomSnapshot(roomId);
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
    <div className="page-shell max-w-2xl py-10">
      <SectionHeader title={room.smashPass.title} />
      <p className="mt-1 mb-6 text-sm text-[color:var(--muted)]">
        {room.smashPass.items.length} élément
        {room.smashPass.items.length > 1 ? "s" : ""} · Smash or Pass multijoueur
      </p>
      <SmashPassRoomClient
        initialRoom={room}
        userId={playerId}
        username={username}
      />
    </div>
  );
}
