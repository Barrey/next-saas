import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, invitations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/server";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.redirect(new URL("/login?error=missing_invite_token", req.url));
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const inviteList = await db.select().from(invitations).where(eq(invitations.id, hashedToken)).limit(1);
    if (inviteList.length === 0) {
      return NextResponse.redirect(new URL("/login?error=invalid_invite", req.url));
    }

    const invite = inviteList[0];
    if (invite.status !== "pending" || invite.expiresAt.getTime() <= Date.now()) {
      return NextResponse.redirect(new URL("/login?error=expired_invite", req.url));
    }

    const user = await getCurrentUser();

    if (!user) {
      // User is not logged in: redirect to registration with the token in query parameters
      return NextResponse.redirect(new URL(`/register?invite_token=${token}`, req.url));
    }

    // Owner protection warning: an owner cannot join another team until they delete or transfer theirs
    if (user.role === "owner") {
      return NextResponse.redirect(new URL("/dashboard?error=owner_cannot_join_team", req.url));
    }

    // Update user role and organization link
    await db.update(users).set({
      organizationId: invite.organizationId,
      role: "member"
    }).where(eq(users.id, user.id));

    // Consume the invitation
    await db.update(invitations).set({
      status: "accepted"
    }).where(eq(invitations.id, hashedToken));

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (err) {
    console.error("Accept invite error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", req.url));
  }
}
