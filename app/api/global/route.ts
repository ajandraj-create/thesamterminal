import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/** Global market stats via CoinGecko's free public endpoint. Graceful when unreachable. */
export async function GET() {
  try {
    const { value } = await cached("global", 600, async () => {
      // CoinGecko's keyless endpoint works for low volume; if their Demo plan starts
      // requiring a key, set COINGECKO_API_KEY (free, no card) and it's sent automatically.
      const cgKey = process.env.COINGECKO_API_KEY;
      const res = await fetch("https://api.coingecko.com/api/v3/global", {
        cache: "no-store",
        headers: cgKey ? { "x-cg-demo-api-key": cgKey } : undefined,
      });
      if (!res.ok) throw new Error(`coingecko ${res.status}`);
      const j = await res.json();
      const d = j?.data;
      if (!d) throw new Error("empty");
      return {
        totalMarketCap: d.total_market_cap?.usd ?? null,
        totalVolume: d.total_volume?.usd ?? null,
        mcapChange24h: d.market_cap_change_percentage_24h_usd ?? null,
        btcDominance: d.market_cap_percentage?.btc ?? null,
        ethDominance: d.market_cap_percentage?.eth ?? null,
      };
    });
    return NextResponse.json(value, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
