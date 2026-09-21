import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import prisma from "@/lib/prisma";
import { getBracketRoomSnapshot } from "@/lib/collaborative-room";
import { getI18n } from "@/lib/i18n";
import SectionHeader from "@/components/ui/SectionHeader";
import MultiplayerRoomDeparture from "@/components/MultiplayerRoomDeparture";
import BracketRoomClient from "./BracketRoomClient";

export const dynamic = "force-dynamic";

export default async function BracketRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const { locale, t } = await getI18n();
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
      <MultiplayerRoomDeparture roomId={room.id} kind="bracket" />
      <div className="mb-6">
        <SectionHeader title={room.bracket.title} subtitle={t.multiplayerRoom.bracketSubtitle} />
        <p className="mt-1 text-sm text-[color:var(--muted)]">{t.multiplayerRoom.bracketRule}</p>
      </div>
      <BracketRoomClient
        initialRoom={room}
        userId={playerId}
        username={profile?.username ?? t.multiplayerRoom.defaultPlayer}
        locale={locale}
        texts={t.multiplayerRoom}
      />
    </div>
  );
}
