"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TierlistBoard, { type TierItem } from "@/components/TierlistBoard";
import { type TierlistSavePayload } from "@/lib/tierlist-tiers";
import { saveTierlistSession } from "./actions";

export default function TierlistPlayer({
  tierlistId,
  tracks,
}: {
  tierlistId: string;
  tracks: TierItem[];
}) {
  const router = useRouter();
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const handleSave = (payload: TierlistSavePayload) => {
    setError(null);
    startTransition(async () => {
      const res = await saveTierlistSession(tierlistId, payload);
      if ("error" in res) {
        setError(res.error ?? "Erreur inconnue.");
      } else {
        setSavedSessionId(res.id);
        router.refresh();
      }
    });
  };

  if (savedSessionId) {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/tierlist/${tierlistId}/results/${savedSessionId}`
        : "";
    return (
      <div className="card p-8 text-center mt-6">
        <p className="text-xl font-bold">Tierlist sauvegardée 🎉</p>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Partage le lien ci-dessous avec tes amis.
        </p>
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
            Copier
          </button>
        </div>
        <button
          onClick={() => setSavedSessionId(null)}
          className="btn-ghost mt-4 text-sm"
        >
          Continuer à modifier
        </button>
      </div>
    );
  }

  return (
    <>
      <TierlistBoard
        tierlistId={tierlistId}
        tracks={tracks}
        onSave={handleSave}
        saving={saving}
      />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </>
  );
}
