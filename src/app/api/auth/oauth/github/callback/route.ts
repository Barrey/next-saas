import { NextRequest, NextResponse } from "next/server";
import { githubOAuth } from "@/lib/auth/oauth";
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
  const storedState = cookieStore.get("github_oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.json({ error: "Invalid OAuth state or parameters." }, { status: 400 });
  }

  try {
    const tokens = await githubOAuth.validateAuthorizationCode(code);
    
    // Fetch primary profile
    const profileRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokens.accessToken}`, "User-Agent": "NextSaas-App" }
    });
    const profile = await profileRes.json() as { id: number; email: string | null };
    
    let email = profile.email;
    
    // GitHub email can be null, query email endpoint to search for primary/verified email
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokens.accessToken}`, "User-Agent": "NextSaas-App" }
      });
      const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primaryEmail = emails.find(e => e.primary && e.verified) || emails[0];
      if (primaryEmail) {
        email = primaryEmail.email;
      }
    }

    if (!email) {
      return NextResponse.json({ error: "No email address found linked to your GitHub account." }, { status: 400 });
    }

    const githubUserId = String(profile.id);
    let [user] = await db.select().from(users).where(eq(users.githubId, githubUserId)).limit(1);

    if (!user) {
      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser) {
        [user] = await db.update(users).set({ githubId: githubUserId }).where(eq(users.id, existingUser.id)).returning();
      } else {
        [user] = await db.insert(users).values({
          email,
          githubId: githubUserId
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

    response.cookies.delete("github_oauth_state");

    return response;
  } catch (err) {
    console.error("GitHub OAuth Error:", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
