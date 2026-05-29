import { NextRequest, NextResponse } from "next/server";

const WGER_BASE = (process.env.WGER_API_BASE ?? "https://wger.de/api/v2").replace(/\/$/, "");

export const dynamic = "force-dynamic";

/**
 * Thin proxy to the public Wger API (avoids exposing a separate client integration).
 * Example: GET /api/wger/exerciseinfo/?language=2&limit=20
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const segment = path.join("/");
  const target = new URL(`${WGER_BASE}/${segment}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  try {
    const res = await fetch(target.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    console.error("[wger-proxy]", err);
    return NextResponse.json({ error: "Wger proxy failed" }, { status: 502 });
  }
}
