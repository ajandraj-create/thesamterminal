"use client";

import { useState } from "react";
import { BellRing, Trash2 } from "lucide-react";
import { useAlertStore } from "@/hooks/useAlertStore";
import { usePaperStore } from "@/hooks/usePaperStore";
import { toSymbol } from "@/lib/binance";
import { fmtCrypto } from "@/lib/format";

export default function AlertCard({ base }: { base: string }) {
  const symbol = toSymbol(base);
  const { alerts, add, remove, clearTriggered } = useAlertStore();
  const livePrice = usePaperStore((s) => s.lastPrices[symbol] ?? null);
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [price, setPrice] = useState("");
  const mine = alerts.filter((a) => a.symbol === symbol);

  const create = async () => {
    const p = parseFloat(price);
    if (!isFinite(p) || p <= 0) return;
    if ("Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
    add({ base, symbol, condition, price: p });
    setPrice("");
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as "above" | "below")}
          className="rounded-lg border border-edgesoft bg-ink/70 px-2 py-1.5 text-xs font-mono outline-none focus:border-gold/60"
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={livePrice ? fmtCrypto(livePrice) : "price"}
          inputMode="decimal"
          className="flex-1 min-w-0 rounded-lg border border-edgesoft bg-ink/70 px-2.5 py-1.5 text-xs font-mono outline-none focus:border-gold/60 placeholder:text-dim"
        />
        <button onClick={create} className="rounded-lg border border-gold/40 bg-gold/10 px-3 text-gold hover:bg-gold/20 transition active:scale-95" aria-label="Create alert">
          <BellRing className="h-3.5 w-3.5" />
        </button>
      </div>
      {mine.length > 0 && (
        <ul className="space-y-1.5">
          {mine.map((a) => (
            <li key={a.id} className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 font-mono text-[11px] ${a.triggeredAt ? "border-gold/40 bg-gold/5 text-gold" : "border-edgesoft text-muted"}`}>
              <span>{a.triggeredAt ? "✓ " : ""}{a.condition} {fmtCrypto(a.price)}</span>
              <button onClick={() => remove(a.id)} className="text-dim hover:text-bear transition" aria-label="Delete alert"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
      {alerts.some((a) => a.triggeredAt) && (
        <button onClick={clearTriggered} className="text-[10px] font-mono text-dim hover:text-muted transition">clear triggered</button>
      )}
      <p className="text-[10px] text-dim">Fires while a TheSamTerminal tab is open — chime + browser notification.</p>
    </div>
  );
}
