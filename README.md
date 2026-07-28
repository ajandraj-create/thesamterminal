# TheSamTerminal

> Your edge. Your market. Your terminal.

### ▶ **[Open the live terminal → thesamterminal.vercel.app](https://thesamterminal.vercel.app)**

A premium black-and-gold **crypto research terminal** — tick-by-tick live prices over Binance public WebSockets, a TradingView-style chart with custom drawing tools, a transparent quant scoring engine, a live news wire, a market screener, and a full paper-trading desk. Built with Next.js 16 + React 19 + TypeScript. **No API keys required.**

Educational market analysis only — not financial advice. Crypto assets are highly volatile.

---

## Highlights

- **Live data, zero keys.** Real-time prices stream from Binance's free public WebSocket; historical candles, global stats, and sentiment come from public REST endpoints. One shared WebSocket connection feeds the entire app.
- **Pro charting.** Candle / line / area, 7 timeframes, infinite history scroll, SMA/EMA/Bollinger/VWAP/Supertrend, log scale, fullscreen, PNG export, and a full **drawing-tools suite** (trend lines, Fib, rectangles, ruler, long/short position boxes with draggable TP/SL, text) that persists per coin.
- **Transparent quant engine.** A 0–100 composite (trend / momentum / structure / volatility) where **every point is explained** — no black box. Drives educational signal labels (Buy Setup / Watch / Hold / Avoid …) with reasons, risks, confidence, and an invalidation level.
- **Paper Trade Desk.** A 100k simulated account executing against **real live prices** — market/limit/stop orders, SL/TP brackets, fees + slippage, positions/orders/history/performance/journal, and an equity badge in the nav.
- **Market Command, Alpha Scanner, Sam Newswire, Watchtower.** Heatmap, breadth, movers, a sortable screener with a spotlight panel, an RSS news wire with sentiment, and a live watchlist.

## Running it locally

```bash
npm install
npm run dev
```

Next will print the local address it's serving on. No configuration or API keys needed — it's fully live out of the box.

## Testing

The quant engine, indicator library, cache, and formatting utilities are covered by unit tests:

```bash
npm test             # 34 tests
npm run test:coverage
```

## Production hardening

- **Next.js 16 + React 19** — no known vulnerabilities reachable from the deployed app. (`npm audit` lists two advisories in dev-only tooling: `sharp`, which is unused because the app doesn't use `next/image`, and `brace-expansion`, which lives under ESLint and never ships.)
- **Bounded LRU cache with optional Redis tier** — set `UPSTASH_REDIS_REST_URL`/`_TOKEN` and the cache is shared across serverless instances; without it, a 500-entry LRU prevents unbounded memory growth.
- **Per-IP rate limiting** (`proxy.ts`) — 120 req/min per client on `/api/*`, protecting the server's Binance quota from abusive clients. IPs are held in memory for one 60-second window and never persisted.
- **Batched live-tick store** — WebSocket messages flush to a Zustand store at most 10×/sec, and shallow per-symbol selectors mean a component re-renders only when *its* symbols tick (previously every consumer re-rendered on every message).
- **Full symbol universe** — search autocompletes across every actively trading Binance USDT spot pair (~400), not just 16 majors.
- **Real feed parsing + word-boundary sentiment** — `fast-xml-parser` handles RSS *and* Atom; keyword matching uses `\b` boundaries so "airdrops" no longer reads as bearish.
- **Session-anchored VWAP** — resets at 00:00 UTC on intraday timeframes instead of drifting with scroll depth.
- **Strict CSP + HSTS and four more security headers**, CDN `Cache-Control` on all API routes, visible TradingView attribution, and colorblind-safe ▲/▼ direction glyphs.

## Tech & architecture

- **Next.js 16 (App Router) + React 19 + TypeScript**, Tailwind, lightweight-charts, zustand
- `lib/binance.ts` — provider with caching + clearly-labelled demo fallback
- `lib/indicators.ts` — SMA, EMA, RSI, MACD, ATR, VWAP, Supertrend, volatility
- `lib/analysis.ts` — quant scoring, signal classification, trade-plan framework
- `lib/drawing.ts` — custom canvas drawing engine over lightweight-charts
- `lib/cache.ts` — two-tier cache (in-memory LRU + optional Upstash) with stale-on-error
- `hooks/useLiveTicker.tsx` — single shared WebSocket fan-out for the whole app
- `hooks/usePaperStore.ts` — persisted paper-trading engine
- API routes proxy public data server-side and batch requests (e.g. `/api/sparklines`)

## Privacy

No accounts, no payments, no tracking. There are no analytics or advertising scripts. Watchlists, paper-trading accounts, drawings, and alerts live in your own browser's localStorage and are never sent to a server. See [/terms](https://thesamterminal.vercel.app/terms) for the full notes.

## License & attributions

Code is **MIT** (see `LICENSE`) © Abhinay Jandrajupalli. Charts use **TradingView Lightweight Charts™** (Apache-2.0; attribution retained in the footer). Market data: Binance public API. Global stats: CoinGecko. Sentiment: alternative.me. Headlines via public RSS (CoinDesk, Cointelegraph, Decrypt) — titles and short snippets only, every item linking to the original publisher. TheSamTerminal is an independent, non-commercial educational project, not affiliated with any of these services, and provides no financial advice. The name refers to its author and has no connection to Bloomberg L.P. or the Bloomberg Terminal.

## Roadmap

Backtesting, multi-chart layouts, more indicators (Ichimoku, ADX, OBV), and Supabase sync for cross-device watchlists/paper accounts.
