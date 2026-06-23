import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-guard";
import { isRateLimited } from "@/lib/auth/rate-limiter";

export async function GET(req: NextRequest) {
  const org = await validateApiKey(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized. Invalid or missing API key." }, { status: 401 });
  }

  if (isRateLimited(org.id)) {
    return NextResponse.json({ error: "Too many requests. Rate limit exceeded." }, { status: 429 });
  }

  return NextResponse.json({
    id: org.id,
    name: org.name,
    invitationExpiryDays: org.invitationExpiryDays,
    createdAt: org.createdAt
  });
}
