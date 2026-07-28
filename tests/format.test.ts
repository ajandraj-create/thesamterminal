import { describe, it, expect } from "vitest";
import { fmtPct, fmtSigned, fmtCompact } from "@/lib/format";

describe("fmtPct", () => {
  it("adds a + for positive and keeps - for negative", () => {
    expect(fmtPct(2.5)).toBe("+2.50%");
    expect(fmtPct(-1.2)).toBe("-1.20%");
  });
  it("handles null", () => expect(fmtPct(null)).toBe("—"));
});

describe("fmtSigned", () => {
  it("signs values and adapts decimals to magnitude", () => {
    expect(fmtSigned(1500)).toBe("+1500");
    expect(fmtSigned(-12.3)).toBe("-12.30");
  });
});

describe("fmtCompact", () => {
  it("compacts large numbers", () => {
    expect(fmtCompact(1_500_000)).toMatch(/1\.5M/);
    expect(fmtCompact(2_300_000_000)).toMatch(/2\.3B/);
  });
});
