# NextSaas Organizations & Invitations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a team subscription system where users can belong to one organization, create teams, generate secure invite tokens with custom expiry durations, and accept invitations with ownership conflict protections.

**Architecture:** We update SQL database templates with organization and invitation tables. We build role protection guards (`requireOwner`, `requireOrgMember`) and create API endpoints for team setup, member invites, and acceptance code linking.

**Tech Stack:** Next.js 15, Drizzle ORM, Playwright.

## Global Constraints
- Enforce strict One-to-Many team mapping via nullable foreign key `organizationId` directly on the `users` table.
- Support custom, per-invitation expiry days parameter (`expiresInDays`), falling back to a default config variable.
- Block team owners from accepting new invitations until they delete/transfer their current workspace.

---

### Task 1: Database Schema Expansion & Configuration File

**Files:**
- Modify: `src/db/templates/postgres/schema.ts`
- Modify: `src/db/templates/mysql/schema.ts`
- Modify: `src/db/templates/mariadb/schema.ts`
- Create: `src/lib/config.ts`
- Create: `tests/integration/orgs-schema.spec.ts`

**Interfaces:**
- Consumes: Initial auth schema mappings.
- Produces: Configuration constant `AUTH_CONFIG` and database schema tables: organizations, invitations, and users columns.

- [ ] **Step 1: Update Postgres Template Schema**
  Append organizations, invitations, and link users in `src/db/templates/postgres/schema.ts`:
  ```typescript
  import { pgTable, uuid, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";

  export const organizations = pgTable("organizations", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });

  export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }),
    twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until"),
    suspended: boolean("suspended").default(false).notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    role: varchar("role", { length: 50 }), // 'owner' | 'member'
    createdAt: timestamp("created_at").defaultNow().notNull()
  });

  export const sessions = pgTable("sessions", {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });

  export const verificationTokens = pgTable("verification_tokens", {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });

  export const invitations = pgTable("invitations", {
    id: varchar("id", { length: 64 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending' | 'accepted' | 'declined'
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });
  ```

- [ ] **Step 2: Update MySQL & MariaDB Template Schemas**
  Update `src/db/templates/mysql/schema.ts` and `src/db/templates/mariadb/schema.ts`:
  ```typescript
  import { mysqlTable, varchar, timestamp, boolean, int } from "drizzle-orm/mysql-core";
  import crypto from "crypto";

  export const organizations = mysqlTable("organizations", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });

  export const users = mysqlTable("users", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }),
    twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    failedLoginAttempts: int("failed_login_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until"),
    suspended: boolean("suspended").default(false).notNull(),
    organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id, { onDelete: "set null" }),
    role: varchar("role", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });

  export const sessions = mysqlTable("sessions", {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });

  export const verificationTokens = mysqlTable("verification_tokens", {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });

  export const invitations = mysqlTable("invitations", {
    id: varchar("id", { length: 64 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    organizationId: varchar("organization_id", { length: 36 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  });
  ```

- [ ] **Step 3: Create Central Config File (`src/lib/config.ts`)**
  ```typescript
  export const AUTH_CONFIG = {
    // Default expiry time for workspace invitations (in days, defaults to 7)
    invitationExpiryDays: Number(process.env.INVITATION_EXPIRY_DAYS) || 7,
  };
  ```

- [ ] **Step 4: Create schemas verification test**
  Create `tests/integration/orgs-schema.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";

  test("should load organizations and invitations schemas successfully", async () => {
    const schema = await import("../../src/db/schema");
    expect(schema.organizations).toBeDefined();
    expect(schema.invitations).toBeDefined();
  });
  ```

- [ ] **Step 5: Run Database Setup & Test**
  Run: `npm run db:setup postgres`
  Run: `npx playwright test tests/integration/orgs-schema.spec.ts`
  Expected: Schema imports cleanly and test passes.

- [ ] **Step 6: Commit**
  Run: `git add src/ tests/`
  Run: `git commit -m "feat: add organizations and invitations schemas to dialect templates"`

---

### Task 2: Access Guards & Organization Creation API

**Files:**
- Create: `src/lib/auth/guards.ts`
- Create: `src/app/api/auth/organization/route.ts`
- Modify: `src/db/templates/postgres/client.ts`
- Modify: `src/db/templates/mysql/client.ts`
- Modify: `src/db/templates/mariadb/client.ts`

