import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-edgesoft mt-10">
      <div className="mx-auto max-w-[1400px] px-4 py-6 space-y-2">
        <p className="text-[11px] text-dim leading-relaxed">
          © {new Date().getFullYear()} TheSamTerminal · Built by Abhinay Jandrajupalli · Educational market analysis only — not financial advice. Crypto assets are highly volatile.
        </p>
        <p className="text-[10px] text-dim leading-relaxed">
          Charts powered by{" "}
          <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="text-goldsoft hover:underline">TradingView Lightweight Charts™</a>
          {" "}· Market data via the Binance public API ·{" "}
          {/* CoinGecko attribution is required by their API terms — keep this visible. */}
          <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" className="text-goldsoft hover:underline">Powered by CoinGecko</a>
          {" "}· Fear &amp; Greed by alternative.me · Headlines via public RSS from CoinDesk, Cointelegraph &amp; Decrypt (links open the original publishers).
        </p>
        <p className="text-[10px] text-dim leading-relaxed">
          TheSamTerminal is an independent, non-commercial educational project and is not affiliated with, endorsed by, or connected to TradingView, Binance, CoinGecko, alternative.me, or any news publisher. The name refers to its author and carries no connection to Bloomberg L.P. or the Bloomberg Terminal. See our{" "}
          <Link href="/terms" className="text-goldsoft hover:underline">Terms &amp; Attributions</Link>.
        </p>
        <p className="text-[10px] text-dim font-mono">
          <Link href="/news" className="hover:text-gold transition">Sam Newswire</Link> · <Link href="/markets" className="hover:text-gold transition">Market Command</Link> · <Link href="/screener" className="hover:text-gold transition">Alpha Scanner</Link> · <Link href="/watchlist" className="hover:text-gold transition">Watchtower</Link> · <Link href="/terms" className="hover:text-gold transition">Terms</Link>
        </p>
      </div>
    </footer>
  );
}
