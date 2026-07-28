"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { /* could log to a service here */ }, [error]);
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-mono text-gold text-sm">Something went wrong</p>
      <h1 className="text-xl font-bold text-slate-100 mt-2">This panel hit an error</h1>
      <p className="text-sm text-dim mt-2">A component failed to render — usually a temporary data hiccup. You can retry or head back to the dashboard.</p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button onClick={reset} className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/20 transition">Try again</button>
        <Link href="/" className="rounded-xl border border-edgesoft px-4 py-2 text-sm text-muted hover:text-gold hover:border-gold/40 transition">Dashboard</Link>
      </div>
    </main>
  );
}
