import { Candle, Sourced, Ticker24 } from "./types";
import { cached } from "./cache";

/**
 * Binance public market data — no API key required.
 * Uses data-api.binance.vision, the dedicated public market-data domain.
 */
const REST = "https://data-api.binance.vision/api/v3";

export const QUOTE_ASSET = "USDT";

/** Curated, liquid pairs for tape/markets (full search still accepts any base). */
export const FEATURED = [
  "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX",
  "LINK", "DOT", "MATIC", "LTC", "NEAR", "ATOM", "ARB", "OP",
] as const;

export function toSymbol(base: string): string {
  const b = base.trim().toUpperCase();
  return b.endsWith(QUOTE_ASSET) ? b : `${b}${QUOTE_ASSET}`;
}

export function baseOf(symbol: string): string {
  return symbol.toUpperCase().replace(new RegExp(`${QUOTE_ASSET}$`), "");
}

export function isValidBase(b: string): boolean {
  return /^[A-Za-z0-9]{2,12}$/.test(b.trim());
}

export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${REST}${path}`, { cache: "no-store" });
  if (res.status === 429 || res.status === 418) throw new Error("Rate limited by Binance");
  if (!res.ok) throw new Error(`Binance error ${res.status}`);
  return (await res.json()) as T;
}

// ---------- demo fallback (only if Binance is unreachable; always labelled) ----------

function seedFrom(s: string): () => number {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function demoCandles(symbol: string, n = 400, stepSec = 3600): Candle[] {
  const rand = seedFrom(symbol);
  let price = symbol.startsWith("BTC") ? 60000 : symbol.startsWith("ETH") ? 3000 : 5 + rand() * 200;
  const out: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);
  for (let i = n; i > 0; i--) {
    const vol = 0.01 + rand() * 0.025;
    const open = price;
    const close = Math.max(0.0001, open * (1 + (rand() - 0.485) * vol * 2));
    out.push({
      time: now - i * stepSec,
      open, close,
      high: Math.max(open, close) * (1 + rand() * vol),
      low: Math.min(open, close) * (1 - rand() * vol),
      volume: 100 + rand() * 5000,
    });
    price = close;
  }
  return out;
}

// ---------- public API ----------

const INTERVAL_SECONDS: Record<Interval, number> = {
  "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400, "1w": 604800,
};

export async function getKlines(
  symbol: string,
  interval: Interval = "1h",
  limit = 400,
  endTime?: number // unix ms — fetch candles strictly before this time (history pagination)
): Promise<Sourced<Candle[]>> {
  const key = `klines:${symbol}:${interval}:${limit}:${endTime ?? "latest"}`;
  // Historical pages never change — cache them for a long time.
  const ttl = endTime ? 86400 : Math.min(60, Math.max(5, INTERVAL_SECONDS[interval] / 10));
  try {
    const { value } = await cached(key, ttl, async () => {
      type Row = [number, string, string, string, string, string, ...unknown[]];
      const end = endTime ? `&endTime=${endTime}` : "";
      const rows = await rest<Row[]>(`/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${end}`);
      return rows.map((r) => ({
        time: Math.floor(r[0] / 1000),
        open: parseFloat(r[1]),
        high: parseFloat(r[2]),
        low: parseFloat(r[3]),
        close: parseFloat(r[4]),
        volume: parseFloat(r[5]),
      }));
    });
    return { data: value, source: "live" };
  } catch (e) {
    console.error("klines fallback:", (e as Error).message);
    return { data: demoCandles(symbol, 400, INTERVAL_SECONDS[interval]), source: "demo" };
  }
}

function mapTicker(j: Record<string, string>): Ticker24 {
  return {
    symbol: j.symbol,
    base: baseOf(j.symbol),
    price: parseFloat(j.lastPrice),
    change: parseFloat(j.priceChange),
    changePercent: parseFloat(j.priceChangePercent),
    high: parseFloat(j.highPrice),
    low: parseFloat(j.lowPrice),
    volumeBase: parseFloat(j.volume),
    volumeQuote: parseFloat(j.quoteVolume),
  };
}

export async function getTicker24(symbol: string): Promise<Sourced<Ticker24>> {
  try {
    const { value } = await cached(`t24:${symbol}`, 10, async () =>
      mapTicker(await rest<Record<string, string>>(`/ticker/24hr?symbol=${symbol}`))
    );
    return { data: value, source: "live" };
  } catch (e) {
    console.error("ticker fallback:", (e as Error).message);
    const c = demoCandles(symbol, 30, 3600);
    const last = c[c.length - 1];
    const first = c[0];
    return {
      data: {
        symbol, base: baseOf(symbol), price: last.close,
        change: last.close - first.close,
        changePercent: ((last.close - first.close) / first.close) * 100,
        high: Math.max(...c.map((x) => x.high)), low: Math.min(...c.map((x) => x.low)),
        volumeBase: 0, volumeQuote: 0,
      },
      source: "demo",
    };
  }
}

export async function getFeaturedTickers(): Promise<Sourced<Ticker24[]>> {
  try {
    const { value } = await cached("featured", 15, async () => {
      const symbols = FEATURED.map((b) => `"${b}${QUOTE_ASSET}"`).join(",");
      const rows = await rest<Record<string, string>[]>(`/ticker/24hr?symbols=[${symbols}]`);
      const order = new Map(FEATURED.map((b, i) => [`${b}${QUOTE_ASSET}`, i]));
      return rows.map(mapTicker).sort((a, b) => (order.get(a.symbol) ?? 99) - (order.get(b.symbol) ?? 99));
    });
    return { data: value, source: "live" };
  } catch (e) {
    console.error("featured fallback:", (e as Error).message);
    return {
      data: FEATURED.map((b) => {
        const c = demoCandles(`${b}${QUOTE_ASSET}`, 30, 3600);
        const last = c[c.length - 1];
        const first = c[0];
        return {
          symbol: `${b}${QUOTE_ASSET}`, base: b, price: last.close,
          change: last.close - first.close,
          changePercent: ((last.close - first.close) / first.close) * 100,
          high: last.high, low: last.low, volumeBase: 0, volumeQuote: 0,
        };
      }),
      source: "demo",
    };
  }
}

/**
 * Tri-state existence check. "unknown" (Binance unreachable) lets the coin
 * page render with a clearly-labelled fallback instead of silently
 * pretending an unverifiable symbol is real.
 */
export async function symbolExists(symbol: string): Promise<"yes" | "no" | "unknown"> {
  try {
    const { value } = await cached(`exists:${symbol}`, 3600, async () => {
      const res = await fetch(`${REST}/exchangeInfo?symbol=${symbol}`, { cache: "no-store" });
      if (res.ok) return "yes" as const;
      if (res.status === 400 || res.status === 404) return "no" as const;
      throw new Error(`exchangeInfo ${res.status}`);
    });
    return value;
  } catch {
    return "unknown";
  }
}

export interface SymbolInfo { base: string; symbol: string }

/** Every actively TRADING USDT spot pair on Binance (~400), cached 1h. */
export async function getAllSymbols(): Promise<SymbolInfo[]> {
  const { value } = await cached("all-symbols", 3600, async () => {
    type Info = { symbols: { symbol: string; baseAsset: string; quoteAsset: string; status: string; isSpotTradingAllowed?: boolean }[] };
    const j = await rest<Info>("/exchangeInfo?permissions=SPOT");
    return j.symbols
      .filter((s) => s.quoteAsset === QUOTE_ASSET && s.status === "TRADING")
      .map((s) => ({ base: s.baseAsset, symbol: s.symbol }))
      .sort((a, b) => a.base.localeCompare(b.base));
  });
  return value;
}
