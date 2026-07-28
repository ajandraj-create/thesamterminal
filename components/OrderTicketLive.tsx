"use client";

import OrderTicket from "./OrderTicket";
import { usePaperStore } from "@/hooks/usePaperStore";
import { toSymbol } from "@/lib/binance";

/** Binds the order ticket to the live tick price of the viewed coin. */
export default function OrderTicketLive({ base }: { base: string }) {
  const livePrice = usePaperStore((s) => s.lastPrices[toSymbol(base)] ?? null);
  return <OrderTicket base={base} livePrice={livePrice} />;
}
