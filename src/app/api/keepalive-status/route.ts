import { NextResponse } from "next/server";
import { getStatus } from "@/lib/mam-session";

export async function GET() {
  return NextResponse.json(await getStatus());
}
