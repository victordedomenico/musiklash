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
  const requirePreview = searchParams.get("requirePreview") !== "false";

  const { contentSource } = getCurrentVertical();

  try {
    const items = await contentSource.getEntityTopItems(id, { limit, requirePreview });
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load entity items" }, { status: 502 });
  }
}
