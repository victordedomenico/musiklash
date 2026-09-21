import { NextRequest, NextResponse } from "next/server";
import { leaveBracketRoom } from "@/app/bracket-game/room/[roomId]/actions";
import { leaveTierlistRoom } from "@/app/tierlist/room/[roomId]/actions";

export const runtime = "nodejs";

function hasSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }

  const roomId = request.nextUrl.searchParams.get("roomId");
  const kind = request.nextUrl.searchParams.get("kind");
  if (!roomId || (kind !== "bracket" && kind !== "tierlist")) {
    return NextResponse.json({ error: "Room invalide." }, { status: 400 });
  }

  const result =
    kind === "bracket" ? await leaveBracketRoom(roomId) : await leaveTierlistRoom(roomId);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
