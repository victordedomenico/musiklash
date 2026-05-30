import { NextResponse } from "next/server";
import { theCocktailDbContentSource } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const results = await theCocktailDbContentSource.getEntityTopItems(id, { limit: 40 });
    return NextResponse.json({ results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
