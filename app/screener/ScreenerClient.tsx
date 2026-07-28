"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowUp, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { fmtCrypto, fmtPct } from "@/lib/format";
import Sparkline from "@/components/Sparkline";
import { quickSignal, TONE_CLASS } from "@/lib/badges";

interface Row {
  base: string; price: number; rsi14: number | null; above200: boolean | null;
  macdCross: "bullish" | "bearish" | null; volumeSpike: boolean;
  volatility: "high" | "normal"; changePct30d: number;
}

const FILTERS = [
  { id: "above200", label: "Above 200 SMA", fn: (r: Row) => r.above200 === true },
  { id: "below200", label: "Below 200 SMA", fn: (r: Row) => r.above200 === false },
  { id: "oversold", label: "RSI oversold (<30)", fn: (r: Row) => r.rsi14 != null && r.rsi14 < 30 },
  { id: "overbought", label: "RSI overbought (>70)", fn: (r: Row) => r.rsi14 != null && r.rsi14 > 70 },
  { id: "bullCross", label: "Bullish MACD cross", fn: (r: Row) => r.macdCross === "bullish" },
  { id: "bearCross", label: "Bearish MACD cross", fn: (r: Row) => r.macdCross === "bearish" },
  { id: "volume", label: "Volume spike", fn: (r: Row) => r.volumeSpike },
  { id: "hot", label: "High volatility", fn: (r: Row) => r.volatility === "high" },
] as const;

type SortKey = "base" | "rsi14" | "changePct30d" | "price";

