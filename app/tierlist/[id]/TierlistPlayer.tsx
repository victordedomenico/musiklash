"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TierlistBoard, { type TierItem, type TierlistBoardTexts } from "@/components/TierlistBoard";
import { type TierlistSavePayload } from "@/lib/tierlist-tiers";
import type { Dictionary } from "@/lib/i18n";
import TrackPicker from "@/components/TrackPicker";
import { MAX_BRACKET_TRACKS } from "@/lib/bracket";
import { saveTierlistSession, updateTierlistTracks } from "./actions";

export default function TierlistPlayer({
  tierlistId,
  tracks,
  boardTexts,
  playerTexts,
  transient = false,
  canEdit,
  savedDraft,
}: {
  tierlistId: string;
  tracks: TierItem[];
  boardTexts: TierlistBoardTexts;
  playerTexts: Dictionary["tierlistPlayer"];
  transient?: boolean;
  canEdit: boolean;
  savedDraft: unknown;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState(() =>
    tracks.map((track) => ({
      deezer_track_id: track.deezerTrackId,
      title: track.title,
      artist: track.artist,
      cover_url: track.coverUrl,
      preview_url: "",
    })),
  );
  const [updating, startUpdate] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const promotedRef = useRef(false);

  const handleSave = (payload: TierlistSavePayload) => {
    setError(null);
    startTransition(async () => {
      const res = await saveTierlistSession(tierlistId, payload);
      if ("error" in res) {
        setError(res.error ?? "Erreur inconnue.");
        return;
      }
      if (transient) {
        promotedRef.current = true;
      }
      setSavedSessionId(res.id);
      router.refresh();
    });
  };

  if (savedSessionId) {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/tierlist/${tierlistId}/results/${savedSessionId}`
        : "";
    return (
      <div className="card p-8 text-center mt-6">
        <p className="text-xl font-bold">{playerTexts.savedTitle}</p>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{playerTexts.savedSubtitle}</p>
        {transient ? (
          <p className="mt-2 text-xs text-amber-300">Résultat sauvegardé en Publié — Privé.</p>
        ) : null}
        <div className="mt-4 flex gap-2 justify-center flex-wrap">
          <input
            readOnly
            value={shareUrl}
            className="input max-w-sm text-xs"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl).catch(() => {})}
            className="btn-primary text-sm"
          >
            {playerTexts.copy}
          </button>
        </div>
        <button onClick={() => setSavedSessionId(null)} className="btn-ghost mt-4 text-sm">
          {playerTexts.continueEditing}
        </button>
      </div>
    );
  }

  return (
    <>
      {canEdit ? (
        <section className="mb-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {!editing ? (
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => {
                setSelection(
                  tracks.map((track) => ({
                    deezer_track_id: track.deezerTrackId,
                    title: track.title,
                    artist: track.artist,
                    cover_url: track.coverUrl,
                    preview_url: "",
                  })),
                );
                setEditing(true);
              }}
            >
              Modifier les morceaux
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-bold">Modifier les morceaux</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Ajoute ou retire des éléments : tes placements conservés restent en place et les
                  nouveaux seront à classer.
                </p>
              </div>
              <TrackPicker
                size={MAX_BRACKET_TRACKS}
                selected={selection}
                onChange={setSelection}
                unlimited
              />
              {editError ? (
                <p role="alert" className="text-sm text-red-400">
                  {editError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={updating || selection.length < 2}
                  className="btn-primary disabled:opacity-50"
                  onClick={() => {
                    setEditError(null);
                    startUpdate(async () => {
                      const result = await updateTierlistTracks(
                        tierlistId,
                        tracks.map((track) => track.position),
                        selection,
                      );
                      if (result.error) {
                        setEditError(result.error);
                        return;
                      }
                      setEditing(false);
                      router.refresh();
                    });
                  }}
                >
                  {updating ? "Enregistrement…" : "Enregistrer les modifications"}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={updating}
                  onClick={() => setEditing(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}
      {transient ? (
        <p className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Mode non publié : ton brouillon reste disponible sur cet appareil pour que tu puisses le
          reprendre. Sauvegarde et partage pour conserver un résultat permanent.
        </p>
      ) : null}
      <TierlistBoard
        key={tracks.map((track) => `${track.position}:${track.deezerTrackId}`).join(",")}
        tierlistId={tierlistId}
        tracks={tracks}
        savedDraft={savedDraft}
        onSave={handleSave}
        saving={saving}
        texts={boardTexts}
      />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </>
  );
}
