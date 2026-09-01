import type { MetadataRoute } from "next";

const COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://thesamterminal.vercel.app";
  const now = new Date();
  const pages = ["", "/markets", "/screener", "/compare", "/news", "/watchlist", "/terms"].map((p) => ({
    url: `${base}${p}`, lastModified: now, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.8,
  }));
  const coins = COINS.map((c) => ({
    url: `${base}/coin/${c}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.6,
  }));
  return [...pages, ...coins];
}
