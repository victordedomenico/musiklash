import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import BattleFeatRoom from "./BattleFeatRoom";
import { getBattleFeatRoomSnapshot } from "@/lib/battle-feat-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ roomId: string }> }): Promise<Metadata> {
  const { roomId } = await params;
  const room = await prisma.battleFeatRoom.findUnique({ where: { id: roomId }, select: { id: true } });
  return { title: room ? `Room BattleFeat` : "BattleFeat" };
}

export default async function RoomPage({
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
    redirect(`/api/guest/ensure?redirect=${encodeURIComponent(`/battle-feat/room/${roomId}`)}`);
  }

  const roomData = await getBattleFeatRoomSnapshot(roomId);
  if (!roomData) notFound();

  const participantUsername = roomData.participants.find(
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
    <div className="mx-auto w-full max-w-[1040px] py-6">
      <div className="mb-6 rounded-[28px] border px-6 py-5" style={{ borderColor: "#2a3242", background: "#10141d" }}>
        <h1 className="text-5xl font-black tracking-[-0.03em]">BattleFeat Multi</h1>
        <p className="mt-1 text-lg" style={{ color: "#8f93a0" }}>
          Defi en temps reel · Room {roomData.id.slice(0, 8)}
        </p>
      </div>
      <BattleFeatRoom initialRoom={roomData} userId={playerId} username={username} />
    </div>
  );
}
