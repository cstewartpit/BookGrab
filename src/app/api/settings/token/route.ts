import { NextRequest, NextResponse } from "next/server";
import { clearToken, getStatus, setToken } from "@/lib/mam-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 },
      );
    }
    await setToken(token);
    return NextResponse.json({ success: true, status: await getStatus() });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save token",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  await clearToken();
  return NextResponse.json({ success: true, status: await getStatus() });
}
