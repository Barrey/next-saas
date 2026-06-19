import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifySync } from "otplib";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Missing verification code." }, { status: 400 });
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA is not set up yet. Please request a secret key first." }, { status: 400 });
    }

    const result = verifySync({
      token: code,
      secret: user.twoFactorSecret
    });

    if (!result.valid) {
      return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
    }

    await db.update(users).set({
      twoFactorEnabled: true
    }).where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("2FA enable error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
