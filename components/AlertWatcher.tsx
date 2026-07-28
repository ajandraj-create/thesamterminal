"use client";

import { useEffect, useRef, useState } from "react";
import { useAlertStore } from "@/hooks/useAlertStore";
import { useLiveTickers } from "@/hooks/useLiveTicker";
import { chime } from "@/lib/sound";
import { fmtCrypto } from "@/lib/format";

/** Watches live ticks against active alerts; fires notification + chime + toast. */
export default function AlertWatcher() {
  const { alerts, markTriggered } = useAlertStore();
  const active = alerts.filter((a) => !a.triggeredAt);
  const { ticks } = useLiveTickers(active.map((a) => a.symbol));
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const a of active) {
      const t = ticks[a.symbol];
      if (!t || firedRef.current.has(a.id)) continue;
      const hit = a.condition === "above" ? t.price >= a.price : t.price <= a.price;
      if (!hit) continue;
      firedRef.current.add(a.id);
      markTriggered(a.id);
      chime("alert");
      const text = `${a.base} is ${a.condition} ${fmtCrypto(a.price)} — now ${fmtCrypto(t.price)}`;
      setToasts((p) => [...p, { id: a.id, text }]);
      setTimeout(() => setToasts((p) => p.filter((x) => x.id !== a.id)), 8000);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("TheSamTerminal price alert", { body: text, icon: "/icon-192.png" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticks]);

  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="glass gold-ring rounded-xl border border-gold/40 px-4 py-3 text-sm text-slate-100 animate-fadeUp font-mono">
          🔔 {t.text}
        </div>
      ))}
    </div>
  );
}
