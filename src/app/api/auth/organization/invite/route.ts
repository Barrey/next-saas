import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, organizations } from "@/db/schema";
import { requireOwner } from "@/lib/auth/guards";
import { AUTH_CONFIG } from "@/lib/config";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

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
    
    // Send invitation email
    const subject = `You've been invited to join an organization on NextSaas`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Workspace Invitation</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px;">You have been invited to join the organization <strong>${org?.name || "Workspace"}</strong> on NextSaas.</p>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-bottom: 24px;">Accept Invitation</a>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">This invitation will expire on ${expiresAt.toLocaleDateString()}.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="font-size: 12px; word-break: break-all; color: #3b82f6;">${inviteUrl}</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject,
      html,
      text: `Accept invitation link: ${inviteUrl}`
    });

    return NextResponse.json({ success: true, token: rawToken, inviteUrl, expiresAt: expiresAt.toISOString() });
  } catch (err: any) {
    if (err.message === "Forbidden" || err.message === "Unauthorized") {
      return NextResponse.json({ error: err.message }, { status: err.message === "Forbidden" ? 403 : 401 });
    }
    console.error("Invite API Error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
