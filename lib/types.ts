export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker24 {
  symbol: string;       // e.g. BTCUSDT
  base: string;         // BTC
  price: number;
  change: number;       // 24h absolute
  changePercent: number;
  high: number;
  low: number;
  volumeBase: number;
  volumeQuote: number;  // USDT volume
}

export type DataSource = "live" | "demo";

export interface Sourced<T> {
  data: T;
  source: DataSource;
}

export type Bias =
  | "Strong Bullish" | "Bullish" | "Moderately Bullish" | "Neutral"
  | "Mixed" | "Moderately Bearish" | "Bearish" | "Strong Bearish";

export type SignalLabel =
  | "Buy Setup" | "Buy Watchlist" | "Hold" | "Take Profit Zone" | "Wait" | "Avoid / High Risk";

export interface TradePlan {
  entryZone: [number, number];
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
}

export interface QuantBreakdown {
  technical: number;
  momentum: number;
  trend: number;
  volatilityRisk: number;
  composite: number;
}

export interface TechnicalSnapshot {
  price: number;
  sma20: number | null;
  sma50: number | null;
  sma100: number | null;
  sma200: number | null;
  ema9: number | null;
  ema21: number | null;
  rsi14: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  atr14: number | null;
  vwap: number | null;
  avgVolume20: number | null;
  lastVolume: number | null;
  support: number[];
  resistance: number[];
  trendStrength: "strong up" | "up" | "sideways" | "down" | "strong down";
}

export interface Analysis {
  symbol: string;
  asOf: number;
  source: DataSource;
  technicals: TechnicalSnapshot;
  quant: QuantBreakdown;
  bias: Bias;
  confidence: number;
  signal: SignalLabel;
  riskRating: "Low" | "Moderate" | "Elevated" | "High";
  reasons: string[];
  risks: string[];
  invalidation: string;
  whatToWatch: string[];
  tradePlan: TradePlan | null;
  aiSummary: string;
  aiSource: "rule-based";
  disclaimer: string;
}
