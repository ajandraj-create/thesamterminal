"use client";

import { useEffect, useState } from "react";

/** Crypto Fear & Greed index (alternative.me — free, no key). */
export default function FearGreed() {
  const [data, setData] = useState<{ value: number; label: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/sentiment")
      .then((r) => r.json())
      .then((j) => (j?.value != null ? setData(j) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="text-xs text-dim">Sentiment index unavailable right now.</p>;
  if (!data) return <div className="h-10 rounded-lg bg-ink/40 animate-pulse" />;

  const color = data.value >= 60 ? "#2EBD85" : data.value >= 40 ? "#E6C76A" : "#E5484D";
  return (
    <div>
      <div className="flex items-end justify-between mb-1.5">
        <span className="font-mono text-2xl tabular-nums" style={{ color }}>{data.value}</span>
        <span className="text-xs font-mono" style={{ color }}>{data.label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink/60 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${data.value}%`, background: `linear-gradient(90deg, #E5484D, #E6C76A, #2EBD85)`, transition: "width 0.8s ease" }} />
      </div>
      <p className="text-[10px] text-dim mt-1.5 font-mono">Crypto Fear &amp; Greed · alternative.me</p>
    </div>
  );
}
