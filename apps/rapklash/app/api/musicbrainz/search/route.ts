import { NextResponse } from "next/server";
import { searchMbRecordings, searchMbReleases, searchMbArtists, mbRecordingToItem, mbReleaseToCollection, mbArtistToEntity } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const kind = searchParams.get("kind") ?? "track";
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    if (kind === "album") {
      const releases = await searchMbReleases(q, 20);
      return NextResponse.json({ results: releases.map(mbReleaseToCollection) });
    }
    if (kind === "artist") {
      const artists = await searchMbArtists(q, 20);
      return NextResponse.json({ results: artists.map(mbArtistToEntity) });
    }
    const recs = await searchMbRecordings(q, 20);
    return NextResponse.json({ results: recs.map(mbRecordingToItem) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
