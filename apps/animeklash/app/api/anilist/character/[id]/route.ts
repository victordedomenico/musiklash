import { NextRequest, NextResponse } from "next/server";
import { getCharacterById } from "@klash/content-adapter";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const character = await getCharacterById(Number(id));
  if (!character) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ character });
}
