import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/crypto";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: "Missing password confirmation." }, { status: 400 });
    }

    // Verify password matches
    const isMatch = user.passwordHash ? verifyPassword(password, user.passwordHash) : false;
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 400 });
    }

    await db.update(users).set({
      twoFactorEnabled: false,
      twoFactorSecret: null
    }).where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("2FA disable error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
