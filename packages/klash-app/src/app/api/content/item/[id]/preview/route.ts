import { NextResponse } from "next/server";
import { getCurrentVertical } from "@klash/klash-config";

// Preview URLs may be signed and short-lived — never cache.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { contentSource } = getCurrentVertical();

  if (!contentSource.refreshItemPreview) {
    return NextResponse.json({ preview: "" });
  }

  try {
    const preview = await contentSource.refreshItemPreview(id);
    return NextResponse.json({ preview: preview ?? "" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to refresh preview" }, { status: 502 });
  }
}
