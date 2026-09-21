"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Library, RotateCcw, Swords, X } from "lucide-react";
import {
  forgetMultiplayerRoom,
  MULTIPLAYER_ROOMS_CHANGED_EVENT,
  MULTIPLAYER_ROOMS_STORAGE_KEY,
  parseMultiplayerRooms,
  roomResumeHref,
  type MultiplayerRoomResume,
} from "@/lib/multiplayer-room-resume";

function savedRoomsSnapshot() {
  try {
    return window.localStorage.getItem(MULTIPLAYER_ROOMS_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function ResumeMultiplayerRooms() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const subscribe = useCallback((onStoreChange: () => void) => {
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === MULTIPLAYER_ROOMS_STORAGE_KEY) onStoreChange();
    };
    window.addEventListener("storage", onStorageChange);
    window.addEventListener(MULTIPLAYER_ROOMS_CHANGED_EVENT, onStoreChange);
    return () => {
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener(MULTIPLAYER_ROOMS_CHANGED_EVENT, onStoreChange);
    };
  }, []);
  const savedRooms = useSyncExternalStore(subscribe, savedRoomsSnapshot, () => "");
  const rooms = useMemo(() => parseMultiplayerRooms(savedRooms), [savedRooms]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  if (rooms.length === 0) return null;

  const remove = (room: MultiplayerRoomResume) => {
    forgetMultiplayerRoom(window.localStorage, room);
    window.dispatchEvent(new Event(MULTIPLAYER_ROOMS_CHANGED_EVENT));
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="btn-ghost"
        style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem" }}
        onClick={() => setOpen((current) => !current)}
        aria-label="Reprendre une room collaborative"
        aria-expanded={open}
        aria-controls="multiplayer-room-resume-menu"
      >
        <RotateCcw size={15} />
        <span className="hidden lg:inline">Reprendre</span>
      </button>
      {open ? (
        <div
          id="multiplayer-room-resume-menu"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border p-2 shadow-2xl"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-strong)" }}
        >
          <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Rooms à reprendre
          </p>
          {rooms.map((room) => {
            const Icon = room.kind === "bracket" ? Swords : Library;
            return (
              <div
                key={`${room.kind}:${room.id}`}
                className="group flex items-center gap-2 rounded-xl p-1"
              >
                <Link
                  href={roomResumeHref(room)}
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-white/5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-400/10 text-sky-300">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[color:var(--foreground)]">
                      {room.title || "Room sans titre"}
                    </span>
                    <span className="block text-xs text-[color:var(--muted)]">
                      {room.kind === "bracket" ? "Bracket collaboratif" : "Tierlist collaborative"}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-[color:var(--muted)] opacity-0 transition hover:bg-white/10 hover:text-[color:var(--foreground)] group-hover:opacity-100 focus:opacity-100"
                  onClick={() => remove(room)}
                  aria-label={`Retirer ${room.title || "cette room"} des reprises`}
                  title="Retirer des reprises"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
