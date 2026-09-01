"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { fmtCrypto, fmtPct, fmtSigned } from "@/lib/format";
import type { Analysis, Ticker24 } from "@/lib/types";

const MAX_COINS = 3;
const DEFAULT_COINS = ["BTC", "ETH", "SOL"];

interface Row {
  base: string;
  analysis: Analysis | null;
  ticker: Ticker24 | null;
  error: string | null;
  loading: boolean;
}

/* ── Light-surface tokens, scoped to this page ──────────────────────────────
   Greens are darkened from the brand #22E565 so they stay legible on white —
   the neon accent only has ~1.8:1 contrast against a light background.      */
const INK = "text-[#0B0F0C]";
const MUTED = "text-[#5B635D]";
const BORDER = "border-[#E3E6E3]";
const BULL = "text-[#0A7A38]";
const BEAR = "text-[#C0332F]";

function toneForSignal(signal: string | undefined) {
  if (!signal) return MUTED;
  if (signal.startsWith("Buy")) return BULL;
  if (signal === "Avoid / High Risk" || signal === "Take Profit Zone") return BEAR;
  return "text-[#8A6D1F]";
}

/** Collapsible band — the "Recommended credit score" pattern. */
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`border-t ${BORDER}`}>
      <h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold ${INK} transition hover:opacity-70`}
        >
          {title}
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </h3>
      {open && <div className="pb-6">{children}</div>}
    </section>
  );
}

/** One value per coin column, kept on the same grid as the headers. */
function CellRow({
  rows,
  label,
  render,
}: {
  rows: Row[];
  label?: string;
  render: (r: Row) => React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      {label && <div className={`mb-1.5 text-xs font-medium ${MUTED}`}>{label}</div>}
      <div className="grid grid-cols-[repeat(var(--cols),minmax(220px,1fr))] gap-4" style={{ ["--cols" as string]: rows.length }}>
        {rows.map((r) => (
          <div key={r.base} className={`text-sm ${INK}`}>
            {r.loading ? <span className={`text-xs ${MUTED}`}>Loading…</span> : r.error ? <span className={`text-xs ${MUTED}`}>—</span> : render(r)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 63 ? "#0A7A38" : pct >= 45 ? "#B8860B" : "#C0332F";
  return (
    <div className="mt-1 h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-[#E8EBE8]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function CompareClient() {
  const [coins, setCoins] = useState<string[]>(DEFAULT_COINS);
  const [data, setData] = useState<Record<string, Row>>({});
  const [universe, setUniverse] = useState<string[]>([]);
  const [picker, setPicker] = useState("");
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/symbols")
      .then((r) => r.json())
      .then((j) => setUniverse(Array.isArray(j.data) ? j.data : []))
      .catch(() => setUniverse([]));
  }, []);

  const load = useCallback(async (base: string) => {
    setData((d) => ({ ...d, [base]: { base, analysis: null, ticker: null, error: null, loading: true } }));
    try {
      const [aRes, tRes] = await Promise.all([
        fetch(`/api/analysis/${base}`),
        fetch(`/api/ticker/${base}`),
      ]);
      if (!aRes.ok) throw new Error("unavailable");
      const analysis: Analysis = await aRes.json();
      const ticker: Ticker24 | null = tRes.ok ? (await tRes.json()).data ?? null : null;
      setData((d) => ({ ...d, [base]: { base, analysis, ticker, error: null, loading: false } }));
    } catch {
      setData((d) => ({ ...d, [base]: { base, analysis: null, ticker: null, error: "Market data unavailable", loading: false } }));
    }
  }, []);

  useEffect(() => {
    coins.forEach((c) => {
      if (!data[c]) void load(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins, load]);

  const rows = useMemo(
    () => coins.map((c) => data[c] ?? { base: c, analysis: null, ticker: null, error: null, loading: true }),
    [coins, data]
  );

  const addCoin = (raw: string) => {
    const base = raw.trim().toUpperCase();
    setPickerError(null);
    if (!base) return;
    if (!/^[A-Z0-9]{2,12}$/.test(base)) return setPickerError("That doesn't look like a symbol.");
    if (coins.includes(base)) return setPickerError(`${base} is already here.`);
    if (coins.length >= MAX_COINS) return setPickerError(`Remove one first — ${MAX_COINS} is the max.`);
    if (universe.length && !universe.includes(base)) return setPickerError(`${base} isn't a tradeable USDT pair.`);
    setCoins((c) => [...c, base]);
    setPicker("");
  };

  const disclaimer = rows.find((r) => r.analysis)?.analysis?.disclaimer;

  return (
    <div className="min-h-screen bg-[#F5F6F5]">
      <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:py-16">
        <header className="mb-10">
          <h1 className={`text-4xl font-bold tracking-tight ${INK} sm:text-5xl`}>
            Compare coins side-by-side
          </h1>
          <p className={`mt-3 text-base ${MUTED}`}>
            Line up the signals before you commit. Educational analysis only — not financial advice.
          </p>
        </header>

        {/* Add-coin picker */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              value={picker}
              onChange={(e) => { setPicker(e.target.value); setPickerError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCoin(picker); } }}
              list="compare-universe"
              placeholder="Add a coin (e.g. LINK)"
              aria-label="Add a coin to compare"
              className={`w-56 rounded-xl border ${BORDER} bg-white px-4 py-2.5 text-sm ${INK} outline-none transition placeholder:text-[#9AA29C] focus:border-[#0A7A38]`}
            />
            <datalist id="compare-universe">
              {universe.slice(0, 400).map((s) => <option key={s} value={s} />)}
            </datalist>
            <button
              type="button"
              onClick={() => addCoin(picker)}
              disabled={coins.length >= MAX_COINS}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B0F0C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#222824] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {pickerError && <p className={`text-xs ${BEAR}`}>{pickerError}</p>}
        </div>

        {/* Comparison surface — scrolls horizontally on small screens */}
        <div className={`overflow-x-auto rounded-2xl border ${BORDER} bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-7`}>
          <div className="min-w-[680px]">
            {/* Column headers */}
            <div
              className="grid grid-cols-[repeat(var(--cols),minmax(220px,1fr))] gap-4 pb-6"
              style={{ ["--cols" as string]: rows.length }}
            >
              {rows.map((r) => {
                const price = r.ticker?.price ?? r.analysis?.technicals.price ?? null;
                const chg = r.ticker?.changePercent ?? null;
                return (
                  <div key={r.base} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setCoins((c) => (c.length > 1 ? c.filter((x) => x !== r.base) : c));
                        setPickerError(null);
                      }}
                      disabled={rows.length <= 1}
                      aria-label={`Remove ${r.base}`}
                      className={`absolute right-0 top-0 rounded-lg p-1 ${MUTED} transition hover:bg-[#F0F2F0] disabled:opacity-30`}
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className={`text-xl font-bold tracking-tight ${INK}`}>{r.base}</div>

                    <div className={`mt-2 text-2xl font-bold tracking-tight ${INK}`}>
                      {r.loading ? <span className={`text-sm font-normal ${MUTED}`}>Loading…</span>
                        : price != null ? `$${fmtCrypto(price)}`
                        : <span className={`text-sm font-normal ${MUTED}`}>Unavailable</span>}
                    </div>

                    {chg != null && (
                      <div className={`mt-0.5 text-sm font-semibold ${chg >= 0 ? BULL : BEAR}`}>
                        {fmtSigned(chg)}% <span className={`font-normal ${MUTED}`}>24h</span>
                      </div>
                    )}

                    {r.analysis && (
                      <div className="mt-4">
                        <div className={`text-xs font-medium ${MUTED}`}>Quant score</div>
                        <div className={`mt-0.5 text-lg font-bold ${INK}`}>
                          {r.analysis.quant.composite}<span className={`text-sm font-normal ${MUTED}`}>/100</span>
                        </div>
                        <ScoreBar value={r.analysis.quant.composite} />
                      </div>
                    )}

                    <Link
                      href={`/coin/${r.base}`}
                      className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#0A7A38] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#086330]"
                    >
                      Open terminal
                    </Link>
                    <p className={`mt-2 text-center text-xs ${MUTED}`}>Full chart &amp; analysis</p>

                    {r.error && <p className={`mt-3 text-xs ${BEAR}`}>{r.error}</p>}
                  </div>
                );
              })}
            </div>

            <Section title="Signal & bias">
              <CellRow rows={rows} label="Signal" render={(r) => (
                <span className={`font-semibold ${toneForSignal(r.analysis?.signal)}`}>{r.analysis?.signal ?? "—"}</span>
              )} />
              <CellRow rows={rows} label="Bias" render={(r) => r.analysis?.bias ?? "—"} />
              <CellRow rows={rows} label="Confidence" render={(r) => r.analysis ? `${r.analysis.confidence}%` : "—"} />
              <CellRow rows={rows} label="Risk rating" render={(r) => r.analysis?.riskRating ?? "—"} />
            </Section>

            <Section title="Quant breakdown">
              {([
                ["Trend", "trend"],
                ["Momentum", "momentum"],
                ["Technical", "technical"],
                ["Volatility risk", "volatilityRisk"],
              ] as const).map(([label, key]) => (
                <CellRow key={key} rows={rows} label={label} render={(r) => {
                  const v = r.analysis?.quant[key];
                  return v == null ? "—" : (
                    <>
                      <span className="font-semibold">{v}</span>
                      <ScoreBar value={v} />
                    </>
                  );
                }} />
              ))}
            </Section>

            <Section title="Key levels" defaultOpen={false}>
              <CellRow rows={rows} label="Support" render={(r) => {
                const s = r.analysis?.technicals.support ?? [];
                return s.length ? s.slice(0, 2).map((n) => `$${fmtCrypto(n)}`).join("  ·  ") : "—";
              }} />
              <CellRow rows={rows} label="Resistance" render={(r) => {
                const s = r.analysis?.technicals.resistance ?? [];
                return s.length ? s.slice(0, 2).map((n) => `$${fmtCrypto(n)}`).join("  ·  ") : "—";
              }} />
              <CellRow rows={rows} label="RSI (14)" render={(r) => {
                const v = r.analysis?.technicals.rsi14;
                return v == null ? "—" : fmtPct(v);
              }} />
              <CellRow rows={rows} label="Trend strength" render={(r) => r.analysis?.technicals.trendStrength ?? "—"} />
            </Section>

            <Section title="Trade plan" defaultOpen={false}>
              <CellRow rows={rows} label="Entry zone" render={(r) => {
                const p = r.analysis?.tradePlan;
                return p ? `$${fmtCrypto(p.entryZone[0])} – $${fmtCrypto(p.entryZone[1])}` : "No plan — conditions unclear";
              }} />
              <CellRow rows={rows} label="Stop loss" render={(r) => {
                const p = r.analysis?.tradePlan;
                return p ? `$${fmtCrypto(p.stopLoss)}` : "—";
              }} />
              <CellRow rows={rows} label="Targets" render={(r) => {
                const p = r.analysis?.tradePlan;
                return p ? `$${fmtCrypto(p.takeProfit1)}  ·  $${fmtCrypto(p.takeProfit2)}` : "—";
              }} />
              <CellRow rows={rows} label="Risk / reward" render={(r) => {
                const p = r.analysis?.tradePlan;
                return p ? `${p.riskReward.toFixed(2)} : 1` : "—";
              }} />
            </Section>

            <Section title="Why this reading" defaultOpen={false}>
              <CellRow rows={rows} render={(r) => {
                const reasons = r.analysis?.reasons ?? [];
                return reasons.length ? (
                  <ul className="space-y-1.5">
                    {reasons.slice(0, 4).map((x, i) => (
                      <li key={i} className={`text-xs leading-relaxed ${MUTED}`}>· {x}</li>
                    ))}
                  </ul>
                ) : "—";
              }} />
            </Section>
          </div>
        </div>

        {disclaimer && (
          <p className={`mt-6 rounded-xl border ${BORDER} bg-white p-4 text-[11px] leading-relaxed ${MUTED}`}>
            {disclaimer}
          </p>
        )}
      </div>
    </div>
  );
}
