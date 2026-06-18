import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, invitations } from "@/db/schema";
import { hashPassword } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User already exists with this email." }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    
    const inviteToken = req.nextUrl.searchParams.get("invite_token");
    let organizationId: string | null = null;
    let role: string | null = null;
    let hashedToken: string | null = null;

    console.log("[Register API] invite_token query param:", inviteToken);

    if (inviteToken) {
      hashedToken = crypto.createHash("sha256").update(inviteToken).digest("hex");
      const inviteList = await db.select().from(invitations).where(eq(invitations.id, hashedToken)).limit(1);
      console.log("[Register API] queried invite list length:", inviteList.length);
      if (inviteList.length > 0) {
        const invite = inviteList[0];
        console.log("[Register API] invite details:", { status: invite.status, expiresAt: invite.expiresAt, now: new Date() });
        if (invite.status === "pending" && invite.expiresAt.getTime() > Date.now()) {
          organizationId = invite.organizationId;
          role = "member";
          console.log("[Register API] invite verified! organizationId:", organizationId);
        } else {
          console.log("[Register API] invite validation failed (status or expiry)");
        }
      }
    }

    // Insert user with organization context
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      organizationId,
      role
    }).returning();

    console.log("[Register API] inserted user:", { id: newUser.id, organizationId: newUser.organizationId, role: newUser.role });

    // Consume invite token if applicable
    if (hashedToken && organizationId) {
      await db.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, hashedToken));
      console.log("[Register API] invitation marked as accepted");
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const token = await createSession(newUser.id, ipAddress, userAgent);
    
    const response = NextResponse.json({ success: true, userId: newUser.id });
    
    // Set Session Cookie
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60
    });

    return response;
  } catch (err) {
    console.error("Register Error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
