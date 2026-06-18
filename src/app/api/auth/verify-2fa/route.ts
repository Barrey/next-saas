import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth/session";
import { verifySync } from "otplib";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    const preAuthToken = req.cookies.get("pre_auth_token")?.value;

    if (!preAuthToken || !code) {
      return NextResponse.json({ error: "Invalid request. Missing code or pre-auth context." }, { status: 400 });
    }

    // Decode preAuthToken: format "userId:timestamp"
    const [userId, timestampStr] = preAuthToken.split(":");
    if (!userId || !timestampStr) {
      return NextResponse.json({ error: "Invalid session metadata." }, { status: 400 });
    }

    const timestamp = Number(timestampStr);
    if (isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Pre-authentication session expired." }, { status: 400 });
    }

    const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userList.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 400 });
    }

    const user = userList[0];
    if (!user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA is not configured for this account." }, { status: 400 });
    }

    const result = verifySync({
      token: code,
      secret: user.twoFactorSecret
    });

    if (!result.valid) {
      return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const token = await createSession(user.id, ipAddress, userAgent);

    const response = NextResponse.json({ success: true });
    
    // Clear pre-auth token and issue actual session token
    response.cookies.delete("pre_auth_token");
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60
    });

    return response;
  } catch (err) {
    console.error("2FA verification error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
