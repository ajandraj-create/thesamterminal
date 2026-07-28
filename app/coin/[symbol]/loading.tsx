export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-4" aria-busy>
      {[28, 120, 64, 64, 40].map((h, i) => (
        <div key={i} className="glass rounded-2xl border border-edge animate-pulse" style={{ height: `${h * 4}px` }} />
      ))}
    </main>
  );
}
