"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { isValidBase } from "@/lib/binance";

interface SymbolInfo { base: string; symbol: string }

let universeCache: SymbolInfo[] | null = null; // module-level: fetch once per session

/**
 * Coin search with autocomplete over the FULL Binance USDT universe (~400
 * pairs, fetched once and cached) instead of free-typing against 16 majors.
 * Proper combobox semantics + arrow-key navigation.
 */
export default function SearchBar({ large = false }: { large?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [universe, setUniverse] = useState<SymbolInfo[]>(universeCache ?? []);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (universeCache) return;
    let cancelled = false;
    fetch("/api/symbols")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (cancelled || !Array.isArray(j.data)) return;
        universeCache = j.data;
        setUniverse(j.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = value.trim().toUpperCase().replace(/USDT$/, "");
  const suggestions = useMemo(() => {
    if (!q || !universe.length) return [];
    const starts = universe.filter((s) => s.base.startsWith(q));
    const contains = universe.filter((s) => !s.base.startsWith(q) && s.base.includes(q));
    return [...starts, ...contains].slice(0, 8);
  }, [q, universe]);

  const go = (base?: string) => {
    const t = (base ?? q).toUpperCase();
    if (!isValidBase(t)) {
      setError("Enter a coin symbol, e.g. BTC, ETH, SOL");
      return;
    }
    setError("");
    setOpen(false);
    router.push(`/coin/${t}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault(); setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      go(open && suggestions[active] ? suggestions[active].base : undefined);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${large ? "w-full max-w-xl" : "w-full max-w-xs"}`}>
      <div
        className={`flex items-center gap-2 rounded-xl border border-edge bg-panel/70 backdrop-blur px-3 transition
        focus-within:border-ai/60 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.12)] ${large ? "py-3" : "py-1.5"}`}
      >
        <Search className="h-4 w-4 text-muted shrink-0" aria-hidden />
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(0); setError(""); }}
          onFocus={() => value && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search any coin — BTC, ETH, SOL, PEPE…"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="coin-suggestions"
          aria-autocomplete="list"
          aria-label="Coin symbol"
          className="w-full bg-transparent outline-none text-slate-100 placeholder:text-muted font-mono uppercase tracking-wide text-sm"
          maxLength={12}
        />
        <button
          onClick={() => go()}
          className="rounded-lg bg-ai/15 text-ai border border-ai/30 px-3 py-1 text-xs font-semibold hover:bg-ai/25 active:scale-95 transition"
        >
          Analyze
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <ul
          id="coin-suggestions"
          role="listbox"
          className="absolute z-40 mt-1 w-full rounded-xl border border-edge bg-panel/95 backdrop-blur shadow-xl overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.symbol}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); go(s.base); }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 text-sm font-mono cursor-pointer flex justify-between ${i === active ? "bg-ai/15 text-slate-100" : "text-slate-300"}`}
            >
              <span className="font-semibold">{s.base}</span>
              <span className="text-xs text-muted">{s.symbol}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-bear">{error}</p>}
    </div>
  );
}
