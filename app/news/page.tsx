import NewsClient from "./NewsClient";

export const metadata = { title: "Sam Newswire — TheSamTerminal" };
export const revalidate = 1800;

export default function NewsPage() {
  return (
    <main className="relative">
      {/* ambient artwork backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.16] bg-cover bg-center"
        style={{ backgroundImage: "url(/news-hero.jpg)" }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-ink/60 via-ink/85 to-ink" />

      {/* hero banner */}
      <section className="relative h-56 md:h-72 overflow-hidden border-b border-gold/20">
        <div className="absolute inset-0 bg-cover bg-[center_30%]" style={{ backgroundImage: "url(/news-hero.jpg)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/55 to-ink" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-ink/70" />
        <div className="relative mx-auto max-w-[1100px] h-full px-4 flex flex-col justify-end pb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold animate-fadeUp">Market moves · news drives · stay ahead</p>
          <h1 className="display text-4xl md:text-6xl uppercase gold-text animate-fadeUp" style={{ animationDelay: "80ms" }}>Sam Newswire</h1>
          <p className="text-xs text-muted mt-1 animate-fadeUp" style={{ animationDelay: "140ms" }}>
            Live headlines from CoinDesk, Cointelegraph &amp; Decrypt — refreshed every 30 minutes.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-4 py-8">
        <NewsClient />
      </div>
    </main>
  );
}
