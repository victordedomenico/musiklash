import { NextResponse } from "next/server";
import { getPetsBySpecies } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ species: string }> },
) {
  const { species } = await params;
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const items = await getPetsBySpecies(species, q || undefined);
    return NextResponse.json({ results: items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
