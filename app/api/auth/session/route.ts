import { NextResponse } from "next/server";

import { readSession } from "@/lib/session";

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      displayName: session.displayName,
    },
    expiresAt: session.expiresAt,
  });
}
