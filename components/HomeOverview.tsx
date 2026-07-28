"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BarChart3, Flame, Gauge, Newspaper, ShieldAlert, TrendingUp } from "lucide-react";
import { useLiveTickers } from "@/hooks/useLiveTicker";
import { Ticker24 } from "@/lib/types";
import { fmtCompact, fmtCrypto, fmtPct } from "@/lib/format";
import { quickSignal, ScreenRowLite, TONE_CLASS } from "@/lib/badges";
import Sparkline from "./Sparkline";
import FearGreed from "./FearGreed";

interface Headline { id: string; title: string; link: string; source: string; sentiment: string; coins: string[] }

export default function HomeOverview() {
  const [coins, setCoins] = useState<Ticker24[]>([]);
  const [screen, setScreen] = useState<ScreenRowLite[]>([]);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [fng, setFng] = useState<{ value: number; label: string } | null>(null);
  const [demo, setDemo] = useState(false);
  const { ticks } = useLiveTickers(coins.map((c) => c.symbol));

  useEffect(() => {
    fetch("/api/movers").then((r) => r.json()).then((j) => { setCoins(j.data ?? []); setDemo(j.source === "demo"); }).catch(() => {});
    fetch("/api/screener").then((r) => r.json()).then((j) => setScreen(j.data ?? [])).catch(() => {});
    fetch("/api/news").then((r) => r.json()).then((j) => setHeadlines((j.data ?? []).slice(0, 4))).catch(() => {});
    fetch("/api/sentiment").then((r) => r.json()).then((j) => j?.value != null && setFng(j)).catch(() => {});
  }, []);

  const live = useMemo(() => coins.map((c) => {
    const t = ticks[c.symbol];
    const price = t?.price ?? c.price;
    const open = t?.open24h ?? c.price - c.change;
    return { ...c, price, changePercent: open ? ((price - open) / open) * 100 : c.changePercent, dir: t?.direction ?? "flat" };
  }), [coins, ticks]);

  const byBase = useMemo(() => new Map(screen.map((r) => [r.base, r])), [screen]);

  // ----- command center stats -----
  const stats = useMemo(() => {
    if (!live.length) return null;
    const gainers = live.filter((c) => c.changePercent > 0).length;
    const mood = gainers / live.length;
    const btc = live.find((c) => c.base === "BTC");
    const btcRow = byBase.get("BTC");
    const bestMomentum = [...live].sort((a, b) => b.changePercent - a.changePercent)[0];
    const highestVol = [...live].sort((a, b) => b.volumeQuote - a.volumeQuote)[0];
    const totalVol = live.reduce((a, c) => a + c.volumeQuote, 0);
    const bullNews = headlines.filter((h) => h.sentiment === "bullish").length;
    const bearNews = headlines.filter((h) => h.sentiment === "bearish").length;
    const riskCount = screen.filter((r) => r.volatility === "high" || r.above200 === false).length;
    return { mood, btc, btcRow, bestMomentum, highestVol, totalVol, bullNews, bearNews, riskCount };
  }, [live, byBase, headlines, screen]);

  const opportunities = useMemo(() => {
    const out: { base: string; tag: string }[] = [];
    const sorted = [...screen].sort((a, b) => b.changePct30d - a.changePct30d);
    if (sorted[0]) out.push({ base: sorted[0].base, tag: "Momentum Leader" });
    const vol = screen.find((r) => r.volumeSpike && r.base !== sorted[0]?.base);
    if (vol) out.push({ base: vol.base, tag: "Unusual Volume" });
    const reclaim = screen.find((r) => r.above200 === false && r.rsi14 != null && r.rsi14 > 50);
    if (reclaim) out.push({ base: reclaim.base, tag: "Reclaim Watch" });
    const cross = screen.find((r) => r.macdCross === "bullish");
    if (cross) out.push({ base: cross.base, tag: "Bullish MACD Cross" });
    return out.slice(0, 4);
  }, [screen]);

  const riskWatch = useMemo(() => {
    const out: { base: string; tag: string }[] = [];
    const os = screen.find((r) => r.rsi14 != null && r.rsi14 < 32);
    if (os) out.push({ base: os.base, tag: "RSI Oversold" });
    const weak = [...screen].sort((a, b) => a.changePct30d - b.changePct30d)[0];
    if (weak) out.push({ base: weak.base, tag: "Weak Momentum" });
    const below = screen.find((r) => r.above200 === false && r.base !== weak?.base);
    if (below) out.push({ base: below.base, tag: "Below 200 SMA" });
    const hot = screen.find((r) => r.volatility === "high");
    if (hot) out.push({ base: hot.base, tag: "High Volatility" });
    return out.slice(0, 4);
  }, [screen]);

  const Stat = ({ icon: Icon, label, value, sub, tone = "text-slate-100" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; tone?: string }) => (
    <div className="glass rounded-2xl border border-edge p-3.5 hover:border-gold/30 transition">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-dim font-mono">
        <Icon className="h-3 w-3 text-gold" /> {label}
      </div>
      <div className={`font-mono text-base font-bold tabular-nums mt-1 ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-dim mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ----- Market Command Center ----- */}
      <section>
        <h2 className="text-sm font-semibold text-slate-200 mb-2.5 font-mono uppercase tracking-[0.16em]">Market Command Center</h2>
        {!stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="glass h-20 rounded-2xl border border-edge animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={Gauge} label="Market Mood" value={stats.mood >= 0.6 ? "Risk-on" : stats.mood >= 0.4 ? "Mixed" : "Risk-off"} sub={`${Math.round(stats.mood * 100)}% of majors green`} tone={stats.mood >= 0.6 ? "text-bull" : stats.mood >= 0.4 ? "text-warn" : "text-bear"} />
            <Stat icon={TrendingUp} label="BTC Trend" value={stats.btcRow ? (stats.btcRow.above200 ? "Above 200 SMA" : "Below 200 SMA") : "—"} sub={stats.btc ? fmtPct(stats.btc.changePercent) + " 24h" : undefined} tone={stats.btcRow?.above200 ? "text-bull" : "text-bear"} />
            <Stat icon={Flame} label="Best Momentum" value={stats.bestMomentum?.base ?? "—"} sub={stats.bestMomentum ? fmtPct(stats.bestMomentum.changePercent) + " 24h" : undefined} tone="text-bull" />
            <Stat icon={BarChart3} label="Highest Volume" value={stats.highestVol?.base ?? "—"} sub={stats.highestVol ? fmtCompact(stats.highestVol.volumeQuote) + " USDT" : undefined} />
            <Stat icon={Newspaper} label="News Bias" value={stats.bullNews > stats.bearNews ? "Bullish tilt" : stats.bearNews > stats.bullNews ? "Bearish tilt" : "Balanced"} sub={`${stats.bullNews}▲ / ${stats.bearNews}▼ latest wire`} tone={stats.bullNews > stats.bearNews ? "text-bull" : stats.bearNews > stats.bullNews ? "text-bear" : "text-muted"} />
            <Stat icon={ShieldAlert} label="Risk Level" value={stats.riskCount >= 6 ? "Elevated" : stats.riskCount >= 3 ? "Moderate" : "Calm"} sub={`${stats.riskCount} flagged assets`} tone={stats.riskCount >= 6 ? "text-bear" : stats.riskCount >= 3 ? "text-warn" : "text-bull"} />
            <Stat icon={Activity} label="Fear & Greed" value={fng ? `${fng.value}` : "—"} sub={fng?.label} tone={fng ? (fng.value >= 60 ? "text-bull" : fng.value >= 40 ? "text-warn" : "text-bear") : undefined} />
            <Stat icon={BarChart3} label="Tracked 24h Volume" value={fmtCompact(stats.totalVol) + " USDT"} sub="across 16 majors" />
          </div>
        )}
      </section>

      <div className="grid xl:grid-cols-[1fr_300px] gap-4 items-start">
        {/* ----- left: newswire strip + enhanced coin cards ----- */}
        <div className="space-y-4 min-w-0">
          {headlines.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-200 font-mono uppercase tracking-[0.16em]">Breaking Market Wire</h2>
                <Link href="/news" className="inline-flex items-center gap-1 text-[11px] font-mono text-gold hover:underline">Sam Newswire <ArrowUpRight className="h-3 w-3" /></Link>
              </div>
              <div className="space-y-2">
                {headlines.map((h, i) => (
                  <a key={h.id} href={h.link} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 glass rounded-xl border border-edge px-4 py-2.5 hover:border-gold/40 transition animate-fadeUp" style={{ animationDelay: `${i * 70}ms` }}>
                    {h.coins[0] && <span className="shrink-0 rounded-full border border-gold/30 text-goldsoft font-mono text-[10px] px-2 py-px">{h.coins[0]}</span>}
                    <span className="text-xs text-muted group-hover:text-slate-100 transition truncate">{h.title}</span>
                    <span className={`shrink-0 font-mono text-[10px] rounded-full border px-2 py-px ${h.sentiment === "bullish" ? "text-bull border-bull/40" : h.sentiment === "bearish" ? "text-bear border-bear/40" : "text-dim border-edgesoft"}`}>{h.sentiment}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-dim">{h.source}</span>
                    <ArrowUpRight className="h-3 w-3 text-dim shrink-0" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-200 font-mono uppercase tracking-[0.16em]">Live Markets</h2>
              {demo && <span className="text-[11px] text-warn font-mono">DEMO DATA</span>}
            </div>
            {live.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="glass rounded-2xl border border-edge h-32 animate-pulse" />)}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {live.map((c, i) => {
                  const row = byBase.get(c.base);
                  const sig = row ? quickSignal(row) : null;
                  return (
                    <Link key={c.symbol} href={`/coin/${c.base}`} className="glass rounded-2xl border border-edge p-4 hover:border-gold/40 hover:-translate-y-0.5 transition animate-fadeUp" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-slate-100">{c.base}</span>
                        {sig && <span className={`rounded-full border px-2 py-px font-mono text-[9px] ${TONE_CLASS[sig.tone]}`}>{sig.label}</span>}
                      </div>
                      <div className="flex items-end justify-between gap-2 mt-1">
                        <div>
                          <div key={`${c.price}-${c.dir}`} className={`font-mono text-lg tabular-nums text-slate-100 ${c.dir === "up" ? "animate-flashUp" : c.dir === "down" ? "animate-flashDown" : ""}`}>
                            ${fmtCrypto(c.price)}
                          </div>
                          <div className={`font-mono text-[11px] tabular-nums ${c.changePercent >= 0 ? "text-bull" : "text-bear"}`}>{fmtPct(c.changePercent)} 24h</div>
                        </div>
                        <Sparkline base={c.base} up={c.changePercent >= 0} />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-dim">
                        <span>Vol {fmtCompact(c.volumeQuote)}</span>
                        <span>{row?.rsi14 != null ? `RSI ${row.rsi14.toFixed(0)}` : ""}</span>
                        <span className={row?.above200 == null ? "" : row.above200 ? "text-bull" : "text-bear"}>{row?.above200 == null ? "" : row.above200 ? "uptrend" : "downtrend"}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ----- right rail ----- */}
        <div className="space-y-3">
          <div className="glass rounded-2xl border border-edge p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-mono mb-2">Sentiment</div>
            <FearGreed />
          </div>

          <div className="glass rounded-2xl border border-gold/25 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-gold font-mono mb-2">Top Opportunities</div>
            {opportunities.length === 0 ? <p className="text-xs text-dim">Scanning…</p> : (
              <ul className="space-y-1.5">
                {opportunities.map((o) => (
                  <li key={o.base + o.tag}>
                    <Link href={`/coin/${o.base}`} className="flex items-center justify-between rounded-lg border border-edgesoft px-2.5 py-1.5 hover:border-gold/40 transition">
                      <span className="font-mono text-xs font-semibold text-slate-100">{o.base}</span>
                      <span className="font-mono text-[10px] text-bull">{o.tag}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass rounded-2xl border border-edge p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-mono mb-2">Risk Watch</div>
            {riskWatch.length === 0 ? <p className="text-xs text-dim">Scanning…</p> : (
              <ul className="space-y-1.5">
                {riskWatch.map((o) => (
                  <li key={o.base + o.tag}>
                    <Link href={`/coin/${o.base}`} className="flex items-center justify-between rounded-lg border border-edgesoft px-2.5 py-1.5 hover:border-bear/40 transition">
                      <span className="font-mono text-xs font-semibold text-slate-100">{o.base}</span>
                      <span className="font-mono text-[10px] text-bear">{o.tag}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link href="/screener" className="block glass rounded-2xl border border-gold/30 bg-gold/5 p-4 text-center text-sm font-semibold text-gold hover:bg-gold/10 transition gold-ring">
            Open Alpha Scanner →
          </Link>
        </div>
      </div>
    </div>
  );
}
