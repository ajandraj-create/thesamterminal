import ScreenerClient from "./ScreenerClient";

export const metadata = { title: "Alpha Scanner — TheSamTerminal" };

export default function ScreenerPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Alpha Scanner</h1>
      <p className="text-sm text-dim mb-6">Scan the majors for technical conditions on daily data — signals are probabilistic setups, never guarantees. Click a row to open the terminal.</p>
      <ScreenerClient />
    </main>
  );
}
