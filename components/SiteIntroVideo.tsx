"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { hasSeenIntroVideo, INTRO_VIDEO_SRC, markIntroVideoSeen } from "@/lib/intro-video";

type SiteIntroVideoLabels = {
  title: string;
  skip: string;
  unmute: string;
  mute: string;
  close: string;
};

export default function SiteIntroVideo({ labels }: { labels: SiteIntroVideoLabels }) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const dismiss = useCallback(() => {
    markIntroVideoSeen();
    setOpen(false);
    document.body.style.overflow = "";
    videoRef.current?.pause();
  }, []);

  useEffect(() => {
    if (hasSeenIntroVideo()) return;
    // Opening is gated on a browser-only check (localStorage) that can't run
    // during render without a hydration mismatch, so it must happen on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => null);
  }, [open]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted) void video.play().catch(() => null);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/92 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
    >
      <div className="relative w-full max-w-5xl">
        <div className="absolute -top-2 right-0 z-10 flex items-center gap-2 sm:top-0">
          <button
            type="button"
            onClick={toggleMute}
            className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm"
            aria-pressed={!muted}
            aria-label={muted ? labels.unmute : labels.mute}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span className="hidden sm:inline">{muted ? labels.unmute : labels.mute}</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm"
          >
            {labels.skip}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="btn-ghost p-2"
            aria-label={labels.close}
          >
            <X size={20} />
          </button>
        </div>

        <video
          ref={videoRef}
          src={INTRO_VIDEO_SRC}
          className="aspect-video w-full rounded-2xl bg-black shadow-2xl"
          playsInline
          muted={muted}
          onEnded={dismiss}
        />
      </div>
    </div>
  );
}
