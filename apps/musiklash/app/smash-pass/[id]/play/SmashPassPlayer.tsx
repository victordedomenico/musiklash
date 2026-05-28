"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import SmashPassGameCard from "@/components/smash-pass/SmashPassGameCard";
import SmashPassControls from "@/components/smash-pass/SmashPassControls";
import SmashPassProgress from "@/components/smash-pass/SmashPassProgress";
import SmashPassCommunityStats from "@/components/smash-pass/SmashPassCommunityStats";
import TrackPreviewBar from "@/components/TrackPreviewBar";
import { useTrackPreview } from "@/lib/use-track-preview";
import type {
  SmashPassChoice,
  SmashPassItemData,
  SmashPassItemStatsSnapshot,
  SmashPassItemType,
} from "@/lib/smash-pass";
import {
  deleteTransientSmashPass,
  finishSmashPassSession,
  startSmashPassSession,
  submitSmashPassChoice,
} from "./actions";

const ITEM_LABELS: Record<SmashPassItemType, string> = {
  track: "Morceau",
  album: "Album",
  artist: "Artiste",
};

type Props = {
  smashPassId: string;
  title: string;
  itemType: SmashPassItemType;
  items: SmashPassItemData[];
  transient?: boolean;
};

export default function SmashPassPlayer({
  smashPassId,
  title,
  itemType,
  items,
  transient = false,
}: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [smashCount, setSmashCount] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const [previousItem, setPreviousItem] = useState<SmashPassItemData | null>(null);
  const [previousStats, setPreviousStats] =
    useState<SmashPassItemStatsSnapshot | null>(null);
  const [voting, setVoting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [pending, startTransition] = useTransition();
  const initRef = useRef(false);
  const { nowPlaying, isPlaying, playTrack, toggle, stop, isPlayingKey } =
    useTrackPreview();

  const currentItem = items[position] ?? null;
  const itemLabel = ITEM_LABELS[itemType];

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void startSmashPassSession(smashPassId).then((res) => {
      if ("sessionId" in res && res.sessionId) setSessionId(res.sessionId);
    });
  }, [smashPassId]);

  useEffect(() => {
    if (!transient) return;
    return () => {
      void deleteTransientSmashPass(smashPassId);
    };
  }, [transient, smashPassId]);

  const handlePreview = useCallback(() => {
    if (!currentItem?.previewUrl) return;
    const key = `sp-${currentItem.externalId}`;
    if (isPlayingKey(key)) {
      toggle();
      return;
    }
    void playTrack(
      key,
      currentItem.title,
      currentItem.previewUrl,
      currentItem.externalId,
    );
  }, [currentItem, isPlayingKey, toggle, playTrack]);

  const handleVote = useCallback(
    (choice: SmashPassChoice) => {
      if (!sessionId || !currentItem || voting || finished) return;
      setVoting(true);
      stop();

      void submitSmashPassChoice(
        sessionId,
        itemType,
        currentItem.externalId,
        position,
        choice,
      ).then((res) => {
        setVoting(false);
        if ("error" in res && res.error) return;

        setSmashCount(res.smashCount ?? smashCount);
        setPassCount(res.passCount ?? passCount);
        setPreviousItem(currentItem);
        setPreviousStats(res.stats ?? null);

        const next = position + 1;
        if (next >= items.length) {
          setFinished(true);
          void finishSmashPassSession(sessionId);
        } else {
          setPosition(next);
        }
      });
    },
    [
      sessionId,
      currentItem,
      voting,
      finished,
      itemType,
      position,
      items.length,
      smashCount,
      passCount,
      stop,
    ],
  );

  if (finished) {
    return (
      <div className="text-center py-12 space-y-6">
        <h2 className="text-2xl font-black">Terminé !</h2>
        <p className="text-[color:var(--muted)]">
          {smashCount} smash · {passCount} pass sur {items.length} {itemLabel.toLowerCase()}
          {items.length > 1 ? "s" : ""}
        </p>
        {sessionId ? (
          <Link
            href={`/smash-pass/${smashPassId}/results/${sessionId}`}
            className="btn-primary inline-flex"
          >
            Voir le récap
          </Link>
        ) : null}
        <Link href="/create" className="btn-ghost block">
          Créer un autre deck
        </Link>
      </div>
    );
  }

  if (!sessionId || !currentItem) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[color:var(--muted)]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
          MusiKlash Smash
        </p>
        <h1 className="mt-1 text-lg font-bold text-[color:var(--muted)]">{title}</h1>
      </div>

      <SmashPassGameCard
        item={currentItem}
        itemType={itemType}
        onPreview={currentItem.previewUrl ? handlePreview : undefined}
        isPreviewPlaying={
          currentItem.previewUrl
            ? isPlayingKey(`sp-${currentItem.externalId}`)
            : false
        }
      />

      <SmashPassProgress
        current={position + 1}
        total={items.length}
        itemLabel={itemLabel}
      />

      <SmashPassControls
        smashCount={smashCount}
        passCount={passCount}
        disabled={voting || pending}
        onVote={handleVote}
      />

      <SmashPassCommunityStats item={previousItem} stats={previousStats} />

      {nowPlaying ? (
        <TrackPreviewBar
          title={nowPlaying.title}
          isPlaying={isPlaying}
          onToggle={toggle}
        />
      ) : null}
    </div>
  );
}
