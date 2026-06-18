import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

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
    
    // Insert user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash
    }).returning();

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