**Interfaces:**
- Consumes: Session context helpers.
- Produces: Access control guard functions and organization creation handler endpoint.

- [ ] **Step 1: Implement Access guards (`src/lib/auth/guards.ts`)**
  ```typescript
  import { getCurrentUser } from "./server";

  export async function requireOrgMember() {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }
    if (!user.organizationId) {
      throw new Error("NoOrganization");
    }
    return user;
  }

  export async function requireOwner() {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }
    if (!user.organizationId || user.role !== "owner") {
      throw new Error("Forbidden");
    }
    return user;
  }
  ```

- [ ] **Step 2: Update postgres mock client template to handle organizations insert/select**
  We must update `src/db/templates/postgres/client.ts` to mock SELECT and INSERT for `organizations` and update user column fields (organizationId, role) in UPDATE statement:
  Replace the top SQL matching blocks in `mockQuery`:
  ```typescript
    // 1. SELECT users by email
    if (sql.includes('from "users"') && sql.includes('"users"."email" = $1')) {
      const email = params[0];
      const user = mockUsers.find(u => u.email === email);
      return mockQueryResult(user ? [user] : []);
    }

    // 2. SELECT users by id
    if (sql.includes('from "users"') && sql.includes('"users"."id" = $1')) {
      const id = params[0];
      const user = mockUsers.find(u => u.id === id);
      return mockQueryResult(user ? [user] : []);
    }

    // 3. INSERT user
    if (sql.includes('insert into "users"')) {
      const user = {
        id: crypto.randomUUID(),
        email: params[0],
        password_hash: params[1],
        two_factor_secret: params[2] || null,
        two_factor_enabled: params[3] === true || params[3] === 1 || false,
        failed_login_attempts: params[4] || 0,
        locked_until: params[5] || null,
        suspended: params[6] || false,
        organization_id: params[7] || null,
        role: params[8] || null,
        created_at: params[9] || new Date()
      };
      mockUsers.push(user);
      return mockQueryResult([user]);
    }

    // 4. UPDATE user
    if (sql.includes('update "users"')) {
      const targetId = params[params.length - 1];
      const user = mockUsers.find(u => u.id === targetId);
      if (user) {
        if (sql.includes('"failed_login_attempts" = $1')) {
          user.failed_login_attempts = params[0];
        }
        if (sql.includes('"locked_until" = $2')) {
          user.locked_until = params[1];
        }
        if (sql.includes('"failed_login_attempts" = 0')) {
          user.failed_login_attempts = 0;
          user.locked_until = null;
        }
        if (sql.includes('"organization_id" = $1')) {
          user.organization_id = params[0];
        }
        if (sql.includes('"role" = $2')) {
          user.role = params[1];
        }
      }
      return mockQueryResult(user ? [user] : []);
    }

    // New 4b. INSERT organization
    if (sql.includes('insert into "organizations"')) {
      const org = {
        id: params[0] || crypto.randomUUID(),
        name: params[1],
        created_at: params[2] || new Date()
      };
      (globalThis as any).mockOrgs = (globalThis as any).mockOrgs || [];
      (globalThis as any).mockOrgs.push(org);
      return mockQueryResult([org]);
    }
  ```
  *(Make sure to also update mysql and mariadb templates client mocks with equivalent table structures).*

- [ ] **Step 3: Implement Organization Creation Endpoint**
  Create `src/app/api/auth/organization/route.ts`:
  ```typescript
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
  ```

- [ ] **Step 4: Execute database setup and verify build compilation**
  Run: `npm run db:setup postgres`
  Run: `npm run build`
  Expected: Successful compilation check.

- [ ] **Step 5: Commit**
  Run: `git add src/`
  Run: `git commit -m "feat: implement requireOwner/requireOrgMember guards and organization create route handler"`

---

### Task 3: Invitation Generation & Accept API Handler Endpoints

