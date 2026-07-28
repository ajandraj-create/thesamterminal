import { describe, it, expect } from "vitest";
import { sma, smaSeries, ema, rsi, macd, atr, annualizedVolPct, stdev } from "@/lib/indicators";
import type { Candle } from "@/lib/types";

const candle = (close: number, i: number): Candle => ({
  time: i * 86400, open: close, high: close * 1.01, low: close * 0.99, close, volume: 1000,
});

describe("sma", () => {
  it("returns null before warm-up", () => {
    expect(sma([1, 2], 5)).toBeNull();
  });
  it("computes the average of the last N values", () => {
    expect(sma([2, 4, 6, 8], 4)).toBe(5);
    expect(sma([1, 2, 3, 10, 20], 2)).toBe(15);
  });
});

describe("smaSeries", () => {
  it("aligns to input with nulls during warm-up", () => {
    const s = smaSeries([1, 2, 3, 4], 2);
    expect(s[0]).toBeNull();
    expect(s[1]).toBe(1.5);
    expect(s[3]).toBe(3.5);
  });
});

describe("ema", () => {
  it("returns null with insufficient data", () => {
    expect(ema([1, 2], 10)).toBeNull();
  });
  it("equals the seed SMA at the first computable point", () => {
    expect(ema([2, 4, 6], 3)).toBeCloseTo(4, 5);
  });
});

describe("rsi", () => {
  it("is 100 for a monotonic rise (no losses)", () => {
    const rising = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(rsi(rising, 14)).toBe(100);
  });
  it("sits near 0 for a monotonic fall", () => {
    const falling = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(rsi(falling, 14)!).toBeLessThan(5);
  });
  it("returns null without enough data", () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });
});

describe("macd", () => {
  it("returns null below the required length", () => {
    expect(macd([1, 2, 3])).toBeNull();
  });
  it("produces a positive histogram on an accelerating uptrend", () => {
    // accelerating (not perfectly linear) so the fast EMA leads the slow EMA
    const up = Array.from({ length: 60 }, (_, i) => 100 + i * i * 0.05);
    const m = macd(up)!;
    expect(m.histogram).toBeGreaterThan(0);
  });
  it("returns a near-zero histogram on a perfectly linear trend", () => {
    const linear = Array.from({ length: 60 }, (_, i) => 100 + i * 2);
    const m = macd(linear)!;
    expect(Math.abs(m.histogram)).toBeLessThan(0.01);
  });
});

describe("atr", () => {
  it("is positive for non-flat candles", () => {
    const candles = Array.from({ length: 20 }, (_, i) => candle(100 + i, i));
    expect(atr(candles, 14)!).toBeGreaterThan(0);
  });
});

describe("stdev", () => {
  it("is zero for identical values", () => {
    expect(stdev([5, 5, 5])).toBe(0);
  });
  it("matches a known case", () => {
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
  });
});

describe("annualizedVolPct", () => {
  it("returns null with insufficient history", () => {
    expect(annualizedVolPct([1, 2, 3], 30)).toBeNull();
  });
  it("is ~0 for a perfectly flat series", () => {
    const flat = Array(40).fill(100);
    expect(annualizedVolPct(flat, 30)).toBeCloseTo(0, 5);
  });
});

describe("sessionVwapSeries", () => {
  it("resets the anchor at each UTC day boundary", async () => {
    const { sessionVwapSeries } = await import("@/lib/indicators");
    const mk = (time: number, price: number, volume: number) =>
      ({ time, open: price, high: price, low: price, close: price, volume });
    // Day 1: two candles at 100 and 200 (equal volume) → session VWAP 150.
    // Day 2: first candle at 500 → VWAP must reset to 500, not blend with day 1.
    const candles = [
      mk(0, 100, 10),
      mk(3600, 200, 10),
      mk(86400, 500, 10),
    ];
    const vw = sessionVwapSeries(candles);
    expect(vw[1]).toBeCloseTo(150);
    expect(vw[2]).toBeCloseTo(500);
  });
});
