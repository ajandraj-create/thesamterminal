"use client";

import { useEffect } from "react";
import { useLiveTickers } from "@/hooks/useLiveTicker";
import { usePaperStore } from "@/hooks/usePaperStore";
import { baseOf } from "@/lib/binance";

/**
 * Site-wide tick feeder: keeps every open paper position and resting order
 * marked to live prices (so SL/TP and limit orders trigger on any page).
 */
export default function PaperTickFeeder() {
  const positions = usePaperStore((s) => s.positions);
  const orders = usePaperStore((s) => s.orders);
  const processTick = usePaperStore((s) => s.processTick);
  const symbols = Array.from(new Set([...positions.map((p) => p.symbol), ...orders.map((o) => o.symbol)]));
  const { ticks } = useLiveTickers(symbols);

  useEffect(() => {
    for (const s of symbols) {
      const t = ticks[s];
      if (t) processTick(s, baseOf(s), t.price);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticks]);

  return null;
}
