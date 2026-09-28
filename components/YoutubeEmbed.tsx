"use client";

import { useEffect, useRef, useState } from "react";
import { postYoutubeCommand, youtubeEmbedUrl } from "@/lib/youtube-embed";

export default function YoutubeEmbed({
  videoId,
  title,
  active,
  className = "",
}: {
  videoId: string;
  title: string;
  active: boolean;
  className?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasStartedRef = useRef(false);
  const [origin, setOrigin] = useState("");
  const [src, setSrc] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!origin) return;
    hasStartedRef.current = false;
    setSrc(youtubeEmbedUrl(videoId, { origin }));
  }, [videoId, origin]);

  useEffect(() => {
    if (!origin || !src) return;
    const iframe = iframeRef.current;

    if (active) {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        setSrc(youtubeEmbedUrl(videoId, { autoplay: true, origin }));
        return;
      }
      postYoutubeCommand(iframe, "playVideo");
      return;
    }

    postYoutubeCommand(iframe, "pauseVideo");
  }, [active, videoId, origin, src]);

  if (!origin || !src) {
    return <div className={`bg-[color:var(--surface-2)] ${className}`} aria-hidden="true" />;
  }

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      className={`border-0 ${className}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
