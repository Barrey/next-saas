# Design Specification: NextSaas Social Sign-On (Phase 7)

* **Date**: 2026-06-19
* **Topic**: Social Sign-On (OAuth) — Google, GitHub & Facebook Integration via Arctic
* **Status**: Approved by User

---

## 1. Goal & Context

The goal is to implement Social Sign-On (OAuth) for Google, GitHub, and Facebook on top of the custom session-based authentication system of the `NextSaas` boilerplate.

Users should be able to log in or register with their social accounts.
- **Direct Schema Integration:** Google, GitHub, and Facebook IDs are stored directly in the `users` table (`googleId`, `githubId`, `facebookId`).
- **Auto-linking:** If a user logs in via a social provider and their email matches an existing email/password account (or another provider's account), they are automatically logged in and the provider ID is linked to their existing record.
- **Unified Sessions:** Once authenticated via OAuth, the app starts a standard database-backed custom session using our existing crypto session management.

---

## 2. Database Schema Changes

We add three optional string columns to the `users` table schema across all database templates to preserve setup flexibility.

### 2.1 PostgreSQL Template (`src/db/templates/postgres/schema.ts`)
```typescript
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }), // Nullable for OAuth-only users
  googleId: varchar("google_id", { length: 255 }),
  githubId: varchar("github_id", { length: 255 }),
  facebookId: varchar("facebook_id", { length: 255 }),
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  suspended: boolean("suspended").default(false).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  role: varchar("role", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
```

### 2.2 MySQL & MariaDB Templates
Add the exact same columns:
```typescript
  googleId: varchar("google_id", { length: 255 }),
  githubId: varchar("github_id", { length: 255 }),
  facebookId: varchar("facebook_id", { length: 255 }),
```

---

## 3. Client & Provider Configurations

### 3.1 OAuth Configurations (`src/lib/auth/oauth.ts`)
Create a central utility initializing the Arctic clients:
```typescript
import { Google, GitHub, Facebook } from "arctic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const googleOAuth = new Google(
  process.env.GOOGLE_CLIENT_ID || "",
  process.env.GOOGLE_CLIENT_SECRET || "",
  `${appUrl}/api/auth/oauth/google/callback`
);

export const githubOAuth = new GitHub(
  process.env.GITHUB_CLIENT_ID || "",
  process.env.GITHUB_CLIENT_SECRET || "",
  `${appUrl}/api/auth/oauth/github/callback`
);

export const facebookOAuth = new Facebook(
  process.env.FACEBOOK_CLIENT_ID || "",
  process.env.FACEBOOK_CLIENT_SECRET || "",
  `${appUrl}/api/auth/oauth/facebook/callback`
);
```

---

## 4. API Endpoints

### 4.1 Redirect Routes
Located at `/api/auth/oauth/[provider]/redirect/route.ts`.
- Generate code challenges, states, and verifiers.
- Set secure HTTP-only cookies: `[provider]_oauth_state` and `[provider]_oauth_code_verifier` (for PKCE-compliant Google/Facebook).
- Redirect to provider authorization screens.

### 4.2 Callback Routes
Located at `/api/auth/oauth/[provider]/callback/route.ts`.
- Compare incoming query state to cookie state.
- Exchange authentication code for tokens.
- Query provider user information endpoints:
  - Google: `https://openidconnect.googleapis.com/v1/userinfo` (needs `sub` and `email`)
  - GitHub: `https://api.github.com/user` (needs `id` and fallback to `https://api.github.com/user/emails` for `email`)
  - Facebook: `https://graph.facebook.com/me?fields=id,email` (needs `id` and `email`)
- Handle user record check and auto-linking:
  - Match provider ID.
  - If no match, check matching email. Link provider ID.
  - If no email match, create user record.
- Create system session, set `session_token` cookie, clear provider cookies, redirect to `/dashboard`.

---

## 5. UI Customizations

### 5.1 Login & Register Forms
Update `LoginForm` and `RegisterForm` to include the standard divider and button layout:
```tsx
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
      {/* Google SVG */}
      <span className="hidden sm:inline">Google</span>
    </a>
  </Button>
  {/* GitHub and Facebook Buttons ... */}
</div>
```

---

## 6. Verification Plan

### 6.1 Integration Testing (`tests/integration/oauth.spec.ts`)
Add automated integration tests to verify:
- Clicking social login buttons triggers navigation to callback routes.
- Callback with mock database handler correctly creates or links user session.
- Middleware protects settings and dashboard routes for logged-in OAuth users.

### 6.2 Manual Verification
- Run `npm run build` to ensure clean TypeScript compilation.
- Configure active environment variables in `.env.local` to direct redirects and callbacks successfully.
- Manually check buttons render cleanly on mobile views.
