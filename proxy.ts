import { NextRequest, NextResponse } from "next/server";

/**
 * Per-IP rate limiting for /api/* — protects the server's Binance/CoinGecko
 * quota from a single abusive client (Binance bans by IP, so one hammering
 * user could take the whole site down to demo mode).
 *
 * Sliding window, in-memory. On serverless this is per-instance (still a
 * meaningful brake); for a hard global limit point it at Upstash Ratelimit.
 *
 * IPs live only in this map for the length of one 60s window and are never
 * persisted or linked to anything else — see /terms.
 *
 * Next 16 renamed the "middleware" file convention to "proxy"; the exported
 * function must be named `proxy` to match.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120; // generous: the UI itself makes ~10-20/min

type Bucket = { count: number; windowStart: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function proxy(req: NextRequest) {
  const ip = clientIp(req);
  const now = Date.now();

  let b = buckets.get(ip);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    b = { count: 0, windowStart: now };
    buckets.set(ip, b);
    // crude bound so the map can't grow forever
    if (buckets.size > MAX_BUCKETS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
  }
  b.count++;

  if (b.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((b.windowStart + WINDOW_MS - now) / 1000);
    return new NextResponse(
      JSON.stringify({ error: "Too many requests — slow down." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.max(1, retryAfter)),
        },
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  res.headers.set("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - b.count)));
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
