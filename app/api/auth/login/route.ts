import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { ensureDefaultUsers, findUserByUsername } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { UserModel } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || "")
      .trim()
      .toLowerCase();
    const pin = String(body.pin || "").trim();

    if (!username || !["hamza", "bilal"].includes(username)) {
      return NextResponse.json(
        { error: "Select a valid driver account." },
        { status: 400 },
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits." },
        { status: 400 },
      );
    }

    await connectDb();
    await ensureDefaultUsers();

    const user = await findUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }

    const isValidPin = await bcrypt.compare(pin, user.pinHash);

    if (!isValidPin) {
      return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionPayload = {
      userId: String(user._id),
      username: user.username,
      displayName: user.displayName,
      expiresAt: expiresAt.toISOString(),
    };

    const response = NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        username: user.username,
        displayName: user.displayName,
      },
      expiresAt: expiresAt.toISOString(),
    });

    response.cookies.set("indrive_session", JSON.stringify(sessionPayload), {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
    });

    await UserModel.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } },
    );

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Unable to authenticate user." },
      { status: 500 },
    );
  }
}
