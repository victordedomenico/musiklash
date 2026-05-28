import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRoom } from "./actions";
import { ArrowRight, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="page-shell max-w-3xl py-10">
      <div className="card space-y-5 p-7">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: "var(--accent-dim)" }}
          >
            <Users size={20} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-black">Créer une room BattleFeat</h1>
            <p className="text-sm text-[color:var(--muted)]">
              Choisis la visibilité de la room.
            </p>
          </div>
        </div>

        <p className="text-sm text-[color:var(--muted)]">
          Privée = accessible uniquement par lien. Publique = visible aussi dans Explorer.
        </p>

        <div className="flex flex-wrap gap-2">
          <form action={createRoom}>
            <input type="hidden" name="visibility" value="private" />
            <button type="submit" className="btn-ghost">
              Room privée
            </button>
          </form>
          <form action={createRoom}>
            <input type="hidden" name="visibility" value="public" />
            <button type="submit" className="btn-primary">
              Room publique <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
