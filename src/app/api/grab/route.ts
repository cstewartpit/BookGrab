import { NextRequest, NextResponse } from "next/server";
import { addTorrent } from "@/lib/transmission-api";
import { logGrab } from "@/lib/grabs-log";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { torrentUrl, category, title, book } = body;

    console.log({ body });
    if (!torrentUrl) {
      return NextResponse.json(
        { error: "Torrent URL is required" },
        { status: 400 },
      );
    }

    if (!category || !["audiobook", "ebook"].includes(category)) {
      return NextResponse.json(
        { error: "Valid category (audiobook or ebook) is required" },
        { status: 400 },
      );
    }

    const result = await addTorrent(
      torrentUrl,
      category as "audiobook" | "ebook",
    );

    if (!result.success) {
      console.error({ result });
      return NextResponse.json(
        { error: result.error || result.message },
        { status: 500 },
      );
    }

    if (typeof title === "string" && title.trim()) {
      void logGrab({
        title: title.trim(),
        category: category as "audiobook" | "ebook",
        torrentUrl,
        book: book && typeof book === "object" ? book : undefined,
      }).catch((err) => console.error("[grabs-log] write failed:", err));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Grab API error:", error);
    return NextResponse.json(
      { error: "Failed to add torrent" },
      { status: 500 },
    );
  }
}
