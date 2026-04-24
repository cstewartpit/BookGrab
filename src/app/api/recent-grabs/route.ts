import { NextRequest, NextResponse } from "next/server";
import { getRecentGrabs, GrabEntry } from "@/lib/grabs-log";

/**
 * Most recent grabs, deduped by category + normalized title so a book
 * grabbed twice doesn't appear twice (the newer `at` wins). Pass
 * `?limit=N` to cap the response.
 */
export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "30", 10) || 30, 1), 200);

  const all = await getRecentGrabs(200);
  const seen = new Set<string>();
  const deduped: GrabEntry[] = [];
  for (const g of all) {
    const key = `${g.category}::${g.title.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(g);
    if (deduped.length >= limit) break;
  }
  return NextResponse.json({ grabs: deduped });
}
