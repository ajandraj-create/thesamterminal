"use client";

import { useEffect } from "react";
import { useLiveTickers } from "@/hooks/useLiveTicker";
import { usePaperStore } from "@/hooks/usePaperStore";
import { Bias, Ticker24 } from "@/lib/types";
import { fmtCompact, fmtCrypto, fmtPct, fmtSigned } from "@/lib/format";
import WsStatusDot from "./WsStatusDot";
import WatchlistButton from "./WatchlistButton";

const BIAS_STYLE: Record<string, string> = {
  "Strong Bullish": "bg-bull/15 text-bull border-bull/40",
  Bullish: "bg-bull/15 text-bull border-bull/40",
  "Moderately Bullish": "bg-bull/10 text-bull border-bull/30",
  Neutral: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  Mixed: "bg-warn/15 text-warn border-warn/40",
  "Moderately Bearish": "bg-bear/10 text-bear border-bear/30",
  Bearish: "bg-bear/15 text-bear border-bear/40",
  "Strong Bearish": "bg-bear/15 text-bear border-bear/40",
};

export default function CoinHeader({
  base,
  symbol,
  initial,
  bias,
  demo,
}: {
  base: string;
  symbol: string;
  initial: Ticker24;
  bias: Bias;
  demo: boolean;
}) {
  const { ticks, status } = useLiveTickers([symbol]);
  const t = ticks[symbol];
  const processTick = usePaperStore((st) => st.processTick);
  useEffect(() => {
    if (t) processTick(symbol, base, t.price);
  }, [t, symbol, base, processTick]);
  const price = t?.price ?? initial.price;
  const open = t?.open24h ?? initial.price - initial.change;
  const change = price - open;
  const pct = open ? (change / open) * 100 : initial.changePercent;
  const up = change >= 0;
  const dir = t?.direction ?? "flat";

  return (
    <div className="glass rounded-2xl border border-edge p-5 animate-fadeUp">
      {demo && (
        <div className="mb-3 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          Demo fallback data — the Binance data API is unreachable from this network right now. Everything is clearly labelled until live data resumes.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
              {base}<span className="text-muted text-base">/USDT</span>
            </h1>
            <span className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${BIAS_STYLE[bias] ?? BIAS_STYLE.Neutral}`}>
              {bias}
            </span>
            <WatchlistButton ticker={base} />
          </div>
          <p className="text-sm text-muted mt-1 font-mono">
            24h H {fmtCrypto(t?.high24h ?? initial.high)} · L {fmtCrypto(t?.low24h ?? initial.low)} · Vol {fmtCompact(initial.volumeQuote)} USDT
          </p>
        </div>
        <div className="text-right">
          <div
            key={`${price}-${dir}`}
            className={`text-3xl font-bold font-mono tabular-nums text-slate-100 ${dir === "up" ? "animate-flashUp" : dir === "down" ? "animate-flashDown" : ""}`}
          >
            ${fmtCrypto(price)}
          </div>
          <div className={`font-mono text-sm tabular-nums ${up ? "text-bull" : "text-bear"}`}>
            {fmtSigned(change)} ({fmtPct(pct)}) 24h
          </div>
          <div className="mt-1.5"><WsStatusDot status={demo ? "offline" : status} /></div>
        </div>
      </div>
    </div>
  );
}
