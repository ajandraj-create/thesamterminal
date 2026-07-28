/**
 * Two-tier cache with stale-on-error behaviour.
 *
 * Tier 1 — in-memory LRU (always on). Bounded to MAX_ENTRIES so historical
 * kline pages can never grow the heap unbounded (previously a leak).
 *
 * Tier 2 — optional Upstash Redis via REST (set UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN). This makes the cache shared and durable across
 * serverless lambda instances — without it, on Vercel every cold instance
 * starts empty and upstream rate limits are hit far sooner.
 *
 * On fetch failure the last real value is served (marked stale) instead of
 * dropping to demo data.
 */

type Entry<T> = { value: T; expires: number };

const MAX_ENTRIES = 500;
const store = new Map<string, Entry<unknown>>(); // Map preserves insertion order → LRU

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisEnabled = !!(REDIS_URL && REDIS_TOKEN);

function lruGet<T>(key: string): Entry<T> | undefined {
  const hit = store.get(key) as Entry<T> | undefined;
  if (!hit) return undefined;
  // refresh recency
  store.delete(key);
  store.set(key, hit);
  return hit;
}

function lruSet(key: string, entry: Entry<unknown>) {
  if (store.has(key)) store.delete(key);
  store.set(key, entry);
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

async function redisGet<T>(key: string): Promise<Entry<T> | null> {
  if (!redisEnabled) return null;
  try {
    const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(`tst:${key}`)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (j?.result == null) return null;
    return JSON.parse(j.result) as Entry<T>;
  } catch {
    return null;
  }
}

async function redisSet(key: string, entry: Entry<unknown>, ttlSeconds: number): Promise<void> {
  if (!redisEnabled) return;
  try {
    // Keep the redis copy around 4× the logical TTL so stale-on-error can
    // still serve a real value after expiry.
    const px = Math.max(1, Math.round(ttlSeconds * 4)) * 1000;
    await fetch(`${REDIS_URL}/set/${encodeURIComponent(`tst:${key}`)}?px=${px}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      cache: "no-store",
    });
  } catch {
    /* redis is best-effort */
  }
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<{ value: T; stale: boolean }> {
  const now = Date.now();

  const mem = lruGet<T>(key);
  if (mem && mem.expires > now) return { value: mem.value, stale: false };

  // Shared cache (if configured) — lets all lambda instances reuse one fetch.
  const shared = mem ? null : await redisGet<T>(key);
  if (shared && shared.expires > now) {
    lruSet(key, shared);
    return { value: shared.value, stale: false };
  }

  const lastReal: Entry<T> | null = mem ?? shared; // may be expired — kept for stale-serve

  try {
    const value = await fetcher();
    const entry: Entry<unknown> = { value, expires: now + ttlSeconds * 1000 };
    lruSet(key, entry);
    void redisSet(key, entry, ttlSeconds);
    return { value, stale: false };
  } catch (e) {
    if (lastReal) {
      // Provider failed (likely rate limit) — serve the last real value.
      console.error(`cache stale-serve [${key}]:`, (e as Error).message);
      return { value: lastReal.value, stale: true };
    }
    throw e;
  }
}
