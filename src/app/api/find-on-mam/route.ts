import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/mam-session";
import { searchBooks } from "@/lib/mam-api";

/**
 * Look up a discover-page book on MAM. Triggered by an explicit user click
 * — never on page load — so we make exactly one MAM request per call.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { title, author, isbn } = body as {
    title?: string;
    author?: string;
    isbn?: string;
  };

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Author makes the search far more specific (titles are often duplicated
  // across very different works). ISBN is included only as a hint — MAM's
  // basic search doesn't index by ISBN, but if a torrent name happens to
  // include it we'll match.
  const query = [title, author].filter(Boolean).join(" ").trim();
  const token = (await getToken()) || undefined;

  try {
    const result = await searchBooks(query, token, 0, "seedersDesc");
    // Trim down to the fields the client actually renders. The full Book
    // shape is preserved so BookRow can be reused unchanged.
    const books = (result.books || []).slice(0, 8);
    return NextResponse.json({
      books,
      query,
      isbn: isbn || null,
      totalResults: result.totalResults || 0,
    });
  } catch (err) {
    console.error("[find-on-mam] search failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 502 },
    );
  }
}
