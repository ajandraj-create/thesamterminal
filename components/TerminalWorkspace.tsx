"use client";

import { useCallback, useEffect, useState } from "react";
import CryptoChart from "./CryptoChart";
import ToolSidebar from "./ToolSidebar";
import { ToolId } from "@/lib/drawing";

export default function TerminalWorkspace({
  symbol,
  support,
  resistance,
}: {
  symbol: string;
  support: number[];
  resistance: number[];
}) {
  const [tool, setTool] = useState<ToolId>("cursor");
  const [clearSignal, setClearSignal] = useState(0);
  const onToolDone = useCallback(() => setTool("cursor"), []);

  // keyboard shortcuts: Esc cursor · T trend · H hline · V vline · R rect · F fib · M ruler · L long · S short · X text
  useEffect(() => {
    const KEYS: Record<string, ToolId> = { t: "trend", h: "hline", v: "vline", r: "rect", f: "fib", m: "ruler", l: "long", s: "short", x: "text" };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") { setTool("cursor"); return; }
      const t = KEYS[e.key.toLowerCase()];
      if (t) { e.preventDefault(); setTool(t); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex gap-3 items-start flex-col lg:flex-row">
      <ToolSidebar active={tool} onSelect={setTool} onClear={() => setClearSignal((n) => n + 1)} />
      <div className="glass rounded-2xl border border-edge p-4 flex-1 min-w-0 w-full">
        <CryptoChart
          symbol={symbol}
          support={support}
          resistance={resistance}
          activeTool={tool}
          onToolDone={onToolDone}
          clearSignal={clearSignal}
        />
      </div>
    </div>
  );
}
