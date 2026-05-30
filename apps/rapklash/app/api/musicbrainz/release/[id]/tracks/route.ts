import { NextResponse } from "next/server";
import { getMbReleaseRecordings, mbRecordingToItem } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const recs = await getMbReleaseRecordings(id, 30);
    return NextResponse.json({ results: recs.map(mbRecordingToItem) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
