import { NextRequest } from "next/server";
import { db } from "@/db";
import { apiKeys, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function validateApiKey(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authHeader.substring(7).trim();
  if (!rawKey) return null;

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const result = await db
    .select({
      apiKey: apiKeys,
      organization: organizations
    })
    .from(apiKeys)
    .innerJoin(organizations, eq(apiKeys.organizationId, organizations.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const { apiKey, organization } = result[0];

  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .catch((err) => console.error("Failed to update API key lastUsedAt:", err));

  return organization;
}
