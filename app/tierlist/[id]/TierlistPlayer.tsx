"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TierlistBoard, { type TierItem, type TierlistBoardTexts } from "@/components/TierlistBoard";
import { type TierlistSavePayload } from "@/lib/tierlist-tiers";
import type { Dictionary } from "@/lib/i18n";
import { saveTierlistSession } from "./actions";

export default function TierlistPlayer({
  tierlistId,
  tracks,
  boardTexts,
  playerTexts,
  transient = false,
}: {
  tierlistId: string;
  tracks: TierItem[];
  boardTexts: TierlistBoardTexts;
  playerTexts: Dictionary["tierlistPlayer"];
  transient?: boolean;
}) {
  const router = useRouter();
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
      {transient ? (
        <p className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Mode non publié : ton brouillon reste disponible sur cet appareil pour que tu puisses le
          reprendre. Sauvegarde et partage pour conserver un résultat permanent.
        </p>
      ) : null}
      <TierlistBoard
        tierlistId={tierlistId}
        tracks={tracks}
        onSave={handleSave}
        saving={saving}
        texts={boardTexts}
      />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </>
  );
}
