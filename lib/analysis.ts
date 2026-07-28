import { annualizedVolPct, atr, ema, macd, rsi, sma } from "./indicators";
import { supportResistance } from "./levels";
import {
  Analysis, Bias, Candle, DataSource, QuantBreakdown, SignalLabel,
  TechnicalSnapshot, TradePlan,
} from "./types";

export const DISCLAIMER =
  "This platform provides educational market analysis only and is not financial advice. Crypto assets are highly volatile and you can lose your entire investment. Always do your own research and consider speaking with a licensed financial advisor before making investment decisions.";

export function buildTechnicals(candles: Candle[], price: number): TechnicalSnapshot {
  const closes = candles.map((c) => c.close);
  const vols = candles.map((c) => c.volume);
  const { support, resistance } = supportResistance(candles);

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);

  let trendStrength: TechnicalSnapshot["trendStrength"] = "sideways";
  if (sma20 && sma50 && sma200) {
    if (price > sma20 && sma20 > sma50 && sma50 > sma200) trendStrength = "strong up";
    else if (price > sma50 && sma50 > sma200) trendStrength = "up";
    else if (price < sma20 && sma20 < sma50 && sma50 < sma200) trendStrength = "strong down";
    else if (price < sma50 && sma50 < sma200) trendStrength = "down";
  }

  return {
    price,
    sma20, sma50,
    sma100: sma(closes, 100),
    sma200,
    ema9: ema(closes, 9),
    ema21: ema(closes, 21),
    rsi14: rsi(closes, 14),
    macd: macd(closes),
    atr14: atr(candles, 14),
    vwap: null,
    avgVolume20: sma(vols, 20),
    lastVolume: vols[vols.length - 1] ?? null,
    support, resistance,
    trendStrength,
  };
}

export function buildQuant(t: TechnicalSnapshot, closes: number[]): QuantBreakdown {
  let trend = 50;
  if (t.sma200 != null) trend += t.price > t.sma200 ? 15 : -15;
  if (t.sma50 != null) trend += t.price > t.sma50 ? 10 : -10;
  if (t.sma50 != null && t.sma200 != null) trend += t.sma50 > t.sma200 ? 15 : -15;
  if (t.sma20 != null && t.sma50 != null) trend += t.sma20 > t.sma50 ? 10 : -10;

  let momentum = 50;
  if (t.rsi14 != null) {
    if (t.rsi14 >= 45 && t.rsi14 <= 70) momentum += 20;
    else if (t.rsi14 > 70) momentum -= 10;
    else if (t.rsi14 < 30) momentum -= 5;
    else momentum -= 10;
  }
  if (t.macd) momentum += t.macd.histogram > 0 ? 15 : -15;
  if (t.avgVolume20 && t.lastVolume) {
    const ratio = t.lastVolume / t.avgVolume20;
    if (ratio > 1.5) momentum += 10;
    else if (ratio < 0.6) momentum -= 5;
  }

  let technical = 50;
  if (t.sma20 != null) {
    const ext = (t.price - t.sma20) / t.sma20;
    if (Math.abs(ext) > 0.15) technical -= 15; // crypto runs hotter; wider extension band
    else technical += 10;
  }
  if (t.resistance.length > 0) {
    const dist = (t.resistance[0] - t.price) / t.price;
    technical += dist > 0.05 ? 10 : -5;
  }
  if (t.support.length > 0) {
    const dist = (t.price - t.support[0]) / t.price;
    technical += dist < 0.06 ? 10 : 0;
  }

  // Crypto volatility bands: BTC's "normal" would be extreme for stocks.
  const vol = annualizedVolPct(closes, 30);
  let volatilityRisk = 50;
  if (vol != null) {
    if (vol < 45) volatilityRisk = 85;
    else if (vol < 70) volatilityRisk = 68;
    else if (vol < 100) volatilityRisk = 50;
    else if (vol < 150) volatilityRisk = 32;
    else volatilityRisk = 18;
  }

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  trend = clamp(trend);
  momentum = clamp(momentum);
  technical = clamp(technical);
  volatilityRisk = clamp(volatilityRisk);
  const composite = clamp(trend * 0.35 + momentum * 0.3 + technical * 0.2 + volatilityRisk * 0.15);
  return { trend, momentum, technical, volatilityRisk, composite };
}

