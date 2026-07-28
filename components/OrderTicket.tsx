"use client";

import { useEffect, useState } from "react";
import { usePaperStore, OrderType, Side } from "@/hooks/usePaperStore";
import { toSymbol } from "@/lib/binance";
import { fmtCrypto } from "@/lib/format";

const FEE_RATE = 0.001;

export default function OrderTicket({ base, livePrice }: { base: string; livePrice: number | null }) {
  const symbol = toSymbol(base);
  const { placeOrder, balance, draft, setDraft } = usePaperStore();
  const [side, setSide] = useState<Side>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Autofill from "Trade this setup"
  useEffect(() => {
    if (!draft || draft.base !== base) return;
    setSide(draft.side);
    setType(draft.type);
    if (draft.qty) setQty(String(draft.qty));
    if (draft.limitPrice) setLimitPrice(String(draft.limitPrice));
    if (draft.sl) setSl(String(draft.sl));
    if (draft.tp) setTp(String(draft.tp));
    setMsg({ text: "Setup loaded from the signal engine — review and confirm.", ok: true });
    setDraft(null);
  }, [draft, base, setDraft]);

  const q = parseFloat(qty) || 0;
  const refPrice = type === "market" ? livePrice ?? 0 : parseFloat(limitPrice) || parseFloat(stopPrice) || livePrice || 0;
  const value = q * refPrice;
  const fee = value * FEE_RATE;
  const slN = parseFloat(sl) || null;
  const tpN = parseFloat(tp) || null;
  const rr = slN && tpN && refPrice && refPrice !== slN ? (tpN - refPrice) / (refPrice - slN) : null;

  const setPct = (pct: number) => {
    if (!refPrice) return;
    const usdt = (balance * pct) / 100 / (1 + FEE_RATE);
    setQty((usdt / refPrice).toFixed(6));
  };

  const submit = () => {
    const err = placeOrder({
      symbol, base, side, type, qty: q,
      limitPrice: parseFloat(limitPrice) || undefined,
      stopPrice: parseFloat(stopPrice) || undefined,
      sl: slN ?? undefined, tp: tpN ?? undefined,
    });
    setMsg(err ? { text: err, ok: false } : { text: side === "buy" && type === "market" ? "Filled at live price." : "Order placed.", ok: true });
    if (!err && type === "market") setQty("");
  };

  const input = "w-full rounded-lg border border-edgesoft bg-ink/70 px-2.5 py-1.5 text-sm font-mono outline-none focus:border-gold/60 transition placeholder:text-dim";

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => setSide("buy")} className={`rounded-lg py-1.5 text-sm font-bold transition active:scale-95 border ${side === "buy" ? "bg-bull/15 text-bull border-bull/50" : "border-edgesoft text-muted hover:text-slate-200"}`}>Buy</button>
        <button onClick={() => setSide("sell")} className={`rounded-lg py-1.5 text-sm font-bold transition active:scale-95 border ${side === "sell" ? "bg-bear/15 text-bear border-bear/50" : "border-edgesoft text-muted hover:text-slate-200"}`}>Sell</button>
      </div>
      <div className="flex gap-1">
        {(["market", "limit", "stop"] as OrderType[]).map((t) => (
          <button key={t} onClick={() => setType(t)} className={`flex-1 rounded-lg py-1 text-[11px] font-mono uppercase transition border ${type === t ? "bg-gold/15 text-gold border-gold/40" : "border-transparent text-dim hover:text-muted"}`}>{t}</button>
        ))}
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">Quantity ({base})</label>
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.00" className={input} inputMode="decimal" />
        <div className="flex gap-1 mt-1">
          {[10, 25, 50, 100].map((p) => (
            <button key={p} onClick={() => setPct(p)} className="flex-1 rounded border border-edgesoft py-0.5 text-[10px] font-mono text-dim hover:text-gold hover:border-gold/40 transition">{p}%</button>
          ))}
        </div>
      </div>

      {type === "limit" && (
        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">Limit price</label>
          <input value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder={livePrice ? fmtCrypto(livePrice) : "0.00"} className={input} inputMode="decimal" />
        </div>
      )}
      {type === "stop" && (
        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">Stop trigger price</label>
          <input value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} placeholder={livePrice ? fmtCrypto(livePrice) : "0.00"} className={input} inputMode="decimal" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">Stop-loss</label>
          <input value={sl} onChange={(e) => setSl(e.target.value)} placeholder="optional" className={input} inputMode="decimal" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-dim font-mono">Take-profit</label>
          <input value={tp} onChange={(e) => setTp(e.target.value)} placeholder="optional" className={input} inputMode="decimal" />
        </div>
      </div>

      <dl className="text-[11px] font-mono text-dim space-y-1 border-t border-edgesoft pt-2">
        <div className="flex justify-between"><dt>Est. value</dt><dd className="text-muted">{value ? `${value.toFixed(2)} USDT` : "—"}</dd></div>
        <div className="flex justify-between"><dt>Est. fee (0.10%)</dt><dd className="text-muted">{fee ? fee.toFixed(2) : "—"}</dd></div>
        <div className="flex justify-between"><dt>Risk / reward</dt><dd className={rr != null ? (rr >= 1.5 ? "text-bull" : "text-warn") : "text-muted"}>{rr != null ? `${rr.toFixed(2)}R` : "—"}</dd></div>
        <div className="flex justify-between"><dt>Paper balance</dt><dd className="text-gold">{balance.toFixed(2)} USDT</dd></div>
      </dl>

      <button
        onClick={submit}
        className={`w-full rounded-xl py-2 text-sm font-bold transition active:scale-[0.98] border gold-ring
          ${side === "buy" ? "bg-bull/20 text-bull border-bull/50 hover:bg-bull/30" : "bg-bear/20 text-bear border-bear/50 hover:bg-bear/30"}`}
      >
        {side === "buy" ? "Buy" : "Sell"} {base} · paper
      </button>
      {msg && <p className={`text-[11px] ${msg.ok ? "text-bull" : "text-bear"}`}>{msg.text}</p>}
      <p className="text-[10px] text-dim leading-relaxed">Simulated execution on live prices. Educational only — no real funds.</p>
    </div>
  );
}
