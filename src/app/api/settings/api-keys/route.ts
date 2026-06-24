import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guards";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const user = await requireOwner();
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        truncatedKey: apiKeys.truncatedKey,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt
      })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, user.organizationId!));
    return NextResponse.json({ keys });
  } catch (err: any) {
    console.error("Error in GET /api/settings/api-keys:", err);
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" || err.message === "NoOrganization" ? 403 : 500;
    return NextResponse.json({ error: err.message || "Server error" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOwner();
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: "Key name is required." }, { status: 400 });
    }

    const rawKey = `sk_live_${crypto.randomBytes(16).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const truncatedKey = `sk_live_***${rawKey.slice(-4)}`;

    const [newKey] = await db.insert(apiKeys).values({
      organizationId: user.organizationId!,
      name,
      keyHash,
      truncatedKey
    }).returning();

    return NextResponse.json({ success: true, keyId: newKey.id, rawKey });
  } catch (err: any) {
    console.error("Error in POST /api/settings/api-keys:", err);
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" || err.message === "NoOrganization" ? 403 : 500;
    return NextResponse.json({ error: err.message || "Server error" }, { status });
  }
}
