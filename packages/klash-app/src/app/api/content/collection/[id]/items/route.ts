import { NextResponse } from "next/server";
import { getCurrentVertical } from "@klash/klash-config";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const requirePreview = searchParams.get("requirePreview") !== "false";

  const { contentSource } = getCurrentVertical();

  try {
    const items = await contentSource.getCollectionItems(id, { requirePreview });
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load collection items" }, { status: 502 });
  }
}
