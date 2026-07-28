import { NextRequest, NextResponse } from "next/server";
import { getKlines, getTicker24, isValidBase, toSymbol } from "@/lib/binance";
import { assembleAnalysis, ruleBasedSummary, DISCLAIMER } from "@/lib/analysis";
import { Analysis } from "@/lib/types";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const base = (raw ?? "").toUpperCase();
  if (!isValidBase(base)) return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
  const symbol = toSymbol(base);
  const [klines, ticker] = await Promise.all([getKlines(symbol, "1d", 320), getTicker24(symbol)]);
  if (!klines.data.length) {
    return NextResponse.json({ error: "Market data temporarily unavailable." }, { status: 502 });
  }
  const source = klines.source === "demo" || ticker.source === "demo" ? "demo" : "live";
  const price = source === "live" ? ticker.data.price : klines.data[klines.data.length - 1].close;
  const baseA = assembleAnalysis(symbol, klines.data, price, source);
  const analysis: Analysis = { ...baseA, aiSummary: ruleBasedSummary(base, baseA), aiSource: "rule-based", disclaimer: DISCLAIMER };
  return NextResponse.json(analysis, source === "live" ? { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } } : undefined);
}
