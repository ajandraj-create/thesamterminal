"use client";

import { TradePlan } from "@/lib/types";
import { fmtCrypto } from "@/lib/format";
import { usePaperStore } from "@/hooks/usePaperStore";
import { Zap } from "lucide-react";

export default function TradePlanCard({ plan, base }: { plan: TradePlan | null; base?: string }) {
  const setDraft = usePaperStore((s) => s.setDraft);
  const balance = usePaperStore((s) => s.balance);

  if (!plan) {
    return <p className="text-sm text-muted">Trade plan unavailable — insufficient price history for ATR-based levels.</p>;
  }
  const rows = [
    { label: "Aggressive entry", value: fmtCrypto(plan.entryZone[1]), tone: "text-slate-200" },
    { label: "Pullback entry", value: fmtCrypto(plan.entryZone[0]), tone: "text-slate-200" },
    { label: "Stop-loss", value: fmtCrypto(plan.stopLoss), tone: "text-bear" },
    { label: "Take profit 1", value: fmtCrypto(plan.takeProfit1), tone: "text-bull" },
    { label: "Take profit 2", value: fmtCrypto(plan.takeProfit2), tone: "text-bull" },
    { label: "Risk / reward", value: `${plan.riskReward}R`, tone: plan.riskReward >= 1.5 ? "text-bull" : "text-warn" },
  ];

  const tradeSetup = () => {
    if (!base) return;
    const entry = plan.entryZone[0];
    const riskUsdt = balance * 0.01; // risk 1% of paper account
    const perUnit = Math.max(entry - plan.stopLoss, entry * 0.0001);
    const qty = +(riskUsdt / perUnit).toFixed(6);
    setDraft({ base, side: "buy", type: "limit", qty, limitPrice: entry, sl: plan.stopLoss, tp: plan.takeProfit1 });
    document.getElementById("order-ticket")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div>
      <dl className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-edgesoft pb-2 last:border-0">
            <dt className="text-xs text-dim">{r.label}</dt>
            <dd className={`font-mono text-sm tabular-nums ${r.tone}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {base && (
        <button
          onClick={tradeSetup}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold/10 py-2 text-sm font-semibold text-gold hover:bg-gold/20 transition active:scale-[0.98] gold-ring"
        >
          <Zap className="h-4 w-4" /> Trade this setup (paper)
        </button>
      )}
      <p className="text-[11px] text-dim mt-3">
        ATR + structure derived study framework, sized at 1% account risk. You review and confirm in the order ticket — nothing executes automatically.
      </p>
    </div>
  );
}
