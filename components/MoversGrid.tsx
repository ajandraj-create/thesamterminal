"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveTickers } from "@/hooks/useLiveTicker";
import { Ticker24 } from "@/lib/types";
import { fmtCompact, fmtCrypto, fmtPct } from "@/lib/format";

/** Live coin cards — initial 24h stats via REST, then real tick updates via WebSocket. */
export default function MoversGrid() {
  const [coins, setCoins] = useState<Ticker24[]>([]);
  const [demo, setDemo] = useState(false);
  const { ticks } = useLiveTickers(coins.map((c) => c.symbol));

  useEffect(() => {
    fetch("/api/movers")
      .then((r) => r.json())
      .then((j) => { setCoins((j.data ?? []).slice(0, 8)); setDemo(j.source === "demo"); })
      .catch(() => {});
  }, []);

  if (!coins.length) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl border border-edge h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {demo && <p className="text-[11px] text-warn font-mono mb-2">DEMO DATA — Binance unreachable from this network</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {coins.map((c, i) => {
          const t = ticks[c.symbol];
          const price = t?.price ?? c.price;
          const open = t?.open24h ?? c.price - c.change;
          const pct = open ? ((price - open) / open) * 100 : c.changePercent;
          const dir = t?.direction ?? "flat";
          return (
            <Link
              key={c.symbol}
              href={`/coin/${c.base}`}
              className="glass rounded-2xl border border-edge p-4 hover:border-ai/40 hover:-translate-y-0.5 transition animate-fadeUp"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-slate-100">{c.base}</span>
                <span className={`font-mono text-xs ${pct >= 0 ? "text-bull" : "text-bear"}`}>{pct >= 0 ? "\u25B2" : "\u25BC"} {fmtPct(pct)}</span>
              </div>
              <div
                key={`${price}-${dir}`}
                className={`font-mono text-lg tabular-nums mt-1 text-slate-100 ${dir === "up" ? "animate-flashUp" : dir === "down" ? "animate-flashDown" : ""}`}
              >
                ${fmtCrypto(price)}
              </div>
              <div className="text-[11px] text-muted font-mono mt-0.5">Vol {fmtCompact(c.volumeQuote)} USDT</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
