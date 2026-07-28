import Link from "next/link";
import { BrainCircuit, Radio, Wallet } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Disclaimer from "@/components/Disclaimer";
import HomeOverview from "@/components/HomeOverview";

const FEATURES = [
  { icon: Radio, title: "Live Market Intelligence", body: "Tick-by-tick streams, heatmaps, screeners, and a 24/7 newswire — the whole market in one workspace." },
  { icon: BrainCircuit, title: "Sam Market Desk", body: "A transparent multi-factor quant engine with bias, confidence, risk rating, and invalidation levels — every score explained." },
  { icon: Wallet, title: "Paper Trade Desk", body: "Practice on real live prices with simulated execution, brackets, fees, and full performance tracking." },
];

export default function Home() {
  return (
    <main className="grid-bg">
      <section className="relative overflow-hidden border-b border-edgesoft">
        {/* ambient green glow blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-gold/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-bronze/15 blur-[130px]" />
        <div className="pointer-events-none absolute top-1/3 right-1/3 h-64 w-64 rounded-full bg-gold/8 blur-[100px]" />

        {/* blended hero image on the right — fades into the page so it reads as native */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[58%] hidden md:block">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-90"
            style={{ backgroundImage: "url(/hero-trader.jpg)", backgroundPosition: "center 30%" }}
          />
          {/* left-to-right fade so the image dissolves into the black behind the text — lighter through the center so the subject stays bright */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #070A08 0%, rgba(7,10,8,0.78) 16%, rgba(7,10,8,0.10) 42%, transparent 60%, rgba(7,10,8,0.30) 100%)" }} />
          {/* gentle top & bottom feather only */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #070A08 0%, transparent 14%, transparent 86%, #070A08 100%)" }} />
          {/* soft spotlight lifting the subject area */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(42% 55% at 42% 42%, rgba(255,255,255,0.10), transparent 70%)" }} />
          {/* green glow wash to tie it to the theme */}
          <div className="absolute inset-0 mix-blend-overlay opacity-30" style={{ background: "radial-gradient(60% 70% at 38% 50%, rgba(34,229,101,0.30), transparent 70%)" }} />
          {/* faint grid overlay for the terminal feel */}
          <div className="absolute inset-0 grid-bg opacity-20" />
        </div>

        <div className="mx-auto max-w-[1400px] px-4 py-14 md:py-24 relative">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Live · 24/7 · The Sam Market Desk</p>
            <h1 className="display text-5xl md:text-7xl uppercase text-slate-50 mt-3 drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
              Your edge.<br />Your market.<br /><span className="gold-text">Your terminal.</span>
            </h1>

            {/* shining tagline */}
            <p className="mt-6 text-lg md:text-2xl font-bold leading-snug tracking-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">
              <span className="text-bull" style={{ textShadow: "0 0 18px rgba(34,229,101,0.45)" }}>Bull Markets</span>
              <span className="text-slate-200"> Teach Success. </span>
              <span className="text-bear" style={{ textShadow: "0 0 18px rgba(229,72,77,0.4)" }}>Bear Markets</span>
              <span className="text-slate-200"> Test Success.</span>
              <br />
              <span className="text-slate-100">Master Both with </span>
              <span className="gold-text" style={{ filter: "drop-shadow(0 0 14px rgba(34,229,101,0.5))" }}>SAM.</span>
            </p>

            <p className="text-sm md:text-base text-muted mt-5 max-w-xl leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
              TheSamTerminal brings live crypto prices, market news, signal analysis, and paper trading into one premium workspace built for sharper decisions.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/coin/BTC" className="glow-btn rounded-full px-6 py-2.5 text-sm font-bold transition active:scale-95">Analyze BTC →</Link>
              <Link href="/markets" className="rounded-full border border-gold/30 bg-ink/40 backdrop-blur px-5 py-2.5 text-sm font-semibold text-muted hover:text-gold hover:border-gold/50 transition active:scale-95">Market Command</Link>
              <Link href="/screener" className="rounded-full border border-gold/30 bg-ink/40 backdrop-blur px-5 py-2.5 text-sm font-semibold text-muted hover:text-gold hover:border-gold/50 transition active:scale-95">Alpha Scanner</Link>
            </div>
            <div className="mt-4 max-w-md"><SearchBar /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-6">
        <HomeOverview />

        <div className="grid sm:grid-cols-3 gap-3 mt-8">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="glass-strong rounded-2xl p-6 hover:border-gold/30 hover:-translate-y-1 transition animate-fadeUp" style={{ animationDelay: `${i * 90}ms` }}>
              <f.icon className="h-5 w-5 text-gold" />
              <h3 className="text-sm font-semibold text-slate-100 mt-3">{f.title}</h3>
              <p className="text-xs text-dim mt-1.5 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6"><Disclaimer /></div>
      </section>
    </main>
  );
}
