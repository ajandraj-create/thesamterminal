"use client";

import { useState } from "react";
import { equityOf, performanceStats, usePaperStore, PAPER_START_BALANCE } from "@/hooks/usePaperStore";
import { fmtCrypto } from "@/lib/format";

const TABS = ["Positions", "Orders", "History", "Performance", "Journal", "Feed"] as const;
type Tab = (typeof TABS)[number];

export default function PaperPanel() {
  const store = usePaperStore();
  const [tab, setTab] = useState<Tab>("Positions");
  const equity = equityOf(store);
  const uPnl = store.positions.reduce((a, p) => a + ((store.lastPrices[p.symbol] ?? p.avgEntry) - p.avgEntry) * p.qty, 0);
  const netPct = ((equity - PAPER_START_BALANCE) / PAPER_START_BALANCE) * 100;
  const stats = performanceStats(store.history, store.equityMarks);

  const th = "px-3 py-2 text-left text-[10px] uppercase tracking-[0.14em] text-dim font-mono";
  const td = "px-3 py-2 font-mono text-xs tabular-nums";

  return (
    <section className="glass rounded-2xl border border-edge overflow-hidden">
      <header className="flex items-center justify-between flex-wrap gap-2 border-b border-edgesoft px-4 py-2.5">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1 text-xs font-mono transition border ${tab === t ? "bg-gold/15 text-gold border-gold/40" : "border-transparent text-dim hover:text-muted"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="text-dim">Equity <span className="text-gold font-semibold">{equity.toFixed(2)}</span></span>
          <span className="text-dim">Free <span className="text-muted">{store.balance.toFixed(2)}</span></span>
          <span className="text-dim">uPnL <span className={uPnl >= 0 ? "text-bull" : "text-bear"}>{uPnl >= 0 ? "+" : ""}{uPnl.toFixed(2)}</span></span>
          <span className={netPct >= 0 ? "text-bull" : "text-bear"}>{netPct >= 0 ? "+" : ""}{netPct.toFixed(2)}%</span>
          <button onClick={() => confirm("Reset the paper account to 100,000 USDT? This clears all positions and history.") && store.resetAccount()} className="text-dim hover:text-bear transition">reset</button>
        </div>
      </header>

      <div className="max-h-64 overflow-y-auto">
        {tab === "Positions" && (
          store.positions.length === 0
            ? <Empty text="No open positions. Use the order ticket or “Trade this setup” to open one." />
            : (
              <table className="w-full">
                <thead><tr className="border-b border-edgesoft"><th className={th}>Asset</th><th className={th}>Qty</th><th className={th}>Avg entry</th><th className={th}>Mark</th><th className={th}>uPnL</th><th className={th}>SL / TP</th><th className={th} /></tr></thead>
                <tbody>
                  {store.positions.map((p) => {
                    const mark = store.lastPrices[p.symbol] ?? p.avgEntry;
                    const pnl = (mark - p.avgEntry) * p.qty;
                    const pct = ((mark - p.avgEntry) / p.avgEntry) * 100;
                    return (
                      <tr key={p.symbol} className="border-b border-edgesoft/50 last:border-0">
                        <td className={`${td} font-semibold text-slate-100`}>{p.base}</td>
                        <td className={td}>{p.qty}</td>
                        <td className={td}>{fmtCrypto(p.avgEntry)}</td>
                        <td className={td}>{fmtCrypto(mark)}</td>
                        <td className={`${td} ${pnl >= 0 ? "text-bull" : "text-bear"}`}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({pct.toFixed(2)}%)</td>
                        <td className={`${td} text-dim`}>{p.sl ? fmtCrypto(p.sl) : "—"} / {p.tp ? fmtCrypto(p.tp) : "—"}</td>
                        <td className={td}>
                          <button onClick={() => store.closePosition(p.symbol, mark)} className="rounded border border-bear/40 text-bear px-2 py-0.5 text-[10px] hover:bg-bear/10 transition">Close</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
        )}

        {tab === "Orders" && (
          store.orders.length === 0
            ? <Empty text="No resting orders. Limit and stop orders appear here until triggered." />
            : (
              <table className="w-full">
                <thead><tr className="border-b border-edgesoft"><th className={th}>Asset</th><th className={th}>Side</th><th className={th}>Type</th><th className={th}>Qty</th><th className={th}>Trigger</th><th className={th}>SL / TP</th><th className={th} /></tr></thead>
                <tbody>
                  {store.orders.map((o) => (
                    <tr key={o.id} className="border-b border-edgesoft/50 last:border-0">
                      <td className={`${td} font-semibold text-slate-100`}>{o.base}</td>
                      <td className={`${td} ${o.side === "buy" ? "text-bull" : "text-bear"}`}>{o.side}</td>
                      <td className={`${td} text-muted`}>{o.type}</td>
                      <td className={td}>{o.qty}</td>
                      <td className={td}>{fmtCrypto(o.limitPrice ?? o.stopPrice ?? null)}</td>
                      <td className={`${td} text-dim`}>{o.sl ? fmtCrypto(o.sl) : "—"} / {o.tp ? fmtCrypto(o.tp) : "—"}</td>
                      <td className={td}><button onClick={() => store.cancelOrder(o.id)} className="text-dim hover:text-bear transition text-[10px]">cancel</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        )}

        {tab === "History" && (
          store.history.length === 0
            ? <Empty text="Closed trades will appear here with realized PnL." />
            : (
              <table className="w-full">
                <thead><tr className="border-b border-edgesoft"><th className={th}>Asset</th><th className={th}>Qty</th><th className={th}>Entry → Exit</th><th className={th}>PnL (net)</th><th className={th}>Fees</th><th className={th}>Reason</th><th className={th}>Closed</th></tr></thead>
                <tbody>
                  {store.history.map((t) => (
                    <tr key={t.id} className="border-b border-edgesoft/50 last:border-0">
                      <td className={`${td} font-semibold text-slate-100`}>{t.base}</td>
                      <td className={td}>{t.qty}</td>
                      <td className={td}>{fmtCrypto(t.entry)} → {fmtCrypto(t.exit)}</td>
                      <td className={`${td} ${t.pnl >= 0 ? "text-bull" : "text-bear"}`}>{t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}</td>
                      <td className={`${td} text-dim`}>{t.fees.toFixed(2)}</td>
                      <td className={`${td} text-dim`}>{t.reason}</td>
                      <td className={`${td} text-dim`}>{new Date(t.closedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        )}

        {tab === "Performance" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
            {[
              ["Net PnL", `${stats.netPnl >= 0 ? "+" : ""}${stats.netPnl.toFixed(2)}`, stats.netPnl >= 0],
              ["Trades", String(stats.trades), true],
              ["Win rate", `${stats.winRate.toFixed(1)}%`, stats.winRate >= 50],
              ["Profit factor", stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2), stats.profitFactor >= 1],
              ["Avg win", `+${stats.avgWin.toFixed(2)}`, true],
              ["Avg loss", `-${stats.avgLoss.toFixed(2)}`, false],
              ["Max drawdown", `${stats.maxDrawdownPct.toFixed(2)}%`, stats.maxDrawdownPct < 10],
              ["Total fees", stats.totalFees.toFixed(2), false],
            ].map(([label, value, good]) => (
              <div key={label as string} className="rounded-xl border border-edgesoft bg-ink/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">{label}</div>
                <div className={`font-mono text-lg tabular-nums mt-1 ${good ? "text-bull" : "text-muted"}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "Journal" && (
          store.history.length === 0
            ? <Empty text="Close a trade, then write what you learned here." />
            : (
              <ul className="divide-y divide-edgesoft/50">
                {store.history.slice(0, 12).map((t) => (
                  <li key={t.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-100">{t.base} · {t.pnl >= 0 ? <span className="text-bull">+{t.pnl.toFixed(2)}</span> : <span className="text-bear">{t.pnl.toFixed(2)}</span>}</span>
                      <span className="text-dim">{new Date(t.closedAt).toLocaleDateString()}</span>
                    </div>
                    <input
                      defaultValue={t.note ?? ""}
                      onBlur={(e) => store.addNote(t.id, e.target.value)}
                      placeholder="What was the thesis? What did you learn?"
                      className="mt-1.5 w-full rounded-lg border border-edgesoft bg-ink/50 px-2.5 py-1.5 text-xs outline-none focus:border-gold/50 transition placeholder:text-dim"
                    />
                  </li>
                ))}
              </ul>
            )
        )}

        {tab === "Feed" && (
          store.feed.length === 0
            ? <Empty text="Execution events will stream here." />
            : (
              <ul className="divide-y divide-edgesoft/50">
                {store.feed.map((f) => (
                  <li key={f.id} className="px-4 py-2 font-mono text-[11px] flex justify-between gap-3">
                    <span className={f.tone === "bull" ? "text-bull" : f.tone === "bear" ? "text-bear" : "text-muted"}>{f.text}</span>
                    <span className="text-dim shrink-0">{new Date(f.time).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )
        )}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-8 text-center text-xs text-dim">{text}</p>;
}
