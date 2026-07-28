import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";

export async function GET() {
  try {
    const { value } = await cached("fng", 3600, async () => {
      const res = await fetch("https://api.alternative.me/fng/?limit=1", { cache: "no-store" });
      if (!res.ok) throw new Error("fng unavailable");
      const j = await res.json();
      const d = j?.data?.[0];
      if (!d) throw new Error("fng empty");
      return { value: parseInt(d.value, 10), label: d.value_classification as string };
    });
    return NextResponse.json(value, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
