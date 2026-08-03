import { notFound } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import CoinHeader from "@/components/CoinHeader";
import TerminalWorkspace from "@/components/TerminalWorkspace";
import OrderBook from "@/components/OrderBook";
import TradesFeed from "@/components/TradesFeed";
import ScoreRing from "@/components/ScoreRing";
import SignalCard from "@/components/SignalCard";
import TechnicalsCard from "@/components/TechnicalsCard";
import TradePlanCard from "@/components/TradePlanCard";
import OrderTicketLive from "@/components/OrderTicketLive";
import AdvisorCard from "@/components/AdvisorCard";
import FearGreed from "@/components/FearGreed";
import AlertCard from "@/components/AlertCard";
import FundingCard from "@/components/FundingCard";
import PaperPanel from "@/components/PaperPanel";
import Disclaimer from "@/components/Disclaimer";
import { assembleAnalysis, ruleBasedSummary, DISCLAIMER } from "@/lib/analysis";
import { getKlines, getTicker24, isValidBase, symbolExists, toSymbol } from "@/lib/binance";
import { fmtCompact, fmtCrypto } from "@/lib/format";
import { Analysis } from "@/lib/types";

export const revalidate = 60;

export default async function CoinPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await params;
  const base = decodeURIComponent(raw ?? "").toUpperCase().replace(/USDT$/, "");
  if (!isValidBase(base)) notFound();
  const symbol = toSymbol(base);
  if ((await symbolExists(symbol)) === "no") notFound();

  const [klines, ticker] = await Promise.all([
    getKlines(symbol, "1d", 320),
    getTicker24(symbol),
  ]);
  if (!klines.data.length) {
    return (
      <main className="mx-auto max-w-[1900px] px-4 py-16 text-center text-muted">
        Market data temporarily unavailable. Please try again later.
      </main>
    );
  }

  const source = klines.source === "demo" || ticker.source === "demo" ? "demo" : "live";
  const price = source === "live" ? ticker.data.price : klines.data[klines.data.length - 1].close;
  const baseAnalysis = assembleAnalysis(symbol, klines.data, price, source);
  const analysis: Analysis = { ...baseAnalysis, aiSummary: ruleBasedSummary(base, baseAnalysis), aiSource: "rule-based", disclaimer: DISCLAIMER };

  return (
    <main className="mx-auto max-w-[1900px] px-3 py-3 space-y-3">
      <CoinHeader base={base} symbol={symbol} initial={ticker.data} bias={analysis.bias} demo={source === "demo"} />

      {/* Side rail (order ticket + key stats) sits beside the chart from lg up.
          It used to require xl (1280px), which meant a laptop at 125% display
          scaling dropped the ticket below the fold. */}
      <div className="grid lg:grid-cols-[1fr_290px] xl:grid-cols-[1fr_320px] gap-3 items-start">
        <div className="space-y-3 min-w-0">
          <TerminalWorkspace symbol={symbol} support={analysis.technicals.support} resistance={analysis.technicals.resistance} />
          <div className="grid md:grid-cols-2 gap-3">
            <GlassCard eyebrow="Liquidity Desk" title="Order book">
              <OrderBook symbol={symbol} />
            </GlassCard>
            <GlassCard eyebrow="Execution Tape" title="Live fills">
              <TradesFeed symbol={symbol} />
            </GlassCard>
          </div>
          <PaperPanel />
        </div>

        <div className="space-y-3">
          <GlassCard eyebrow="Paper Trade Desk" title="Order ticket" accent="ai">
            <div id="order-ticket"><OrderTicketLive base={base} /></div>
          </GlassCard>

          <GlassCard eyebrow="Key stats" title="24h market">
            <dl className="space-y-2 font-mono text-xs">
              {([
                ["High", fmtCrypto(ticker.data.high)],
                ["Low", fmtCrypto(ticker.data.low)],
                ["Volume", `${fmtCompact(ticker.data.volumeBase)} ${base}`],
                ["Turnover", `${fmtCompact(ticker.data.volumeQuote)} USDT`],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-edgesoft pb-1.5 last:border-0">
                  <dt className="text-dim">{k}</dt><dd className="text-muted tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>

          <GlassCard eyebrow="Alerts" title="Price alerts">
            <AlertCard base={base} />
          </GlassCard>

          <GlassCard eyebrow="Sentiment" title="Fear & Greed">
            <FearGreed />
          </GlassCard>

          <FundingCard base={base} />

        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <GlassCard eyebrow="Sam Market Desk" title="Advisor note" accent="ai" className="lg:col-span-2">
          <AdvisorCard a={analysis} base={base} />
        </GlassCard>

        <GlassCard eyebrow="Quant engine" title="Composite score">
          <div className="flex items-center justify-center"><ScoreRing score={analysis.quant.composite} label="Quant score" /></div>
          <dl className="mt-4 space-y-2">
            {([
              ["Trend", analysis.quant.trend],
              ["Momentum", analysis.quant.momentum],
              ["Structure", analysis.quant.technical],
              ["Volatility safety", analysis.quant.volatilityRisk],
            ] as const).map(([label, v]) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-dim mb-1">
                  <span>{label}</span><span className="font-mono text-muted">{v}</span>
                </div>
                <div className="h-1 rounded-full bg-ink/70">
                  <div className={`h-full rounded-full ${v >= 63 ? "bg-bull" : v >= 45 ? "bg-warn" : "bg-bear"}`} style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </dl>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <GlassCard eyebrow="Signal Command" title="Educational signal" accent={analysis.signal.startsWith("Buy") ? "bull" : analysis.signal === "Avoid / High Risk" ? "bear" : "warn"}>
          <SignalCard a={analysis} />
        </GlassCard>
        <div className="space-y-3">
          <GlassCard eyebrow="Trade setup builder" title="Structured setup (study only)">
            <TradePlanCard plan={analysis.tradePlan} base={base} />
          </GlassCard>
          <GlassCard eyebrow="Next" title="What to watch">
            <ul className="space-y-1.5 text-sm text-muted">
              {analysis.whatToWatch.length
                ? analysis.whatToWatch.map((w, i) => <li key={i} className="pl-3 border-l border-gold/40">{w}</li>)
                : <li className="text-dim">No specific triggers detected.</li>}
            </ul>
          </GlassCard>
        </div>
      </div>

      <GlassCard eyebrow="Technical Matrix" title="Indicator snapshot (daily)">
        <TechnicalsCard t={analysis.technicals} />
      </GlassCard>

      <Disclaimer />
    </main>
  );
}
