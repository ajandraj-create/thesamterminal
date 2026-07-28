import { describe, it, expect } from "vitest";
import { supportResistance } from "@/lib/levels";
import type { Candle } from "@/lib/types";

describe("supportResistance", () => {
  it("returns empty arrays with insufficient data", () => {
    const { support, resistance } = supportResistance([], 120);
    expect(support).toEqual([]);
    expect(resistance).toEqual([]);
  });
  it("finds resistance above and support below current price", () => {
    // sawtooth so swing pivots exist
    const candles: Candle[] = Array.from({ length: 150 }, (_, i) => {
      const base = 100 + Math.sin(i / 3) * 10;
      return { time: i * 86400, open: base, high: base + 2, low: base - 2, close: base, volume: 1000 };
    });
    const { support, resistance } = supportResistance(candles, 150);
    const price = candles[candles.length - 1].close;
    support.forEach((s) => expect(s).toBeLessThan(price));
    resistance.forEach((r) => expect(r).toBeGreaterThan(price));
  });
});
