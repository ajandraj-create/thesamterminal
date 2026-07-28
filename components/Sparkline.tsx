"use client";

import { useSparkline } from "./SparklineProvider";

/** Tiny SVG sparkline. Data is fetched in a single batched request via the provider. */
export default function Sparkline({ base, up }: { base: string; up: boolean }) {
  const closes = useSparkline(base);

  if (!closes) return <div className="h-8 w-24 rounded bg-ink/40 animate-pulse" />;
  if (closes.length < 2) return <div className="h-8 w-24" />;

  const min = Math.min(...closes), max = Math.max(...closes);
  const span = max - min || 1;
  const points = closes.map((c, i) => `${(i / (closes.length - 1)) * 100},${30 - ((c - min) / span) * 28 + 1}`).join(" ");
  const color = up ? "#2EBD85" : "#E5484D";

  return (
    <svg viewBox="0 0 100 32" className="h-8 w-24" preserveAspectRatio="none" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <polyline points={`0,32 ${points} 100,32`} fill={`${color}22`} stroke="none" />
    </svg>
  );
}
