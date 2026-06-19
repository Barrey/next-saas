import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { generateSecret, generateURI } from "otplib";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Generate secret and key URI
    const secret = generateSecret();
    const qrCodeUrl = generateURI({
      secret,
      label: user.email,
      issuer: "NextSaas",
      strategy: "totp"
    });

    // Save secret temporarily to twoFactorSecret (without turning on twoFactorEnabled)
    await db.update(users).set({
      twoFactorSecret: secret
    }).where(eq(users.id, user.id));

    return NextResponse.json({ secret, qrCodeUrl });
  } catch (err) {
    console.error("2FA setup error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
