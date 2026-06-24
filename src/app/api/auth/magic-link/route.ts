import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { createSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

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

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { email } = body;
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    // 1. Find or create user
    let userList = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let user = userList[0];

    if (!user) {
      const [newUser] = await db.insert(users).values({
        email,
        passwordHash: null,
        organizationId: null,
        role: null,
      }).returning();
      user = newUser;
    }

    // 2. Generate secure token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    // 3. Save hashed token in verification_tokens
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await db.insert(verificationTokens).values({
      id: hashedToken,
      userId: user.id,
      type: "magic_link",
      expiresAt,
    });

    // 4. Construct magic link URL
    const magicLinkUrl = `${req.nextUrl.origin}/api/auth/magic-link?token=${rawToken}`;

    // 5. Send transaction email
    const subject = "Sign in to NextSaas";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Sign in to NextSaas</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px;">Click the button below to log into your account. This link will expire in 15 minutes.</p>
        <a href="${magicLinkUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-bottom: 24px;">Sign in</a>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">If you didn't request this link, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="font-size: 12px; word-break: break-all; color: #3b82f6;">${magicLinkUrl}</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject,
      html,
      text: `Sign in link: ${magicLinkUrl}`
    });

    return NextResponse.json({ success: true, token: rawToken });
  } catch (err) {
    console.error("Magic Link creation error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
