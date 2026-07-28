"use client";

import { useEffect, useState } from "react";

const KEY = "stockterminal.watchlist";

export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setTickers(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const persist = (next: string[]) => {
    setTickers(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const add = (t: string) => {
    const up = t.toUpperCase();
    if (!tickers.includes(up)) persist([...tickers, up]);
  };
  const remove = (t: string) => persist(tickers.filter((x) => x !== t.toUpperCase()));
  const has = (t: string) => tickers.includes(t.toUpperCase());

  return { tickers, add, remove, has, ready };
}
