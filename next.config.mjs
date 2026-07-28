/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Client-side external connections: only Binance's public market-data
// WebSocket. All REST providers (Binance/CoinGecko/RSS) are called
// server-side, so they don't need to appear in connect-src.
//
// Dev mode additionally needs 'unsafe-eval': React's development build uses
// eval() for debugging features (callstack reconstruction). Production React
// never calls eval, so the deployed CSP stays strict.
const isDev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`, // Next.js hydration requires inline bootstrap scripts
  "style-src 'self' 'unsafe-inline'",  // inline style attributes used for dynamic chart styling
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' wss://data-stream.binance.vision",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root to this folder. Without it Turbopack walks up looking
  // for a lockfile and can settle on an unrelated one further up the tree
  // (e.g. a stray package-lock.json in the home directory).
  turbopack: { root: projectRoot },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};
export default nextConfig;
