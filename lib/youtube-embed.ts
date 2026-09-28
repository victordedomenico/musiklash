/** Client-safe YouTube embed URL builder (no server secrets). */
export function youtubeEmbedUrl(
  videoId: string,
  opts?: { autoplay?: boolean; origin?: string },
): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    enablejsapi: "1",
  });
  if (opts?.autoplay) params.set("autoplay", "1");
  if (opts?.origin) params.set("origin", opts.origin);
  // Embeds must stay on youtube.com — music.youtube.com sets X-Frame-Options: SAMEORIGIN.
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params}`;
}

/** Open the track in the YouTube Music web player. */
export function youtubeMusicWatchUrl(videoId: string): string {
  return `https://music.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function postYoutubeCommand(
  iframe: HTMLIFrameElement | null,
  command: "playVideo" | "pauseVideo" | "stopVideo",
): void {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func: command, args: [] }),
    "*",
  );
}