export default function ScreenerClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [spotlight, setSpotlight] = useState<Row | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("changePct30d");
  const [desc, setDesc] = useState(true);

  useEffect(() => {
    fetch("/api/screener")
      .then((r) => r.json())
      .then((j) => { if (j.data?.length) { setRows(j.data); setSpotlight(j.data[0]); } else setFailed(true); })
      .catch(() => setFailed(true));
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const fns = FILTERS.filter((f) => active.has(f.id)).map((f) => f.fn);
    return [...rows.filter((r) => fns.every((fn) => fn(r)))].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va == null) return 1; if (vb == null) return -1;
      return desc ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
  }, [rows, active, sortKey, desc]);

  const counts = useMemo(() => rows ? {
    bull: rows.filter((r) => r.macdCross === "bullish").length,
    oversold: rows.filter((r) => r.rsi14 != null && r.rsi14 < 30).length,
    overbought: rows.filter((r) => r.rsi14 != null && r.rsi14 > 70).length,
    above: rows.filter((r) => r.above200 === true).length,
    volume: rows.filter((r) => r.volumeSpike).length,
    hot: rows.filter((r) => r.volatility === "high").length,
  } : null, [rows]);

  if (failed) return <p className="text-sm text-dim">Scanner unavailable — Binance data unreachable from this network.</p>;

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="px-3 py-2.5 text-left sticky top-0 bg-panel/95 backdrop-blur z-10">
      <button onClick={() => sortKey === k ? setDesc(!desc) : (setSortKey(k), setDesc(true))} className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-mono hover:text-slate-200 transition ${sortKey === k ? "text-gold" : "text-dim"}`}>
        {label}{sortKey === k && (desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div className="grid xl:grid-cols-[1fr_280px] gap-5 items-start">
      <div className="space-y-4 min-w-0">
        {/* summary cards */}
        {counts ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {([
              ["Above 200 SMA", counts.above, "text-bull"],
              ["Bullish Cross", counts.bull, "text-bull"],
              ["Oversold", counts.oversold, "text-warn"],
              ["Overbought", counts.overbought, "text-warn"],
              ["Vol Spike", counts.volume, "text-gold"],
              ["High Vol", counts.hot, "text-bear"],
            ] as const).map(([label, n, tone]) => (
              <div key={label} className="glass rounded-xl border border-edge px-3 py-2.5 hover:border-gold/30 transition">
                <div className={`font-mono text-2xl font-bold tabular-nums ${tone}`}>{n}</div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-dim font-mono mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass h-14 rounded-xl border border-edge animate-pulse" />)}</div>
        )}

        {/* filters */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-mono text-dim uppercase tracking-[0.14em] mr-1">Filter:</span>
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setActive((p) => { const n = new Set(p); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; })}
              className={`rounded-full border px-3 py-1 text-xs font-mono transition active:scale-95 ${active.has(f.id) ? "bg-gold/15 text-gold border-gold/40 gold-ring" : "border-edgesoft text-dim hover:text-muted"}`}>
              {f.label}
            </button>
          ))}
          {active.size > 0 && (
            <button onClick={() => setActive(new Set())} className="rounded-full px-3 py-1 text-xs font-mono text-dim hover:text-bear border border-transparent hover:border-bear/30 transition">clear</button>
          )}
          {rows && <span className="ml-auto text-[11px] font-mono text-dim">{filtered.length} / {rows.length} coins</span>}
        </div>

        {/* table */}
        {!rows ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass h-12 rounded-xl border border-edge animate-pulse" />)}</div>
        ) : (
          <div className="glass rounded-2xl border border-edge overflow-x-auto max-h-[620px] overflow-y-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-edgesoft">
                  <Th label="Coin" k="base" />
                  <Th label="Price" k="price" />
                  <Th label="RSI 14" k="rsi14" />
                  <th className="px-3 py-2.5 sticky top-0 bg-panel/95 backdrop-blur z-10 text-[10px] uppercase tracking-[0.14em] text-dim font-mono">200 SMA</th>
                  <th className="px-3 py-2.5 sticky top-0 bg-panel/95 backdrop-blur z-10 text-[10px] uppercase tracking-[0.14em] text-dim font-mono">MACD</th>
                  <th className="px-3 py-2.5 sticky top-0 bg-panel/95 backdrop-blur z-10 text-[10px] uppercase tracking-[0.14em] text-dim font-mono">Signal</th>
                  <th className="px-3 py-2.5 sticky top-0 bg-panel/95 backdrop-blur z-10 text-[10px] uppercase tracking-[0.14em] text-dim font-mono">Flags</th>
                  <Th label="30d" k="changePct30d" />
                  <th className="px-3 py-2.5 sticky top-0 bg-panel/95 backdrop-blur z-10 text-[10px] uppercase tracking-[0.14em] text-dim font-mono">7d</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-xs text-dim">No coins match every selected condition right now.</td></tr>
                ) : filtered.map((r) => {
                  const sig = quickSignal(r);
                  const isSpot = spotlight?.base === r.base;
                  return (
                    <tr key={r.base}
                      onClick={() => setSpotlight(r)}
                      className={`border-b border-edgesoft/60 last:border-0 cursor-pointer transition ${isSpot ? "bg-gold/8 border-l-2 border-l-gold" : "hover:bg-gold/5"}`}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {isSpot && <ChevronRight className="h-3 w-3 text-gold" />}
                          <Link href={`/coin/${r.base}`} onClick={(e) => e.stopPropagation()} className="font-mono font-bold text-slate-100 hover:text-gold transition">{r.base}</Link>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-muted text-xs">{fmtCrypto(r.price)}</td>
                      <td className={`px-3 py-2.5 font-mono tabular-nums text-xs ${r.rsi14 == null ? "text-dim" : r.rsi14 > 70 ? "text-warn" : r.rsi14 < 30 ? "text-warn" : "text-muted"}`}>{r.rsi14?.toFixed(1) ?? "—"}</td>
                      <td className={`px-3 py-2.5 font-mono text-xs ${r.above200 == null ? "text-dim" : r.above200 ? "text-bull" : "text-bear"}`}>{r.above200 == null ? "—" : r.above200 ? "above" : "below"}</td>
                      <td className={`px-3 py-2.5 font-mono text-xs ${r.macdCross === "bullish" ? "text-bull" : r.macdCross === "bearish" ? "text-bear" : "text-dim"}`}>{r.macdCross ?? "—"}</td>
                      <td className="px-3 py-2.5"><span className={`rounded-full border px-2 py-px font-mono text-[9px] ${TONE_CLASS[sig.tone]}`}>{sig.label}</span></td>
                      <td className="px-3 py-2.5 font-mono text-[10px] space-x-1">
                        {r.volumeSpike && <span className="rounded-full border border-gold/40 text-gold px-1.5 py-px">VOL</span>}
                        {r.volatility === "high" && <span className="rounded-full border border-bear/40 text-bear px-1.5 py-px">HOT</span>}
                      </td>
                      <td className={`px-3 py-2.5 font-mono tabular-nums text-xs ${r.changePct30d >= 0 ? "text-bull" : "text-bear"}`}>{fmtPct(r.changePct30d)}</td>
                      <td className="px-3 py-2.5"><Sparkline base={r.base} up={r.changePct30d >= 0} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: spotlight + legend */}
      <aside className="space-y-4">
        {spotlight ? (
          <div className="glass rounded-2xl border border-gold/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-gold font-mono">Spotlight</div>
                <Link href={`/coin/${spotlight.base}`} className="text-xl font-bold text-slate-100 hover:text-gold transition font-mono">{spotlight.base}<span className="text-dim text-sm">/USDT</span></Link>
              </div>
              <Link href={`/coin/${spotlight.base}`} className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-mono text-gold hover:bg-gold/20 transition">Open terminal →</Link>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["Price", fmtCrypto(spotlight.price), "text-slate-100"],
                ["RSI 14", spotlight.rsi14?.toFixed(1) ?? "—", spotlight.rsi14 != null && spotlight.rsi14 > 70 ? "text-warn" : spotlight.rsi14 != null && spotlight.rsi14 < 30 ? "text-warn" : "text-muted"],
                ["200 SMA", spotlight.above200 == null ? "—" : spotlight.above200 ? "Above" : "Below", spotlight.above200 ? "text-bull" : "text-bear"],
                ["30d Change", fmtPct(spotlight.changePct30d), spotlight.changePct30d >= 0 ? "text-bull" : "text-bear"],
              ].map(([label, value, tone]) => (
                <div key={label as string} className="rounded-xl border border-edgesoft bg-ink/40 p-2.5">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-dim font-mono">{label}</div>
                  <div className={`font-mono text-sm tabular-nums font-semibold mt-0.5 ${tone}`}>{value}</div>
                </div>
              ))}
            </div>

            {(() => { const sig = quickSignal(spotlight); return (
              <div className={`rounded-xl border p-2.5 ${TONE_CLASS[sig.tone]}`}>
                <div className="text-[10px] uppercase tracking-[0.14em] font-mono mb-1">Signal Command</div>
                <div className="font-semibold text-sm">{sig.label}</div>
              </div>
            ); })()}

            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono mb-1.5">Conditions met</div>
              <div className="flex flex-wrap gap-1">
                {spotlight.above200 && <span className="rounded-full border border-bull/40 text-bull px-2 py-px font-mono text-[10px]">Above 200 SMA</span>}
                {spotlight.macdCross === "bullish" && <span className="rounded-full border border-bull/40 text-bull px-2 py-px font-mono text-[10px]">MACD bullish cross</span>}
                {spotlight.macdCross === "bearish" && <span className="rounded-full border border-bear/40 text-bear px-2 py-px font-mono text-[10px]">MACD bearish cross</span>}
                {spotlight.rsi14 != null && spotlight.rsi14 < 30 && <span className="rounded-full border border-warn/40 text-warn px-2 py-px font-mono text-[10px]">RSI oversold</span>}
                {spotlight.rsi14 != null && spotlight.rsi14 > 70 && <span className="rounded-full border border-warn/40 text-warn px-2 py-px font-mono text-[10px]">RSI overbought</span>}
                {spotlight.volumeSpike && <span className="rounded-full border border-gold/40 text-gold px-2 py-px font-mono text-[10px]">Volume spike</span>}
                {spotlight.volatility === "high" && <span className="rounded-full border border-bear/40 text-bear px-2 py-px font-mono text-[10px]">High volatility</span>}
                {!spotlight.above200 && !spotlight.macdCross && spotlight.rsi14 != null && spotlight.rsi14 >= 30 && spotlight.rsi14 <= 70 && <span className="text-[10px] text-dim font-mono">No extreme conditions</span>}
              </div>
            </div>

            <p className="text-[10px] text-dim leading-relaxed">Click any row to spotlight that coin. Tap &ldquo;Open terminal&rdquo; for full chart, order book, and paper trading.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl border border-edge p-4 text-center text-sm text-dim">Click a row to see its analysis spotlight</div>
        )}

        {/* scanner legend */}
        <div className="glass rounded-2xl border border-edge p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">Signal Legend</div>
          <ul className="space-y-2 text-[11px] font-mono">
            {[
              ["Buy Setup", "bull", "Above 200 SMA, RSI 45–70, healthy"],
              ["Watch", "warn", "Oversold or near key level"],
              ["Hold", "neutral", "No extreme conditions"],
              ["Sell Pressure", "warn", "RSI > 72, overbought"],
              ["Avoid", "bear", "Below 200 SMA, bearish"],
              ["High Risk", "bear", "Volatile + below 200 SMA"],
            ].map(([label, tone, desc]) => (
              <li key={label as string} className="flex items-start gap-2">
                <span className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] mt-0.5 ${tone === "bull" ? "text-bull border-bull/40" : tone === "warn" ? "text-warn border-warn/40" : tone === "bear" ? "text-bear border-bear/40" : "text-muted border-edgesoft"}`}>{label}</span>
                <span className="text-dim leading-tight">{desc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl border border-edge p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-dim"><Activity className="h-3.5 w-3.5 text-gold" /> Sort by column header</div>
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-dim"><TrendingUp className="h-3.5 w-3.5 text-bull" /> Click row to spotlight</div>
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-dim"><TrendingDown className="h-3.5 w-3.5 text-bear" /> Stack filters for intersection</div>
        </div>
      </aside>
    </div>
  );
}
