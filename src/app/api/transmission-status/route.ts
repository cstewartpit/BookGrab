import { NextResponse } from "next/server";
import { listTorrents } from "@/lib/transmission-api";

// Short in-memory cache so the client can poll this endpoint from the
// list page without hitting Transmission on every keystroke. Small TTL
// keeps download-progress fresh enough.
let cache: { at: number; payload: unknown } | null = null;
const TTL_MS = 8_000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.payload);
  }
  try {
    const torrents = await listTorrents();
    const slim = torrents.map((t) => ({
      name: t.name,
      percentDone: t.percentDone,
      status: t.status,
      rateDownload: t.rateDownload,
      eta: t.eta,
      downloadDir: t.downloadDir,
    }));
    const payload = { torrents: slim, fetchedAt: new Date().toISOString() };
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      {
        torrents: [],
        error:
          err instanceof Error
            ? err.message
            : "Failed to query Transmission",
      },
      { status: 500 },
    );
  }
}
