import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import { db } from "../src/db";
import { users, organizations, invitations, sessions, verificationTokens } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/crypto";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function seed() {
  console.log("--- Starting Database Seeding ---");

  try {
    // 1. Wipe existing data in order of foreign key dependencies
    console.log("Clearing existing database records...");
    await db.delete(sessions);
    await db.delete(verificationTokens);
    await db.delete(invitations);
    await db.delete(users);
    await db.delete(organizations);
    console.log("Database cleared successfully.");

    // 2. Generate hashed password
    const defaultPassword = "password123";
    console.log(`Hashing password "${defaultPassword}" using scrypt...`);
    const passwordHash = hashPassword(defaultPassword);

    // 3. Create mock organizations
    console.log("Inserting mock organizations...");
    
    // We insert organizations one-by-one to support the Mock DB single-row insertion logic
    const [acmeOrg] = await db.insert(organizations).values({
      id: crypto.randomUUID(),
      name: "Acme Corp",
      invitationExpiryDays: 3,
      createdAt: new Date(),
    }).returning();
    const acmeOrgId = acmeOrg.id;

    const [starkOrg] = await db.insert(organizations).values({
      id: crypto.randomUUID(),
      name: "Stark Industries",
      invitationExpiryDays: 14,
      createdAt: new Date(),
    }).returning();
    const starkOrgId = starkOrg.id;

    const [cyberdyneOrg] = await db.insert(organizations).values({
      id: crypto.randomUUID(),
      name: "Cyberdyne Systems",
      invitationExpiryDays: null,
      createdAt: new Date(),
    }).returning();
    const cyberdyneOrgId = cyberdyneOrg.id;

    // 4. Create mock users
    console.log("Inserting mock users...");
    
    // Note: The Mock DB client expects exactly: email, password_hash, organization_id, role.
    // It generates the user ID and default flags internally. We do not pass "id" or "createdAt"
    // to match the exact query signature the Mock DB expects, and retrieve the ID via returning().
    const [ownerAcme] = await db.insert(users).values({
      email: "owner@acme.com",
      passwordHash: passwordHash,
      organizationId: acmeOrgId,
      role: "owner",
    }).returning();
    const ownerAcmeId = ownerAcme.id;

    const [memberAcme] = await db.insert(users).values({
      email: "member@acme.com",
      passwordHash: passwordHash,
      organizationId: acmeOrgId,
      role: "member",
    }).returning();
    const memberAcmeId = memberAcme.id;

    const [tonyStark] = await db.insert(users).values({
      email: "tony@stark.com",
      passwordHash: passwordHash,
      organizationId: starkOrgId,
      role: "owner",
    }).returning();
    const tonyStarkId = tonyStark.id;

    const [loneUser] = await db.insert(users).values({
      email: "loneuser@example.com",
      passwordHash: passwordHash,
      organizationId: null,
      role: null,
    }).returning();
    const loneUserId = loneUser.id;

    // 5. Create mock invitations
    console.log("Inserting mock invitations...");
    const invitePendingRawToken = "acme_pending_invite_raw_token";
    const invitePendingHashedToken = crypto.createHash("sha256").update(invitePendingRawToken).digest("hex");

    const inviteExpiredRawToken = "acme_expired_invite_raw_token";
    const inviteExpiredHashedToken = crypto.createHash("sha256").update(inviteExpiredRawToken).digest("hex");

    const inviteAcceptedRawToken = "acme_accepted_invite_raw_token";
    const inviteAcceptedHashedToken = crypto.createHash("sha256").update(inviteAcceptedRawToken).digest("hex");

    // We insert invitations one-by-one to align with Mock DB insertion expectations
    await db.insert(invitations).values({
      id: invitePendingHashedToken,
      email: "newbie@acme.com",
      organizationId: acmeOrgId,
      status: "pending",
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days in future
      createdAt: new Date(),
    });

    await db.insert(invitations).values({
      id: inviteExpiredHashedToken,
      email: "expired@acme.com",
      organizationId: acmeOrgId,
      status: "pending",
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day in past
      createdAt: new Date(),
    });

    await db.insert(invitations).values({
      id: inviteAcceptedHashedToken,
      email: "member@acme.com",
      organizationId: acmeOrgId,
      status: "accepted",
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days in future
      createdAt: new Date(),
    });

    console.log("--- Database Seeding Completed Successfully! ---");
    console.log("\nSeeded Mock Data Reference:");
    console.log("- Password for all users: 'password123'");
    console.log("- Acme Corp (invitationExpiryDays: 3):");
    console.log(`  * Owner ID: ${ownerAcmeId} (owner@acme.com)`);
    console.log(`  * Member ID: ${memberAcmeId} (member@acme.com)`);
    console.log("  * Pending Invite (email: newbie@acme.com):");
    console.log(`    Raw token: "${invitePendingRawToken}"`);
    console.log(`    URL: /api/invitations/accept?token=${invitePendingRawToken}`);
    console.log("  * Expired Invite (email: expired@acme.com):");
    console.log(`    Raw token: "${inviteExpiredRawToken}"`);
    console.log(`    URL: /api/invitations/accept?token=${inviteExpiredRawToken}`);
    console.log("- Stark Industries (invitationExpiryDays: 14):");
    console.log(`  * Owner ID: ${tonyStarkId} (tony@stark.com)`);
    console.log("- Cyberdyne Systems (invitationExpiryDays: null / global default):");
    console.log("- Standalone user (no organization):");
    console.log(`  * User ID: ${loneUserId} (loneuser@example.com)`);
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
}

seed();
