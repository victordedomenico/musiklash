import Link from "next/link";
import { Eye, EyeOff, Heart, Users } from "lucide-react";
import LibraryVisibilityToggle from "@/components/LibraryVisibilityToggle";

export type SmashPassSummary = {
  id: string;
  title: string;
  visibility: string;
  itemType: string;
  itemCount?: number;
  coverUrl?: string | null;
};

export type SmashPassRoomSummary = {
  id: string;
  status: string;
  title: string;
  itemCount: number;
  hostName: string;
  visibility: string;
  itemType: string;
  canEditVisibility?: boolean;
};

const itemTypeLabel: Record<string, string> = {
  anime: "Titres d'animé",
  character: "Persos d'animé",
  arc: "Arcs d'animé",
  track: "Openings/Endings",
  album: "Titres d'animé",
  artist: "Persos d'animé",
};

const roomStatusLabel: Record<string, string> = {
  waiting: "Disponible",
  playing: "En cours",
  finished: "Terminée",
};

export function SmashPassCard({
  sp,
  libraryEditor,
}: {
  sp: SmashPassSummary;
  libraryEditor?: boolean;
}) {
  const vis = sp.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb">
        {sp.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sp.coverUrl}
            alt=""
            className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/20 to-blue-500/20">
            <Heart
              size={36}
              className="text-[color:var(--muted)] transition group-hover:text-[color:var(--accent)]"
            />
          </div>
        )}
        <span className="media-pill absolute right-2 top-2">Smash or Pass</span>
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
      </div>
      <div className="p-4">
        <p className="line-clamp-1 font-semibold">{sp.title}</p>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">
          {itemTypeLabel[sp.itemType] ?? sp.itemType}
          {sp.itemCount != null
            ? ` · ${sp.itemCount} élément${sp.itemCount > 1 ? "s" : ""}`
            : ""}
        </p>
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/smash-pass/${sp.id}/play`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/smash-pass/${sp.id}/play`} className="group media-card">
        {inner}
      </Link>
      <LibraryVisibilityToggle entity="smash_pass" id={sp.id} visibility={vis} />
    </div>
  );
}

export function SmashPassRoomCard({
  room,
  libraryEditor,
}: {
  room: SmashPassRoomSummary;
  libraryEditor?: boolean;
}) {
  const vis = room.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-blue-500/20">
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
          {roomStatusLabel[room.status] ?? room.status}
        </span>
      </div>
      <div className="space-y-1 p-4">
        <p className="line-clamp-1 font-semibold">{room.title}</p>
        <p className="text-xs text-[color:var(--muted)]">
          {itemTypeLabel[room.itemType] ?? room.itemType} · {room.itemCount} élément
          {room.itemCount > 1 ? "s" : ""} · Hôte: {room.hostName}
        </p>
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/smash-pass/room/${room.id}`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/smash-pass/room/${room.id}`} className="group media-card">
        {inner}
      </Link>
      {room.canEditVisibility ? (
        <LibraryVisibilityToggle entity="smash_pass_room" id={room.id} visibility={vis} />
      ) : null}
    </div>
  );
}
