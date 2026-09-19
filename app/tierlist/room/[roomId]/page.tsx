import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import prisma from "@/lib/prisma";
import { getTierlistRoomSnapshot } from "@/lib/collaborative-room";
import SectionHeader from "@/components/ui/SectionHeader";
import TierlistRoomClient from "./TierlistRoomClient";

export const dynamic = "force-dynamic";

export default async function TierlistRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
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
      <div className="mb-6">
        <SectionHeader title={room.tierlist.title} subtitle="Tierlist collaborative" />
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Chaque morceau est placé dans le rang choisi par la majorité, avec pile ou face en cas
          d’égalité.
        </p>
      </div>
      <TierlistRoomClient
        initialRoom={room}
        userId={playerId}
        username={profile?.username ?? "Joueur"}
      />
    </div>
  );
}
