import { NextResponse } from "next/server";
import { getFeaturedTickers } from "@/lib/binance";

export async function GET() {
  return NextResponse.json(await getFeaturedTickers(), { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } });
}
