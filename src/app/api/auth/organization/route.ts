import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/server";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (user.organizationId) {
      return NextResponse.json({ error: "You already belong to an organization." }, { status: 400 });
    }

    const { name } = await req.json();
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    }

    const orgId = crypto.randomUUID();

    // 1. Insert organization
    await db.insert(organizations).values({
      id: orgId,
      name
    });

    // 2. Set user as Owner
    await db.update(users).set({
      organizationId: orgId,
      role: "owner"
    }).where(eq(users.id, user.id));

    return NextResponse.json({ success: true, organizationId: orgId });
  } catch (err) {
    console.error("Create organization error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
