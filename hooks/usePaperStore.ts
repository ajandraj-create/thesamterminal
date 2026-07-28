"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { chime } from "@/lib/sound";

/**
 * Paper trading engine — simulated execution against REAL live tick prices.
 * Fees 0.10% per side, market slippage 0.05%. Persisted in localStorage.
 * Educational only.
 */

export type Side = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop";

export interface PaperOrder {
  id: string;
  symbol: string;
  base: string;
  side: Side;
  type: OrderType;
  qty: number;
  limitPrice?: number;
  stopPrice?: number;
  sl?: number;
  tp?: number;
  createdAt: number;
  status: "open" | "filled" | "cancelled";
}

export interface PaperPosition {
  symbol: string;
  base: string;
  qty: number; // > 0 long only (spot-style)
  avgEntry: number;
  sl?: number;
  tp?: number;
  openedAt: number;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  base: string;
  qty: number;
  entry: number;
  exit: number;
  pnl: number; // net of fees
  fees: number;
  openedAt: number;
  closedAt: number;
  reason: "manual" | "take-profit" | "stop-loss";
  note?: string;
}

export interface FillEvent {
  id: string;
  time: number;
  text: string;
  tone: "bull" | "bear" | "neutral";
}

export interface TicketDraft {
  base: string;
  side: Side;
  type: OrderType;
  qty?: number;
  limitPrice?: number;
  sl?: number;
  tp?: number;
}

const FEE_RATE = 0.001; // 0.10% per side
const SLIPPAGE = 0.0005; // 0.05% on market orders
const START_BALANCE = 100_000;

interface PaperState {
  balance: number; // free USDT
  orders: PaperOrder[];
  positions: PaperPosition[];
  history: ClosedTrade[];
  feed: FillEvent[];
  equityMarks: { time: number; equity: number }[];
  draft: TicketDraft | null;
  lastPrices: Record<string, number>;

