import Link from "next/link";
import { Clock, Eye, EyeOff, Trophy, Users, Zap } from "lucide-react";
import LibraryVisibilityToggle from "@/components/LibraryVisibilityToggle";

export type StreamClashSummary = {
  id: string;
  title: string;
  visibility: string;
  trackCount?: number;
  coverUrl?: string | null;
};

export type StreamClashRoomSummary = {
  id: string;
  status: string;
  title: string;
  trackCount: number;
  hostName: string;
  visibility: string;
  difficulty: string;
  canEditVisibility?: boolean;
  createdAt: string;
};

export type StreamClashSessionSummary = {
  id: string;
  streamClashId: string;
  title: string;
  difficulty: string;
  score: number;
  totalRounds: number;
  visibility: string;
  createdAt: string;
  coverUrl?: string | null;
};

const difficultyLabel: Record<string, string> = {
  easy: "Facile",
  normal: "Normal",
  hard: "Difficile",
};

const roomStatusLabel: Record<string, string> = {
  waiting: "Disponible",
  playing: "En cours",
  finished: "Terminée",
};

export function StreamClashCard({
  sc,
  libraryEditor,
}: {
  sc: StreamClashSummary;
  libraryEditor?: boolean;
}) {
  const vis = sc.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb">
        {sc.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sc.coverUrl}
            alt=""
            className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
            <Zap
              size={36}
              className="text-[color:var(--muted)] transition group-hover:text-[color:var(--accent)]"
            />
          </div>
        )}
        <span className="media-pill absolute right-2 top-2">Stream Clash</span>
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
        <p className="line-clamp-1 font-semibold">{sc.title}</p>
        {sc.trackCount != null ? (
          <p className="mt-0.5 text-xs text-[color:var(--muted)]">
            {sc.trackCount} morceau{sc.trackCount > 1 ? "x" : ""}
          </p>
        ) : null}
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/stream-clash/${sc.id}`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/stream-clash/${sc.id}`} className="group media-card">
        {inner}
      </Link>
      <LibraryVisibilityToggle entity="stream_clash" id={sc.id} visibility={vis} />
    </div>
  );
}

export function StreamClashRoomCard({
  room,
  libraryEditor,
}: {
  room: StreamClashRoomSummary;
  libraryEditor?: boolean;
}) {
  const vis = room.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-blue-500/20">
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
          {room.trackCount} morceau{room.trackCount > 1 ? "x" : ""} ·{" "}
          {difficultyLabel[room.difficulty] ?? room.difficulty} · Hôte: {room.hostName}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-[color:var(--muted)]">
          <Zap size={11} />
          Room #{room.id.slice(0, 8)}
        </p>
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/stream-clash/room/${room.id}`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/stream-clash/room/${room.id}`} className="group media-card">
        {inner}
      </Link>
      {room.canEditVisibility ? (
        <LibraryVisibilityToggle entity="stream_clash_room" id={room.id} visibility={vis} />
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

export function StreamClashSessionCard({
  session,
  libraryEditor,
}: {
  session: StreamClashSessionSummary;
  libraryEditor?: boolean;
}) {
  const vis = session.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb">
        {session.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.coverUrl}
            alt=""
            className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
            <Zap
              size={36}
              className="text-[color:var(--muted)] transition group-hover:text-[color:var(--accent)]"
            />
          </div>
        )}
        <span className="media-pill absolute right-2 top-2">Solo</span>
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
          {difficultyLabel[session.difficulty] ?? session.difficulty}
        </span>
      </div>
      <div className="p-4">
        <p className="line-clamp-1 font-semibold">{session.title}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Trophy size={14} className="text-yellow-400" />
            {session.score} pts
          </p>
          <span className="flex items-center gap-1 text-xs text-[color:var(--muted)]">
            <Clock size={12} />
            {new Date(session.createdAt).toLocaleDateString("fr-FR")}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">
          {session.totalRounds} manche{session.totalRounds > 1 ? "s" : ""}
        </p>
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/stream-clash/${session.streamClashId}/play`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/stream-clash/${session.streamClashId}/play`} className="group media-card">
        {inner}
      </Link>
      <LibraryVisibilityToggle
        entity="stream_clash_session"
        id={session.id}
        visibility={vis}
      />
    </div>
  );
}
