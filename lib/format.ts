/** Crypto prices span $0.000004 to $100k+ — adapt decimals to magnitude. */
export function fmtCrypto(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return n.toPrecision(4);
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function fmtSigned(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  const s = abs >= 1000 ? n.toFixed(0) : abs >= 1 ? n.toFixed(2) : n.toPrecision(3);
  return `${n >= 0 ? "+" : ""}${s}`;
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function timeAgo(unixSeconds: number): string {
  const diff = Math.max(0, Date.now() / 1000 - unixSeconds);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
