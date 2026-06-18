import crypto from "crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  
  // Expires in 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: hashedToken,
    userId,
    expiresAt,
    ipAddress,
    userAgent
  });

  return rawToken;
}

export async function validateSession(rawToken: string) {
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  
  const result = await db
    .select({
      user: users,
      session: sessions
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, hashedToken));

  if (result.length === 0) return null;

  const { user, session } = result[0];

  // Expiry Check
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, hashedToken));
    return null;
  }

  // Lockout & Suspension Checks
  if (user.suspended || (user.lockedUntil && user.lockedUntil.getTime() > Date.now())) {
    return null;
  }

  return { user, session };
}

export async function revokeSession(rawToken: string): Promise<void> {
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  await db.delete(sessions).where(eq(sessions.id, hashedToken));
}
