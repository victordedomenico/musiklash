import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const room = await prisma.battleFeatRoom.create({
    data: {
      hostId: user.id,
      status: "waiting",
      usedArtistIds: [],
      moves: [],
    },
  });

  redirect(`/battle-feat/room/${room.id}`);
}
