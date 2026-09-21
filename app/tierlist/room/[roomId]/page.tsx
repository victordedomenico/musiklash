import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import prisma from "@/lib/prisma";
import { getTierlistRoomSnapshot } from "@/lib/collaborative-room";
import { getI18n } from "@/lib/i18n";
import SectionHeader from "@/components/ui/SectionHeader";
import MultiplayerRoomDeparture from "@/components/MultiplayerRoomDeparture";
import TierlistRoomClient from "./TierlistRoomClient";

export const dynamic = "force-dynamic";

export default async function TierlistRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const guest = user ? null : await getGuestIdentityFromCookies();
  const playerId = user?.id ?? guest?.id;
  if (!playerId)
    redirect(`/api/guest/ensure?redirect=${encodeURIComponent(`/tierlist/room/${roomId}`)}`);
  const room = await getTierlistRoomSnapshot(roomId);
  if (!room) notFound();
  const profile = await prisma.profile.findUnique({
    where: { id: playerId },
    select: { username: true },
  });
  return (
    <div className="page-shell max-w-3xl py-10">
      <MultiplayerRoomDeparture roomId={room.id} kind="tierlist" />
      <div className="mb-6">
        <SectionHeader title={room.tierlist.title} subtitle={t.multiplayerRoom.tierlistSubtitle} />
        <p className="mt-1 text-sm text-[color:var(--muted)]">{t.multiplayerRoom.tierlistRule}</p>
      </div>
      <TierlistRoomClient
        initialRoom={room}
        userId={playerId}
        username={profile?.username ?? t.multiplayerRoom.defaultPlayer}
        texts={t.multiplayerRoom}
      />
    </div>
  );
}
