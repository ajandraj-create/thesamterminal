import { Candle } from "./types";

/** Simple moving average of the last `period` closes. */
export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** Full SMA series aligned to input (nulls before warm-up). */
export function smaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function emaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function ema(values: number[], period: number): number | null {
  const s = emaSeries(values, period);
  return s[s.length - 1] ?? null;
}

/** Wilder's RSI. */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): { macd: number; signal: number; histogram: number } | null {
  if (values.length < slow + signalPeriod) return null;
  const fastS = emaSeries(values, fast);
  const slowS = emaSeries(values, slow);
  const macdLine: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (fastS[i] != null && slowS[i] != null) macdLine.push((fastS[i] as number) - (slowS[i] as number));
  }
  const signalS = emaSeries(macdLine, signalPeriod);
  const m = macdLine[macdLine.length - 1];
  const s = signalS[signalS.length - 1];
  if (m == null || s == null) return null;
  return { macd: m, signal: s, histogram: m - s };
}

/** Average True Range (Wilder). */
export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)));
  }
  let a = trs.slice(0, period).reduce((x, y) => x + y, 0) / period;
  for (let i = period; i < trs.length; i++) a = (a * (period - 1) + trs[i]) / period;
  return a;
}

/** Volume-weighted average price across the supplied candles (use intraday session candles). */
export function vwap(candles: Candle[]): number | null {
  let pv = 0;
  let vol = 0;
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    vol += c.volume;
  }
  return vol > 0 ? pv / vol : null;
}

export function stdev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

/** Annualized historical volatility from daily closes, in percent. */
export function annualizedVolPct(closes: number[], lookback = 30): number | null {
  if (closes.length < lookback + 1) return null;
  const rets: number[] = [];
  const slice = closes.slice(-(lookback + 1));
  for (let i = 1; i < slice.length; i++) rets.push(Math.log(slice[i] / slice[i - 1]));
  return stdev(rets) * Math.sqrt(252) * 100;
}

/** Cumulative VWAP series anchored at the first loaded candle. */
export function vwapSeries(candles: Candle[]): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  let pv = 0, vol = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    pv += ((c.high + c.low + c.close) / 3) * c.volume;
    vol += c.volume;
    out[i] = vol > 0 ? pv / vol : null;
  }
  return out;
}

/**
 * Session VWAP: resets at each UTC daily open (crypto convention — 00:00 UTC).
 * Unlike load-anchored VWAP, its value doesn't change meaning depending on how
 * far back the user has scrolled. For intervals >= 1d it degrades to per-candle
 * typical price, so callers should only show it on intraday timeframes.
 */
export function sessionVwapSeries(candles: Candle[]): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  let pv = 0, vol = 0, day = -1;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const d = Math.floor(c.time / 86400);
    if (d !== day) { day = d; pv = 0; vol = 0; } // new UTC session — reset anchor
    pv += ((c.high + c.low + c.close) / 3) * c.volume;
    vol += c.volume;
    out[i] = vol > 0 ? pv / vol : null;
  }
  return out;
}

/** Supertrend (period, multiplier). Returns separate up/down lines for coloring. */
export function supertrendSeries(
  candles: Candle[],
  period = 10,
  mult = 3
): { up: (number | null)[]; down: (number | null)[] } {
  const n = candles.length;
  const up: (number | null)[] = new Array(n).fill(null);
  const down: (number | null)[] = new Array(n).fill(null);
  if (n < period + 2) return { up, down };

  // Wilder ATR series
  const atrS: number[] = new Array(n).fill(0);
  let acc = 0;
  for (let i = 1; i < n; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    if (i <= period) {
      acc += tr;
      atrS[i] = acc / Math.min(i, period);
    } else {
      atrS[i] = (atrS[i - 1] * (period - 1) + tr) / period;
    }
  }

  let upperBand = 0, lowerBand = 0, trendUp = true;
  for (let i = period; i < n; i++) {
    const mid = (candles[i].high + candles[i].low) / 2;
    const basicUpper = mid + mult * atrS[i];
    const basicLower = mid - mult * atrS[i];
    upperBand = i === period || basicUpper < upperBand || candles[i - 1].close > upperBand ? basicUpper : upperBand;
    lowerBand = i === period || basicLower > lowerBand || candles[i - 1].close < lowerBand ? basicLower : lowerBand;
    if (i === period) trendUp = candles[i].close >= mid;
    else if (trendUp && candles[i].close < lowerBand) trendUp = false;
    else if (!trendUp && candles[i].close > upperBand) trendUp = true;
    if (trendUp) up[i] = lowerBand;
    else down[i] = upperBand;
  }
  return { up, down };
}
