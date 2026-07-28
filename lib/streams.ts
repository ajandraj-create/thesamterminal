/**
 * Binance public WebSocket streams (no key, no auth) — market data domain.
 * Built client-side; each helper returns a ready-to-open URL.
 */
const WS = "wss://data-stream.binance.vision";

export function miniTickerStream(symbols: string[]): string {
  return `${WS}/stream?streams=${symbols.map((s) => `${s.toLowerCase()}@miniTicker`).join("/")}`;
}

export function tradeStream(symbol: string): string {
  return `${WS}/ws/${symbol.toLowerCase()}@trade`;
}

export function depthStream(symbol: string, levels: 10 | 20 = 20): string {
  return `${WS}/ws/${symbol.toLowerCase()}@depth${levels}@100ms`;
}

export function klineStream(symbol: string, interval: string): string {
  return `${WS}/ws/${symbol.toLowerCase()}@kline_${interval}`;
}
