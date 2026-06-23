# NextSaas Boilerplate User Guide & Implementation Manual

Welcome to the **NextSaas Boilerplate**! This document serves as the implementation manual and user guide for developers looking to adopt this project as their SaaS starter template. It is designed for engineers who already have coding experience and want to understand the architecture, configuration, database options, setup process, and customization capabilities of this boilerplate.

---

## Table of Contents
1. [Core Features & Architecture](#1-core-features--architecture)
2. [Project Directory Structure](#2-project-directory-structure)
3. [Database Setup & Migrations](#3-database-setup--migrations)
4. [Environment Configuration](#4-environment-configuration)
5. [Authentication & Authorization (RBAC)](#5-authentication--authorization-rbac)
6. [Organization & Invitation Flow](#6-organization--invitation-flow)
7. [Billing & Stripe Subscription Integration](#7-billing--stripe-subscription-integration)
8. [Testing & Verification](#8-testing--verification)
9. [Developer Customization Guide](#9-developer-customization-guide)

---

## 1. Core Features & Architecture

NextSaas is built on a modern, robust, and highly isolated stack:
* **Framework**: Next.js 15 (App Router) with React 19.
* **Styling**: Tailwind CSS & shadcn/ui components (supporting Light, Dark, and Cyberpunk theme modes).
* **Database & ORM**: Drizzle ORM supporting Postgres, MySQL, and MariaDB through configurable, pluggable database schemas and clients.
* **Authentication**: Custom stateful session management utilizing native Node.js cryptography (`scrypt`), rate limiting/temporary account lockouts, Magic Links, 2FA (TOTP via Authenticator apps), and OAuth 2.0 (Google, GitHub, Facebook via Arctic).
* **RBAC & Multi-Tenancy**: Organization creation, membership, Owner/Member roles, and invitation logic.
* **Billing**: Pluggable Billing Service with ready-to-use Stripe checkout, customer portal, webhook handlers, and full mock DB support for keyless testing.

---

## 2. Project Directory Structure

```text
NextSaas/
├── docs/                      # Technical specifications, plans, and user guides
├── drizzle/                   # Drizzle migration files (generated dynamically)
├── scripts/                   # DB setup and database seeding scripts
│   ├── setup-db.js            # Initialized schema & driver based on dialect choice
│   └── seed.ts                # Seeding mock data for local testing
├── src/
│   ├── app/
│   │   ├── api/               # API endpoints (auth, invitations, billing, oauth)
│   │   ├── dashboard/         # Protected dashboard view (org controls, billing)
│   │   ├── login/             # Login flow (magic link, credentials, 2FA inputs)
│   │   ├── register/          # Sign-up page (handling invite tokens)
│   │   ├── settings/          # User settings (password changes, 2FA setup toggle)
│   │   ├── layout.tsx         # Root layout with theme provider
│   │   ├── page.tsx           # SaaS Landing page
│   │   └── middleware.ts      # Protective middleware (Next.js Edge route guard)
│   ├── components/            # Reusable UI component blocks (auth forms, dashboard)
│   ├── db/
│   │   ├── templates/         # SQL Dialect configuration templates
│   │   ├── client.ts          # Active database client (copied from templates)
│   │   └── schema.ts          # Active database schema (copied from templates)
│   ├── lib/
│   │   ├── auth/              # Server/client auth helpers, session rules, OAuth
│   │   └── billing/           # Stripe service definitions and interfaces
│   └── hooks/                 # Custom React hooks (theme toggles, etc.)
└── tests/                     # Playwright integration & unit test suite
```

---

## 3. Database Setup & Migrations

This boilerplate supports PostgreSQL, MySQL, and MariaDB. Setting up the database dialect compiles the schemas and clients dynamically:

### Step 3.1: Initialize the Database Configuration
Run the database setup script, passing your chosen database dialect as an argument:
```bash
# Set up for PostgreSQL
npm run db:setup postgres

# Set up for MySQL
npm run db:setup mysql

# Set up for MariaDB
npm run db:setup mariadb
```
**What this script does:**
1. Copies the selected dialect's database schema and client from `src/db/templates/<dialect>/` to the active `src/db/` directory.
2. Copies the dialect-specific `drizzle-config.ts` to the root workspace.
3. Automatically installs the required database driver dependency (`pg` for Postgres, `mysql2` for MySQL/MariaDB).
4. Creates a default `.env.local` file prepopulated with a placeholder `DATABASE_URL` if it does not already exist.

### Step 3.2: Run Database Migrations
Generate and execute the SQL migrations using Drizzle Kit:
```bash
# Generate the SQL migration files based on schema changes
npm run db:generate

# Execute the migrations onto your target database
npm run db:migrate
```

### Step 3.3: Seed Mock Data for Local Testing
To prepopulate your database with sandbox organizations, users, and invitation tokens for testing:
```bash
npm run db:seed
```
* **Default Seeding Credentials**:
  * Password for all seeded users: `password123`
  * Owner: `owner@acme.com` (Acme Corp)
  * Member: `member@acme.com` (Acme Corp)
  * Standalone User: `loneuser@example.com` (no organization)

---

## 4. Environment Configuration

Define these variables in your `.env.local` file at the root of the project:

| Variable | Description | Allowed / Example Values | Required? |
|----------|-------------|--------------------------|-----------|
| `DATABASE_URL` | Connection string for your SQL database. | `postgresql://user:pass@localhost:5432/db` or `mysql://user:pass@localhost:3306/db` | Yes (unless `MOCK_DB=true`) |
| `MOCK_DB` | Enforces mock mode (in-memory mock database array queries) without needing a live SQL engine or Stripe connection. | `"true"` \| `"false"` | Optional (default `"false"`) |
| `NEXT_PUBLIC_APP_URL` | Fully qualified domain URL of the application. | `http://localhost:3000` | Yes (used for OAuth redirects) |
| `INVITATION_EXPIRY_DAYS` | Default lifespan (in days) of organization member invites. | `7` | Optional (default `7`) |
| `BILLING_PROVIDER` | SaaS Billing handler engine. | `"stripe"` | Optional (default `"stripe"`) |
| `STRIPE_SECRET_KEY` | Private key for Stripe operations. | `sk_test_...` | Yes (unless `MOCK_DB=true`) |
| `STRIPE_WEBHOOK_SECRET` | Secret key used to verify incoming Webhook signature integrity. | `whsec_...` | Yes (unless `MOCK_DB=true`) |
| `GOOGLE_CLIENT_ID` | OAuth application Client ID. | `client_id_here` | Optional (needed for Google sign-in) |
| `GOOGLE_CLIENT_SECRET` | OAuth application Client Secret. | `client_secret_here` | Optional (needed for Google sign-in) |
| `GITHUB_CLIENT_ID` | OAuth application Client ID. | `client_id_here` | Optional (needed for GitHub sign-in) |
| `GITHUB_CLIENT_SECRET` | OAuth application Client Secret. | `client_secret_here` | Optional (needed for GitHub sign-in) |
| `FACEBOOK_CLIENT_ID` | OAuth application Client ID. | `client_id_here` | Optional (needed for Facebook sign-in) |
| `FACEBOOK_CLIENT_SECRET` | OAuth application Client Secret. | `client_secret_here` | Optional (needed for Facebook sign-in) |
| `GEMINI_API_KEY` | Developer Google Gemini API access token. | `AIzaSy...` | Optional (needed for AI Planner module) |

---

## 5. Authentication & Authorization (RBAC)

NextSaas manages credentials and access limits dynamically using custom, stateful, database-backed sessions.

### 5.1 Cryptography
Password verification uses native Node.js `crypto.scryptSync` with a random 16-byte salt:
* Hashed strings are stored in the database in the format `${salt}.${hash}`.
* Rate lockouts: If a user enters an incorrect password 5 consecutive times, the account is temporarily locked for **15 minutes**.
* Session validation: Sessions are stored in the database. Tokens are hashed with `SHA-256` before storing, ensuring that compromised database files do not leak active session keys.

### 5.2 2FA (Two-Factor Authentication)
Users can enable 2FA inside the `/settings` dashboard page:
* TOTP secret keys are generated using `otplib` and represented as a visual QR code text configuration.
* If enabled, login forms automatically redirect the user to a verify-2fa screen, requiring a valid 6-digit verification code. The user's status is cached in a secure temporary `pre_auth_token` cookie for 5 minutes during verification.

### 5.3 Protected Router Middleware
The core routing rules are enforced in [middleware.ts](file:///a:/Mine/NextSaas/src/middleware.ts):
```typescript
const isAuthRoute = path.startsWith("/login") || path.startsWith("/register");
const isProtectedRoute = path.startsWith("/dashboard") || path.startsWith("/settings");

// Redirect guests attempting to access protected dashboards to login
if (isProtectedRoute && !token) {
  return NextResponse.redirect(new URL("/login", req.url));
}
// Redirect authenticated users trying to access login/register back to the dashboard
if (isAuthRoute && token) {
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
```

---

## 6. Organization & Invitation Flow

Multi-tenant controls allow users to belong to an organization:
* **Roles**: Roles are classified into `"owner"` (administrative permissions, billing control) and `"member"` (read-only/limited interaction).
* **Creating an Organization**: Users who sign up without an invitation code can create a new organization, automatically becoming its `Owner`.
* **Inviting Members**: Organization owners can trigger member invitations by submitting emails.
  * Invitations generate a cryptographically random token (`crypto.randomBytes(32).toString("hex")`) and store the hashed token in the database.
  * The user receives a link: `${APP_URL}/register?invite_token=${rawToken}`.
  * When a user registers using an invitation link, they bypass independent organization creation and are assigned as a `"member"` of the sending organization.
* **Role Guard Validation**: Endpoints that perform organizational mutation verify constraints via [guards.ts](file:///a:/Mine/NextSaas/src/lib/auth/guards.ts) using `requireOwner()`.

---

## 7. Billing & Stripe Subscription Integration

The billing flow integrates Stripe Checkout and the Stripe Customer Portal:
* **Flow**:
  1. An organization `Owner` requests checkout for a chosen billing plan (e.g. `price_pro`).
  2. The application requests a Stripe Checkout Session, embedding the `organizationId` inside the Stripe metadata.
  3. Upon payment success, Stripe triggers a webhook call to `/api/billing/webhook`.
  4. The webhook parses the event and inserts/updates the `subscriptions` table, mapping the `status`, `providerCustomerId`, `providerSubscriptionId`, and subscription period details to the target organization.
  5. The dashboard UI automatically updates to display the active subscription tier and opens access to the "Manage Billing" button, which redirects owners to the Stripe Customer Portal.

### Pluggable Billing Handler Service
To switch providers, update the `BILLING_PROVIDER` environment variable and extend the `BillingService` interface in [billing.ts](file:///a:/Mine/NextSaas/src/lib/billing/billing.ts):
```typescript
export interface BillingService {
  createCheckoutSession(organizationId: string, priceId: string, returnUrl: string): Promise<string>;
  createPortalSession(customerId: string, returnUrl: string): Promise<string>;
}
```

---

## 8. Testing & Verification

Integration and regression tests are handled via **Playwright**.

### Run All Integration Tests:
```bash
# Run tests using Playwright
npx playwright test
```
*If running inside a restricted PowerShell console on Windows, use `cmd` to bypass local script execution restrictions:*
```bash
cmd /c "npx playwright test"
```

### Key Test Suites:
* `tests/integration/auth.spec.ts`: Validates user registration and credentials authentication logic.
* `tests/integration/auth-ui.spec.ts`: Tests login forms, error prompts, theme switching, and redirects.
* `tests/integration/settings.spec.ts`: Tests password changes and the full 2FA setup/disable cycle.
* `tests/integration/orgs.spec.ts`: Covers organization setups, invitations, and role-based guard assertions.
* `tests/integration/billing.spec.ts`: Validates Stripe subscription checkouts, webhooks, portal sessions, and RBAC restrictions.

---

## 9. Developer Customization Guide

### 9.1 Adding a New Database Model
1. Open your target dialect's schema template file:
   * Postgres: `src/db/templates/postgres/schema.ts`
   * MySQL: `src/db/templates/mysql/schema.ts`
   * MariaDB: `src/db/templates/mariadb/schema.ts`
2. Define and export your database table using Drizzle schema declarations.
3. If running mock databases (`MOCK_DB=true`), update the mock database query intercepts inside `src/db/templates/<dialect>/client.ts` to support mock operations.
4. Run `npm run db:setup <dialect>` to copy the new files.
5. Generate and execute migrations: `npm run db:generate` followed by `npm run db:migrate`.

### 9.2 Creating a Protected API Route
To guard API route handlers against guest users:
```typescript
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // User is authenticated, proceed...
}
```
To restrict actions to organization Owners only:
```typescript
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guards";

export async function POST(req: Request) {
  try {
    const user = await requireOwner(); // Throws error if not Owner or not in org
    
    // Perform Owner action...
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
```

### 9.3 Customizing Themes
This project supports Light, Dark, and Cyberpunk theme modes through tailwind classes and `next-themes` styling:
* Edit colors, borders, and animations in the Tailwind CSS configuration and your root css styles.
* To check user context and adapt components to current active themes, make use of the `useTheme` hooks from `next-themes`.
