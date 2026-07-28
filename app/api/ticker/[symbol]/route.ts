import { NextRequest, NextResponse } from "next/server";
import { getTicker24, isValidBase, toSymbol } from "@/lib/binance";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const base = raw ?? "";
  if (!isValidBase(base)) return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
  const out = await getTicker24(toSymbol(base));
  return NextResponse.json(out, out.source === "live" ? { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } } : undefined);
}
