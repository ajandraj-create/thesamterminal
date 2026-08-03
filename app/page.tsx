import Link from "next/link";
import { ArrowUpRight, Award, BrainCircuit, Crown, Radio, Wallet } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Disclaimer from "@/components/Disclaimer";
import HomeOverview from "@/components/HomeOverview";

const FEATURES = [
  { icon: Radio, title: "Live Market Intelligence", body: "Tick-by-tick streams, heatmaps, screeners, and a 24/7 newswire — the whole market in one workspace." },
  { icon: BrainCircuit, title: "Sam Market Desk", body: "A transparent multi-factor quant engine with bias, confidence, risk rating, and invalidation levels — every score explained." },
  { icon: Wallet, title: "Paper Trade Desk", body: "Practice on real live prices with simulated execution, brackets, fees, and full performance tracking." },
];

/**
 * Optional looping background video. Left null so the hero ships with the
 * owned still (`/hero-trader.jpg`) plus a slow drift — no third-party asset is
 * hotlinked and nothing loads off-origin, so the strict CSP stays intact.
 * To use a video: drop your own file in `public/` and set this to "/hero.mp4".
 */
const HERO_VIDEO: string | null = null;

/* Every figure here is verifiable from the codebase — no invented metrics. */
const STATS = [
  { value: "400+", label: "Trading Pairs" },
  { value: "7", label: "Chart Timeframes" },
  { value: "24/7", label: "Live Market Data" },
];

export default function Home() {
  return (
    <main>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[calc(100svh-76px)] items-center overflow-hidden border-b border-edgesoft">
        {/* Background media */}
        <div className="absolute inset-0 -z-10">
          {HERO_VIDEO ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="/hero-trader.jpg"
              className="h-full w-full object-cover"
            >
              <source src={HERO_VIDEO} type="video/mp4" />
            </video>
          ) : (
            <div
              className="h-full w-full bg-cover bg-center animate-hero-drift will-change-transform"
              style={{ backgroundImage: "url(/hero-trader.jpg)", backgroundPosition: "center 28%" }}
            />
          )}

          {/* Readability + brand wash, layered so the subject stays visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/70" />
          <div
            className="absolute inset-0 mix-blend-overlay opacity-30"
            style={{ background: "radial-gradient(60% 70% at 62% 45%, rgba(34,229,101,0.35), transparent 70%)" }}
          />
          <div className="absolute inset-0 grid-bg opacity-[0.18]" />
        </div>

        <div className="mx-auto w-full max-w-[1400px] px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
          <div className="max-w-3xl">
            {/* 1 — Tagline */}
            <div className="mb-6 flex items-center gap-2.5 lg:mb-8 animate-fade-up">
              <Crown className="h-4 w-4 text-gold/80" />
              <span className="font-inter text-[10px] uppercase tracking-[0.3em] text-white/70 sm:text-xs">
                Live · 24/7 · The Sam Market Desk
              </span>
            </div>

            {/* 2 — Heading */}
            <h1 className="font-podium uppercase leading-[0.92] tracking-tight text-white animate-fade-up-delay-1">
              <span className="block text-[clamp(2.8rem,8vw,7rem)]">Your edge.</span>
              <span className="block text-[clamp(2.8rem,8vw,7rem)]">Your market.</span>
              <span className="block text-[clamp(2.8rem,8vw,7rem)] gold-text">Your terminal.</span>
            </h1>

            {/* 3 — Subtext */}
            <div className="mt-6 max-w-xl animate-fade-up-delay-2 lg:mt-8">
              <p className="font-inter text-base font-semibold leading-snug tracking-tight sm:text-lg">
                <span className="text-bull">Bull markets</span>
                <span className="text-white/80"> teach success. </span>
                <span className="text-bear">Bear markets</span>
                <span className="text-white/80"> test it.</span>
              </p>
              <p className="mt-3 font-inter text-sm leading-relaxed text-white/70 sm:text-base">
                Live crypto prices, market news, signal analysis, and paper trading in one
                workspace built for sharper decisions.
              </p>
            </div>

            {/* 4 — CTA row */}
            <div className="mt-8 flex flex-wrap items-center gap-4 animate-fade-up-delay-3 sm:gap-6 lg:mt-10">
              <Link
                href="/coin/BTC"
                className="group inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 font-inter text-[11px] font-bold uppercase tracking-widest text-ink transition hover:bg-goldsoft active:scale-95 sm:px-7 sm:py-4 sm:text-xs"
              >
                Analyze BTC
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/markets"
                className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 font-inter text-[11px] font-semibold uppercase tracking-widest text-white/80 transition hover:border-white/60 hover:bg-white/10 hover:text-white active:scale-95 sm:px-7 sm:py-4 sm:text-xs"
              >
                Market Command
              </Link>

              <div className="hidden items-center gap-3 sm:flex">
                <Award className="h-8 w-8 text-white/40" />
                <div className="font-inter text-xs uppercase tracking-wider text-white/60">
                  <div>Keyless access</div>
                  <div>No signup needed</div>
                </div>
              </div>
            </div>

            {/* Search stays in the hero — it's the fastest path into the terminal */}
            <div className="mt-6 max-w-md animate-fade-up-delay-3">
              <SearchBar />
            </div>

            {/* 5 — Stats */}
            <div className="mt-8 flex flex-wrap gap-6 animate-fade-up-delay-4 sm:mt-10 sm:gap-12 lg:mt-14 lg:gap-16">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="font-inter text-2xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                    {s.value}
                  </div>
                  <div className="mt-1 font-inter text-[9px] uppercase tracking-widest text-white/50 sm:text-xs">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Below the fold ───────────────────────────────────────────────── */}
      <section className="grid-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-6">
          <HomeOverview />

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="glass-strong animate-fadeUp rounded-2xl p-6 transition hover:-translate-y-1 hover:border-gold/30"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <f.icon className="h-5 w-5 text-gold" />
                <h3 className="mt-3 text-sm font-semibold text-slate-100">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-dim">{f.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6"><Disclaimer /></div>
        </div>
      </section>
    </main>
  );
}
