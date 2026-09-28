export type YoutubeClientResult = {
  videoId: string;
  title: string | null;
  channelTitle: string | null;
};

export async function fetchYoutubeVideoId(
  artist: string,
  title: string,
  album?: string | null,
): Promise<YoutubeClientResult | null> {
  const params = new URLSearchParams({
    artist: artist.trim(),
    title: title.trim(),
  });
  if (album?.trim()) params.set("album", album.trim());

  const res = await fetch(`/api/youtube/search?${params}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    videoId?: string | null;
    title?: string | null;
    channelTitle?: string | null;
  };
  const videoId = data.videoId?.trim();
  if (!videoId) return null;
  return {
    videoId,
    title: typeof data.title === "string" ? data.title : null,
    channelTitle: typeof data.channelTitle === "string" ? data.channelTitle : null,
  };
}
