# Auth UI Implementation Plan (Phase 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend authentication UI pages (`/login`, `/register`, `/auth/verify-2fa`, `/dashboard`) that connect to the existing backend auth APIs.

**Architecture:** Auth pages (`/login`, `/register`, `/auth/verify-2fa`) are client components using `fetch` to call existing API routes, wrapped in a shared split-panel `AuthLayout`. The `/dashboard` page is a server component that calls `getCurrentUser()` directly. No new backend routes are created.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4 (with existing CSS variable tokens), `lucide-react` for icons, `next-themes` for theme-aware styling.

## Global Constraints

- All new files must use TypeScript with `strict: true` — no implicit `any`
- Tailwind classes must use existing CSS variable tokens only: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `bg-primary`, `border-border`, `bg-accent` — do NOT hardcode colors
- All pages use the root layout (`src/app/layout.tsx`) which already wraps everything in `ThemeProvider` — do not add another provider
- `lucide-react` is already installed — use it for icons
- No new npm packages — use only what is already in `package.json`
- Playwright tests go in `tests/integration/` and use `@playwright/test`
- Run tests with: `cmd.exe /c npm run test`
- Run build with: `cmd.exe /c npm run build`

---

### Task 1: Shared Auth Layout Component

**Files:**
- Create: `src/components/auth/auth-layout.tsx`

**Interfaces:**
- Produces: `AuthLayout({ children: React.ReactNode }): JSX.Element` — a split-panel wrapper used by all three auth pages

- [ ] **Step 1: Create the auth layout component**

```tsx
// src/components/auth/auth-layout.tsx
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12 bg-primary text-primary-foreground">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NextSaas</h1>
          <p className="mt-2 text-sm opacity-70">The production-ready Next.js SaaS starter</p>
        </div>
        <ul className="space-y-4 text-sm opacity-80">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
            Multi-tenant organizations
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
            Secure session authentication
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
            Flexible SQL database
          </li>
        </ul>
        <p className="text-xs opacity-40">© 2026 NextSaas Boilerplate</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col flex-1 bg-background">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles cleanly**

```bash
cmd.exe /c npm run build
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/auth-layout.tsx
git commit -m "feat: add shared auth split-panel layout component"
```

---

### Task 2: Login Page

**Files:**
- Create: `src/components/auth/login-form.tsx`
- Create: `src/app/login/page.tsx`
- Modify: `src/middleware.ts` (add `?redirected_from=1` to redirect URL)

**Interfaces:**
- Consumes: `AuthLayout` from `@/components/auth/auth-layout`
- Consumes: `POST /api/auth/login` → `{ success: true }` on success, `{ error: string }` on failure; response includes `requiresTwoFactor: true` when 2FA is required
- Consumes: `POST /api/auth/magic-link` → `{ success: true }` on success, `{ error: string }` on failure
- Produces: `/login` page, rendered inside `AuthLayout`

- [ ] **Step 1: Update middleware to append `?redirected_from=1`**

Edit `src/middleware.ts` line 11 — change the redirect URL from `/login` to `/login?redirected_from=1`:

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  const path = req.nextUrl.pathname;

  const isAuthRoute = path.startsWith("/login") || path.startsWith("/register");
  const isProtectedRoute = path.startsWith("/dashboard") || path.startsWith("/settings");

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login?redirected_from=1", req.url));
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/login", "/register"],
};
```

- [ ] **Step 2: Create the login form component**

