import { NextResponse } from "next/server";
import { getDrinksByBrand, offProductToItem } from "@klash/content-adapter";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ brand: string }> },
) {
  const { brand } = await params;
  try {
    const products = await getDrinksByBrand(decodeURIComponent(brand), 20);
    return NextResponse.json({ results: products.map((p) => offProductToItem(p)) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 502 });
  }
}
