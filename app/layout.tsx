import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font — no external requests, so these load
// under `font-src 'self'` and the strict CSP stays untouched. Both are SIL OFL.
// Anton stands in for the PODIUM-style sharp display face.
const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-podium", display: "swap" });
const inter = Inter({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-inter", display: "swap" });
import Nav from "@/components/Nav";
import TickerTape from "@/components/TickerTape";
import PaperTickFeeder from "@/components/PaperTickFeeder";
import { LiveTickerProvider } from "@/hooks/useLiveTicker";
import { SparklineProvider } from "@/components/SparklineProvider";
import AlertWatcher from "@/components/AlertWatcher";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://thesamterminal.vercel.app"),
  title: "TheSamTerminal — premium crypto trading terminal",
  keywords: ["crypto", "trading terminal", "bitcoin", "technical analysis", "paper trading", "charts"],
  authors: [{ name: "Abhinay Jandrajupalli" }],
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: {
    title: "TheSamTerminal",
    description: "Premium gold crypto terminal — live charts, drawing tools, a transparent quant engine, and paper trading on real Binance tick data.",
    images: ["/icon-512.png"],
  },
  description:
    "Educational crypto research terminal: tick-by-tick live prices, TradingView-style charts, drawing tools, order book, trades tape, a transparent quant engine, and paper trading. Not financial advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <LiveTickerProvider>
        <SparklineProvider>
        <Nav />
        <TickerTape />
        <PaperTickFeeder />
        <AlertWatcher />
        {children}
        <Footer />
        </SparklineProvider>
        </LiveTickerProvider>
      </body>
    </html>
  );
}
