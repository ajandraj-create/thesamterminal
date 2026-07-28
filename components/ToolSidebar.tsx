"use client";

import {
  Crosshair, Eraser, Minus, MousePointer2, MoveVertical, PencilLine,
  Ruler, Square, TrendingDown, TrendingUp, Type,
} from "lucide-react";
import { ToolId } from "@/lib/drawing";

const TOOLS: { id: ToolId; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: "cursor", icon: MousePointer2, label: "Cursor / pan" },
  { id: "trend", icon: PencilLine, label: "Trend line" },
  { id: "hline", icon: Minus, label: "Horizontal line" },
  { id: "vline", icon: MoveVertical, label: "Vertical line" },
  { id: "rect", icon: Square, label: "Rectangle / zone" },
  { id: "fib", icon: Crosshair, label: "Fib retracement (drag low→high)" },
  { id: "ruler", icon: Ruler, label: "Measure (drag)" },
  { id: "long", icon: TrendingUp, label: "Long position (drag entry→target)" },
  { id: "short", icon: TrendingDown, label: "Short position (drag entry→target)" },
  { id: "text", icon: Type, label: "Text annotation" },
];

export default function ToolSidebar({
  active,
  onSelect,
  onClear,
}: {
  active: ToolId;
  onSelect: (t: ToolId) => void;
  onClear: () => void;
}) {
  return (
    <aside className="glass rounded-2xl border border-edge p-1.5 flex lg:flex-col gap-1 self-start sticky top-20 z-10">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          title={t.label}
          aria-label={t.label}
          onClick={() => onSelect(t.id)}
          className={`grid place-items-center h-9 w-9 rounded-xl transition active:scale-90 border
            ${active === t.id ? "bg-gold/15 text-gold border-gold/40 gold-ring" : "border-transparent text-dim hover:text-goldsoft hover:bg-gold/5"}`}
        >
          <t.icon className="h-4 w-4" />
        </button>
      ))}
      <div className="lg:my-1 lg:h-px lg:w-full w-px bg-edgesoft" />
      <button
        title="Clear all drawings"
        aria-label="Clear all drawings"
        onClick={onClear}
        className="grid place-items-center h-9 w-9 rounded-xl text-dim hover:text-bear hover:bg-bear/10 transition active:scale-90"
      >
        <Eraser className="h-4 w-4" />
      </button>
    </aside>
  );
}