export function buildSignal(t: TechnicalSnapshot, q: QuantBreakdown): {
  bias: Bias; signal: SignalLabel; confidence: number;
  riskRating: Analysis["riskRating"]; reasons: string[]; risks: string[];
  invalidation: string; whatToWatch: string[];
} {
  const reasons: string[] = [];
  const risks: string[] = [];
  const watch: string[] = [];
  const p = (n: number) => n >= 1000 ? n.toFixed(0) : n >= 1 ? n.toFixed(2) : n.toPrecision(4);

  if (t.sma200 && t.price > t.sma200) reasons.push("Price is above the 200-period moving average (long-term uptrend intact).");
  if (t.sma200 && t.price < t.sma200) risks.push("Price is below the 200-period moving average — the long-term trend is against the setup.");
  if (t.sma50 && t.sma200 && t.sma50 > t.sma200) reasons.push("50-period SMA is above the 200-period SMA (golden-cross regime).");
  if (t.rsi14 != null) {
    if (t.rsi14 > 70) risks.push(`RSI ${t.rsi14.toFixed(0)} is overbought — chasing here has poor risk/reward.`);
    else if (t.rsi14 < 30) watch.push(`RSI ${t.rsi14.toFixed(0)} is oversold — wait for a stabilization candle before assuming reversal.`);
    else if (t.rsi14 >= 45) reasons.push(`RSI ${t.rsi14.toFixed(0)} shows healthy momentum without being overbought.`);
  }
  if (t.macd) {
    if (t.macd.histogram > 0) reasons.push("MACD histogram is positive (bullish momentum).");
    else risks.push("MACD histogram is negative (momentum currently bearish).");
  }
  if (t.avgVolume20 && t.lastVolume && t.lastVolume > 1.5 * t.avgVolume20)
    reasons.push("Volume is running well above its 20-period average — moves carry conviction.");
  if (t.sma20) {
    const ext = (t.price - t.sma20) / t.sma20;
    if (ext > 0.15) risks.push("Price is extended more than 15% above the 20-period SMA — mean-reversion risk.");
  }
  if (t.resistance.length) watch.push(`Watch resistance near ${p(t.resistance[0])} — a clean break and hold above it strengthens the bullish case.`);
  if (t.support.length) watch.push(`Watch support near ${p(t.support[0])} — losing it invalidates the setup.`);

  let bias: Bias;
  if (q.composite >= 75) bias = "Strong Bullish";
  else if (q.composite >= 63) bias = "Bullish";
  else if (q.composite >= 55) bias = "Moderately Bullish";
  else if (q.composite >= 45) bias = "Neutral";
  else if (q.composite >= 37) bias = "Moderately Bearish";
  else if (q.composite >= 25) bias = "Bearish";
  else bias = "Strong Bearish";

  const overbought = t.rsi14 != null && t.rsi14 > 72;
  const highRisk = q.volatilityRisk <= 25;
  let signal: SignalLabel;
  if (highRisk && q.composite < 55) signal = "Avoid / High Risk";
  else if (overbought && q.composite >= 60) signal = "Take Profit Zone";
  else if (q.composite >= 70) signal = "Buy Setup";
  else if (q.composite >= 60) signal = "Buy Watchlist";
  else if (q.composite >= 45) signal = "Hold";
  else if (q.composite >= 35) signal = "Wait";
  else signal = "Avoid / High Risk";

  const riskRating: Analysis["riskRating"] =
    q.volatilityRisk >= 70 ? "Low" : q.volatilityRisk >= 50 ? "Moderate" : q.volatilityRisk >= 30 ? "Elevated" : "High";

  const spread = Math.abs(q.composite - 50) * 2;
  const confidence = Math.max(20, Math.min(92, Math.round(40 + spread * 0.5 + (reasons.length - risks.length) * 4)));

  const invalidation = t.support.length
    ? `A close below ${p(t.support[0])} (nearest support) invalidates the current setup.`
    : t.sma50
      ? `A close below the 50-period SMA (${p(t.sma50)}) invalidates the current setup.`
      : "Invalidation level unavailable — insufficient price history.";

  return { bias, signal, confidence, riskRating, reasons, risks, invalidation, whatToWatch: watch };
}

