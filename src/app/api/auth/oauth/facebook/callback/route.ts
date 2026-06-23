import { NextRequest, NextResponse } from "next/server";
import { facebookOAuth } from "@/lib/auth/oauth";
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
  const storedState = cookieStore.get("facebook_oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.json({ error: "Invalid OAuth state or parameters." }, { status: 400 });
  }

  try {
    const tokens = await facebookOAuth.validateAuthorizationCode(code);
    
    const profileRes = await fetch(`https://graph.facebook.com/me?fields=id,email&access_token=${tokens.accessToken}`);
    const profile = await profileRes.json() as { id: string; email: string };

    const facebookUserId = profile.id;
    const email = profile.email;

    if (!email) {
      return NextResponse.json({ error: "No email address linked to your Facebook account." }, { status: 400 });
    }

    let [user] = await db.select().from(users).where(eq(users.facebookId, facebookUserId)).limit(1);

    if (!user) {
      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser) {
        [user] = await db.update(users).set({ facebookId: facebookUserId }).where(eq(users.id, existingUser.id)).returning();
      } else {
        [user] = await db.insert(users).values({
          email,
          facebookId: facebookUserId
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

    response.cookies.delete("facebook_oauth_state");

    return response;
  } catch (err) {
    console.error("Facebook OAuth Error:", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
