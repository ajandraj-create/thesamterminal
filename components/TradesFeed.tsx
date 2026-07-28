"use client";

import { useEffect, useState } from "react";
import { tradeStream } from "@/lib/streams";
import { fmtCrypto } from "@/lib/format";

interface Trade { id: number; price: number; qty: number; time: number; buyerMaker: boolean }

/** Live trades tape — every executed trade on the pair, streamed in real time. */
export default function TradesFeed({ symbol }: { symbol: string }) {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    const connect = () => {
      if (closed) return;
      ws = new WebSocket(tradeStream(symbol));
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (!d.p) return;
          setTrades((prev) =>
            [{ id: d.t, price: parseFloat(d.p), qty: parseFloat(d.q), time: d.T, buyerMaker: d.m }, ...prev].slice(0, 26)
          );
        } catch {}
      };
      ws.onclose = () => { if (!closed) setTimeout(connect, 3000); };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => { closed = true; ws?.close(); };
  }, [symbol]);

  if (!trades.length) return <div className="h-[200px] grid place-items-center text-xs text-muted font-mono">Waiting for trades…</div>;

  return (
    <div>
      <div className="flex justify-between px-2 pb-1 text-[10px] uppercase tracking-[0.14em] text-muted font-mono">
        <span>Price</span><span>Size</span><span>Time</span>
      </div>
      <ul className="max-h-[420px] overflow-hidden">
        {trades.map((t) => (
          <li key={t.id} className="flex justify-between px-2 py-[3px] font-mono text-[11px] tabular-nums animate-fadeUp" style={{ animationDuration: "0.25s" }}>
            <span className={t.buyerMaker ? "text-bear" : "text-bull"}>{fmtCrypto(t.price)}</span>
            <span className="text-slate-300">{t.qty.toFixed(4)}</span>
            <span className="text-muted">{new Date(t.time).toLocaleTimeString("en-US", { hour12: false })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
