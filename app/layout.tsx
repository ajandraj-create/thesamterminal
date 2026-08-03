import type { Metadata } from "next";
import "./globals.css";
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
    <html lang="en">
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
