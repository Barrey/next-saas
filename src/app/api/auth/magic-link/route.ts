import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { createSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const tokenList = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.id, hashedToken))
      .limit(1);

    if (tokenList.length === 0) {
      return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
    }

    const verifiedToken = tokenList[0];

    if (Date.now() >= verifiedToken.expiresAt.getTime()) {
      await db.delete(verificationTokens).where(eq(verificationTokens.id, hashedToken));
      return NextResponse.redirect(new URL("/login?error=expired_token", req.url));
    }

    // Delete token to prevent reuse
    await db.delete(verificationTokens).where(eq(verificationTokens.id, hashedToken));

    const userList = await db.select().from(users).where(eq(users.id, verifiedToken.userId)).limit(1);
    if (userList.length === 0) {
      return NextResponse.redirect(new URL("/login?error=user_not_found", req.url));
    }

    const user = userList[0];
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const sessionToken = await createSession(user.id, ipAddress, userAgent);

    const response = NextResponse.redirect(new URL("/dashboard", req.url));
    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60
    });

    return response;
  } catch (err) {
    console.error("Magic Link verification error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", req.url));
  }
}
