import { NextRequest, NextResponse } from "next/server";
import { getKlines, Interval, isValidBase, toSymbol } from "@/lib/binance";

const ALLOWED: Interval[] = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

export async function GET(req: NextRequest, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const base = raw ?? "";
  if (!isValidBase(base)) return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
  const i = req.nextUrl.searchParams.get("interval") ?? "1h";
  const interval = (ALLOWED.includes(i as Interval) ? i : "1h") as Interval;
  const limit = Math.min(1000, Math.max(50, parseInt(req.nextUrl.searchParams.get("limit") ?? "600", 10) || 600));
  const endRaw = req.nextUrl.searchParams.get("endTime");
  const endTime = endRaw && /^\d{10,16}$/.test(endRaw) ? parseInt(endRaw, 10) : undefined;
  const out = await getKlines(toSymbol(base), interval, limit, endTime);
  const secs = out.source === "live" ? (endTime ? 86400 : 10) : 0;
  return NextResponse.json(out, secs ? { headers: { "Cache-Control": `public, s-maxage=${secs}, stale-while-revalidate=${secs * 2}` } } : undefined);
}
