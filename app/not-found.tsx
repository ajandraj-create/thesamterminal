import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-24 text-center">
      <p className="font-mono text-ai text-sm">404</p>
      <h1 className="text-xl font-bold text-slate-100 mt-2">Pair not found</h1>
      <p className="text-sm text-muted mt-1">That coin doesn&apos;t trade against USDT on Binance. Check the symbol and try again.</p>
      <Link href="/" className="inline-block mt-5 text-sm text-ai hover:underline">Back to search</Link>
    </main>
  );
}
