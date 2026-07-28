"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useLiveTickers } from "@/hooks/useLiveTicker";
import { toSymbol } from "@/lib/binance";
import { Ticker24 } from "@/lib/types";
import { fmtCrypto, fmtPct } from "@/lib/format";

export default function WatchlistClient() {
  const { tickers, remove, ready } = useWatchlist();
  const [snapshots, setSnapshots] = useState<Record<string, Ticker24>>({});
  const symbols = tickers.map(toSymbol);
  const { ticks } = useLiveTickers(symbols);

  useEffect(() => {
    if (!ready || !tickers.length) return;
    let cancelled = false;
    Promise.all(
      tickers.map((t) =>
        fetch(`/api/ticker/${t}`).then((r) => r.json()).then((j) => [toSymbol(t), j.data] as const).catch(() => null)
      )
    ).then((rows) => {
      if (cancelled) return;
      const map: Record<string, Ticker24> = {};
      rows.forEach((r) => { if (r && r[1]) map[r[0]] = r[1]; });
      setSnapshots(map);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tickers.join(",")]);

  if (!ready) return null;
  if (tickers.length === 0) {
    return (
      <div className="glass rounded-2xl border border-edge p-10 text-center">
        <p className="text-slate-200 font-semibold">Your watchlist is empty</p>
        <p className="text-sm text-muted mt-1">Open any coin and press “Watch” to track it here with live prices.</p>
        <Link href="/coin/BTC" className="inline-block mt-4 text-sm text-ai hover:underline">Try BTC →</Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-edge overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-muted font-mono border-b border-edge">
            <th className="px-4 py-3">Coin</th>
            <th className="px-4 py-3 text-right">Price (live)</th>
            <th className="px-4 py-3 text-right">24h %</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {tickers.map((base) => {
            const symbol = toSymbol(base);
            const t = ticks[symbol];
            const snap = snapshots[symbol];
            const price = t?.price ?? snap?.price ?? null;
            const open = t?.open24h ?? (snap ? snap.price - snap.change : null);
            const pct = price != null && open ? ((price - open) / open) * 100 : snap?.changePercent ?? null;
            const dir = t?.direction ?? "flat";
            return (
              <tr key={base} className="border-b border-edge last:border-0 hover:bg-slate-500/5 transition">
                <td className="px-4 py-3">
                  <Link href={`/coin/${base}`} className="font-mono font-semibold text-slate-100 hover:text-ai transition">
                    {base}<span className="text-muted font-normal">/USDT</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    key={`${price}-${dir}`}
                    className={`font-mono tabular-nums ${dir === "up" ? "animate-flashUp" : dir === "down" ? "animate-flashDown" : "text-slate-200"}`}
                  >
                    {price != null ? fmtCrypto(price) : "…"}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums ${(pct ?? 0) >= 0 ? "text-bull" : "text-bear"}`}>
                  {pct != null ? fmtPct(pct) : "…"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(base)} aria-label={`Remove ${base}`} className="text-muted hover:text-bear transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
