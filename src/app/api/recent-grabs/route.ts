import { NextResponse } from "next/server";
import { getRecentGrabs } from "@/lib/grabs-log";

export async function GET() {
  const grabs = await getRecentGrabs(30);
  return NextResponse.json({ grabs });
}
