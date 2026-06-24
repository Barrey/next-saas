import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-guard";
import { isRateLimited } from "@/lib/auth/rate-limiter";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { AUTH_CONFIG } from "@/lib/config";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const org = await validateApiKey(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized. Invalid or missing API key." }, { status: 401 });
  }

  if (isRateLimited(org.id)) {
    return NextResponse.json({ error: "Too many requests. Rate limit exceeded." }, { status: 429 });
  }

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

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  
  const expiryDays = org.invitationExpiryDays || AUTH_CONFIG.invitationExpiryDays;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await db.insert(invitations).values({
    id: hashedToken,
    email,
    organizationId: org.id,
    status: "pending",
    expiresAt
  });

  return NextResponse.json({
    success: true,
    email,
    expiresAt,
    token: rawToken
  });
}