  placeOrder: (o: Omit<PaperOrder, "id" | "createdAt" | "status">) => string | null;
  closePartial: (symbol: string, qty: number, price: number, reason: ClosedTrade["reason"]) => void;
  cancelOrder: (id: string) => void;
  closePosition: (symbol: string, price: number, reason?: ClosedTrade["reason"]) => void;
  setStops: (symbol: string, sl?: number, tp?: number) => void;
  processTick: (symbol: string, base: string, price: number) => void;
  setDraft: (d: TicketDraft | null) => void;
  addNote: (tradeId: string, note: string) => void;
  resetAccount: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function pushFeed(feed: FillEvent[], text: string, tone: FillEvent["tone"]): FillEvent[] {
  if (typeof window !== "undefined" && tone !== "neutral") chime("fill");
  return [{ id: uid(), time: Date.now(), text, tone }, ...feed].slice(0, 40);
}

export const usePaperStore = create<PaperState>()(
  persist(
    (set, get) => ({
      balance: START_BALANCE,
      orders: [],
      positions: [],
      history: [],
      feed: [],
      equityMarks: [],
      draft: null,
      lastPrices: {},

      placeOrder: (o) => {
        const s = get();
        if (!isFinite(o.qty) || o.qty <= 0) return "Quantity must be positive.";
        const price = s.lastPrices[o.symbol];

        if (o.type === "market") {
          if (!price) return "No live price yet — wait for the stream.";
          if (o.side === "buy") {
            const fill = price * (1 + SLIPPAGE);
            const cost = fill * o.qty;
            const fee = cost * FEE_RATE;
            if (cost + fee > s.balance) return "Insufficient paper balance.";
            const existing = s.positions.find((p) => p.symbol === o.symbol);
            const positions = existing
              ? s.positions.map((p) =>
                  p.symbol === o.symbol
                    ? { ...p, avgEntry: (p.avgEntry * p.qty + fill * o.qty) / (p.qty + o.qty), qty: p.qty + o.qty, sl: o.sl ?? p.sl, tp: o.tp ?? p.tp }
                    : p
                )
              : [...s.positions, { symbol: o.symbol, base: o.base, qty: o.qty, avgEntry: fill, sl: o.sl, tp: o.tp, openedAt: Date.now() }];
            set({
              balance: s.balance - cost - fee,
              positions,
              feed: pushFeed(s.feed, `Bought ${o.qty} ${o.base} @ ${fill.toFixed(2)} (fee ${fee.toFixed(2)})`, "bull"),
            });
            return null;
          } else {
            const pos = s.positions.find((p) => p.symbol === o.symbol);
            if (!pos || pos.qty < o.qty) return "Not enough position to sell (spot paper account).";
            get().closePartial(o.symbol, o.qty, price * (1 - SLIPPAGE), "manual");
            return null;
          }
        }

        // limit / stop orders rest until triggered
        if (o.type === "limit" && !o.limitPrice) return "Limit price required.";
        if (o.type === "stop" && !o.stopPrice) return "Stop price required.";
        if (o.side === "buy" && o.type === "limit" && o.limitPrice) {
          const reserve = o.limitPrice * o.qty * (1 + FEE_RATE);
          if (reserve > s.balance) return "Insufficient paper balance to reserve for this limit order.";
        }
        set({
          orders: [...s.orders, { ...o, id: uid(), createdAt: Date.now(), status: "open" }],
          feed: pushFeed(s.feed, `${o.side === "buy" ? "Buy" : "Sell"} ${o.type} order placed: ${o.qty} ${o.base}`, "neutral"),
        });
        return null;
      },

      cancelOrder: (id) =>
        set((s) => ({
          orders: s.orders.filter((o) => o.id !== id),
          feed: pushFeed(s.feed, "Order cancelled", "neutral"),
        })),

      closePartial: (symbol: string, qty: number, price: number, reason: ClosedTrade["reason"]) => {
        const s = get();
        const pos = s.positions.find((p) => p.symbol === symbol);
        if (!pos) return;
        const sellQty = Math.min(qty, pos.qty);
        const proceeds = price * sellQty;
        const fee = proceeds * FEE_RATE;
        const entryFee = pos.avgEntry * sellQty * FEE_RATE;
        const pnl = proceeds - fee - pos.avgEntry * sellQty;
        const remaining = pos.qty - sellQty;
        const trade: ClosedTrade = {
          id: uid(), symbol, base: pos.base, qty: sellQty,
          entry: pos.avgEntry, exit: price, pnl, fees: fee + entryFee,
          openedAt: pos.openedAt, closedAt: Date.now(), reason,
        };
        const balance = s.balance + proceeds - fee;
        const positions = remaining > 0.0000001
          ? s.positions.map((p) => (p.symbol === symbol ? { ...p, qty: remaining } : p))
          : s.positions.filter((p) => p.symbol !== symbol);
        const equity = balance + positions.reduce((a, p) => a + (s.lastPrices[p.symbol] ?? p.avgEntry) * p.qty, 0);
        set({
          balance,
          positions,
          history: [trade, ...s.history],
          equityMarks: [...s.equityMarks, { time: Date.now(), equity }].slice(-500),
          feed: pushFeed(
            s.feed,
            `${reason === "manual" ? "Sold" : reason === "take-profit" ? "Take-profit hit:" : "Stop-loss hit:"} ${sellQty} ${pos.base} @ ${price.toFixed(2)} · PnL ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`,
            pnl >= 0 ? "bull" : "bear"
          ),
        });
      },

      closePosition: (symbol, price, reason = "manual") => {
        const pos = get().positions.find((p) => p.symbol === symbol);
        if (!pos) return;
        get().closePartial(symbol, pos.qty, price, reason);
      },

      setStops: (symbol, sl, tp) =>
        set((s) => ({
          positions: s.positions.map((p) => (p.symbol === symbol ? { ...p, sl, tp } : p)),
        })),

      processTick: (symbol, base, price) => {
        const s = get();
        const lastPrices = { ...s.lastPrices, [symbol]: price };
        set({ lastPrices });

        // trigger resting orders
        for (const o of s.orders.filter((o) => o.symbol === symbol && o.status === "open")) {
          const triggered =
            (o.type === "limit" && o.side === "buy" && o.limitPrice != null && price <= o.limitPrice) ||
            (o.type === "limit" && o.side === "sell" && o.limitPrice != null && price >= o.limitPrice) ||
            (o.type === "stop" && o.side === "buy" && o.stopPrice != null && price >= o.stopPrice) ||
            (o.type === "stop" && o.side === "sell" && o.stopPrice != null && price <= o.stopPrice);
          if (!triggered) continue;
          set((st) => ({ orders: st.orders.filter((x) => x.id !== o.id) }));
          const fillPrice = o.type === "limit" ? (o.limitPrice as number) : price;
          if (o.side === "buy") {
            const cost = fillPrice * o.qty;
            const fee = cost * FEE_RATE;
            const st = get();
            if (cost + fee > st.balance) {
              set({ feed: pushFeed(st.feed, `Order skipped — insufficient balance for ${o.base}`, "bear") });
              continue;
            }
            const existing = st.positions.find((p) => p.symbol === symbol);
            const positions = existing
              ? st.positions.map((p) =>
                  p.symbol === symbol
                    ? { ...p, avgEntry: (p.avgEntry * p.qty + fillPrice * o.qty) / (p.qty + o.qty), qty: p.qty + o.qty, sl: o.sl ?? p.sl, tp: o.tp ?? p.tp }
                    : p
                )
              : [...st.positions, { symbol, base, qty: o.qty, avgEntry: fillPrice, sl: o.sl, tp: o.tp, openedAt: Date.now() }];
            set({
              balance: st.balance - cost - fee,
              positions,
              feed: pushFeed(st.feed, `${o.type} buy filled: ${o.qty} ${base} @ ${fillPrice.toFixed(2)}`, "bull"),
            });
          } else {
            get().closePartial(symbol, o.qty, fillPrice, "manual");
          }
        }

        // SL / TP on the live position
        const pos = get().positions.find((p) => p.symbol === symbol);
        if (pos) {
          if (pos.sl != null && price <= pos.sl) {
            get().closePartial(symbol, pos.qty, pos.sl, "stop-loss");
          } else if (pos.tp != null && price >= pos.tp) {
            get().closePartial(symbol, pos.qty, pos.tp, "take-profit");
          }
        }
      },

      setDraft: (d) => set({ draft: d }),

      addNote: (tradeId, note) =>
        set((s) => ({ history: s.history.map((t) => (t.id === tradeId ? { ...t, note } : t)) })),

      resetAccount: () =>
        set({
          balance: START_BALANCE,
          orders: [], positions: [], history: [], feed: [], equityMarks: [], draft: null,
        }),
    }),
    {
      name: "pulseterminal.paper",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        balance: s.balance, orders: s.orders, positions: s.positions,
        history: s.history, equityMarks: s.equityMarks,
      }),
    }
  )
);

export function equityOf(s: Pick<PaperState, "balance" | "positions" | "lastPrices">): number {
  return s.balance + s.positions.reduce((a, p) => a + (s.lastPrices[p.symbol] ?? p.avgEntry) * p.qty, 0);
}

export function performanceStats(history: ClosedTrade[], equityMarks: { equity: number }[]) {
  const wins = history.filter((t) => t.pnl > 0);
  const losses = history.filter((t) => t.pnl <= 0);
  const grossWin = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  let peak = START_BALANCE, maxDD = 0;
  for (const m of equityMarks) {
    peak = Math.max(peak, m.equity);
    maxDD = Math.max(maxDD, (peak - m.equity) / peak);
  }
  return {
    trades: history.length,
    winRate: history.length ? (wins.length / history.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    netPnl: history.reduce((a, t) => a + t.pnl, 0),
    totalFees: history.reduce((a, t) => a + t.fees, 0),
    maxDrawdownPct: maxDD * 100,
  };
}

export const PAPER_START_BALANCE = START_BALANCE;
