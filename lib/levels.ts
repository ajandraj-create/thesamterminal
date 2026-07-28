import { Candle } from "./types";

/**
 * Detect support/resistance from swing highs/lows, clustered into levels.
 * Transparent and deterministic — no black box.
 */
export function supportResistance(
  candles: Candle[],
  lookback = 120,
  pivotWindow = 3,
  maxLevels = 3
): { support: number[]; resistance: number[] } {
  const data = candles.slice(-lookback);
  if (data.length < pivotWindow * 2 + 1) return { support: [], resistance: [] };
  const price = data[data.length - 1].close;

  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = pivotWindow; i < data.length - pivotWindow; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - pivotWindow; j <= i + pivotWindow; j++) {
      if (data[j].high > data[i].high) isHigh = false;
      if (data[j].low < data[i].low) isLow = false;
    }
    if (isHigh) highs.push(data[i].high);
    if (isLow) lows.push(data[i].low);
  }

  const tolerance = price * 0.015;
  const cluster = (points: number[]): number[] => {
    const sorted = [...points].sort((a, b) => a - b);
    const clusters: number[][] = [];
    for (const p of sorted) {
      const last = clusters[clusters.length - 1];
      if (last && p - last[last.length - 1] <= tolerance) last.push(p);
      else clusters.push([p]);
    }
    return clusters
      .map((c) => ({ level: c.reduce((a, b) => a + b, 0) / c.length, touches: c.length }))
      .sort((a, b) => b.touches - a.touches)
      .map((c) => c.level);
  };

  const support = cluster(lows)
    .filter((l) => l < price)
    .sort((a, b) => b - a)
    .slice(0, maxLevels);
  const resistance = cluster(highs)
    .filter((l) => l > price)
    .sort((a, b) => a - b)
    .slice(0, maxLevels);
  return { support, resistance };
}
