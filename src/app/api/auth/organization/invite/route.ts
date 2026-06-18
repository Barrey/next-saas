import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, organizations } from "@/db/schema";
import { requireOwner } from "@/lib/auth/guards";
import { AUTH_CONFIG } from "@/lib/config";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await requireOwner();

    let email: string | undefined;
    let expiresInDays: number | undefined;

    try {
      const body = await req.json();
      email = body.email;
      expiresInDays = body.expiresInDays;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Missing recipient email." }, { status: 400 });
    }

    // Retrieve organization to check db-configured default expiry
    const orgs = await db.select().from(organizations).where(eq(organizations.id, user.organizationId!)).limit(1);
    const org = orgs[0];

    // Determine invitation duration in days:
    // 1. Specific expiresInDays from body
    // 2. Organization settings from DB (invitationExpiryDays)
    // 3. Fallback to global config (AUTH_CONFIG.invitationExpiryDays)
    const durationDays = expiresInDays !== undefined 
      ? Number(expiresInDays) 
      : ((org?.invitationExpiryDays !== undefined && org?.invitationExpiryDays !== null) 
          ? org.invitationExpiryDays 
          : AUTH_CONFIG.invitationExpiryDays);

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await db.insert(invitations).values({
      id: hashedToken,
      email,
      organizationId: user.organizationId!,
      expiresAt,
      status: "pending"
    });

    const inviteUrl = `${req.nextUrl.origin}/api/invitations/accept?token=${rawToken}`;
    console.log(`[Workspace Invite URL]: ${inviteUrl}`);

    return NextResponse.json({ success: true, token: rawToken, inviteUrl, expiresAt: expiresAt.toISOString() });
  } catch (err: any) {
    if (err.message === "Forbidden" || err.message === "Unauthorized") {
      return NextResponse.json({ error: err.message }, { status: err.message === "Forbidden" ? 403 : 401 });
    }
    console.error("Invite API Error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
