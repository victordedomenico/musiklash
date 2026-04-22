"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Visibility } from "@/app/my-brackets/actions";
import {
  deleteBattleFeatRoom,
  deleteBattleFeatSoloSession,
  deleteBlindtest,
  deleteBlindtestSession,
  deleteBracket,
  deleteBracketGame,
  deleteTierlist,
  deleteTierlistSession,
  updateBattleFeatRoomVisibility,
  updateBattleFeatSoloVisibility,
  updateBlindtestSessionVisibility,
  updateBlindtestVisibility,
  updateBracketGameVisibility,
  updateBracketVisibility,
  updateTierlistSessionVisibility,
  updateTierlistVisibility,
} from "@/app/my-brackets/actions";

type Entity =
  | "bracket"
  | "tierlist"
  | "blindtest"
  | "battlefeat_solo"
  | "battlefeat_room"
  | "bracket_game"
  | "tierlist_session"
  | "blindtest_session";

export default function LibraryVisibilityToggle({
  entity,
  id,
  visibility,
  showVisibility = true,
  showDelete = true,
}: {
  entity: Entity;
  id: string;
  visibility: Visibility;
  showVisibility?: boolean;
  showDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(next: Visibility) {
    if (next === visibility || pending) return;
    setError(null);
    startTransition(async () => {
      let res:
        | { ok: true }
        | { error: string }
        | undefined;
      switch (entity) {
        case "bracket":
          res = await updateBracketVisibility(id, next);
          break;
        case "tierlist":
          res = await updateTierlistVisibility(id, next);
          break;
        case "blindtest":
          res = await updateBlindtestVisibility(id, next);
          break;
        case "battlefeat_solo":
          res = await updateBattleFeatSoloVisibility(id, next);
          break;
        case "battlefeat_room":
          res = await updateBattleFeatRoomVisibility(id, next);
          break;
        case "bracket_game":
          res = await updateBracketGameVisibility(id, next);
          break;
        case "tierlist_session":
          res = await updateTierlistSessionVisibility(id, next);
          break;
        case "blindtest_session":
          res = await updateBlindtestSessionVisibility(id, next);
          break;
      }
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    if (pending || !showDelete) return;
    const confirmed = window.confirm("Supprimer définitivement cet élément ?");
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      let res:
        | { ok: true }
        | { error: string }
        | undefined;
      switch (entity) {
        case "bracket":
          res = await deleteBracket(id);
          break;
        case "tierlist":
          res = await deleteTierlist(id);
          break;
        case "blindtest":
          res = await deleteBlindtest(id);
          break;
        case "battlefeat_solo":
          res = await deleteBattleFeatSoloSession(id);
          break;
        case "battlefeat_room":
          res = await deleteBattleFeatRoom(id);
          break;
        case "bracket_game":
          res = await deleteBracketGame(id);
          break;
        case "tierlist_session":
          res = await deleteTierlistSession(id);
          break;
        case "blindtest_session":
          res = await deleteBlindtestSession(id);
          break;
      }
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{ borderColor: "#283041", background: "#131822" }}
      role="group"
      aria-label="Visibilité"
    >
      {showVisibility ? (
        <>
          <p
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: "var(--muted-strong)" }}
          >
            Publication
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="btn-chip"
              data-active={visibility === "private"}
              onClick={() => apply("private")}
            >
              Publié — Privé
            </button>
            <button
              type="button"
              disabled={pending}
              className="btn-chip"
              data-active={visibility === "public"}
              onClick={() => apply("public")}
            >
              Publié — Public
            </button>
          </div>
        </>
      ) : null}
      {showDelete ? (
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="btn-chip mt-2"
          style={{ borderColor: "#7f1d1d", color: "#fca5a5", background: "rgba(127, 29, 29, 0.2)" }}
        >
          Supprimer
        </button>
      ) : null}
      {error ? (
        <p className="mt-1.5 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
