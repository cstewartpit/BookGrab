import { NextResponse } from "next/server";
import { getLibrarySnapshot } from "@/lib/library-status";

export async function GET() {
  const snap = await getLibrarySnapshot();
  return NextResponse.json({
    calibre: snap.calibreNormalized,
    abs: snap.absNormalized,
    calibreCount: snap.calibre.length,
    absCount: snap.abs.length,
    fetchedAt: snap.fetchedAt,
    calibreError: snap.calibreError,
    absError: snap.absError,
  });
}
