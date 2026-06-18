# Design Specification: NextSaas Authentication & Authorization (Phase 2)

* **Date**: 2026-06-18
* **Topic**: Custom Session-Based Auth, 2FA, Magic Links, Lockouts (Phase 2)
* **Status**: Approved by User

---

## 1. Goal & Context
The goal is to implement a modular, secure, custom session-based authentication and authorization system. It must be highly resilient against common web security attacks, supports multiple auth credentials (credentials, magic link, social OAuth, 2FA/TOTP), and features lockout mechanisms for brute force attempts.

---

## 2. Database Schema Specifications
All database dialects (PostgreSQL, MySQL, MariaDB) will be updated under their respective `src/db/templates/` directories.

### 2.1 Expanded `users` Table
* `id` (UUID / String length 36): Primary Key.
* `email` (Varchar 255): Unique, not null.
* `passwordHash` (Varchar 255): Nullable (allows passwordless only accounts).
* `twoFactorSecret` (Varchar 255): Nullable.
* `twoFactorEnabled` (Boolean): Defaults to false.
* `failedLoginAttempts` (Integer): Defaults to 0.
* `lockedUntil` (Timestamp): Nullable.
* `suspended` (Boolean): Defaults to false.
* `createdAt` (Timestamp): Defaults to now.

### 2.2 `sessions` Table
* `id` (Varchar 64): SHA-256 hash of the session token. Primary Key.
* `userId` (UUID / String length 36): Foreign key pointing to `users.id` (on delete cascade).
* `expiresAt` (Timestamp): Not null.
* `ipAddress` (Varchar 45): Nullable (supports IPv4 and IPv6).
* `userAgent` (Varchar 512): Nullable.
* `createdAt` (Timestamp): Defaults to now.

### 2.3 `verification_tokens` Table
* `id` (Varchar 64): SHA-256 hash of the token. Primary Key.
* `userId` (UUID / String length 36): Foreign key pointing to `users.id` (on delete cascade).
* `type` (Varchar 50): Can be `'magic_link' | 'email_verification' | 'password_reset'`.
* `expiresAt` (Timestamp): Not null.
* `createdAt` (Timestamp): Defaults to now.

---

## 3. Cryptography & Password Security
We use Node.js's native `crypto` module to perform portable, dependency-free cryptographic operations.

### 3.1 Password Hashing & Verification
* **Algorithm**: `scrypt` (native Node.js implementation).
* **Parameters**: N=16384, r=8, p=1. Key length: 32 bytes. Salt: 16 random bytes.
* **Storage format**: `salt_hex.hash_hex` (stored in `passwordHash`).
* **Verification**: Computes scrypt hash of inputs using the stored salt, comparing results using `crypto.timingSafeEqual` to eliminate timing side-channels.

### 3.2 Session Token Storage Protection
* Token is generated as 32 cryptographically secure random bytes (`crypto.randomBytes(32).toString('hex')`).
* To prevent session hijacking in the event of database leaks, the session token is hashed using SHA-256 before storage in the `sessions` table.
* Cookies are set with attributes: `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, `path: '/'`, and appropriate expiry times.

---

## 4. Authentication Workflows

### 4.1 Account Lockouts & Suspensions
* Max failed login attempts allowed: `5`.
* Lockout duration: `15 minutes`.
* Checks on login:
  - If `suspended` flag is true $\rightarrow$ deny access immediately.
  - If `lockedUntil` timestamp is set and `lockedUntil > Date.now()` $\rightarrow$ deny access.
* Verification matching:
  - Success: Reset `failedLoginAttempts` to 0, clear `lockedUntil`.
  - Failure: Increment `failedLoginAttempts`. If it reaches 5, set `lockedUntil` to `Date.now() + 15 minutes`.

### 4.2 Magic Link Sign-in
1. User enters email $\rightarrow$ create user if not exists.
2. Generate secure 32-byte token.
3. Save its SHA-256 hash to `verification_tokens` with `type: 'magic_link'` expiring in 15 minutes.
4. Send verification link: `/api/auth/magic-link?token=RAW_TOKEN`.
5. Clicking the link:
   - Compute hash of token.
   - Lookup and check expiry.
   - Delete token (single use).
   - Generate session, set cookie, redirect.

### 4.3 Two-Factor Authentication (2FA) Setup & Verify
* **Library**: `otplib` (standard TOTP algorithm).
* **Pre-auth flow**: If a user logs in (via password or magic link) and has `twoFactorEnabled: true`, set temporary cookie `pre_auth_token` valid for 5 minutes and redirect to `/auth/verify-2fa`.
* **Verification**: Validate code against secret using `otplib`. If valid, clear `pre_auth_token`, write full `session_token` cookie, and login.

### 4.4 Social Sign-on (OAuth 2.0)
* **Library**: `arctic`.
* Includes callback API handlers `/api/auth/oauth/google` and `/api/auth/oauth/github` exchanging authorization codes for profile details, matching email to user records.

---

## 5. Route Protection & Helpers
- **`getCurrentUser()` Server Helper**: A React `cache` function querying active sessions, returning user properties (de-duplicated across server components).
- **Middleware (`src/middleware.ts`)**: Redirects unauthenticated requests to `/login` if path is under `/dashboard/*` or `/settings/*`.

---

## 6. Verification Plan
1. **Unit tests**: Password hashing, locking logic, and token validation.
2. **Integration tests**: Playwright checks running:
   - Login attempt with bad password increments lock.
   - Locked user is rejected.
   - Magic link flows.
