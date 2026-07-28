import { describe, it, expect } from "vitest";
import { buildTechnicals, buildQuant, buildSignal, buildTradePlan, assembleAnalysis } from "@/lib/analysis";
import type { Candle } from "@/lib/types";

function uptrend(n = 260): Candle[] {
  return Array.from({ length: n }, (_, i) => {
    const close = 100 + i * 0.8;
    return { time: i * 86400, open: close - 0.2, high: close + 0.5, low: close - 0.5, close, volume: 1000 + i };
  });
}
function downtrend(n = 260): Candle[] {
  return Array.from({ length: n }, (_, i) => {
    const close = 300 - i * 0.8;
    return { time: i * 86400, open: close + 0.2, high: close + 0.5, low: close - 0.5, close, volume: 1000 };
  });
}

describe("buildTechnicals", () => {
  it("marks a clean uptrend as up or strong up", () => {
    const c = uptrend();
    const t = buildTechnicals(c, c[c.length - 1].close);
    expect(["up", "strong up"]).toContain(t.trendStrength);
    expect(t.sma200).not.toBeNull();
  });
  it("marks a clean downtrend as down or strong down", () => {
    const c = downtrend();
    const t = buildTechnicals(c, c[c.length - 1].close);
    expect(["down", "strong down"]).toContain(t.trendStrength);
  });
});

describe("buildQuant", () => {
  it("scores an uptrend higher than a downtrend", () => {
    const up = uptrend(), down = downtrend();
    const qUp = buildQuant(buildTechnicals(up, up[up.length - 1].close), up.map((c) => c.close));
    const qDown = buildQuant(buildTechnicals(down, down[down.length - 1].close), down.map((c) => c.close));
    expect(qUp.composite).toBeGreaterThan(qDown.composite);
  });
  it("keeps all sub-scores within 0..100", () => {
    const c = uptrend();
    const q = buildQuant(buildTechnicals(c, c[c.length - 1].close), c.map((x) => x.close));
    for (const v of [q.trend, q.momentum, q.technical, q.volatilityRisk, q.composite]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("buildSignal", () => {
  it("gives a bullish bias and confidence in range for an uptrend", () => {
    const c = uptrend();
    const t = buildTechnicals(c, c[c.length - 1].close);
    const q = buildQuant(t, c.map((x) => x.close));
    const sig = buildSignal(t, q);
    expect(sig.bias.toLowerCase()).toContain("bull");
    expect(sig.confidence).toBeGreaterThanOrEqual(20);
    expect(sig.confidence).toBeLessThanOrEqual(92);
    expect(typeof sig.invalidation).toBe("string");
  });
});

describe("buildTradePlan", () => {
  it("produces a stop below entry and positive R:R for an uptrend", () => {
    const c = uptrend();
    const t = buildTechnicals(c, c[c.length - 1].close);
    const plan = buildTradePlan(t);
    expect(plan).not.toBeNull();
    expect(plan!.stopLoss).toBeLessThan(plan!.entryZone[1]);
    expect(plan!.riskReward).toBeGreaterThan(0);
    expect(plan!.takeProfit2).toBeGreaterThan(plan!.takeProfit1);
  });
});

describe("assembleAnalysis", () => {
  it("returns a complete analysis object", () => {
    const c = uptrend();
    const a = assembleAnalysis("BTCUSDT", c, c[c.length - 1].close, "live");
    expect(a.symbol).toBe("BTCUSDT");
    expect(a.quant.composite).toBeGreaterThanOrEqual(0);
    expect(a.signal).toBeTruthy();
    expect(Array.isArray(a.reasons)).toBe(true);
  });
});