export function buildTradePlan(t: TechnicalSnapshot): TradePlan | null {
  if (!t.atr14 || t.atr14 <= 0) return null;
  const round = (n: number) => +n.toPrecision(n >= 1000 ? 6 : 5);
  const nearestSupport = t.support[0] ?? t.price - 2 * t.atr14;
  const entryLow = Math.min(t.price, Math.max(nearestSupport, t.price - 0.75 * t.atr14));
  const entryHigh = t.price + 0.25 * t.atr14;
  const stop = round(nearestSupport - 0.6 * t.atr14);
  const entryMid = (entryLow + entryHigh) / 2;
  const risk = entryMid - stop;
  if (risk <= 0) return null;
  const tp1 = t.resistance[0] && t.resistance[0] > entryMid + risk ? t.resistance[0] : entryMid + 1.5 * risk;
  const tp2 = t.resistance[1] && t.resistance[1] > tp1 ? t.resistance[1] : entryMid + 2.5 * risk;
  return {
    entryZone: [round(entryLow), round(entryHigh)],
    stopLoss: stop,
    takeProfit1: round(tp1),
    takeProfit2: round(tp2),
    riskReward: +(((tp1 - entryMid) / risk)).toFixed(2),
  };
}

export function ruleBasedSummary(base: string, a: Omit<Analysis, "aiSummary" | "aiSource" | "disclaimer">): string {
  const t = a.technicals;
  const parts: string[] = [];
  parts.push(
    `${base} currently screens as ${a.bias.toLowerCase()} on the daily timeframe with a quant score of ${a.quant.composite}/100 and ${a.confidence}/100 confidence. The structural trend is ${t.trendStrength}.`
  );
  if (a.reasons.length) parts.push(`Supporting the setup: ${a.reasons.slice(0, 3).join(" ")}`);
  if (a.risks.length) parts.push(`Working against it: ${a.risks.slice(0, 2).join(" ")}`);
  parts.push(a.invalidation);
  if (a.tradePlan)
    parts.push(
      `For study purposes, the model frames an entry zone of ${a.tradePlan.entryZone[0]}–${a.tradePlan.entryZone[1]}, a stop at ${a.tradePlan.stopLoss}, and targets at ${a.tradePlan.takeProfit1} / ${a.tradePlan.takeProfit2} (≈${a.tradePlan.riskReward}R to the first target).`
    );
  parts.push("Crypto is extremely volatile. This is educational market analysis, not financial advice.");
  return parts.join(" ");
}

export function assembleAnalysis(
  symbol: string,
  candles: Candle[],
  price: number,
  source: DataSource
): Omit<Analysis, "aiSummary" | "aiSource" | "disclaimer"> {
  const technicals = buildTechnicals(candles, price || candles[candles.length - 1].close);
  const quant = buildQuant(technicals, candles.map((c) => c.close));
  const sig = buildSignal(technicals, quant);
  return {
    symbol: symbol.toUpperCase(),
    asOf: Math.floor(Date.now() / 1000),
    source,
    technicals,
    quant,
    ...sig,
    tradePlan: buildTradePlan(technicals),
  };
}
