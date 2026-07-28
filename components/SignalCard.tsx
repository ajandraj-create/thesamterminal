import { Analysis } from "@/lib/types";

const SIGNAL_STYLE: Record<string, string> = {
  "Buy Setup": "text-bull border-bull/40 bg-bull/10",
  "Buy Watchlist": "text-bull border-bull/30 bg-bull/5",
  Hold: "text-slate-300 border-slate-500/40 bg-slate-500/10",
  "Take Profit Zone": "text-warn border-warn/40 bg-warn/10",
  Wait: "text-warn border-warn/30 bg-warn/5",
  "Avoid / High Risk": "text-bear border-bear/40 bg-bear/10",
};

export default function SignalCard({ a }: { a: Analysis }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className={`rounded-xl border px-4 py-2 text-sm font-bold ${SIGNAL_STYLE[a.signal]}`}>
          {a.signal}
        </span>
        <div className="text-right">
          <div className="font-mono text-sm text-slate-200">Confidence {a.confidence}/100</div>
          <div className="text-xs text-muted">Risk: {a.riskRating}</div>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-slate-700/40 overflow-hidden">
        <div
          className={`h-full rounded-full ${a.confidence >= 60 ? "bg-bull" : a.confidence >= 45 ? "bg-warn" : "bg-bear"}`}
          style={{ width: `${a.confidence}%`, transition: "width 0.8s ease" }}
        />
      </div>

      {a.reasons.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.16em] text-bull font-mono mb-1.5">Supporting</h3>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {a.reasons.slice(0, 4).map((r, i) => <li key={i} className="pl-3 border-l border-bull/40">{r}</li>)}
          </ul>
        </div>
      )}
      {a.risks.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.16em] text-bear font-mono mb-1.5">Against</h3>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {a.risks.slice(0, 3).map((r, i) => <li key={i} className="pl-3 border-l border-bear/40">{r}</li>)}
          </ul>
        </div>
      )}
      <p className="text-xs text-warn/90 border border-warn/20 bg-warn/5 rounded-lg p-2.5">
        Invalidation: {a.invalidation}
      </p>
      <p className="text-[11px] text-muted">Educational setup classification — not a trade instruction.</p>
    </div>
  );
}
