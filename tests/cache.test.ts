import { describe, it, expect } from "vitest";
import { cached } from "@/lib/cache";

describe("cached", () => {
  it("returns fresh value and caches it", async () => {
    let calls = 0;
    const fn = async () => { calls++; return 42; };
    const a = await cached("t:fresh", 60, fn);
    const b = await cached("t:fresh", 60, fn);
    expect(a.value).toBe(42);
    expect(b.value).toBe(42);
    expect(calls).toBe(1); // second hit served from cache
  });

  it("serves stale value when the fetcher fails after a prior success", async () => {
    let fail = false;
    const fn = async () => { if (fail) throw new Error("boom"); return "real"; };
    await cached("t:stale", 0, fn); // ttl 0 → expires immediately
    fail = true;
    const res = await cached("t:stale", 0, fn);
    expect(res.value).toBe("real");
    expect(res.stale).toBe(true);
  });

  it("throws when there is no prior value and the fetcher fails", async () => {
    await expect(cached("t:none", 60, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
  });

  it("evicts oldest entries beyond the LRU bound", async () => {
    let refetches = 0;
    await cached("t:first", 3600, async () => "v0");
    // flood well past MAX_ENTRIES (500)
    for (let i = 0; i < 600; i++) await cached(`t:flood:${i}`, 3600, async () => i);
    await cached("t:first", 3600, async () => { refetches++; return "v1"; });
    expect(refetches).toBe(1); // "t:first" was evicted, so it refetched
  });
});