**Files:**
- Create: `src/app/api/auth/organization/invite/route.ts`
- Create: `src/app/api/invitations/accept/route.ts`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/db/templates/postgres/client.ts`

**Interfaces:**
- Consumes: Config parameters, active database schema.
- Produces: API routes allowing invite links distribution, validation, and registration auto-linking.

- [ ] **Step 1: Update postgres client mock template to support invitations SELECT & INSERT**
  Ensure template `src/db/templates/postgres/client.ts` handles `insert into "invitations"` and `from "invitations"` SELECT calls.
  Append these query interceptors under `mockQuery`:
  ```typescript
    // INSERT invitation
    if (sql.includes('insert into "invitations"')) {
      const invite = {
        id: params[0],
        email: params[1],
        organization_id: params[2],
        status: params[3] || "pending",
        expires_at: params[4],
        created_at: params[5] || new Date()
      };
      mockTokens.push(invite); // reuse mockTokens storage
      return mockQueryResult([invite]);
    }

    // SELECT invitation by token hash
    if (sql.includes('from "invitations"') && sql.includes('"invitations"."id" = $1')) {
      const invite = mockTokens.find(t => t.id === params[0] && t.organization_id !== undefined);
      return mockQueryResult(invite ? [invite] : []);
    }

    // UPDATE invitation status
    if (sql.includes('update "invitations"')) {
      const invite = mockTokens.find(t => t.id === params[params.length - 1]);
      if (invite) {
        invite.status = params[0];
      }
      return mockQueryResult(invite ? [invite] : []);
    }
  ```

- [ ] **Step 2: Implement Member Invitation Generator Handler**
  Create `src/app/api/auth/organization/invite/route.ts` (reading `expiresInDays` parameter):
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { db } from "@/db";
  import { invitations } from "@/db/schema";
  import { requireOwner } from "@/lib/auth/guards";
  import { AUTH_CONFIG } from "@/lib/config";
  import crypto from "crypto";

  export async function POST(req: NextRequest) {
    try {
      const user = await requireOwner();
      const { email, expiresInDays } = await req.json();

      if (!email) {
        return NextResponse.json({ error: "Missing recipient email." }, { status: 400 });
      }

      const durationDays = expiresInDays || AUTH_CONFIG.invitationExpiryDays;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

      await db.insert(invitations).values({
        id: hashedToken,
        email,
        organizationId: user.organizationId!,
        expiresAt,
        status: "pending"
      });

      const inviteUrl = `${req.nextUrl.origin}/api/invitations/accept?token=${rawToken}`;
      console.log(`[Workspace Invite URL]: ${inviteUrl}`);

      return NextResponse.json({ success: true, token: rawToken, inviteUrl });
    } catch (err: any) {
      if (err.message === "Forbidden" || err.message === "Unauthorized") {
        return NextResponse.json({ error: err.message }, { status: err.message === "Forbidden" ? 403 : 401 });
      }
      return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
    }
  }
  ```

