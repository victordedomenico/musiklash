import { NextResponse } from "next/server";
import { getMbArtistReleases, mbReleaseToCollection } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const releases = await getMbArtistReleases(id, 20);
    return NextResponse.json({ results: releases.map(mbReleaseToCollection) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
