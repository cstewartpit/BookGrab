import { NextResponse } from "next/server";
import { pingMam } from "@/lib/mam-session";

export async function POST() {
  const status = await pingMam();
  return NextResponse.json(status);
}
