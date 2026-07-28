"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useLiveTickers } from "@/hooks/useLiveTicker";
import { Ticker24 } from "@/lib/types";
import { fmtCompact, fmtCrypto, fmtPct } from "@/lib/format";
import { quickSignal, ScreenRowLite, TONE_CLASS } from "@/lib/badges";
import Sparkline from "@/components/Sparkline";

type SortKey = "base" | "price" | "changePercent" | "volumeQuote";

interface GlobalStats {
  totalMarketCap: number | null; totalVolume: number | null;
  mcapChange24h: number | null; btcDominance: number | null; ethDominance: number | null;
}

export default function MarketsClient() {
  const [coins, setCoins] = useState<Ticker24[]>([]);
  const [screen, setScreen] = useState<ScreenRowLite[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [fng, setFng] = useState<{ value: number; label: string } | null>(null);
  const [demo, setDemo] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("volumeQuote");
  const [desc, setDesc] = useState(true);
  const { ticks } = useLiveTickers(coins.map((c) => c.symbol));

  useEffect(() => {
    fetch("/api/movers").then((r) => r.json()).then((j) => { setCoins(j.data ?? []); setDemo(j.source === "demo"); }).catch(() => {});
    fetch("/api/screener").then((r) => r.json()).then((j) => setScreen(j.data ?? [])).catch(() => {});
    fetch("/api/global").then((r) => (r.ok ? r.json() : null)).then((j) => j && setGlobalStats(j)).catch(() => {});
    fetch("/api/sentiment").then((r) => r.json()).then((j) => j?.value != null && setFng(j)).catch(() => {});
  }, []);

  const byBase = useMemo(() => new Map(screen.map((r) => [r.base, r])), [screen]);

  const live = useMemo(() => coins.map((c) => {
    const t = ticks[c.symbol];
    const price = t?.price ?? c.price;
    const open = t?.open24h ?? c.price - c.change;
    return { ...c, price, changePercent: open ? ((price - open) / open) * 100 : c.changePercent, dir: t?.direction ?? "flat" };
  }), [coins, ticks]);

  const rows = useMemo(() => {
    const filtered = filter ? live.filter((c) => c.base.includes(filter.toUpperCase())) : live;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === "string" ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
      return desc ? -cmp : cmp;
    });
  }, [live, filter, sortKey, desc]);

  const movers = useMemo(() => {
    if (!live.length) return null;
    const byChg = [...live].sort((a, b) => b.changePercent - a.changePercent);
    const byVol = [...live].sort((a, b) => b.volumeQuote - a.volumeQuote);
    const volatile = [...screen].filter((r) => r.volatility === "high").map((r) => r.base);
    const byMom = [...screen].sort((a, b) => b.changePct30d - a.changePct30d);
    return {
      gainers: byChg.slice(0, 3), losers: byChg.slice(-3).reverse(),
      volume: byVol.slice(0, 3),
      volatile: live.filter((c) => volatile.includes(c.base)).slice(0, 3),
      strong: byMom.slice(0, 3), weak: byMom.slice(-3).reverse(),
    };
  }, [live, screen]);

  const moodPct = live.length ? live.filter((c) => c.changePercent > 0).length / live.length : 0.5;

  const header = (label: string, key: SortKey, align = "text-right") => (
    <th className={`px-3 py-3 ${align} sticky top-0 bg-panel/95 backdrop-blur z-10`}>
      <button onClick={() => (sortKey === key ? setDesc(!desc) : (setSortKey(key), setDesc(true)))} className={`inline-flex items-center gap-1 hover:text-slate-200 transition ${sortKey === key ? "text-gold" : ""}`}>
        {label}{sortKey === key && (desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );

  const SummaryCard = ({ label, value, sub, tone = "text-slate-100" }: { label: string; value: string; sub?: string; tone?: string }) => (
    <div className="glass rounded-2xl border border-edge p-3.5 hover:border-gold/30 transition">
      <div className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">{label}</div>
      <div className={`font-mono text-base font-bold tabular-nums mt-1 ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-dim mt-0.5">{sub}</div>}
    </div>
  );

  const MoverPanel = ({ title, items, tone }: { title: string; items: { base: string; v: string }[]; tone: string }) => (
    <div className="glass rounded-2xl border border-edge p-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono mb-2">{title}</div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.base}>
            <Link href={`/coin/${it.base}`} className="flex justify-between font-mono text-xs hover:text-gold transition">
              <span className="text-slate-100 font-semibold">{it.base}</span>
              <span className={tone}>{it.v}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  if (!coins.length) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass h-24 rounded-2xl border border-edge animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-5">
      {demo && <p className="text-[11px] text-warn font-mono">DEMO DATA — Binance unreachable from this network</p>}

      {/* summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryCard label="Total Market Cap" value={globalStats?.totalMarketCap ? "$" + fmtCompact(globalStats.totalMarketCap) : "—"} sub={globalStats?.mcapChange24h != null ? fmtPct(globalStats.mcapChange24h) + " 24h" : "CoinGecko unavailable"} tone={globalStats?.mcapChange24h != null && globalStats.mcapChange24h < 0 ? "text-bear" : "text-bull"} />
        <SummaryCard label="Global 24h Volume" value={globalStats?.totalVolume ? "$" + fmtCompact(globalStats.totalVolume) : "—"} />
        <SummaryCard label="BTC Dominance" value={globalStats?.btcDominance != null ? globalStats.btcDominance.toFixed(1) + "%" : "—"} />
        <SummaryCard label="ETH Dominance" value={globalStats?.ethDominance != null ? globalStats.ethDominance.toFixed(1) + "%" : "—"} />
        <SummaryCard label="Fear & Greed" value={fng ? String(fng.value) : "—"} sub={fng?.label} tone={fng ? (fng.value >= 60 ? "text-bull" : fng.value >= 40 ? "text-warn" : "text-bear") : undefined} />
        <SummaryCard label="Market Mood" value={moodPct >= 0.6 ? "Risk-on" : moodPct >= 0.4 ? "Mixed" : "Risk-off"} sub={`${Math.round(moodPct * 100)}% green`} tone={moodPct >= 0.6 ? "text-bull" : moodPct >= 0.4 ? "text-warn" : "text-bear"} />
      </div>

      {/* heatmap + movers */}
      <div className="grid xl:grid-cols-[1fr_280px] gap-4 items-start">
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-2 font-mono uppercase tracking-[0.16em]">Heatmap · 24h</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {live.map((c) => {
                const mag = Math.min(1, Math.abs(c.changePercent) / 8);
                const bg = c.changePercent >= 0 ? `rgba(46,189,133,${0.10 + mag * 0.5})` : `rgba(229,72,77,${0.10 + mag * 0.5})`;
                const r = byBase.get(c.base);
                return (
                  <Link key={c.symbol} href={`/coin/${c.base}`} className="rounded-xl border border-edgesoft p-3.5 hover:border-gold/50 transition group" style={{ background: bg }}>
                    <div className="flex justify-between font-mono text-sm">
                      <span className="font-bold text-slate-100">{c.base}</span>
                      <span className="text-slate-100">{fmtPct(c.changePercent)}</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-200/80 mt-1.5">${fmtCrypto(c.price)}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-mono text-[10px] text-slate-200/60">Vol {fmtCompact(c.volumeQuote)}</span>
                      {r?.rsi14 != null && <span className="font-mono text-[10px] text-slate-200/70">RSI {r.rsi14.toFixed(0)}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* market breadth + signal distribution fills the former gap */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass rounded-2xl border border-edge p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-dim font-mono mb-3">Market Breadth</div>
              {(() => {
                const green = live.filter((c) => c.changePercent > 0).length;
                const red = live.length - green;
                const greenPct = live.length ? (green / live.length) * 100 : 0;
                return (
                  <div>
                    <div className="flex h-3 rounded-full overflow-hidden border border-edgesoft">
                      <div className="bg-bull/70" style={{ width: `${greenPct}%`, transition: "width 0.8s ease" }} />
                      <div className="bg-bear/70 flex-1" />
                    </div>
                    <div className="flex justify-between mt-2 font-mono text-xs">
                      <span className="text-bull">{green} advancing</span>
                      <span className="text-bear">{red} declining</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg border border-edgesoft bg-ink/40 py-2">
                        <div className="font-mono text-lg font-bold text-bull">{Math.round(greenPct)}%</div>
                        <div className="text-[9px] uppercase tracking-[0.12em] text-dim font-mono">green</div>
                      </div>
                      <div className="rounded-lg border border-edgesoft bg-ink/40 py-2">
                        <div className="font-mono text-lg font-bold text-slate-100">{live.length ? fmtPct(live.reduce((a, c) => a + c.changePercent, 0) / live.length) : "—"}</div>
                        <div className="text-[9px] uppercase tracking-[0.12em] text-dim font-mono">avg move</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="glass rounded-2xl border border-edge p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-dim font-mono mb-3">Signal Distribution</div>
              {(() => {
                const sigs = live.map((c) => byBase.get(c.base)).filter(Boolean).map((r) => quickSignal(r!));
                const groups = { bull: sigs.filter((s) => s.tone === "bull").length, warn: sigs.filter((s) => s.tone === "warn").length, bear: sigs.filter((s) => s.tone === "bear").length, neutral: sigs.filter((s) => s.tone === "neutral").length };
                const totalSig = sigs.length || 1;
                return (
                  <div className="space-y-2">
                    {([["Buy Setups", groups.bull, "bg-bull", "text-bull"], ["Watch / Caution", groups.warn, "bg-warn", "text-warn"], ["Avoid / Risk", groups.bear, "bg-bear", "text-bear"], ["Neutral", groups.neutral, "bg-dim", "text-dim"]] as const).map(([label, n, bar, text]) => (
                      <div key={label}>
                        <div className="flex justify-between text-[11px] font-mono mb-1">
                          <span className={text}>{label}</span><span className="text-dim">{n}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-ink/60"><div className={`h-full rounded-full ${bar}`} style={{ width: `${(n / totalSig) * 100}%`, transition: "width 0.8s ease" }} /></div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {movers && (
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-3">
            <MoverPanel title="Top Gainers" items={movers.gainers.map((c) => ({ base: c.base, v: fmtPct(c.changePercent) }))} tone="text-bull" />
            <MoverPanel title="Top Losers" items={movers.losers.map((c) => ({ base: c.base, v: fmtPct(c.changePercent) }))} tone="text-bear" />
            <MoverPanel title="Highest Volume" items={movers.volume.map((c) => ({ base: c.base, v: fmtCompact(c.volumeQuote) }))} tone="text-muted" />
            <MoverPanel title="Most Volatile" items={movers.volatile.map((c) => ({ base: c.base, v: "HOT" }))} tone="text-warn" />
            <MoverPanel title="Strongest 30d" items={movers.strong.map((r) => ({ base: r.base, v: fmtPct(r.changePct30d) }))} tone="text-bull" />
            <MoverPanel title="Weakest 30d" items={movers.weak.map((r) => ({ base: r.base, v: fmtPct(r.changePct30d) }))} tone="text-bear" />
          </div>
        )}
      </div>

      {/* full table */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-200 font-mono uppercase tracking-[0.16em]">All Tracked Markets</h2>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" aria-label="Filter coins"
            className="w-40 rounded-xl border border-edge bg-panel/70 px-3 py-1.5 text-xs font-mono uppercase outline-none focus:border-gold/60 transition" />
        </div>
        <div className="glass rounded-2xl border border-edge overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-dim font-mono border-b border-edgesoft">
                <th className="px-3 py-3 sticky top-0 bg-panel/95 backdrop-blur z-10">#</th>
                {header("Coin", "base", "text-left")}
                {header("Price", "price")}
                {header("24h %", "changePercent")}
                {header("Volume", "volumeQuote")}
                <th className="px-3 py-3 sticky top-0 bg-panel/95 backdrop-blur z-10">Signal</th>
                <th className="px-3 py-3 sticky top-0 bg-panel/95 backdrop-blur z-10">Trend</th>
                <th className="px-3 py-3 text-right sticky top-0 bg-panel/95 backdrop-blur z-10">RSI</th>
                <th className="px-3 py-3 sticky top-0 bg-panel/95 backdrop-blur z-10">7d</th>
                <th className="px-3 py-3 sticky top-0 bg-panel/95 backdrop-blur z-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const r = byBase.get(c.base);
                const sig = r ? quickSignal(r) : null;
                return (
                  <tr key={c.symbol} className="border-b border-edgesoft/60 last:border-0 hover:bg-gold/5 transition">
                    <td className="px-3 py-2.5 font-mono text-xs text-dim">{i + 1}</td>
                    <td className="px-3 py-2.5"><Link href={`/coin/${c.base}`} className="font-mono font-semibold text-slate-100 hover:text-gold transition">{c.base}<span className="text-dim font-normal">/USDT</span></Link></td>
                    <td className="px-3 py-2.5 text-right">
                      <span key={`${c.price}-${c.dir}`} className={`font-mono tabular-nums ${c.dir === "up" ? "animate-flashUp" : c.dir === "down" ? "animate-flashDown" : "text-slate-200"}`}>{fmtCrypto(c.price)}</span>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${c.changePercent >= 0 ? "text-bull" : "text-bear"}`}>{fmtPct(c.changePercent)}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-dim">{fmtCompact(c.volumeQuote)}</td>
                    <td className="px-3 py-2.5">{sig && <span className={`rounded-full border px-2 py-px font-mono text-[9px] ${TONE_CLASS[sig.tone]}`}>{sig.label}</span>}</td>
                    <td className={`px-3 py-2.5 font-mono text-[10px] ${r?.above200 == null ? "text-dim" : r.above200 ? "text-bull" : "text-bear"}`}>{r?.above200 == null ? "—" : r.above200 ? "up" : "down"}</td>
                    <td className={`px-3 py-2.5 text-right font-mono tabular-nums text-xs ${r?.rsi14 == null ? "text-dim" : r.rsi14 > 70 || r.rsi14 < 30 ? "text-warn" : "text-muted"}`}>{r?.rsi14?.toFixed(0) ?? "—"}</td>
                    <td className="px-3 py-2.5"><Sparkline base={c.base} up={c.changePercent >= 0} /></td>
                    <td className="px-3 py-2.5"><Link href={`/coin/${c.base}`} className="rounded-lg border border-gold/30 px-2.5 py-1 text-[10px] font-mono text-gold hover:bg-gold/10 transition">Trade</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
