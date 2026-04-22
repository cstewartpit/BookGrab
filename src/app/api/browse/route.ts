import { NextRequest, NextResponse } from "next/server";
import { searchBooks, type BrowseCategory } from "@/lib/mam-api";
import {
  getCachedBrowse,
  getToken,
  setCachedBrowse,
} from "@/lib/mam-session";

const ALLOWED_SORTS = new Set([
  "seeds",
  "date",
  "size",
  "name",
  "times_completed",
]);

function parseCategory(raw: string | null): BrowseCategory {
  if (raw === "audiobook" || raw === "ebook") return raw;
  return "all";
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const category = parseCategory(sp.get("cat"));
  const rawSort = sp.get("sort") || "seeds";
  const sort = ALLOWED_SORTS.has(rawSort) ? rawSort : "seeds";
  const start = Math.max(0, parseInt(sp.get("start") || "0", 10));
  const tag = sp.get("tag")?.trim() || undefined;
  const noCache = sp.get("noCache") === "1";

  const cacheKey = JSON.stringify({ category, sort, start, tag });
  if (!noCache) {
    const cached = getCachedBrowse(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const token = (await getToken()) || undefined;
    const result = await searchBooks("", token, start, sort, {
      category,
      tag,
    });
    if (!result.error) {
      setCachedBrowse(cacheKey, result);
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Browse API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to browse books",
        books: [],
        hasMore: false,
        totalResults: 0,
      },
      { status: 500 },
    );
  }
}
