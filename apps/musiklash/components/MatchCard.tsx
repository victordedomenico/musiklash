"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { usePreviewVolume } from "@/lib/audio-volume";

export type BracketTrack = {
  seed: number;
  deezerTrackId: number;
  title: string;
  artist: string;
  preview_url: string;
  cover_url: string | null;
};

async function fetchFreshPreview(deezerTrackId: number): Promise<string> {
  const res = await fetch(`/api/deezer/track/${deezerTrackId}`);
  const data = await res.json() as { preview?: string };
  return data.preview ?? "";
}

export default function MatchCard({
  a,
  b,
  onPick,
  roundLabel,
}: {
  a: BracketTrack;
  b: BracketTrack;
  onPick: (winnerSeed: number) => void;
  roundLabel: string;
}) {
  const [playing, setPlaying] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { volume } = usePreviewVolume();
  // Fresh preview URLs fetched on mount (les URLs Deezer signées expirent)
  const [previewA, setPreviewA] = useState(a.preview_url);
  const [previewB, setPreviewB] = useState(b.preview_url);

  useEffect(() => {
    fetchFreshPreview(a.deezerTrackId).then((url) => { if (url) setPreviewA(url); }).catch(() => {});
    fetchFreshPreview(b.deezerTrackId).then((url) => { if (url) setPreviewB(url); }).catch(() => {});
  }, [a.deezerTrackId, b.deezerTrackId]);

  useEffect(() => {
    return () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  const toggle = (seed: number, url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        setPlaying(null);
        setCurrentTime(0);
      };
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime ?? 0);
      };
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration ?? 30);
      };
      audioRef.current.volume = volume;
    }
    const el = audioRef.current;
    if (playing === seed) {
      el.pause();
      setPlaying(null);
      return;
    }
    el.pause();
    el.volume = volume;
    el.src = url;
    el.load();
    setPlaying(seed);
    setCurrentTime(0);
    el.play().catch((err: unknown) => {
      console.warn("Audio playback failed:", err);
      setPlaying(null);
    });
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="card p-4 sm:p-6">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
        {roundLabel}
      </p>
      <div className="mt-4 grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-4">
        <Side
          track={a}
          previewUrl={previewA}
          playing={playing === a.seed}
          currentTime={currentTime}
          duration={duration}
          onToggle={toggle}
          onPick={onPick}
          onSeek={handleSeek}
        />
        <div className="mx-auto text-lg font-black text-[color:var(--muted)] h-10 w-10 flex items-center justify-center rounded-full bg-[color:var(--surface-2)]">
          VS
        </div>
        <Side
          track={b}
          previewUrl={previewB}
          playing={playing === b.seed}
          currentTime={currentTime}
          duration={duration}
          onToggle={toggle}
          onPick={onPick}
          onSeek={handleSeek}
        />
      </div>
    </div>
  );
}

function Side({
  track,
  previewUrl,
  playing,
  currentTime,
  duration,
  onToggle,
  onPick,
  onSeek,
}: {
  track: BracketTrack;
  previewUrl: string;
  playing: boolean;
  currentTime: number;
  duration: number;
  onToggle: (seed: number, url: string) => void;
  onPick: (seed: number) => void;
  onSeek: (time: number) => void;
}) {
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center flex-1 w-full text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={track.cover_url ?? ""}
        alt=""
        className="h-32 w-32 rounded-xl bg-[color:var(--surface-2)] object-cover shadow-lg sm:h-40 sm:w-40 md:h-48 md:w-48"
      />
      <div className="mt-4 w-full px-2 max-w-[240px]">
        <p className="font-semibold line-clamp-1">{track.title}</p>
        <p className="text-sm text-[color:var(--muted)] line-clamp-1">{track.artist}</p>

        {/* Audio Player Controls */}
        <div className="mt-4 flex flex-col gap-2">
          {/* Progress Bar */}
          <div className="flex items-center gap-2 text-[10px] text-[color:var(--muted)]">
            <span className="w-6 text-right">{playing ? formatTime(currentTime) : "0:00"}</span>
            <input
              type="range"
              min={0}
              max={playing ? duration : 30}
              step={0.1}
              value={playing ? currentTime : 0}
              onChange={(e) => {
                if (playing) onSeek(parseFloat(e.target.value));
              }}
              disabled={!playing}
              className="flex-1 h-1.5 appearance-none rounded-full bg-[color:var(--surface-2)] outline-none accent-[color:var(--accent)] cursor-pointer disabled:cursor-auto disabled:opacity-50"
            />
            <span className="w-6 text-left">{playing ? formatTime(duration) : "0:30"}</span>
          </div>

          {/* Action Buttons */}
          <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onToggle(track.seed, previewUrl)}
            className="btn-ghost w-full justify-center text-sm sm:flex-1"
            >
              {playing ? <Pause size={14} className="shrink-0" /> : <Play size={14} className="shrink-0" />}
              {playing ? "Pause" : "Écouter"}
            </button>
            <button
              type="button"
              onClick={() => onPick(track.seed)}
            className="btn-primary w-full justify-center text-sm sm:flex-1"
            >
              Voter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
