import Link from "next/link";

export const metadata = { title: "Terms & Attributions — TheSamTerminal" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="text-lg font-bold text-slate-100 mb-2">{title}</h2>
      <div className="text-sm text-muted leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="grid-bg">
      <section className="relative overflow-hidden border-b border-edgesoft">
        <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-gold/12 blur-[120px]" />
        <div className="mx-auto max-w-[900px] px-4 py-12 relative">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Legal · Attributions · Privacy</p>
          <h1 className="display text-4xl md:text-5xl uppercase text-slate-50 mt-3">Terms &amp; <span className="gold-text">Attributions</span></h1>
          <p className="text-sm text-muted mt-4 max-w-2xl">The plain-language version. TheSamTerminal is a free, non-commercial educational project — these notes explain what it is, what it isn&apos;t, and who the data comes from.</p>
        </div>
      </section>

      <div className="mx-auto max-w-[900px] px-4 py-8 space-y-4">
        <Section title="Educational use only — not financial advice">
          <p>Everything on TheSamTerminal — prices, signals, scores, the screener, paper trading, and any written analysis — is for education and practice only. It is <strong>not financial, investment, or trading advice</strong>, and nothing here is a recommendation to buy, sell, or hold any asset.</p>
          <p>Signals and scores are probabilistic educational tools, not predictions. Crypto assets are highly volatile and you can lose money trading them. Always do your own research and consider speaking with a licensed financial professional. You are solely responsible for your own decisions.</p>
        </Section>

        <Section title="No real money, no accounts, no personal data">
          <p>TheSamTerminal has no user accounts, takes no payments, and executes no real trades. The &ldquo;Paper Trade Desk&rdquo; is a simulation using live prices and fake balances.</p>
          <p>We don&apos;t ask you for personal data and we have no database of users. Your watchlist, paper-trading account, drawings, and alerts are stored <strong>locally in your own browser</strong> (localStorage) and are never sent to a server we control. Clearing your browser data removes them. We don&apos;t set advertising cookies, run analytics or tracking scripts, or sell data.</p>
          <p>Two small exceptions, for honesty&apos;s sake. To stop one visitor from exhausting the shared data limits, our API briefly holds your IP address in memory for about a minute to count requests — it is never written to disk, never linked to anything else about you, and is discarded automatically. And like any website, our hosting provider keeps standard server logs, which include IP addresses.</p>
        </Section>

        <Section title="Non-commercial">
          <p>This is a personal portfolio project provided free of charge. It carries no advertising, no paid tiers, and no referral or affiliate monetization. This matters because some of the underlying data providers permit their public data only for non-commercial use (see attributions below).</p>
        </Section>

        <Section title="Data sources &amp; attributions">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Charts:</strong> <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="text-goldsoft hover:underline">TradingView Lightweight Charts™</a> (Apache-2.0). Attribution retained as required by its license.</li>
            <li><strong>Market prices &amp; candles:</strong> Binance public market-data API, used for non-commercial educational purposes.</li>
            <li><strong>Global market stats:</strong> <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" className="text-goldsoft hover:underline">Powered by CoinGecko</a>.</li>
            <li><strong>Fear &amp; Greed Index:</strong> alternative.me.</li>
            <li><strong>News headlines:</strong> public RSS feeds from CoinDesk, Cointelegraph, and Decrypt. Only headlines and short snippets are shown; every item links to the original publisher. No full articles are reproduced.</li>
          </ul>
          <p className="text-xs text-dim mt-2">TheSamTerminal is independent and is not affiliated with, endorsed by, or sponsored by any of these services. &ldquo;Sam&rdquo; is the author&apos;s own name; the project has no connection to Bloomberg L.P. or the Bloomberg Terminal, and is not offered as a substitute for any professional market terminal.</p>
        </Section>

        <Section title="No warranty">
          <p>The terminal is provided &ldquo;as is,&rdquo; without warranty of any kind. Data may be delayed, inaccurate, or unavailable. We are not liable for any loss arising from use of the site. Code is released under the MIT License.</p>
        </Section>

        <p className="text-center text-xs text-dim pt-2">
          Questions? This is a student portfolio project by Abhinay Jandrajupalli. ·{" "}
          <Link href="/" className="text-gold hover:underline">Back to terminal</Link>
        </p>
      </div>
    </main>
  );
}
