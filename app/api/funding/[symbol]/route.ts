import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { isValidBase, toSymbol } from "@/lib/binance";

/** Binance futures public data — funding rate + open interest. Hidden gracefully if unreachable. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await ctx.params;
  const base = (raw ?? "").toUpperCase();
  if (!isValidBase(base)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const symbol = toSymbol(base);
  try {
    const { value } = await cached(`funding:${symbol}`, 60, async () => {
      // Try futures hosts in order; some are geo-blocked in certain regions.
      const HOSTS = ["https://fapi.binance.com", "https://fapi.binancefuture.com"];
      const fetchJson = async (path: string) => {
        for (const host of HOSTS) {
          try {
            const r = await fetch(`${host}${path}`, { cache: "no-store" });
            if (r.ok) return await r.json();
          } catch { /* try next host */ }
        }
        throw new Error("futures unavailable");
      };
      const [prem, oi] = await Promise.all([
        fetchJson(`/fapi/v1/premiumIndex?symbol=${symbol}`),
        fetchJson(`/fapi/v1/openInterest?symbol=${symbol}`),
      ]);
      return {
        fundingRate: parseFloat(prem.lastFundingRate) * 100, // % per 8h
        markPrice: parseFloat(prem.markPrice),
        nextFundingTime: prem.nextFundingTime as number,
        openInterest: parseFloat(oi.openInterest),
      };
    });
    return NextResponse.json(value, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
