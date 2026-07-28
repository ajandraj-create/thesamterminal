"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { createStore, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { miniTickerStream } from "@/lib/streams";
import { FEATURED, QUOTE_ASSET } from "@/lib/binance";

export interface LiveTick {
  symbol: string;
  price: number;
  open24h: number;
  high24h: number;
  low24h: number;
  direction: "up" | "down" | "flat";
}

export type WsStatus = "connecting" | "live" | "reconnecting" | "offline";

/**
 * Shared live-price layer — one WebSocket for the whole app.
 *
 * v13 rewrite: ticks live in a Zustand store instead of React Context.
 * Context re-rendered EVERY consumer on EVERY message of EVERY symbol
 * (~16 renders/sec app-wide, unbounded as symbols grow). Now:
 *
 *  1. Incoming messages are buffered and flushed at most every FLUSH_MS in
 *     ONE store update (per-message setState is gone).
 *  2. Unchanged symbols keep referential identity across flushes, so
 *     `useLiveTickers` selectors (shallow-compared) only re-render a
 *     component when a symbol IT asked for actually ticked.
 */

interface TickerState {
  ticks: Record<string, LiveTick>;
  status: WsStatus;
}

const tickerStore = createStore<TickerState>(() => ({
  ticks: {},
  status: "connecting",
}));

const FLUSH_MS = 100; // ≤10 UI updates/sec regardless of message volume

// ---- subscription manager (module-level; Provider drives the socket) ----
const subs = new Map<number, string[]>();
let idSeq = 0;
let recomputeTimer: ReturnType<typeof setTimeout> | null = null;
let onUnionChange: ((key: string) => void) | null = null;
let currentKey = "";

function scheduleRecompute() {
  if (recomputeTimer) clearTimeout(recomputeTimer);
  // Debounce so a burst of component mounts collapses into one socket rebuild.
  recomputeTimer = setTimeout(() => {
    const set = new Set<string>();
    subs.forEach((arr) => arr.forEach((s) => set.add(s)));
    const key = Array.from(set).sort().join(",");
    if (key !== currentKey) {
      currentKey = key;
      onUnionChange?.(key);
    }
  }, 120);
}

function addSub(symbols: string[]): () => void {
  const id = idSeq++;
  subs.set(id, symbols);
  scheduleRecompute();
  return () => {
    subs.delete(id);
    scheduleRecompute();
  };
}

export function LiveTickerProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Keep the featured majors always subscribed so navigating between coin
    // pages never tears down the socket.
    const releaseBase = addSub(FEATURED.map((b) => `${b}${QUOTE_ASSET}`));

    let ws: WebSocket | null = null;
    let closed = false;
    let attempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // message buffer → single batched store update
    const pending: Record<string, LiveTick> = {};
    const lastPrice: Record<string, number> = {};
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    const flush = () => {
      const keys = Object.keys(pending);
      if (!keys.length) return;
      const prev = tickerStore.getState().ticks;
      const next = { ...prev };
      for (const k of keys) next[k] = pending[k]; // unchanged symbols keep identity
      for (const k of keys) delete pending[k];
      tickerStore.setState({ ticks: next });
    };

    const connect = (symbols: string[]) => {
      if (closed || !symbols.length) return;
      tickerStore.setState({ status: attempts === 0 ? "connecting" : "reconnecting" });
      try {
        ws = new WebSocket(miniTickerStream(symbols));
      } catch {
        tickerStore.setState({ status: "offline" });
        return;
      }
      ws.onopen = () => { attempts = 0; tickerStore.setState({ status: "live" }); };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const d = msg.data ?? msg;
          if (!d?.s || !d?.c) return;
          const symbol = d.s as string;
          const price = parseFloat(d.c);
          const prev = lastPrice[symbol];
          lastPrice[symbol] = price;
          pending[symbol] = {
            symbol, price,
            open24h: parseFloat(d.o), high24h: parseFloat(d.h), low24h: parseFloat(d.l),
            direction: prev == null || price === prev ? "flat" : price > prev ? "up" : "down",
          };
        } catch {}
      };
      ws.onclose = () => {
        if (closed) return;
        attempts++;
        if (attempts > 6) { tickerStore.setState({ status: "offline" }); return; }
        tickerStore.setState({ status: "reconnecting" });
        reconnectTimer = setTimeout(() => connect(currentKey ? currentKey.split(",") : []), Math.min(15000, 1000 * 2 ** attempts));
      };
      ws.onerror = () => ws?.close();
    };

    onUnionChange = (key) => {
      ws?.close();
      ws = null;
      attempts = 0;
      connect(key ? key.split(",") : []);
    };

    flushTimer = setInterval(flush, FLUSH_MS);
    if (currentKey) connect(currentKey.split(","));

    return () => {
      closed = true;
      onUnionChange = null;
      releaseBase();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (flushTimer) clearInterval(flushTimer);
      ws?.close();
    };
  }, []);

  return <>{children}</>;
}

/**
 * Subscribe to live prices for a set of symbols. Returns the tick map filtered
 * to the requested symbols and the connection status. A component re-renders
 * only when one of ITS symbols ticks (shallow-compared selector).
 */
export function useLiveTickers(symbols: string[]) {
  const key = symbols.join(",");

  useEffect(() => {
    if (!symbols.length) return;
    return addSub(symbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const stable = useMemo(() => symbols, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const ticks = useStore(
    tickerStore,
    useShallow((s: TickerState) => {
      const filtered: Record<string, LiveTick> = {};
      for (const sym of stable) if (s.ticks[sym]) filtered[sym] = s.ticks[sym];
      return filtered;
    })
  );
  const status = useStore(tickerStore, (s) => s.status);

  return { ticks, status };
}
