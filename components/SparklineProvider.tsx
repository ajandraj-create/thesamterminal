"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

/**
 * Batches sparkline data requests. Components register the base they need; the
 * provider debounces and fetches them all in one /api/sparklines call.
 */
interface Bus {
  series: Record<string, number[]>;
  request: (base: string) => void;
}
const Ctx = createContext<Bus | null>(null);

export function SparklineProvider({ children }: { children: ReactNode }) {
  const [series, setSeries] = useState<Record<string, number[]>>({});
  const pending = useRef<Set<string>>(new Set());
  const requested = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = async () => {
    const bases = Array.from(pending.current);
    pending.current.clear();
    if (!bases.length) return;
    try {
      const res = await fetch(`/api/sparklines?bases=${bases.join(",")}&interval=1h&limit=48`);
      if (!res.ok) return;
      const j = await res.json();
      setSeries((s) => ({ ...s, ...(j.data ?? {}) }));
    } catch {}
  };

  const request = (base: string) => {
    if (requested.current.has(base)) return;
    requested.current.add(base);
    pending.current.add(base);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 80); // debounce burst of mounts into one call
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <Ctx.Provider value={{ series, request }}>{children}</Ctx.Provider>;
}

export function useSparkline(base: string): number[] | null {
  const bus = useContext(Ctx);
  useEffect(() => { bus?.request(base); }, [bus, base]);
  if (!bus) return null;
  return bus.series[base] ?? null;
}
