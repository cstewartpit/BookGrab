import { NextRequest, NextResponse } from "next/server";
import { searchBooks } from "@/lib/mam-api";
import { getToken } from "@/lib/mam-session";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const startNumber = parseInt(searchParams.get("start") || "0", 10);
  const sortType = searchParams.get("sort") || "seedersDesc";

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 },
    );
  }

  try {
    const mamToken = (await getToken()) || undefined;
    const result = await searchBooks(query, mamToken, startNumber, sortType);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to search books",
      },
      { status: 500 },
    );
  }
}
