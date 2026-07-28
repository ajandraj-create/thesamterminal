import MarketsClient from "./MarketsClient";

export const metadata = { title: "Market Command — TheSamTerminal" };

export default function MarketsPage() {
  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 grid-bg">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Market Command</h1>
      <p className="text-sm text-dim mb-6">Global stats, live heatmap, movers, and the full tracked-markets table — every price streaming.</p>
      <MarketsClient />
    </main>
  );
}
