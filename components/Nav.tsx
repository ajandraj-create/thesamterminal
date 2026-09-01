"use client";

import Link from "next/link";
import SearchBar from "./SearchBar";
import { equityOf, usePaperStore, PAPER_START_BALANCE } from "@/hooks/usePaperStore";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

function TSTLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7CFFB0" />
          <stop offset="55%" stopColor="#22E565" />
          <stop offset="100%" stopColor="#0F9E4A" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="26" height="26" rx="7" fill="#0B0B0F" stroke="url(#gold)" strokeWidth="1.4" />
      {/* terminal prompt */}
      <path d="M5.5 9.5 L9 13 L5.5 16.5" fill="none" stroke="url(#gold)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      {/* market pulse */}
      <path d="M11 16.5 L13.5 16.5 L15.2 11 L17.6 19 L19.4 14.5 L20.6 16.5 L23 16.5" fill="none" stroke="url(#gold)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const LINKS = [
  { href: "/markets", label: "Market Command" },
  { href: "/screener", label: "Alpha Scanner" },
  { href: "/compare", label: "Compare" },
  { href: "/news", label: "Sam Newswire" },
  { href: "/watchlist", label: "Watchtower" },
];

export default function Nav() {
  const store = usePaperStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const equity = equityOf(store);
  const pct = ((equity - PAPER_START_BALANCE) / PAPER_START_BALANCE) * 100;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-edge bg-ink/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1900px] px-4 py-2.5 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <TSTLogo />
          <span className="font-mono font-bold tracking-tight text-slate-100">
            TheSam<span className="gold-text">Terminal</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:block"><SearchBar /></div>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hidden sm:inline text-sm text-muted hover:text-gold transition whitespace-nowrap">{l.label}</Link>
          ))}
          {mounted && (
            <Link href="/coin/BTC" title="Paper Trade Desk" className="hidden lg:inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 font-mono text-[11px] hover:bg-gold/10 transition">
              <span className="text-dim">Paper Desk</span>
              <span className="text-gold font-semibold tabular-nums">{equity.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              <span className={pct >= 0 ? "text-bull" : "text-bear"}>{pct >= 0 ? "+" : ""}{pct.toFixed(2)}%</span>
            </Link>
          )}
          <button onClick={() => setMobileOpen((o) => !o)} aria-label="Menu" aria-expanded={mobileOpen} className="sm:hidden text-muted hover:text-gold transition">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-edgesoft bg-ink/95 backdrop-blur px-4 py-3 space-y-1 animate-fadeUp">
          <div className="pb-2"><SearchBar /></div>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-muted hover:text-gold transition font-mono">{l.label}</Link>
          ))}
          {mounted && (
            <div className="pt-2 mt-1 border-t border-edgesoft flex items-center gap-2 font-mono text-[11px]">
              <span className="text-dim">Paper Desk</span>
              <span className="text-gold font-semibold">{equity.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              <span className={pct >= 0 ? "text-bull" : "text-bear"}>{pct >= 0 ? "+" : ""}{pct.toFixed(2)}%</span>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
