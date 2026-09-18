import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import prisma from "@/lib/prisma";
import { getBracketRoomSnapshot } from "@/lib/collaborative-room";
import SectionHeader from "@/components/ui/SectionHeader";
import BracketRoomClient from "./BracketRoomClient";

export const dynamic = "force-dynamic";

export default async function BracketRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const guest = user ? null : await getGuestIdentityFromCookies();
  const playerId = user?.id ?? guest?.id;
  if (!playerId)
    redirect(`/api/guest/ensure?redirect=${encodeURIComponent(`/bracket-game/room/${roomId}`)}`);
  const room = await getBracketRoomSnapshot(roomId);
  if (!room) notFound();
  const profile = await prisma.profile.findUnique({
    where: { id: playerId },
    select: { username: true },
  });
  return (
    <div className="page-shell max-w-3xl py-10">
      <div className="mb-6">
        <SectionHeader title={room.bracket.title} subtitle="Bracket collaboratif" />
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Les duels sont décidés à la majorité ; une égalité est tranchée au hasard.
        </p>
      </div>
      <BracketRoomClient
        initialRoom={room}
        userId={playerId}
        username={profile?.username ?? "Joueur"}
      />
    </div>
  );
}
