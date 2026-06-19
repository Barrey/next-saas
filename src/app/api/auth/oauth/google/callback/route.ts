import { NextRequest, NextResponse } from "next/server";
import { googleOAuth } from "@/lib/auth/oauth";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;
  const storedCodeVerifier = cookieStore.get("google_oauth_code_verifier")?.value;

  if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
    return NextResponse.json({ error: "Invalid OAuth state or parameters." }, { status: 400 });
  }

  try {
    const tokens = await googleOAuth.validateAuthorizationCode(code, storedCodeVerifier);
    
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` }
    });
    const profile = await profileRes.json() as { sub: string; email: string };

    const googleUserId = profile.sub;
    const email = profile.email;

    let [user] = await db.select().from(users).where(eq(users.googleId, googleUserId)).limit(1);

    if (!user) {
      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser) {
        [user] = await db.update(users).set({ googleId: googleUserId }).where(eq(users.id, existingUser.id)).returning();
      } else {
        [user] = await db.insert(users).values({
          email,
          googleId: googleUserId
        }).returning();
      }
    }

    if (user.suspended) {
      return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
    }

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

    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_code_verifier");

    return response;
  } catch (err) {
    console.error("Google OAuth Error:", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
