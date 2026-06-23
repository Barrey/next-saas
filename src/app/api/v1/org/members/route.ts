import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-guard";
import { isRateLimited } from "@/lib/auth/rate-limiter";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const org = await validateApiKey(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized. Invalid or missing API key." }, { status: 401 });
  }

  if (isRateLimited(org.id)) {
    return NextResponse.json({ error: "Too many requests. Rate limit exceeded." }, { status: 429 });
  }

  const members = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.organizationId, org.id));

  return NextResponse.json({ members });
}
