"use client";

import { WsStatus } from "@/hooks/useLiveTicker";

const MAP: Record<WsStatus, { color: string; label: string; pulse: boolean }> = {
  live: { color: "bg-bull", label: "Live · tick stream", pulse: true },
  connecting: { color: "bg-slate-500", label: "Connecting…", pulse: true },
  reconnecting: { color: "bg-warn", label: "Reconnecting…", pulse: true },
  offline: { color: "bg-bear", label: "Stream offline · showing last data", pulse: false },
};

export default function WsStatusDot({ status }: { status: WsStatus }) {
  const s = MAP[status];
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted font-mono">
      <span className={`h-2 w-2 rounded-full ${s.color} ${s.pulse ? "animate-pulseDot" : ""}`} />
      {s.label}
    </span>
  );
}
