import { NextResponse } from "next/server";
import { getAllSymbols } from "@/lib/binance";

/** Full tradeable USDT symbol universe for search autocomplete. */
export async function GET() {
  try {
    const symbols = await getAllSymbols();
    return NextResponse.json(
      { data: symbols },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ data: [] }, { status: 502 });
  }
}
