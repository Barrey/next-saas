# Design Specification: NextSaas Authentication UI (Phase 4)

* **Date**: 2026-06-18
* **Topic**: Frontend Authentication UI — Login, Register, 2FA, Dashboard
* **Status**: Approved by User

---

## 1. Goal & Context

The backend authentication APIs (login, register, magic-link, verify-2fa, logout) are fully implemented and tested. This phase adds the frontend UI pages that connect to those APIs, completing the end-to-end authentication experience for users.

**In scope:**
- `/login` — Email + password form with magic link toggle
- `/register` — Registration form with invite token support
- `/auth/verify-2fa` — 6-digit TOTP verification page
- `/dashboard` — Basic user info card (server-rendered)

**Out of scope:**
- Social sign-on (OAuth with Google/GitHub) — planned for a future phase
- User settings / profile editing
- Organization management UI

---

## 2. Layout & Visual Design

### 2.1 Split-Panel Layout (Auth Pages)

All auth pages (`/login`, `/register`, `/auth/verify-2fa`) use a shared `AuthLayout` wrapper component with:

- **Left panel (40% width, hidden on mobile)**: Dark branded panel using existing CSS token colors (`--primary`, `--card`, `--border`). Contains:
  - App name and logo mark
  - Tagline: "The production-ready Next.js SaaS starter"
  - 3 bullet features: "Multi-tenant organizations", "Secure session auth", "Flexible SQL database"
  - Fully theme-aware (respects light/dark/cyberpunk via existing CSS variables)

- **Right panel (60% width, full-width on mobile)**: Clean card background (`--card` token). Contains:
  - `ThemeToggle` button in the top-right corner
  - Vertically centered auth form
  - Link to the opposite auth page (e.g. "Already have an account? Log in")

### 2.2 Dashboard

Single-column centered layout. Server-rendered page showing a user info card with logout capability.

---

## 3. Pages & Components

### 3.1 File Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx              # /login — client component
│   ├── register/
│   │   └── page.tsx              # /register — client component
│   ├── auth/
│   │   └── verify-2fa/
│   │       └── page.tsx          # /auth/verify-2fa — client component
│   └── dashboard/
│       └── page.tsx              # /dashboard — server component
└── components/
    └── auth/
        ├── auth-layout.tsx       # Shared split-panel wrapper
        ├── login-form.tsx        # Login form with magic link toggle
        ├── register-form.tsx     # Register form with invite banner
        └── verify-2fa-form.tsx   # 6-digit TOTP input form
```

### 3.2 `/login` Page

**Component**: Client (`"use client"`)

**Form fields:**
- `email` (type="email", required)
- `password` (type="password", required) — replaced by a submit button when magic link mode is active

**Toggle:** "Or, send me a magic link" link switches between password mode and magic link mode.

**Behaviour:**
- Password mode: `POST /api/auth/login` with `{ email, password }`
  - `200` → redirect to `/dashboard`; if response includes `requiresTwoFactor: true` → redirect to `/auth/verify-2fa`
  - Error codes → display inline error message (see Section 4)
- Magic link mode: `POST /api/auth/magic-link` with `{ email }`
  - `200` → show success message: "Check your email — we sent a login link"
  - Error → inline error message

**Footer link:** "Don't have an account? Register"

### 3.3 `/register` Page

**Component**: Client (`"use client"`)

**Invite token handling:**
- Reads `?invite_token=...` from URL on mount via `useSearchParams()`
- If present: email field is pre-filled and set to read-only; displays banner: *"You've been invited — complete registration to join your team"*
- Registration `POST` goes to `/api/auth/register?invite_token=TOKEN`

**Form fields:**
- `email` (type="email", required; read-only if invite token present)
- `password` (type="password", required, min 8 chars)

**Behaviour:**
- `POST /api/auth/register` (with `?invite_token` in URL if applicable)
- `200` → redirect to `/dashboard`
- Error codes → display inline error message

**Footer link:** "Already have an account? Log in"

### 3.4 `/auth/verify-2fa` Page

**Component**: Client (`"use client"`)

**Form fields:**
- Single 6-digit numeric code input (auto-focused on mount, accepts only digits, max length 6)

**Behaviour:**
- `POST /api/auth/verify-2fa` with `{ code }`
- `200` → redirect to `/dashboard`
- Error → inline: "Invalid code — please try again"

**Note:** This page is only reachable after a successful password login when `twoFactorEnabled` is true. If the user navigates here directly without a valid `pre_auth_token` cookie, the API will return 401 and they are redirected to `/login`.

### 3.5 `/dashboard` Page

**Component**: Server component

**Data source:** Calls `getCurrentUser()` from `@/lib/auth/server` directly in the server component. If no session, middleware redirects to `/login` before the page renders.

**Displays:**
- User email
- Organization name (or `"No organization"` if `organizationId` is null)
- Role badge: `Owner` (green) / `Member` (blue) / `—` (grey) based on `user.role`
- Logout button: `POST /api/auth/logout` via a client action → redirects to `/login`

---

## 4. Error Handling

| API Error | Display Message |
|---|---|
| `401 Unauthorized` | "Invalid email or password" |
| `403 Forbidden` (locked) | "Account locked — try again in 15 minutes" |
| `403 Forbidden` (suspended) | "Your account has been suspended" |
| `400` (email exists) | "An account with this email already exists" |
| `400` (weak password) | "Password must be at least 8 characters" |
| `500` | "Something went wrong — please try again" |

All errors are displayed inline below the form submit button. No page-level redirects for form errors.

---

## 5. Routing & Middleware

The existing `src/middleware.ts` already protects `/dashboard/*` and `/settings/*` by redirecting unauthenticated users to `/login`. No middleware changes are needed.

The login page reads a `?redirected_from` query param (set automatically by middleware) to show a contextual message: *"Please log in to continue"* — this requires a small middleware update to append `?redirected_from=1` on redirect.

---

## 6. Verification Plan

### Automated Tests
- Extend `tests/integration/auth.spec.ts` with Playwright tests verifying:
  - Login form submits correctly and redirects to `/dashboard`
  - Register form submits correctly with and without an `invite_token`
  - Dashboard page renders user info when logged in
  - Unauthenticated access to `/dashboard` redirects to `/login`

### Manual Verification
- `npm run build` — TypeScript must compile without errors
- `npm run dev` + manually walk through all 4 pages in the browser
- Verify split-panel layout renders correctly on mobile (left panel hidden)
- Verify theme toggle works on auth pages
