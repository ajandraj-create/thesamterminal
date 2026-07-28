import WatchlistClient from "./WatchlistClient";

export const metadata = { title: "Watchlist — TheSamTerminal" };

export default function WatchlistPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Watchlist</h1>
      <p className="text-sm text-muted mb-6">Saved on this device, streaming live.</p>
      <WatchlistClient />
    </main>
  );
}