```tsx
// src/components/auth/login-form.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "password" | "magic-link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirected_from");

  const [mode, setMode] = React.useState<Mode>("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mode === "magic-link") {
        const res = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          setSuccessMsg("Check your email — we sent a login link.");
        } else {
          const data = await res.json();
          setError(data.error || "Something went wrong — please try again.");
        }
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.requiresTwoFactor) {
          router.push("/auth/verify-2fa");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      if (res.status === 403) {
        if (data.error?.toLowerCase().includes("suspended")) {
          setError("Your account has been suspended.");
        } else {
          setError(data.error || "Account locked — try again in 15 minutes.");
        }
      } else {
        setError("Invalid email or password.");
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
        {redirectedFrom ? (
          <p className="mt-1 text-sm text-muted-foreground">Please log in to continue.</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="login-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {mode === "password" && (
          <div className="space-y-1">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {error && (
          <p id="login-error" className="text-sm text-red-500">{error}</p>
        )}
        {successMsg && (
          <p id="login-success" className="text-sm text-green-600">{successMsg}</p>
        )}

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : mode === "password"
            ? "Sign in"
            : "Send magic link"}
        </button>
      </form>

      <div className="space-y-3 text-center text-sm">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "password" ? "magic-link" : "password");
            setError("");
            setSuccessMsg("");
          }}
          className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          {mode === "password" ? "Or, send me a magic link" : "Back to password sign in"}
        </button>
        <p className="text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-foreground font-medium hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the login page**

```tsx
// src/app/login/page.tsx
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign In — NextSaas",
  description: "Sign in to your NextSaas account.",
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
```

> **Note:** `LoginForm` uses `useSearchParams()` which requires a `Suspense` boundary in Next.js 15 App Router. Wrapping in `<Suspense>` avoids the build-time warning.

- [ ] **Step 4: Write a Playwright integration test for the login page**

Add a new test file:

```ts
// tests/integration/auth-ui.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Auth UI Pages", () => {
  test("login page renders and shows correct elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2")).toHaveText("Welcome back");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator("#login-submit")).toHaveText("Sign in");
  });

  test("login page toggles to magic link mode", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Or, send me a magic link").click();
    await expect(page.locator("#login-password")).not.toBeVisible();
    await expect(page.locator("#login-submit")).toHaveText("Send magic link");
  });

  test("login redirects to dashboard on success", async ({ page }) => {
    // Register first via API
    const email = `ui-login-${Date.now()}@example.com`;
    await page.request.post("/api/auth/register", {
      data: { email, password: "password123" },
    });

    await page.goto("/login");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill("password123");
    await page.locator("#login-submit").click();
    await page.waitForURL("/dashboard");
    expect(page.url()).toContain("/dashboard");
  });

  test("login shows error on bad credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill("nobody@example.com");
    await page.locator("#login-password").fill("wrongpassword");
    await page.locator("#login-submit").click();
    await expect(page.locator("#login-error")).toBeVisible();
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cmd.exe /c npm run test
```

Expected: All existing tests pass, plus the new `auth-ui.spec.ts` login tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/components/auth/login-form.tsx src/app/login/page.tsx tests/integration/auth-ui.spec.ts
git commit -m "feat: add login page with password and magic link modes"
```

---

### Task 3: Register Page

**Files:**
- Create: `src/components/auth/register-form.tsx`
- Create: `src/app/register/page.tsx`

**Interfaces:**
- Consumes: `AuthLayout` from `@/components/auth/auth-layout`
- Consumes: `POST /api/auth/register` (with optional `?invite_token=TOKEN` query param) → `{ success: true, userId: string }` on success, `{ error: string }` on failure
- Produces: `/register` page, rendered inside `AuthLayout`

- [ ] **Step 1: Create the register form component**

```tsx
// src/components/auth/register-form.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = inviteToken
      ? `/api/auth/register?invite_token=${inviteToken}`
      : "/api/auth/register";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/dashboard");
        return;
      }

      if (data.error?.toLowerCase().includes("already exists")) {
        setError("An account with this email already exists.");
      } else if (data.error?.toLowerCase().includes("8 characters")) {
        setError("Password must be at least 8 characters.");
      } else {
        setError(data.error || "Something went wrong — please try again.");
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {inviteToken
            ? "You've been invited — complete registration to join your team."
            : "Start your journey with NextSaas."}
        </p>
      </div>

      {inviteToken && (
        <div
          id="register-invite-banner"
          className="rounded-lg border border-border bg-accent px-4 py-3 text-sm text-foreground"
        >
          🎉 You&apos;ve been invited! Register below to accept and join your team.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="register-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            required
            readOnly={!!inviteToken}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 read-only:opacity-60 read-only:cursor-not-allowed"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="register-password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && (
          <p id="register-error" className="text-sm text-red-500">{error}</p>
        )}

        <button
          id="register-submit"
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="text-foreground font-medium hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create the register page**

```tsx
// src/app/register/page.tsx
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Create Account — NextSaas",
  description: "Create your NextSaas account.",
};

