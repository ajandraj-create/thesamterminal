"use client";

import { useEffect, useState } from "react";
import { fmtCompact } from "@/lib/format";

/** Futures funding + open interest — renders nothing if the futures API is unreachable. */
export default function FundingCard({ base }: { base: string }) {
  const [data, setData] = useState<{ fundingRate: number; openInterest: number; nextFundingTime: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/funding/${base}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, [base]);

  if (failed || !data) return null;
  const fr = data.fundingRate;
  const mins = Math.max(0, Math.round((data.nextFundingTime - Date.now()) / 60000));
  return (
    <div className="glass rounded-2xl border border-edge p-5 animate-fadeUp">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-mono">Derivatives</div>
      <h2 className="text-sm font-semibold text-slate-200 mt-0.5 mb-3">Funding &amp; open interest</h2>
      <dl className="space-y-2 font-mono text-xs">
        <div className="flex justify-between border-b border-edgesoft pb-1.5">
          <dt className="text-dim">Funding rate (8h)</dt>
          <dd className={fr >= 0 ? "text-bull" : "text-bear"}>{fr >= 0 ? "+" : ""}{fr.toFixed(4)}%</dd>
        </div>
        <div className="flex justify-between border-b border-edgesoft pb-1.5">
          <dt className="text-dim">Next funding</dt>
          <dd className="text-muted">{Math.floor(mins / 60)}h {mins % 60}m</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-dim">Open interest</dt>
          <dd className="text-muted">{fmtCompact(data.openInterest)} {base}</dd>
        </div>
      </dl>
      <p className="text-[10px] text-dim mt-2">{fr > 0.03 ? "Elevated positive funding — longs crowded, squeeze risk." : fr < -0.01 ? "Negative funding — shorts paying longs." : "Funding near neutral."}</p>
    </div>
  );
}
