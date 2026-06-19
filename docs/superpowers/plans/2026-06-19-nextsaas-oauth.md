# Social Sign-On (OAuth) Implementation Plan (Phase 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Social Sign-On (OAuth) for Google, GitHub, and Facebook using `arctic` directly on top of NextSaas's custom session database-backed login logic, supporting auto-linking on matching email addresses.

**Architecture:** Initialize Arctic provider instances in `src/lib/auth/oauth.ts`. Create individual redirect and callback route handlers for Google, GitHub, and Facebook. Modify the login and register forms to display a styled grid of social buttons wrapping the API routes.

**Tech Stack:** Next.js 15 (App Router), Drizzle ORM, `arctic` OAuth 2.0 helper library, shadcn/ui.

## Global Constraints

* Drizzle tables and migrations must support all 3 database dialects (Postgres, MySQL, MariaDB) by updating templates.
* Use `arctic` for lightweight, standard-compliant OAuth authentication.
* Auto-link users by matching email if signing up via OAuth with an email that is already registered with a password or another provider.
* Support responsive outline buttons displaying icons and labels.

---

### Task 1: Database Schema Expansion

**Files:**
- Modify: `tests/integration/db-schema.spec.ts`
- Modify: `src/db/templates/postgres/schema.ts`
- Modify: `src/db/templates/mysql/schema.ts`
- Modify: `src/db/templates/mariadb/schema.ts`
- Modify: `src/db/schema.ts`

**Interfaces:**
- Consumes: none
- Produces: `googleId`, `githubId`, and `facebookId` columns in the `users` table.

- [ ] **Step 1: Write the failing schema tests**
  Add schema assertion checks in `tests/integration/db-schema.spec.ts`:
  ```typescript
  // Add this inside the existing test:
  expect(schema.users.googleId).toBeDefined();
  expect(schema.users.githubId).toBeDefined();
  expect(schema.users.facebookId).toBeDefined();
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx playwright test tests/integration/db-schema.spec.ts`
  Expected: FAIL with undefined column errors.

