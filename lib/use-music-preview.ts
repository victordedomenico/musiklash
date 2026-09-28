"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBracketPreviewSource } from "@/lib/bracket-preview-source";
import { useTrackPreview } from "@/lib/use-track-preview";
import { fetchYoutubeVideoId } from "@/lib/youtube-client";

type YoutubeNowPlaying = {
  key: string;
  title: string;
  artist: string;
  videoId: string;
};

/**
 * Unified Deezer / YouTube Music preview for list-style game UIs
 * (Stream Clash, Smash Pass, etc.).
 */
export function useMusicPreview() {
  const { source, setSource } = useBracketPreviewSource();
  const deezer = useTrackPreview();
  const [youtubeNow, setYoutubeNow] = useState<YoutubeNowPlaying | null>(null);
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const [youtubeLoadingKey, setYoutubeLoadingKey] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    deezer.stop();
    setYoutubeNow(null);
    setYoutubePlaying(false);
    setYoutubeLoadingKey(null);
    // Only react to source flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const stop = useCallback(() => {
    deezer.stop();
    setYoutubeNow(null);
    setYoutubePlaying(false);
    setYoutubeLoadingKey(null);
  }, [deezer]);

  const playDeezerTrack = useCallback(
    async (key: string, title: string, deezerTrackId: number) => {
      if (source !== "deezer") return;
      await deezer.playTrack(key, title, deezerTrackId);
    },
    [deezer, source],
  );

  const playDeezerUrl = useCallback(
    (key: string, title: string, previewUrl: string, deezerTrackId = 0) => {
      if (source !== "deezer") return;
      const safeUrl = previewUrl.replace(/^http:\/\//i, "https://");
      setYoutubeNow(null);
      setYoutubePlaying(false);
      deezer.playUrl(key, title, safeUrl, deezerTrackId);
    },
    [deezer, source],
  );

  const playYoutubeTrack = useCallback(
    async (key: string, title: string, artist: string, album?: string | null) => {
      if (source !== "youtube") return;

      if (youtubeNow?.key === key) {
        setYoutubePlaying((playing) => !playing);
        return;
      }

      const cacheKey = `${artist}::${title}::${album ?? ""}`;
      let videoId = cacheRef.current.get(cacheKey);
      if (videoId === undefined) {
        setYoutubeLoadingKey(key);
        try {
          const res = await fetchYoutubeVideoId(artist, title, album);
          videoId = res?.videoId ?? null;
          cacheRef.current.set(cacheKey, videoId);
        } finally {
          setYoutubeLoadingKey(null);
        }
      }

      if (!videoId) {
        setYoutubeNow(null);
        setYoutubePlaying(false);
        return;
      }

      deezer.stop();
      setYoutubeNow({ key, title, artist, videoId });
      setYoutubePlaying(true);
    },
    [source, youtubeNow?.key, deezer],
  );

  /** Deezer preview URL or YouTube Music resolve — for Battle Feat style UIs. */
  const playFeatPreview = useCallback(
    async (options: {
      key: string;
      title: string;
      artist: string;
      previewUrl?: string | null;
      album?: string | null;
    }) => {
      if (source === "youtube") {
        await playYoutubeTrack(options.key, options.title, options.artist, options.album);
        return;
      }
      if (!options.previewUrl) return;
      playDeezerUrl(options.key, options.title, options.previewUrl);
    },
    [source, playYoutubeTrack, playDeezerUrl],
  );

  const toggle = useCallback(() => {
    if (source === "youtube") {
      if (!youtubeNow) return;
      setYoutubePlaying((playing) => !playing);
      return;
    }
    deezer.toggle();
  }, [source, youtubeNow, deezer]);

  const isPlayingKey = useCallback(
    (key: string) => {
      if (source === "youtube") {
        return youtubeNow?.key === key && youtubePlaying;
      }
      return deezer.isPlayingKey(key);
    },
    [source, youtubeNow?.key, youtubePlaying, deezer],
  );

  return {
    source,
    setSource,
    stop,
    toggle,
    playDeezerTrack,
    playDeezerUrl,
    playYoutubeTrack,
    playFeatPreview,
    isPlayingKey,
    isPlaying: source === "youtube" ? youtubePlaying : deezer.isPlaying,
    nowPlayingTitle:
      source === "youtube" ? (youtubeNow?.title ?? null) : (deezer.nowPlaying?.title ?? null),
    nowPlayingDeezerId: source === "youtube" ? null : (deezer.nowPlaying?.deezerTrackId ?? null),
    youtubeNow,
    youtubePlaying,
    youtubeLoadingKey,
  };
}
