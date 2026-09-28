import { NextResponse } from "next/server";
import { searchYoutubeVideo } from "@/lib/youtube";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist") ?? "";
  const title = searchParams.get("title") ?? "";
  const album = searchParams.get("album") ?? "";

  if (!artist.trim() || !title.trim()) {
    return NextResponse.json({ videoId: null }, { status: 400 });
  }

  try {
    const result = await searchYoutubeVideo(artist, title, album || null);
    if (!result) {
      return NextResponse.json({ videoId: null });
    }
    return NextResponse.json({
      videoId: result.videoId,
      title: result.title,
      channelTitle: result.channelTitle,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { videoId: null, error: "Erreur lors de la recherche YouTube" },
      { status: 502 },
    );
  }
}
