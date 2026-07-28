import { NextResponse } from "next/server";
import { FEATURED, QUOTE_ASSET, getKlines } from "@/lib/binance";
import { cached } from "@/lib/cache";
import { macd, rsi, sma } from "@/lib/indicators";

export interface ScreenRow {
  base: string;
  price: number;
  rsi14: number | null;
  above200: boolean | null;
  macdCross: "bullish" | "bearish" | null;
  volumeSpike: boolean;
  volatility: "high" | "normal";
  changePct30d: number;
}

export async function GET() {
  try {
    const { value } = await cached("screener", 900, async () => {
      const rows = await Promise.all(
        FEATURED.map(async (b): Promise<ScreenRow | null> => {
          const k = await getKlines(`${b}${QUOTE_ASSET}`, "1d", 250);
          if (k.source === "demo" || k.data.length < 60) return null;
          const closes = k.data.map((c) => c.close);
          const vols = k.data.map((c) => c.volume);
          const price = closes[closes.length - 1];
          const s200 = sma(closes, 200);
          const m = macd(closes);
          const mPrev = macd(closes.slice(0, -1));
          let cross: ScreenRow["macdCross"] = null;
          if (m && mPrev) {
            if (mPrev.histogram <= 0 && m.histogram > 0) cross = "bullish";
            else if (mPrev.histogram >= 0 && m.histogram < 0) cross = "bearish";
          }
          const avgVol = sma(vols.slice(0, -1), 20);
          const rets = closes.slice(-30).map((c, i, a) => (i ? Math.abs(c / a[i - 1] - 1) : 0));
          const avgMove = rets.reduce((x, y) => x + y, 0) / Math.max(1, rets.length - 1);
          return {
            base: b,
            price,
            rsi14: rsi(closes, 14),
            above200: s200 != null ? price > s200 : null,
            macdCross: cross,
            volumeSpike: !!(avgVol && vols[vols.length - 1] > 1.8 * avgVol),
            volatility: avgMove > 0.045 ? "high" : "normal",
            changePct30d: closes.length > 30 ? ((price - closes[closes.length - 31]) / closes[closes.length - 31]) * 100 : 0,
          };
        })
      );
      return rows.filter((r): r is ScreenRow => r !== null);
    });
    return NextResponse.json({ data: value, source: value.length ? "live" : "demo" }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
  } catch {
    return NextResponse.json({ data: [], source: "demo" });
  }
}
