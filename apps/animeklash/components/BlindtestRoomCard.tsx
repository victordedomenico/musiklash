import Link from "next/link";
import { Eye, EyeOff, Music, Users } from "lucide-react";
import LibraryVisibilityToggle from "@/components/LibraryVisibilityToggle";

export type BlindtestRoomSummary = {
  id: string;
  status: string;
  title: string;
  trackCount: number;
  hostName: string;
  visibility: string;
  canEditVisibility?: boolean;
  createdAt: string;
};

const statusLabel: Record<string, string> = {
  waiting: "Disponible",
  playing: "En cours",
  finished: "Terminée",
};

export default function BlindtestRoomCard({
  room,
  libraryEditor,
}: {
  room: BlindtestRoomSummary;
  libraryEditor?: boolean;
}) {
  const vis = room.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb flex items-center justify-center bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20">
        <Users
          size={36}
          className="text-[color:var(--muted)] transition group-hover:text-[color:var(--accent)]"
        />
        <span className="media-pill absolute right-2 top-2">Room multi</span>
        <span className="media-pill absolute left-2 top-2">
          {vis === "public" ? (
            <>
              <Eye size={12} /> Public
            </>
          ) : (
            <>
              <EyeOff size={12} /> Privé
            </>
          )}
        </span>
        <span className="media-pill absolute bottom-2 left-2">
          {statusLabel[room.status] ?? room.status}
        </span>
      </div>
      <div className="space-y-1 p-4">
        <p className="line-clamp-1 font-semibold">{room.title}</p>
        <p className="text-xs text-[color:var(--muted)]">
          {room.trackCount} morceau{room.trackCount > 1 ? "x" : ""} · Hôte: {room.hostName}
        </p>
        <p className="text-[11px] text-[color:var(--muted)] flex items-center gap-1">
          <Music size={11} />
          Room #{room.id.slice(0, 8)}
        </p>
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/blindtest/room/${room.id}`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/blindtest/room/${room.id}`} className="group media-card">
        {inner}
      </Link>
      {room.canEditVisibility ? (
        <LibraryVisibilityToggle entity="blindtest_room" id={room.id} visibility={vis} />
      ) : (
        <p
          className="rounded-xl border px-3 py-2 text-xs text-[color:var(--muted)]"
          style={{ borderColor: "#283041", background: "#131822" }}
        >
          Visibilité définie par l&apos;hôte ({vis === "public" ? "public" : "privé"}).
        </p>
      )}
    </div>
  );
}