- [ ] **Step 3: Update all templates and active schema**
  Modify [postgres/schema.ts](file:///a:/Mine/NextSaas/src/db/templates/postgres/schema.ts):
  ```typescript
  // Add columns to users table:
  googleId: varchar("google_id", { length: 255 }),
  githubId: varchar("github_id", { length: 255 }),
  facebookId: varchar("facebook_id", { length: 255 }),
  ```
  Modify [mysql/schema.ts](file:///a:/Mine/NextSaas/src/db/templates/mysql/schema.ts):
  ```typescript
  googleId: varchar("google_id", { length: 255 }),
  githubId: varchar("github_id", { length: 255 }),
  facebookId: varchar("facebook_id", { length: 255 }),
  ```
  Modify [mariadb/schema.ts](file:///a:/Mine/NextSaas/src/db/templates/mariadb/schema.ts):
  ```typescript
  googleId: varchar("google_id", { length: 255 }),
  githubId: varchar("github_id", { length: 255 }),
  facebookId: varchar("facebook_id", { length: 255 }),
  ```
  Modify [schema.ts](file:///a:/Mine/NextSaas/src/db/schema.ts) (active schema file):
  ```typescript
  googleId: varchar("google_id", { length: 255 }),
  githubId: varchar("github_id", { length: 255 }),
  facebookId: varchar("facebook_id", { length: 255 }),
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx playwright test tests/integration/db-schema.spec.ts`
  Expected: PASS

- [ ] **Step 5: Generate Drizzle migrations**
  Run: `npx drizzle-kit generate`
  Expected: Drizzle generates migration files under the `drizzle` directory containing the new columns.

- [ ] **Step 6: Commit**
  Run: `git add src/db/ tests/integration/db-schema.spec.ts drizzle/`
  Run: `git commit -m "feat: add OAuth provider fields to users schema"`

---

### Task 2: Install Arctic & Create Client Manager

**Files:**
- Modify: `package.json`
- Create: `src/lib/auth/oauth.ts`
- Create: `tests/integration/oauth-config.spec.ts`

**Interfaces:**
- Consumes: none
- Produces: `googleOAuth`, `githubOAuth`, and `facebookOAuth` class instances.

- [ ] **Step 1: Write config verification test**
  Create `tests/integration/oauth-config.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";
  
  test("should load oauth configurations correctly", async () => {
    const oauth = await import("../../src/lib/auth/oauth");
    expect(oauth.googleOAuth).toBeDefined();
    expect(oauth.githubOAuth).toBeDefined();
    expect(oauth.facebookOAuth).toBeDefined();
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx playwright test tests/integration/oauth-config.spec.ts`
  Expected: FAIL with "module not found" error.

- [ ] **Step 3: Install arctic**
  Run: `npm install arctic`
  Expected: `package.json` updated with `arctic`.

- [ ] **Step 4: Create the OAuth client manager**
  Create `src/lib/auth/oauth.ts`:
  ```typescript
  import { Google, GitHub, Facebook } from "arctic";
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  export const googleOAuth = new Google(
    process.env.GOOGLE_CLIENT_ID || "mock-google-id",
    process.env.GOOGLE_CLIENT_SECRET || "mock-google-secret",
    `${appUrl}/api/auth/oauth/google/callback`
  );
  
  export const githubOAuth = new GitHub(
    process.env.GITHUB_CLIENT_ID || "mock-github-id",
    process.env.GITHUB_CLIENT_SECRET || "mock-github-secret",
    `${appUrl}/api/auth/oauth/github/callback`
  );
  
  export const facebookOAuth = new Facebook(
    process.env.FACEBOOK_CLIENT_ID || "mock-facebook-id",
    process.env.FACEBOOK_CLIENT_SECRET || "mock-facebook-secret",
    `${appUrl}/api/auth/oauth/facebook/callback`
  );
  ```

- [ ] **Step 5: Run test to verify it passes**
  Run: `npx playwright test tests/integration/oauth-config.spec.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run: `git add package.json package-lock.json src/lib/auth/oauth.ts tests/integration/oauth-config.spec.ts`
  Run: `git commit -m "feat: install arctic and configure oauth clients"`

---

### Task 3: Google OAuth Routes

**Files:**
- Create: `src/app/api/auth/oauth/google/redirect/route.ts`
- Create: `src/app/api/auth/oauth/google/callback/route.ts`
- Create: `tests/integration/oauth-google.spec.ts`

**Interfaces:**
- Consumes: `googleOAuth` client from `src/lib/auth/oauth.ts`, `users` schema, and `createSession` helper.
- Produces: API routes `/api/auth/oauth/google/redirect` and `/api/auth/oauth/google/callback`.

- [ ] **Step 1: Write Google redirect API and callback validation tests**
  Create `tests/integration/oauth-google.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";
  
  test.describe("Google OAuth Routes", () => {
    test("redirect route returns 302 and sets state cookie", async ({ request }) => {
      const res = await request.get("/api/auth/oauth/google/redirect", { maxRedirects: 0 });
      expect(res.status()).toBe(302);
      expect(res.headers()["location"]).toContain("accounts.google.com");
      expect(res.headers()["set-cookie"]).toContain("google_oauth_state");
      expect(res.headers()["set-cookie"]).toContain("google_oauth_code_verifier");
    });
  
    test("callback route returns 400 when code/state is missing", async ({ request }) => {
      const res = await request.get("/api/auth/oauth/google/callback");
      expect(res.status()).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid OAuth state or parameters.");
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx playwright test tests/integration/oauth-google.spec.ts`
  Expected: FAIL with 404 not found errors.

- [ ] **Step 3: Create Google Redirect Route**
  Create `src/app/api/auth/oauth/google/redirect/route.ts`:
  ```typescript
  import { googleOAuth } from "@/lib/auth/oauth";
  import { generateState, generateCodeVerifier } from "arctic";
  import { cookies } from "next/headers";
  import { NextResponse } from "next/server";
  
  export async function GET() {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = googleOAuth.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);
  
    const cookieStore = await cookies();
    cookieStore.set("google_oauth_state", state, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 600, // 10 mins
      sameSite: "lax"
    });
    cookieStore.set("google_oauth_code_verifier", codeVerifier, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 600,
      sameSite: "lax"
    });
  
    return NextResponse.redirect(url);
  }
  ```

- [ ] **Step 4: Create Google Callback Route**
  Create `src/app/api/auth/oauth/google/callback/route.ts`:
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { googleOAuth } from "@/lib/auth/oauth";
  import { cookies } from "next/headers";
  import { db } from "@/db";
  import { users } from "@/db/schema";
  import { eq } from "drizzle-orm";
  import { createSession } from "@/lib/auth/session";
  
  export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
  
    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value;
    const storedCodeVerifier = cookieStore.get("google_oauth_code_verifier")?.value;
  
    if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
      return NextResponse.json({ error: "Invalid OAuth state or parameters." }, { status: 400 });
    }
  
    try {
      const tokens = await googleOAuth.validateAuthorizationCode(code, storedCodeVerifier);
      
      const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      });
      const profile = await profileRes.json() as { sub: string; email: string };
  
      const googleUserId = profile.sub;
      const email = profile.email;
  
      let [user] = await db.select().from(users).where(eq(users.googleId, googleUserId)).limit(1);
  
      if (!user) {
        const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser) {
          [user] = await db.update(users).set({ googleId: googleUserId }).where(eq(users.id, existingUser.id)).returning();
        } else {
          [user] = await db.insert(users).values({
            email,
            googleId: googleUserId
          }).returning();
        }
      }
  
      if (user.suspended) {
        return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
      }
  
      const ipAddress = req.headers.get("x-forwarded-for") || undefined;
      const userAgent = req.headers.get("user-agent") || undefined;
      const sessionToken = await createSession(user.id, ipAddress, userAgent);
  
      const response = NextResponse.redirect(new URL("/dashboard", req.url));
      response.cookies.set("session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60
      });
  
      // Clear Oauth cookies
      response.cookies.delete("google_oauth_state");
      response.cookies.delete("google_oauth_code_verifier");
  
      return response;
    } catch (err) {
      console.error("Google OAuth Error:", err);
      return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
    }
  }
  ```

- [ ] **Step 5: Run tests to verify they pass**
  Run: `npx playwright test tests/integration/oauth-google.spec.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run: `git add src/app/api/auth/oauth/google/ tests/integration/oauth-google.spec.ts`
  Run: `git commit -m "feat: implement Google redirect and callback route handlers"`

---

### Task 4: GitHub OAuth Routes

**Files:**
- Create: `src/app/api/auth/oauth/github/redirect/route.ts`
- Create: `src/app/api/auth/oauth/github/callback/route.ts`
- Create: `tests/integration/oauth-github.spec.ts`

**Interfaces:**
- Consumes: `githubOAuth` client from `src/lib/auth/oauth.ts`, `users` schema, and `createSession` helper.
- Produces: API routes `/api/auth/oauth/github/redirect` and `/api/auth/oauth/github/callback`.

- [ ] **Step 1: Write GitHub redirect API and callback validation tests**
  Create `tests/integration/oauth-github.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";
  
  test.describe("GitHub OAuth Routes", () => {
    test("redirect route returns 302 and sets state cookie", async ({ request }) => {
      const res = await request.get("/api/auth/oauth/github/redirect", { maxRedirects: 0 });
      expect(res.status()).toBe(302);
      expect(res.headers()["location"]).toContain("github.com/login/oauth/authorize");
      expect(res.headers()["set-cookie"]).toContain("github_oauth_state");
    });
  
    test("callback route returns 400 when code/state is missing", async ({ request }) => {
      const res = await request.get("/api/auth/oauth/github/callback");
      expect(res.status()).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid OAuth state or parameters.");
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx playwright test tests/integration/oauth-github.spec.ts`
  Expected: FAIL with 404 not found errors.

- [ ] **Step 3: Create GitHub Redirect Route**
  Create `src/app/api/auth/oauth/github/redirect/route.ts`:
  ```typescript
  import { githubOAuth } from "@/lib/auth/oauth";
  import { generateState } from "arctic";
  import { cookies } from "next/headers";
  import { NextResponse } from "next/server";
  
  export async function GET() {
    const state = generateState();
    const url = githubOAuth.createAuthorizationURL(state, ["user:email"]);
  
    const cookieStore = await cookies();
    cookieStore.set("github_oauth_state", state, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 600,
      sameSite: "lax"
    });
  
    return NextResponse.redirect(url);
  }
  ```

- [ ] **Step 4: Create GitHub Callback Route**
  Create `src/app/api/auth/oauth/github/callback/route.ts`:
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { githubOAuth } from "@/lib/auth/oauth";
  import { cookies } from "next/headers";
  import { db } from "@/db";
  import { users } from "@/db/schema";
  import { eq } from "drizzle-orm";
  import { createSession } from "@/lib/auth/session";
  
  export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
  
    const cookieStore = await cookies();
    const storedState = cookieStore.get("github_oauth_state")?.value;
  
    if (!code || !state || !storedState || state !== storedState) {
      return NextResponse.json({ error: "Invalid OAuth state or parameters." }, { status: 400 });
    }
  
    try {
      const tokens = await githubOAuth.validateAuthorizationCode(code);
      
      // Fetch primary profile
      const profileRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tokens.accessToken}`, "User-Agent": "NextSaas-App" }
      });
      const profile = await profileRes.json() as { id: number; email: string | null };
      
      let email = profile.email;
      
      // GitHub email can be null, query email endpoint to search for primary/verified email
      if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${tokens.accessToken}`, "User-Agent": "NextSaas-App" }
        });
        const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
        const primaryEmail = emails.find(e => e.primary && e.verified) || emails[0];
        if (primaryEmail) {
          email = primaryEmail.email;
        }
      }
  
      if (!email) {
        return NextResponse.json({ error: "No email address found linked to your GitHub account." }, { status: 400 });
      }
  
      const githubUserId = String(profile.id);
      let [user] = await db.select().from(users).where(eq(users.githubId, githubUserId)).limit(1);
  
      if (!user) {
        const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser) {
          [user] = await db.update(users).set({ githubId: githubUserId }).where(eq(users.id, existingUser.id)).returning();
        } else {
          [user] = await db.insert(users).values({
            email,
            githubId: githubUserId
          }).returning();
        }
      }
  
      if (user.suspended) {
        return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
      }
  
      const ipAddress = req.headers.get("x-forwarded-for") || undefined;
      const userAgent = req.headers.get("user-agent") || undefined;
      const sessionToken = await createSession(user.id, ipAddress, userAgent);
  
      const response = NextResponse.redirect(new URL("/dashboard", req.url));
      response.cookies.set("session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60
      });
  
      response.cookies.delete("github_oauth_state");
  
      return response;
    } catch (err) {
      console.error("GitHub OAuth Error:", err);
      return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
    }
  }
  ```

- [ ] **Step 5: Run tests to verify they pass**
  Run: `npx playwright test tests/integration/oauth-github.spec.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run: `git add src/app/api/auth/oauth/github/ tests/integration/oauth-github.spec.ts`
  Run: `git commit -m "feat: implement GitHub redirect and callback route handlers"`

---

### Task 5: Facebook OAuth Routes

**Files:**
- Create: `src/app/api/auth/oauth/facebook/redirect/route.ts`
- Create: `src/app/api/auth/oauth/facebook/callback/route.ts`
- Create: `tests/integration/oauth-facebook.spec.ts`

**Interfaces:**
- Consumes: `facebookOAuth` client from `src/lib/auth/oauth.ts`, `users` schema, and `createSession` helper.
- Produces: API routes `/api/auth/oauth/facebook/redirect` and `/api/auth/oauth/facebook/callback`.

- [ ] **Step 1: Write Facebook redirect API and callback validation tests**
  Create `tests/integration/oauth-facebook.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";
  
  test.describe("Facebook OAuth Routes", () => {
    test("redirect route returns 302 and sets state cookie", async ({ request }) => {
      const res = await request.get("/api/auth/oauth/facebook/redirect", { maxRedirects: 0 });
      expect(res.status()).toBe(302);
      expect(res.headers()["location"]).toContain("facebook.com");
      expect(res.headers()["set-cookie"]).toContain("facebook_oauth_state");
      expect(res.headers()["set-cookie"]).toContain("facebook_oauth_code_verifier");
    });
  
    test("callback route returns 400 when code/state is missing", async ({ request }) => {
      const res = await request.get("/api/auth/oauth/facebook/callback");
      expect(res.status()).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid OAuth state or parameters.");
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx playwright test tests/integration/oauth-facebook.spec.ts`
  Expected: FAIL with 404 not found errors.

- [ ] **Step 3: Create Facebook Redirect Route**
  Create `src/app/api/auth/oauth/facebook/redirect/route.ts`:
  ```typescript
  import { facebookOAuth } from "@/lib/auth/oauth";
  import { generateState, generateCodeVerifier } from "arctic";
  import { cookies } from "next/headers";
  import { NextResponse } from "next/server";
  
  export async function GET() {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = facebookOAuth.createAuthorizationURL(state, codeVerifier, ["email", "public_profile"]);
  
    const cookieStore = await cookies();
    cookieStore.set("facebook_oauth_state", state, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 600,
      sameSite: "lax"
    });
    cookieStore.set("facebook_oauth_code_verifier", codeVerifier, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 600,
      sameSite: "lax"
    });
  
    return NextResponse.redirect(url);
  }
  ```

- [ ] **Step 4: Create Facebook Callback Route**
  Create `src/app/api/auth/oauth/facebook/callback/route.ts`:
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { facebookOAuth } from "@/lib/auth/oauth";
  import { cookies } from "next/headers";
  import { db } from "@/db";
  import { users } from "@/db/schema";
  import { eq } from "drizzle-orm";
  import { createSession } from "@/lib/auth/session";
  
  export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
  
    const cookieStore = await cookies();
    const storedState = cookieStore.get("facebook_oauth_state")?.value;
    const storedCodeVerifier = cookieStore.get("facebook_oauth_code_verifier")?.value;
  
    if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
      return NextResponse.json({ error: "Invalid OAuth state or parameters." }, { status: 400 });
    }
  
    try {
      const tokens = await facebookOAuth.validateAuthorizationCode(code, storedCodeVerifier);
      
      const profileRes = await fetch(`https://graph.facebook.com/me?fields=id,email&access_token=${tokens.accessToken}`);
      const profile = await profileRes.json() as { id: string; email: string };
  
      const facebookUserId = profile.id;
      const email = profile.email;
  
      if (!email) {
        return NextResponse.json({ error: "No email address linked to your Facebook account." }, { status: 400 });
      }
  
      let [user] = await db.select().from(users).where(eq(users.facebookId, facebookUserId)).limit(1);
  
      if (!user) {
        const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser) {
          [user] = await db.update(users).set({ facebookId: facebookUserId }).where(eq(users.id, existingUser.id)).returning();
        } else {
          [user] = await db.insert(users).values({
            email,
            facebookId: facebookUserId
          }).returning();
        }
      }
  
      if (user.suspended) {
        return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
      }
  
      const ipAddress = req.headers.get("x-forwarded-for") || undefined;
      const userAgent = req.headers.get("user-agent") || undefined;
      const sessionToken = await createSession(user.id, ipAddress, userAgent);
  
      const response = NextResponse.redirect(new URL("/dashboard", req.url));
      response.cookies.set("session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60
      });
  
      response.cookies.delete("facebook_oauth_state");
      response.cookies.delete("facebook_oauth_code_verifier");
  
      return response;
    } catch (err) {
      console.error("Facebook OAuth Error:", err);
      return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
    }
  }
  ```

- [ ] **Step 5: Run tests to verify they pass**
  Run: `npx playwright test tests/integration/oauth-facebook.spec.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run: `git add src/app/api/auth/oauth/facebook/ tests/integration/oauth-facebook.spec.ts`
  Run: `git commit -m "feat: implement Facebook redirect and callback route handlers"`

---

### Task 6: UI Component Updates

**Files:**
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/components/auth/register-form.tsx`
- Modify: `tests/integration/auth-ui.spec.ts`

**Interfaces:**
- Consumes: Google, GitHub, and Facebook Redirect API endpoints.
- Produces: Updated login and register visual components with social authentication.

- [ ] **Step 1: Write integration checks for social login elements**
  Add verification inside `tests/integration/auth-ui.spec.ts`:
  ```typescript
  // Add this inside the "Auth UI Pages" describe block in tests/integration/auth-ui.spec.ts:
  test("login page displays social oauth login options", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("a[href*='/oauth/google/redirect']")).toBeVisible();
    await expect(page.locator("a[href*='/oauth/github/redirect']")).toBeVisible();
    await expect(page.locator("a[href*='/oauth/facebook/redirect']")).toBeVisible();
  });
  
  test("register page displays social oauth registration options", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("a[href*='/oauth/google/redirect']")).toBeVisible();
    await expect(page.locator("a[href*='/oauth/github/redirect']")).toBeVisible();
    await expect(page.locator("a[href*='/oauth/facebook/redirect']")).toBeVisible();
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx playwright test tests/integration/auth-ui.spec.ts`
  Expected: FAIL (social buttons not found).

- [ ] **Step 3: Update login-form.tsx**
  Modify [login-form.tsx](file:///a:/Mine/NextSaas/src/components/auth/login-form.tsx):
  Insert the divider and grid of social login buttons right below the submit button in the form (around line 135):
  ```tsx
            {/* ... form submit button ... */}
          </Button>
          
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <span className="relative bg-card px-2 text-[10px] tracking-wider text-muted-foreground uppercase font-semibold">
              Or continue with
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" type="button" asChild className="w-full flex items-center justify-center gap-2">
              <a href="/api/auth/oauth/google/redirect">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.67 0 3.2.58 4.39 1.71l3.27-3.27C17.68 1.58 14.99 1 12 1 7.24 1 3.2 3.73 1.24 7.74l3.88 3.01C6.07 7.79 8.78 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.74-4.93 3.74-8.55z" />
                  <path fill="#FBBC05" d="M5.12 10.75c-.24-.73-.38-1.5-.38-2.3s.14-1.57.38-2.3L1.24 3.14C.45 4.73 0 6.52 0 8.45s.45 3.72 1.24 5.31l3.88-3.01z" />
                  <path fill="#34A853" d="M12 19.96c-3.22 0-5.93-2.75-6.88-5.71l-3.88 3.01C3.2 21.27 7.24 24 12 24c3.27 0 6.01-1.09 8.01-2.96l-3.69-2.87c-1.11.75-2.54 1.79-4.32 1.79z" />
                </svg>
                <span className="hidden sm:inline">Google</span>
              </a>
            </Button>

            <Button variant="outline" type="button" asChild className="w-full flex items-center justify-center gap-2">
              <a href="/api/auth/oauth/github/redirect">
                <svg className="size-4 fill-foreground" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>

            <Button variant="outline" type="button" asChild className="w-full flex items-center justify-center gap-2">
              <a href="/api/auth/oauth/facebook/redirect">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="hidden sm:inline">Facebook</span>
              </a>
            </Button>
          </div>
  ```

- [ ] **Step 4: Update register-form.tsx**
  Modify [register-form.tsx](file:///a:/Mine/NextSaas/src/components/auth/register-form.tsx):
  Open the register form component and insert the same social button grid right below the form submit button:
  ```tsx
            {/* ... register form submit button ... */}
          </Button>
          
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <span className="relative bg-card px-2 text-[10px] tracking-wider text-muted-foreground uppercase font-semibold">
              Or continue with
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" type="button" asChild className="w-full flex items-center justify-center gap-2">
              <a href="/api/auth/oauth/google/redirect">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.67 0 3.2.58 4.39 1.71l3.27-3.27C17.68 1.58 14.99 1 12 1 7.24 1 3.2 3.73 1.24 7.74l3.88 3.01C6.07 7.79 8.78 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.74-4.93 3.74-8.55z" />
                  <path fill="#FBBC05" d="M5.12 10.75c-.24-.73-.38-1.5-.38-2.3s.14-1.57.38-2.3L1.24 3.14C.45 4.73 0 6.52 0 8.45s.45 3.72 1.24 5.31l3.88-3.01z" />
                  <path fill="#34A853" d="M12 19.96c-3.22 0-5.93-2.75-6.88-5.71l-3.88 3.01C3.2 21.27 7.24 24 12 24c3.27 0 6.01-1.09 8.01-2.96l-3.69-2.87c-1.11.75-2.54 1.79-4.32 1.79z" />
                </svg>
                <span className="hidden sm:inline">Google</span>
              </a>
            </Button>

            <Button variant="outline" type="button" asChild className="w-full flex items-center justify-center gap-2">
              <a href="/api/auth/oauth/github/redirect">
                <svg className="size-4 fill-foreground" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>

            <Button variant="outline" type="button" asChild className="w-full flex items-center justify-center gap-2">
              <a href="/api/auth/oauth/facebook/redirect">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="hidden sm:inline">Facebook</span>
              </a>
            </Button>
          </div>
  ```

- [ ] **Step 5: Run tests to verify they pass**
  Run: `npx playwright test tests/integration/auth-ui.spec.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run: `git add src/components/auth/ tests/integration/auth-ui.spec.ts`
  Run: `git commit -m "feat: integrate Google, GitHub, and Facebook social buttons into auth forms"`
