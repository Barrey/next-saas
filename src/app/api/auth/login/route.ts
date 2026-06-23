import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password." }, { status: 400 });
    }

    const userList = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userList.length === 0) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
    }

    const user = userList[0];

    // Check Suspension
    if (user.suspended) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    // Check Lockouts
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const diffMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      return NextResponse.json({ error: `Account locked. Try again in ${diffMinutes} minutes.` }, { status: 403 });
    }

    // Verify Password
    const isMatch = user.passwordHash ? verifyPassword(password, user.passwordHash) : false;

    if (!isMatch) {
      const attempts = user.failedLoginAttempts + 1;
      const updates: Partial<typeof user> = { failedLoginAttempts: attempts };
      
      if (attempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      }
      
      await db.update(users).set(updates).where(eq(users.id, user.id));
      return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
    }

    // Successful Login -> reset counters
    await db.update(users).set({
      failedLoginAttempts: 0,
      lockedUntil: null
    }).where(eq(users.id, user.id));

    // Check 2FA
    if (user.twoFactorEnabled) {
      const preAuthToken = `${user.id}:${Date.now()}`;
      const response = NextResponse.json({ success: true, requiresTwoFactor: true });
      response.cookies.set("pre_auth_token", preAuthToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 5 * 60 // 5 minutes
      });
      return response;
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const token = await createSession(user.id, ipAddress, userAgent);

    const response = NextResponse.json({ success: true });
    
    // Set Cookie
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60
    });

    return response;
  } catch (err) {
    console.error("Login Error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
