import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guards";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await requireOwner();
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "Key ID is required." }, { status: 400 });
    }

    await db
      .delete(apiKeys)
      .where(
        and(
          eq(apiKeys.id, id),
          eq(apiKeys.organizationId, user.organizationId!)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" || err.message === "NoOrganization" ? 403 : 500;
    return NextResponse.json({ error: err.message || "Server error" }, { status });
  }
}
