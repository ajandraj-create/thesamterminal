"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PriceAlert {
  id: string;
  base: string;
  symbol: string;
  condition: "above" | "below";
  price: number;
  createdAt: number;
  triggeredAt?: number;
}

interface AlertState {
  alerts: PriceAlert[];
  add: (a: Omit<PriceAlert, "id" | "createdAt">) => void;
  remove: (id: string) => void;
  markTriggered: (id: string) => void;
  clearTriggered: () => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      alerts: [],
      add: (a) => set((s) => ({ alerts: [...s.alerts, { ...a, id: Math.random().toString(36).slice(2), createdAt: Date.now() }] })),
      remove: (id) => set((s) => ({ alerts: s.alerts.filter((x) => x.id !== id) })),
      markTriggered: (id) => set((s) => ({ alerts: s.alerts.map((x) => (x.id === id ? { ...x, triggeredAt: Date.now() } : x)) })),
      clearTriggered: () => set((s) => ({ alerts: s.alerts.filter((x) => !x.triggeredAt) })),
    }),
    { name: "pulseterminal.alerts", storage: createJSONStorage(() => localStorage) }
  )
);
