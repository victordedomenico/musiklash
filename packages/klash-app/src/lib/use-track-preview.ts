"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePreviewVolume } from "@klash/klash-app/lib/audio-volume";

function safePreviewUrl(url: string) {
  return url.replace(/^http:\/\//i, "https://");
}

export function useTrackPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlaying, setNowPlaying] = useState<{ key: string; title: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { volume } = usePreviewVolume();

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setNowPlaying(null);
  }, []);

  const playUrl = useCallback(
    (key: string, title: string, previewUrl: string) => {
      const url = safePreviewUrl(previewUrl);

      if (audioRef.current && nowPlaying?.key === key) {
        if (audioRef.current.paused) {
          void audioRef.current.play().catch(() => null);
        } else {
          audioRef.current.pause();
        }
        return;
      }

      if (!audioRef.current) {
        const audio = new Audio();
        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => { setIsPlaying(false); setNowPlaying(null); };
        audioRef.current = audio;
      }

      const audio = audioRef.current;
      audio.pause();
      audio.volume = volume;
      audio.src = url;
      setNowPlaying({ key, title });
      void audio.play().catch(() => {
        setIsPlaying(false);
        setNowPlaying(null);
      });
    },
    [volume, nowPlaying?.key],
  );

  const playTrack = useCallback(
    async (
      key: string,
      title: string,
      previewUrl: string | null | undefined,
      _externalId?: string | number,
    ) => {
      if (!previewUrl?.trim()) return;

      if (audioRef.current && nowPlaying?.key === key) {
        if (audioRef.current.paused) {
          void audioRef.current.play().catch(() => null);
        } else {
          audioRef.current.pause();
        }
        return;
      }

      playUrl(key, title, previewUrl.trim());
    },
    [playUrl, nowPlaying?.key],
  );

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      void audioRef.current.play().catch(() => null);
    } else {
      audioRef.current.pause();
    }
  }, []);

  const isPlayingKey = useCallback(
    (key: string) => nowPlaying?.key === key && isPlaying,
    [nowPlaying?.key, isPlaying],
  );

  return { nowPlaying, isPlaying, playTrack, toggle, stop, isPlayingKey };
}
