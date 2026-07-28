import { ReactNode } from "react";

export default function GlassCard({
  eyebrow,
  title,
  accent,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  accent?: "ai" | "bull" | "bear" | "warn" | "none";
  children: ReactNode;
  className?: string;
}) {
  const accentColor =
    accent === "ai" ? "border-t-ai/60" :
    accent === "bull" ? "border-t-bull/60" :
    accent === "bear" ? "border-t-bear/60" :
    accent === "warn" ? "border-t-warn/60" : "border-t-transparent";
  return (
    <section
      className={`glass rounded-2xl border border-edge border-t-2 ${accentColor} p-5 animate-fadeUp ${className}`}
    >
      {(eyebrow || title) && (
        <header className="mb-4">
          {eyebrow && (
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-mono">{eyebrow}</div>
          )}
          {title && <h2 className="text-sm font-semibold text-slate-200 mt-0.5">{title}</h2>}
        </header>
      )}
      {children}
    </section>
  );
}
