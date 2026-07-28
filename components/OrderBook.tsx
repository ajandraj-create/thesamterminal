"use client";

import { useEffect, useRef, useState } from "react";
import { depthStream } from "@/lib/streams";
import { fmtCrypto } from "@/lib/format";

type Level = [string, string]; // [price, qty]

/** Live order book — Binance depth20 stream, throttled to ~4 renders/sec. */
export default function OrderBook({ symbol }: { symbol: string }) {
  const [book, setBook] = useState<{ bids: Level[]; asks: Level[] } | null>(null);
  const pending = useRef<{ bids: Level[]; asks: Level[] } | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    const flush = setInterval(() => {
      if (pending.current) {
        setBook(pending.current);
        pending.current = null;
      }
    }, 250);
    const connect = () => {
      if (closed) return;
      ws = new WebSocket(depthStream(symbol, 20));
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.bids && d.asks) pending.current = { bids: d.bids.slice(0, 14), asks: d.asks.slice(0, 14) };
        } catch {}
      };
      ws.onclose = () => { if (!closed) setTimeout(connect, 3000); };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => { closed = true; clearInterval(flush); ws?.close(); };
  }, [symbol]);

  if (!book) return <div className="h-[200px] grid place-items-center text-xs text-muted font-mono">Connecting to depth stream…</div>;

  const maxQty = Math.max(
    ...book.bids.map((b) => parseFloat(b[1])),
    ...book.asks.map((a) => parseFloat(a[1])),
    1e-9
  );
  const spread = parseFloat(book.asks[0]?.[0] ?? "0") - parseFloat(book.bids[0]?.[0] ?? "0");

  const Row = ({ level, side }: { level: Level; side: "bid" | "ask" }) => {
    const qty = parseFloat(level[1]);
    const w = Math.max(2, (qty / maxQty) * 100);
    return (
      <div className="relative flex justify-between px-2 py-[3px] font-mono text-[11px] tabular-nums">
        <div
          className={`absolute inset-y-0 ${side === "bid" ? "right-0 bg-bull/15" : "right-0 bg-bear/15"}`}
          style={{ width: `${w}%`, transition: "width 0.25s ease" }}
        />
        <span className={`relative ${side === "bid" ? "text-bull" : "text-bear"}`}>{fmtCrypto(parseFloat(level[0]))}</span>
        <span className="relative text-slate-300">{qty.toFixed(4)}</span>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between px-2 pb-1 text-[10px] uppercase tracking-[0.14em] text-muted font-mono">
        <span>Price</span><span>Size</span>
      </div>
      <div className="flex flex-col-reverse">
        {book.asks.map((a, i) => <Row key={`a${i}`} level={a} side="ask" />)}
      </div>
      <div className="my-1.5 border-y border-edge px-2 py-1 text-center font-mono text-[11px] text-muted">
        spread {fmtCrypto(spread)}
      </div>
      {book.bids.map((b, i) => <Row key={`b${i}`} level={b} side="bid" />)}
    </div>
  );
}
