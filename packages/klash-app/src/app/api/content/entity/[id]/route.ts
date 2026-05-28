import { NextResponse } from "next/server";
import { getCurrentVertical } from "@klash/klash-config";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { contentSource } = getCurrentVertical();

  try {
    const entity = await contentSource.getEntityById(id);
    if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ entity });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load entity" }, { status: 502 });
  }
}
