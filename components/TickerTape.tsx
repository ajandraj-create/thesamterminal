"use client";

import Link from "next/link";
import { useLiveTickers } from "@/hooks/useLiveTicker";
import { FEATURED, QUOTE_ASSET } from "@/lib/binance";
import { fmtCrypto, fmtPct } from "@/lib/format";

const SYMBOLS = FEATURED.map((b) => `${b}${QUOTE_ASSET}`);

/** Scrolling live ticker tape across the top — every price is a real WebSocket tick. */
export default function TickerTape() {
  const { ticks } = useLiveTickers(SYMBOLS);
  const items = SYMBOLS.map((s) => {
    const t = ticks[s];
    const base = s.replace(QUOTE_ASSET, "");
    const pct = t ? ((t.price - t.open24h) / t.open24h) * 100 : null;
    return { base, price: t?.price ?? null, pct, dir: t?.direction ?? "flat" };
  });
  const row = (suffix: string) => (
    <div className="flex shrink-0 items-center" aria-hidden={suffix === "b"}>
      {items.map((i) => (
        <Link
          key={`${i.base}-${suffix}`}
          href={`/coin/${i.base}`}
          className="flex items-center gap-2 px-4 py-1.5 border-r border-edge hover:bg-slate-500/10 transition whitespace-nowrap"
        >
          <span className="font-mono text-xs font-semibold text-slate-200">{i.base}</span>
          <span className={`font-mono text-xs tabular-nums transition-colors duration-300 ${i.dir === "up" ? "text-bull" : i.dir === "down" ? "text-bear" : "text-slate-300"}`}>
            {i.price != null ? fmtCrypto(i.price) : "…"}
          </span>
          <span className={`font-mono text-[10px] tabular-nums ${(i.pct ?? 0) >= 0 ? "text-bull" : "text-bear"}`}>
            {/* glyph + color: direction stays readable for colorblind users */}
            {i.pct != null ? `${i.pct >= 0 ? "\u25B2" : "\u25BC"} ${fmtPct(i.pct)}` : ""}
          </span>
        </Link>
      ))}
    </div>
  );
  return (
    <div className="border-b border-edge bg-panel/60 backdrop-blur overflow-hidden">
      <div className="flex animate-tape hover:[animation-play-state:paused] w-max">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
