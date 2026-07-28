"use client";

import { useWatchlist } from "@/hooks/useWatchlist";
import { Star } from "lucide-react";

export default function WatchlistButton({ ticker }: { ticker: string }) {
  const { has, add, remove, ready } = useWatchlist();
  if (!ready) return null;
  const active = has(ticker);
  return (
    <button
      onClick={() => (active ? remove(ticker) : add(ticker))}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition
        ${active ? "border-warn/50 text-warn bg-warn/10" : "border-edge text-muted hover:text-slate-200 hover:border-slate-500/50"}`}
    >
      <Star className={`h-3 w-3 ${active ? "fill-warn" : ""}`} />
      {active ? "Watching" : "Watch"}
    </button>
  );
}
