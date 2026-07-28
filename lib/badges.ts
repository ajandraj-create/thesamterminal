/** Shared lightweight signal/trend badges derived from screener metrics. */
export interface ScreenRowLite {
  base: string; price: number; rsi14: number | null; above200: boolean | null;
  macdCross: "bullish" | "bearish" | null; volumeSpike: boolean;
  volatility: "high" | "normal"; changePct30d: number;
}

export function quickSignal(r: ScreenRowLite): { label: string; tone: "bull" | "bear" | "warn" | "neutral" } {
  if (r.above200 === false && r.volatility === "high") return { label: "High Risk", tone: "bear" };
  if (r.rsi14 != null && r.rsi14 > 72) return { label: "Sell Pressure", tone: "warn" };
  if (r.above200 && r.rsi14 != null && r.rsi14 >= 45 && r.rsi14 <= 70) return { label: "Buy Setup", tone: "bull" };
  if (r.above200 === false) return { label: "Avoid", tone: "bear" };
  if (r.rsi14 != null && r.rsi14 < 32) return { label: "Watch", tone: "warn" };
  return { label: "Hold", tone: "neutral" };
}

export const TONE_CLASS: Record<"bull" | "bear" | "warn" | "neutral", string> = {
  bull: "text-bull border-bull/40 bg-bull/10",
  bear: "text-bear border-bear/40 bg-bear/10",
  warn: "text-warn border-warn/40 bg-warn/10",
  neutral: "text-muted border-edgesoft bg-ink/40",
};
