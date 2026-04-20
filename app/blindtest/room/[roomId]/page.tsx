import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBlindtestRoomSnapshot } from "@/lib/blindtest-room";
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

  if (!user) redirect("/login");

  const room = await getBlindtestRoomSnapshot(roomId);
  if (!room) notFound();

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
        userId={user.id}
      />
    </div>
  );
}
