import { NextRequest, NextResponse } from "next/server";
import {
  availableLists,
  getDiscoverList,
  fetchOpenLibraryDescription,
} from "@/lib/discover";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const list = sp.get("list");
  const description = sp.get("description");

  // Lazy description fetch: ?description=/works/OL12345W
  if (description) {
    try {
      const text = await fetchOpenLibraryDescription(description);
      return NextResponse.json({ description: text });
    } catch (err) {
      console.error("[discover] description fetch failed:", err);
      return NextResponse.json({ description: null });
    }
  }

  if (list) {
    try {
      const data = await getDiscoverList(list);
      if (!data) {
        return NextResponse.json({ error: "Unknown list" }, { status: 404 });
      }
      return NextResponse.json(data);
    } catch (err) {
      console.error(`[discover] list "${list}" failed:`, err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Fetch failed" },
        { status: 502 },
      );
    }
  }

  // No params → return the catalogue of available lists (id + label only).
  return NextResponse.json({
    lists: availableLists().map((l) => ({
      id: l.id,
      label: l.label,
      source: l.source,
    })),
  });
}