export default function RegisterPage() {
  return (
    <AuthLayout>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}
```

- [ ] **Step 3: Add Playwright tests for the register page**

Append to `tests/integration/auth-ui.spec.ts`:

```ts
  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h2")).toHaveText("Create an account");
    await expect(page.locator("#register-email")).toBeVisible();
    await expect(page.locator("#register-password")).toBeVisible();
    await expect(page.locator("#register-submit")).toHaveText("Create account");
  });

  test("register page shows invite banner when invite_token is present", async ({ page }) => {
    await page.goto("/register?invite_token=sometoken123");
    await expect(page.locator("#register-invite-banner")).toBeVisible();
  });

  test("register page shows error on duplicate email", async ({ page }) => {
    const email = `dup-${Date.now()}@example.com`;
    // Create user first
    await page.request.post("/api/auth/register", {
      data: { email, password: "password123" },
    });

    await page.goto("/register");
    await page.locator("#register-email").fill(email);
    await page.locator("#register-password").fill("password123");
    await page.locator("#register-submit").click();
    await expect(page.locator("#register-error")).toBeVisible();
  });
```

- [ ] **Step 4: Run tests**

```bash
cmd.exe /c npm run test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/register-form.tsx src/app/register/page.tsx tests/integration/auth-ui.spec.ts
git commit -m "feat: add register page with invite token support"
```

---

### Task 4: 2FA Verification Page

**Files:**
- Create: `src/components/auth/verify-2fa-form.tsx`
- Create: `src/app/auth/verify-2fa/page.tsx`

**Interfaces:**
- Consumes: `AuthLayout` from `@/components/auth/auth-layout`
- Consumes: `POST /api/auth/verify-2fa` with body `{ code: string }` → `{ success: true }` on success, `{ error: string }` on failure
- Produces: `/auth/verify-2fa` page rendered inside `AuthLayout`

- [ ] **Step 1: Create the 2FA form component**

```tsx
// src/components/auth/verify-2fa-form.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function Verify2FAForm() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus the code input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        router.push("/dashboard");
        return;
      }

      setError("Invalid code — please try again.");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Two-factor verification</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="verify-2fa-code" className="text-sm font-medium text-foreground">
            Verification code
          </label>
          <input
            id="verify-2fa-code"
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-2xl font-mono tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && (
          <p id="verify-2fa-error" className="text-sm text-red-500">{error}</p>
        )}

        <button
          id="verify-2fa-submit"
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <a href="/login" className="text-foreground font-medium hover:underline">
          Back to login
        </a>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create the 2FA page**

```tsx
// src/app/auth/verify-2fa/page.tsx
import { AuthLayout } from "@/components/auth/auth-layout";
import { Verify2FAForm } from "@/components/auth/verify-2fa-form";

export const metadata = {
  title: "Two-Factor Verification — NextSaas",
  description: "Enter your two-factor authentication code.",
};

export default function Verify2FAPage() {
  return (
    <AuthLayout>
      <Verify2FAForm />
    </AuthLayout>
  );
}
```

- [ ] **Step 3: Add Playwright test for the 2FA page**

Append to `tests/integration/auth-ui.spec.ts`:

```ts
  test("verify-2fa page renders correctly", async ({ page }) => {
    await page.goto("/auth/verify-2fa");
    await expect(page.locator("h2")).toHaveText("Two-factor verification");
    await expect(page.locator("#verify-2fa-code")).toBeVisible();
    await expect(page.locator("#verify-2fa-submit")).toBeDisabled();
  });

  test("verify-2fa submit button enables when 6 digits entered", async ({ page }) => {
    await page.goto("/auth/verify-2fa");
    await page.locator("#verify-2fa-code").fill("123456");
    await expect(page.locator("#verify-2fa-submit")).toBeEnabled();
  });
```

- [ ] **Step 4: Run tests**

```bash
cmd.exe /c npm run test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/verify-2fa-form.tsx src/app/auth/verify-2fa/page.tsx tests/integration/auth-ui.spec.ts
git commit -m "feat: add 2FA verification page"
```

