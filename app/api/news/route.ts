import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { cached } from "@/lib/cache";

/**
 * Crypto news aggregator — free public RSS/Atom feeds, no API key.
 * Refreshes every 30 minutes; tagged per coin by word-boundary keyword match.
 */
const FEEDS = [
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
];

// Word-boundary regexes — "drops" no longer matches "airdrops",
// "link" no longer matches "linked"/"hyperlink", "eth" no longer matches "whether".
const kw = (words: string[]) => new RegExp(`\\b(?:${words.join("|")})\\b`, "i");

const COIN_KEYWORDS: Record<string, RegExp> = {
  BTC: kw(["bitcoin", "btc"]),
  ETH: kw(["ethereum", "ether", "eth"]),
  SOL: kw(["solana", "sol"]),
  BNB: kw(["bnb", "binance coin"]),
  XRP: kw(["xrp", "ripple"]),
  DOGE: kw(["dogecoin", "doge"]),
  ADA: kw(["cardano", "ada"]),
  AVAX: kw(["avalanche", "avax"]),
  LINK: kw(["chainlink", "link"]),
  DOT: kw(["polkadot", "dot"]),
  MATIC: kw(["polygon", "matic"]),
  LTC: kw(["litecoin", "ltc"]),
  NEAR: kw(["near protocol", "near"]),
  ATOM: kw(["cosmos", "atom"]),
  ARB: kw(["arbitrum", "arb"]),
  OP: kw(["optimism", "op mainnet"]),
};

const BULL = kw(["surge", "surges", "soar", "soars", "rally", "rallies", "record", "all-time high", "ath", "approval", "adoption", "bullish", "gains", "breakout", "inflow", "inflows", "partnership", "upgrade", "launch", "launches"]);
const BEAR = kw(["crash", "crashes", "plunge", "plunges", "hack", "hacked", "exploit", "lawsuit", "sec sues", "ban", "bans", "bearish", "selloff", "sell-off", "outflow", "outflows", "liquidation", "liquidations", "fraud", "scam", "warning", "drop", "drops", "tumble", "tumbles"]);

export interface NewsArticle {
  id: string; title: string; link: string; source: string;
  publishedAt: number; summary: string; coins: string[];
  sentiment: "bullish" | "bearish" | "neutral";
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  trimValues: true,
});

/** Flatten a parsed node (string | {__cdata} | {#text} | array) to plain text, tags stripped. */
function text(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node).replace(/<[^>]+>/g, "").trim();
  if (Array.isArray(node)) return text(node[0]);
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (o.__cdata != null) return text(o.__cdata);
    if (o["#text"] != null) return text(o["#text"]);
    if (o["@_href"] != null) return String(o["@_href"]); // Atom <link href="..."/>
  }
  return "";
}

function classify(t: string): "bullish" | "bearish" | "neutral" {
  const bull = t.match(new RegExp(BULL.source, "gi"))?.length ?? 0;
  const bear = t.match(new RegExp(BEAR.source, "gi"))?.length ?? 0;
  return bull > bear ? "bullish" : bear > bull ? "bearish" : "neutral";
}

async function fetchFeed(source: string, url: string): Promise<NewsArticle[]> {
  const res = await fetch(url, { cache: "no-store", headers: { "user-agent": "TheSamTerminal/1.0 (educational project)" } });
  if (!res.ok) throw new Error(`${source} ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml);

  // RSS 2.0: rss.channel.item[] — Atom: feed.entry[]
  const rawItems: unknown[] =
    doc?.rss?.channel?.item ??
    doc?.feed?.entry ??
    [];
  const items = (Array.isArray(rawItems) ? rawItems : [rawItems]).slice(0, 25);

  return items.map((it: any, i: number) => {
    const title = text(it?.title);
    const link = text(it?.link) || text(it?.guid);
    const summary = text(it?.description ?? it?.summary ?? it?.content).slice(0, 220);
    const dateStr = text(it?.pubDate ?? it?.published ?? it?.updated ?? it?.["dc:date"]);
    const parsed = dateStr ? new Date(dateStr).getTime() : NaN;
    const publishedAt = Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(Date.now() / 1000);
    const haystack = `${title} ${summary}`;
    const coins = Object.entries(COIN_KEYWORDS).filter(([, re]) => re.test(haystack)).map(([c]) => c);
    return { id: `${source}-${i}-${publishedAt}`, title, link, source, publishedAt, summary, coins, sentiment: classify(haystack) };
  }).filter((a) => a.title && a.link);
}

export async function GET() {
  try {
    const { value, stale } = await cached("news", 1800, async () => {
      const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f.source, f.url)));
      const articles = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      if (!articles.length) throw new Error("all feeds failed");
      // dedupe near-identical titles, newest first
      const seen = new Set<string>();
      return articles
        .sort((a, b) => b.publishedAt - a.publishedAt)
        .filter((a) => {
          const key = a.title.toLowerCase().slice(0, 60);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 60);
    });
    return NextResponse.json(
      { data: value, stale },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } }
    );
  } catch {
    return NextResponse.json({ data: [], error: "News feeds unreachable right now." }, { status: 502 });
  }
}
