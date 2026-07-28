import { NextRequest, NextResponse } from "next/server";
import { getKlines, isValidBase, toSymbol } from "@/lib/binance";
import { cached } from "@/lib/cache";

/**
 * Batched sparkline endpoint: one request returns recent closes for many coins,
 * replacing the previous one-fetch-per-sparkline fan-out.
 * GET /api/sparklines?bases=BTC,ETH,SOL&interval=1h&limit=48
 */
export async function GET(req: NextRequest) {
  const basesParam = req.nextUrl.searchParams.get("bases") ?? "";
  const interval = (req.nextUrl.searchParams.get("interval") ?? "1h") as "1h";
  const limit = Math.min(96, Math.max(12, parseInt(req.nextUrl.searchParams.get("limit") ?? "48", 10) || 48));
  const bases = basesParam.split(",").map((b) => b.trim().toUpperCase()).filter(isValidBase).slice(0, 24);
  if (!bases.length) return NextResponse.json({ data: {} });

  const allowed = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];
  const safeInterval = (allowed.includes(interval) ? interval : "1h") as "1h";

  const entries = await Promise.all(bases.map(async (base) => {
    try {
      const { value } = await cached(`spark:${base}:${safeInterval}:${limit}`, 120, async () => {
        const k = await getKlines(toSymbol(base), safeInterval, limit);
        return k.data.map((c) => c.close);
      });
      return [base, value] as const;
    } catch {
      return [base, [] as number[]] as const;
    }
  }));

  const data: Record<string, number[]> = {};
  for (const [base, closes] of entries) data[base] = closes;
  return NextResponse.json({ data });
}