- [ ] **Step 3: Implement Acceptance Landing Redirect Route**
  Create `src/app/api/invitations/accept/route.ts` carrying owner verification warnings and session updates:
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { db } from "@/db";
  import { users, invitations } from "@/db/schema";
  import { getCurrentUser } from "@/lib/auth/server";
  import { eq } from "drizzle-orm";
  import crypto from "crypto";

  export async function GET(req: NextRequest) {
    try {
      const token = req.nextUrl.searchParams.get("token");
      if (!token) {
        return NextResponse.redirect(new URL("/login?error=missing_invite_token", req.url));
      }

      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

      const inviteList = await db.select().from(invitations).where(eq(invitations.id, hashedToken)).limit(1);
      if (inviteList.length === 0) {
        return NextResponse.redirect(new URL("/login?error=invalid_invite", req.url));
      }

      const invite = inviteList[0];
      if (invite.status !== "pending" || invite.expiresAt.getTime() <= Date.now()) {
        return NextResponse.redirect(new URL("/login?error=expired_invite", req.url));
      }

      const user = await getCurrentUser();

      if (!user) {
        // Redirect to register with query token
        return NextResponse.redirect(new URL(`/register?invite_token=${token}`, req.url));
      }

      // Conflict checks
      if (user.role === "owner") {
        return NextResponse.redirect(new URL("/dashboard?error=owner_cannot_join_team", req.url));
      }

      // Update user role and organizationId
      await db.update(users).set({
        organizationId: invite.organizationId,
        role: "member"
      }).where(eq(users.id, user.id));

      // Mark invite accepted
      await db.update(invitations).set({
        status: "accepted"
      }).where(eq(invitations.id, hashedToken));

      return NextResponse.redirect(new URL("/dashboard", req.url));
    } catch (err) {
      console.error("Accept invite error:", err);
      return NextResponse.redirect(new URL("/login?error=server_error", req.url));
    }
  }
  ```

- [ ] **Step 4: Integrate Invitation Autolinking inside register Endpoint**
  Modify registration flow `/api/auth/register` to intercept `invite_token`, fetch original invite metadata, link the user directly to the workspace, and consume the token:
  Update `src/app/api/auth/register/route.ts` with these lines:
  ```typescript
      // Check for invitation token link
      const inviteToken = req.nextUrl.searchParams.get("invite_token") || undefined;
      let organizationId: string | null = null;
      let role: string | null = null;
      let hashedToken: string | null = null;

      if (inviteToken) {
        const crypto = require("crypto");
        hashedToken = crypto.createHash("sha256").update(inviteToken).digest("hex");
        const inviteList = await db.select().from(invitations).where(eq(invitations.id, hashedToken)).limit(1);
        if (inviteList.length > 0 && inviteList[0].status === "pending" && inviteList[0].expiresAt.getTime() > Date.now()) {
          organizationId = inviteList[0].organizationId;
          role = "member";
        }
      }

      // Change users insert fields
      const [newUser] = await db.insert(users).values({
        email,
        passwordHash,
        organizationId,
        role
      }).returning();

      // Consume invite token
      if (hashedToken && organizationId) {
        await db.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, hashedToken));
      }
  ```

- [ ] **Step 5: Run Database Setup & Verify Build**
  Run: `npm run db:setup postgres`
  Run: `npm run build`
  Expected: Successful Next.js compilation.

- [ ] **Step 6: Commit**
  Run: `git add src/`
  Run: `git commit -m "feat: implement invitation creation, acceptance API endpoints and registration linking"`

---

### Task 4: Integration testing

**Files:**
- Create: `tests/integration/orgs.spec.ts`

**Interfaces:**
- Consumes: Authenticated endpoints, invitation routing handles.
- Produces: Complete flow validation testing suite.

- [ ] **Step 1: Write workspace invitations and role validations tests**
  Create `tests/integration/orgs.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";

  test("should handle organization creation, members inviting, and acceptance", async ({ request }) => {
    const ownerEmail = `owner-${Date.now()}@example.com`;
    const password = "securePassword123";

    // 1. Register Owner
    const regOwner = await request.post("/api/auth/register", {
      data: { email: ownerEmail, password }
    });
    expect(regOwner.ok()).toBe(true);

    // 2. Create organization
    const createOrg = await request.post("/api/auth/organization", {
      headers: { Cookie: regOwner.headers()["set-cookie"] },
      data: { name: "My Startup" }
    });
    expect(createOrg.ok()).toBe(true);
    const orgJson = await createOrg.json();
    expect(orgJson.success).toBe(true);

    // 3. Generate invite for new member
    const memberEmail = `member-${Date.now()}@example.com`;
    const inviteRes = await request.post("/api/auth/organization/invite", {
      headers: { Cookie: regOwner.headers()["set-cookie"] },
      data: { email: memberEmail, expiresInDays: 3 }
    });
    expect(inviteRes.ok()).toBe(true);
    const inviteJson = await inviteRes.json();
    expect(inviteJson.success).toBe(true);
    expect(inviteJson.token).toBeDefined();

    // 4. Register member directly with invite token
    const regMember = await request.post(`/api/auth/register?invite_token=${inviteJson.token}`, {
      data: { email: memberEmail, password }
    });
    expect(regMember.ok()).toBe(true);
    const memberJson = await regMember.json();
    expect(memberJson.success).toBe(true);

    // 5. Try accepting same invite again -> should redirect to login with error
    const doubleAccept = await request.get(`/api/invitations/accept?token=${inviteJson.token}`);
    expect(doubleAccept.url()).toContain("error=expired_invite");
  });
  ```

- [ ] **Step 2: Run all integration tests**
  Run: `npx playwright test`
  Expected: All 6 tests (Theme, Schemas, Auth, Orgs) pass successfully.

- [ ] **Step 3: Commit**
  Run: `git add tests/`
  Run: `git commit -m "feat: add organizations and invitations integration tests"`
