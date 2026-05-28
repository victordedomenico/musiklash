import { NextResponse } from "next/server";
import { getCurrentVertical } from "@klash/klash-config";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const { contentSource } = getCurrentVertical();

  try {
    const collections = await contentSource.getEntityCollections(id, limit ? { limit } : undefined);
    return NextResponse.json({ collections });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load entity collections" }, { status: 502 });
  }
}