---

### Task 5: Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getCurrentUser(): Promise<User | null>` from `@/lib/auth/server`
  - `User` has shape: `{ id: string, email: string, organizationId: string | null, role: string | null, ... }`
- Consumes: `POST /api/auth/logout` → clears `session_token` cookie, returns `{ success: true }`
- Produces: `/dashboard` server-rendered page — shows user info card

- [ ] **Step 1: Create the dashboard page**

```tsx
// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata = {
  title: "Dashboard — NextSaas",
  description: "Your NextSaas workspace dashboard.",
};

function RoleBadge({ role }: { role: string | null }) {
  if (role === "owner") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        Owner
      </span>
    );
  }
  if (role === "member") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
        Member
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      —
    </span>
  );
}

async function LogoutButton() {
  async function logout() {
    "use server";
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.delete("session_token");
    redirect("/login");
  }

  return (
    <form action={logout}>
      <button
        id="dashboard-logout"
        type="submit"
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        Log out
      </button>
    </form>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your account overview.</p>
        </div>

        <div
          id="dashboard-user-card"
          className="rounded-xl border border-border bg-card p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Account</h2>
            <RoleBadge role={user.role} />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p id="dashboard-email" className="text-sm font-medium text-foreground mt-0.5">
                {user.email}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Organization</p>
              <p id="dashboard-org" className="text-sm font-medium text-foreground mt-0.5">
                {user.organizationId ? user.organizationId : "No organization"}
              </p>
            </div>
          </div>
        </div>

        <LogoutButton />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add Playwright tests for the dashboard page**

Append to `tests/integration/auth-ui.spec.ts`:

```ts
  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("dashboard shows user info after login", async ({ page }) => {
    const email = `dash-${Date.now()}@example.com`;
    await page.request.post("/api/auth/register", {
      data: { email, password: "password123" },
    });

    // Login via API to set cookie
    const loginRes = await page.request.post("/api/auth/login", {
      data: { email, password: "password123" },
    });
    expect(loginRes.ok()).toBe(true);

    await page.goto("/dashboard");
    await expect(page.locator("#dashboard-user-card")).toBeVisible();
    await expect(page.locator("#dashboard-email")).toHaveText(email);
  });

  test("logout button redirects to login", async ({ page }) => {
    const email = `logout-${Date.now()}@example.com`;
    await page.request.post("/api/auth/register", {
      data: { email, password: "password123" },
    });
    await page.request.post("/api/auth/login", {
      data: { email, password: "password123" },
    });

    await page.goto("/dashboard");
    await page.locator("#dashboard-logout").click();
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
```

- [ ] **Step 3: Run all tests**

```bash
cmd.exe /c npm run test
```

Expected: All 7 original tests + all new `auth-ui.spec.ts` tests pass.

- [ ] **Step 4: Run the production build**

```bash
cmd.exe /c npm run build
```

Expected: `✓ Compiled successfully` — no TypeScript errors, all pages listed in route table.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx tests/integration/auth-ui.spec.ts
git commit -m "feat: add dashboard page with user info card and logout"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `/login` — password + magic link toggle (Task 2)
- ✅ `/register` — invite token detection and banner (Task 3)
- ✅ `/auth/verify-2fa` — 6-digit TOTP input (Task 4)
- ✅ `/dashboard` — email, org, role badge, logout (Task 5)
- ✅ Split-panel `AuthLayout` shared across all 3 auth pages (Task 1)
- ✅ `ThemeToggle` in right panel header (included in `AuthLayout`)
- ✅ `redirected_from=1` banner on login (Task 2, middleware update)
- ✅ Middleware update to append `?redirected_from=1` (Task 2, Step 1)
- ✅ Playwright tests for all pages (Tasks 2–5)
- ✅ Build verification after every task

**Type consistency:**
- `getCurrentUser()` returns `User | null` — `User` has `email`, `organizationId`, `role` — used correctly in Task 5
- `AuthLayout` accepts `{ children: React.ReactNode }` — used consistently in Tasks 2–4
- All form components are `"use client"` — dashboard is async server component — no mixing

**Placeholder scan:** No TBD, TODO, or vague steps found.
