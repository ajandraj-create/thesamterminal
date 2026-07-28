import { TechnicalSnapshot } from "@/lib/types";
import { fmtCompact, fmtCrypto } from "@/lib/format";

function Row({ label, value, tone = "text-slate-200" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-edge last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

export default function TechnicalsCard({ t }: { t: TechnicalSnapshot }) {
  const above = (v: number | null) => (v == null ? "text-slate-200" : t.price >= v ? "text-bull" : "text-bear");
  const rsiTone = t.rsi14 == null ? "" : t.rsi14 > 70 ? "text-warn" : t.rsi14 < 30 ? "text-warn" : "text-slate-200";
  return (
    <div className="grid sm:grid-cols-2 gap-x-8">
      <div>
        <Row label="Trend strength" value={t.trendStrength} tone={t.trendStrength.includes("up") ? "text-bull" : t.trendStrength.includes("down") ? "text-bear" : "text-slate-200"} />
        <Row label="SMA 20" value={fmtCrypto(t.sma20)} tone={above(t.sma20)} />
        <Row label="SMA 50" value={fmtCrypto(t.sma50)} tone={above(t.sma50)} />
        <Row label="SMA 200" value={fmtCrypto(t.sma200)} tone={above(t.sma200)} />
        <Row label="EMA 9 / 21" value={`${fmtCrypto(t.ema9)} / ${fmtCrypto(t.ema21)}`} />
      </div>
      <div>
        <Row label="RSI (14)" value={t.rsi14 != null ? t.rsi14.toFixed(1) : "—"} tone={rsiTone} />
        <Row label="MACD hist." value={t.macd ? t.macd.histogram.toFixed(2) : "—"} tone={t.macd && t.macd.histogram > 0 ? "text-bull" : "text-bear"} />
        <Row label="ATR (14)" value={fmtCrypto(t.atr14)} />
        <Row label="Volume / 20-day avg" value={`${fmtCompact(t.lastVolume)} / ${fmtCompact(t.avgVolume20)}`} />
        <Row label="Support · Resistance" value={`${t.support[0] ? fmtCrypto(t.support[0]) : "—"} · ${t.resistance[0] ? fmtCrypto(t.resistance[0]) : "—"}`} />
      </div>
    </div>
  );
}
