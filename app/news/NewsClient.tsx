"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, ExternalLink, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { timeAgo } from "@/lib/format";

interface Article {
  id: string; title: string; link: string; source: string;
  publishedAt: number; summary: string; coins: string[];
  sentiment: "bullish" | "bearish" | "neutral";
}

const TONE = {
  bullish: { text: "text-bull", border: "border-bull/40", dot: "bg-bull" },
  bearish: { text: "text-bear", border: "border-bear/40", dot: "bg-bear" },
  neutral: { text: "text-dim", border: "border-edgesoft", dot: "bg-dim" },
};

export default function NewsClient() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [coin, setCoin] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRefreshing(true);
    fetch("/api/news")
      .then((r) => r.json())
      .then((j) => (j.data?.length ? setArticles(j.data) : setFailed(true)))
      .catch(() => setFailed(true))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => { load(); const t = setInterval(load, 30 * 60 * 1000); return () => clearInterval(t); }, []);

  const coinCounts = useMemo(() => {
    const m = new Map<string, number>();
    articles?.forEach((a) => a.coins.forEach((c) => m.set(c, (m.get(c) ?? 0) + 1)));
    return m;
  }, [articles]);

  const coins = useMemo(() =>
    Array.from(coinCounts.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c), [coinCounts]);

  const shown = useMemo(() =>
    !articles ? [] : coin === "ALL" ? articles : articles.filter((a) => a.coins.includes(coin)),
    [articles, coin]);

  const [featured, ...rest] = shown;
  const bullC = articles?.filter((a) => a.sentiment === "bullish").length ?? 0;
  const bearC = articles?.filter((a) => a.sentiment === "bearish").length ?? 0;
  const neuC = articles?.filter((a) => a.sentiment === "neutral").length ?? 0;
  const total = bullC + bearC + neuC || 1;

  const sourceMap = useMemo(() => {
    const m = new Map<string, number>();
    articles?.forEach((a) => m.set(a.source, (m.get(a.source) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  if (failed) return <p className="text-sm text-dim p-8 text-center">News feeds are unreachable right now — try again shortly.</p>;

  const SmallCard = ({ a }: { a: Article }) => (
    <a href={a.link} target="_blank" rel="noopener noreferrer"
      className="group flex items-start gap-2.5 rounded-xl border border-edge px-3 py-2.5 hover:border-gold/40 hover:bg-gold/5 transition">
      <span className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${TONE[a.sentiment].dot} animate-pulseDot`} />
      <div className="min-w-0">
        <p className="text-[11px] text-muted group-hover:text-gold transition leading-snug line-clamp-2">{a.title}</p>
        <p className="text-[10px] font-mono text-dim mt-0.5">{a.source} · {timeAgo(a.publishedAt)}</p>
      </div>
    </a>
  );

  return (
    <div className="grid xl:grid-cols-[210px_1fr_210px] gap-5 items-start">

      {/* LEFT SIDEBAR */}
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1 no-scrollbar">
        <div className="glass rounded-2xl border border-edge p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">Wire Sentiment</div>
          {([["Bullish", bullC, "bg-bull", "text-bull"], ["Bearish", bearC, "bg-bear", "text-bear"], ["Neutral", neuC, "bg-dim", "text-dim"]] as const).map(([label, n, bar, text]) => (
            <div key={label} className="mb-2 last:mb-0">
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className={text}>{label}</span>
                <span className="text-dim">{n} ({Math.round((n / total) * 100)}%)</span>
              </div>
              <div className="h-1 rounded-full bg-ink/60">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${(n / total) * 100}%`, transition: "width 0.8s ease" }} />
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl border border-edge p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">Trending on Wire</div>
          <ul className="space-y-1">
            {coins.slice(0, 9).map((c) => (
              <li key={c}>
                <button onClick={() => setCoin(coin === c ? "ALL" : c)}
                  className={`w-full flex justify-between rounded-lg px-2.5 py-1.5 text-xs font-mono transition ${coin === c ? "bg-gold/15 text-gold border border-gold/40" : "hover:bg-gold/5 text-muted"}`}>
                  <span className="font-semibold">{c}</span>
                  <span className="text-dim">{coinCounts.get(c)}</span>
                </button>
              </li>
            ))}
          </ul>
          {coin !== "ALL" && <button onClick={() => setCoin("ALL")} className="mt-2 text-[10px] font-mono text-dim hover:text-gold transition">← all</button>}
        </div>

        <div className="glass rounded-2xl border border-edge p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">Sources</div>
          {sourceMap.map(([src, n]) => (
            <div key={src} className="flex justify-between text-[11px] font-mono mb-1.5 last:mb-0">
              <span className="text-muted">{src}</span><span className="text-dim">{n}</span>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl border border-edge p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">Bias Right Now</div>
          <div className="text-sm font-semibold text-slate-100">
            {bullC > bearC ? "🟢 Bullish tilt" : bearC > bullC ? "🔴 Bearish tilt" : "⚪ Balanced"}
          </div>
          <p className="text-[10px] text-dim font-mono mt-1">{articles?.length ?? 0} stories indexed</p>
        </div>
      </aside>

      {/* MAIN FEED */}
      <div className="min-w-0 space-y-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setCoin("ALL")}
            className={`rounded-full border px-3 py-1 text-xs font-mono transition active:scale-95 ${coin === "ALL" ? "bg-gold/15 text-gold border-gold/40 gold-ring" : "border-edgesoft text-dim hover:text-muted"}`}>ALL</button>
          {coins.slice(0, 9).map((c) => (
            <button key={c} onClick={() => setCoin(coin === c ? "ALL" : c)}
              className={`rounded-full border px-3 py-1 text-xs font-mono transition active:scale-95 ${coin === c ? "bg-gold/15 text-gold border-gold/40 gold-ring" : "border-edgesoft text-dim hover:text-muted"}`}>{c}</button>
          ))}
          <button onClick={load} className="ml-auto text-dim hover:text-gold transition" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {!articles ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass h-40 rounded-2xl border border-edge animate-pulse" />)}</div>
        ) : shown.length === 0 ? (
          <p className="text-sm text-dim py-12 text-center">No stories tagged {coin} right now.</p>
        ) : (
          <ul className="space-y-4">
            {featured && (
              <li className="animate-fadeUp">
                {/* Stretched-link card — see comment on the list cards below. */}
                <div className="group relative glass rounded-2xl border border-edge overflow-hidden hover:border-gold/40 transition">
                  <div className="p-4">
                    <div className="relative z-10 flex flex-wrap gap-1.5 mb-2">
                      {featured.coins.slice(0, 3).map((c) => (
                        <Link key={c} href={`/coin/${c}`} className="border border-gold/30 text-goldsoft rounded-full px-2 py-px font-mono text-[10px] hover:bg-gold/10 transition">{c}</Link>
                      ))}
                      <span className={`rounded-full border px-2 py-px font-mono text-[10px] ${TONE[featured.sentiment].text} ${TONE[featured.sentiment].border}`}>{featured.sentiment}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-100 group-hover:text-gold transition leading-snug">
                      <a href={featured.link} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0">
                        {featured.title}
                      </a>
                    </h2>
                    {featured.summary && <p className="text-xs text-dim mt-1.5 line-clamp-2 leading-relaxed">{featured.summary}</p>}
                    <div className="flex items-center gap-2 mt-3 text-[10px] font-mono">
                      <Zap className="h-3 w-3 text-gold" /><span className="text-gold font-semibold">Featured · </span>
                      <span className="text-dim">{featured.source} · {timeAgo(featured.publishedAt)}</span>
                      <ExternalLink className="ml-auto h-3 w-3 text-dim" />
                    </div>
                  </div>
                </div>
              </li>
            )}
            {rest.map((a, i) => {
              const tone = TONE[a.sentiment];
              return (
                <li key={a.id} className="animate-fadeUp" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  {/* Stretched-link card: valid HTML (no <a> inside <a>) — the title's
                      <a> expands over the whole card via after:inset-0, and the coin
                      chips sit above it on z-10 so both remain clickable. */}
                  <div className="group relative glass rounded-2xl border border-edge hover:border-gold/40 transition overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="relative z-10 flex flex-wrap gap-1 mb-1.5">
                            {a.coins.slice(0, 2).map((c) => (
                              <Link key={c} href={`/coin/${c}`} className="border border-gold/30 text-goldsoft rounded-full px-2 py-px font-mono text-[10px] hover:bg-gold/10 transition">{c}</Link>
                            ))}
                          </div>
                          <h3 className="text-sm font-semibold text-slate-200 group-hover:text-gold transition leading-snug">
                            <a href={a.link} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0">
                              {a.title}
                            </a>
                          </h3>
                          {a.summary && <p className="text-xs text-dim mt-1 line-clamp-2 leading-relaxed">{a.summary}</p>}
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-dim shrink-0 mt-0.5 group-hover:text-gold transition" />
                      </div>
                      <div className="flex items-center gap-2 mt-2.5 text-[10px] font-mono">
                        <span className={`rounded-full border px-2 py-px ${tone.text} ${tone.border}`}>{a.sentiment}</span>
                        <span className="text-dim ml-auto">{a.source} · {timeAgo(a.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1 no-scrollbar">
        <div className="glass rounded-2xl border border-gold/25 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulseDot" />
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold font-mono">Breaking Wire</div>
          </div>
          <div className="space-y-2">
            {!articles ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-ink/40 animate-pulse" />) :
              shown.slice(0, 7).map((a) => <SmallCard key={a.id} a={a} />)}
          </div>
        </div>

        {sourceMap.map(([src]) => {
          const item = articles?.find((a) => a.source === src);
          if (!item) return null;
          const itemTone = TONE[item.sentiment];
          return (
            <div key={src} className="glass rounded-2xl border border-edge p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-2">{src} · Latest</div>
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="group">
                <p className="text-[11px] text-muted group-hover:text-gold transition leading-snug">{item.title}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono">
                  <span className={`rounded-full border px-1.5 py-px ${itemTone.text} ${itemTone.border}`}>{item.sentiment}</span>
                  <span className="text-dim">{timeAgo(item.publishedAt)}</span>
                </div>
              </a>
            </div>
          );
        })}

        {/* market icons panel */}
        <div className="glass rounded-2xl border border-edge p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-3">Market Impact</div>
          {[
            { label: "Crypto", icon: "₿", tone: bullC > bearC ? "text-bull" : "text-bear", signal: bullC > bearC ? "Bullish" : "Bearish" },
            { label: "Sentiment", icon: "⟳", tone: "text-gold", signal: `${bullC}B / ${bearC}Br` },
            { label: "Activity", icon: "⚡", tone: "text-muted", signal: `${articles?.length ?? 0} stories` },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-lg border border-edgesoft px-2.5 py-2">
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-xs font-mono text-muted flex-1">{item.label}</span>
              <span className={`font-mono text-xs font-semibold ${item.tone}`}>{item.signal}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
